-- ─────────────────────────────────────────────
-- CUIDARE — A cliente remarca ou cancela sozinha, pelo link pessoal do agendamento
--
-- Cada agendamento ganha uma "chave" (manage_token) longa e impossível de adivinhar.
-- Quem tem o link /meu-agendamento/<chave> mexe só naquele agendamento.
-- Regras (ajustáveis em business_settings):
--   • até 12 horas antes do atendimento;
--   • no máximo 2 remarcações por agendamento;
--   • pode remarcar com qualquer profissional que faça o serviço;
--   • o link para de funcionar depois do horário do atendimento.
-- A profissional que perdeu e a que ganhou o atendimento recebem aviso por WhatsApp.
-- ─────────────────────────────────────────────

-- ═════════════════════════════════════════════
-- 1. CONFIGURAÇÕES E COLUNAS NOVAS
-- ═════════════════════════════════════════════

alter table public.business_settings
  add column if not exists site_url                text not null default 'https://cuidare-sigma.vercel.app',
  add column if not exists client_change_min_hours int  not null default 12 check (client_change_min_hours between 0 and 168),
  add column if not exists client_max_reschedules  int  not null default 2  check (client_max_reschedules between 0 and 10);

-- A chave: 64 letras/números aleatórios. Cada agendamento existente também ganha a sua.
alter table public.bookings
  add column if not exists manage_token text not null
    default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  add column if not exists client_reschedule_count int not null default 0 check (client_reschedule_count >= 0);

create unique index if not exists bookings_manage_token_key on public.bookings (manage_token);

-- Novo tipo de mensagem: aviso para a profissional
alter table public.notification_queue drop constraint if exists notification_queue_type_check;
alter table public.notification_queue add constraint notification_queue_type_check
  check (type in ('booking_created', 'booking_rescheduled', 'booking_cancelled', 'reminder_24h', 'staff_alert'));

-- ═════════════════════════════════════════════
-- 2. FUNÇÕES INTERNAS
-- ═════════════════════════════════════════════

-- Endereço do link pessoal
create or replace function private.manage_url(p_token text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select rtrim(coalesce((select site_url from public.business_settings where id = 1), 'https://cuidare-sigma.vercel.app'), '/')
         || '/meu-agendamento/' || p_token;
$$;

-- Data e hora por extenso curto, ex.: "14/11 (sex) às 09:00"
create or replace function private.when_label(p_date date, p_time time)
returns text
language sql
immutable
set search_path = ''
as $$
  select to_char(p_date, 'DD/MM') || ' (' ||
         (array['dom','seg','ter','qua','qui','sex','sáb'])[extract(dow from p_date)::int + 1] ||
         ') às ' || to_char(p_time, 'HH24:MI');
$$;

-- Aviso por WhatsApp para uma profissional (sem WhatsApp cadastrado → vai para o número do salão)
create or replace function private.enqueue_staff_alert(p_booking_id uuid, p_professional_id text, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pro   public.professionals;
  v_phone text;
begin
  select * into v_pro from public.professionals where id = p_professional_id;
  v_phone := coalesce(
    nullif(v_pro.whatsapp, ''),
    (select nullif(business_whatsapp, '') from public.business_settings where id = 1)
  );
  if v_phone is null then return; end if;

  insert into public.notification_queue (booking_id, recipient_phone, recipient_name, message, type)
  values (p_booking_id, private.normalize_phone(v_phone), coalesce(v_pro.name, 'Cuidare'), p_message, 'staff_alert');
end;
$$;

-- Por que a cliente NÃO pode mais mexer neste agendamento (null = pode)
create or replace function private.client_change_block_reason(p_booking public.bookings)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_hours int := coalesce((select client_change_min_hours from public.business_settings where id = 1), 12);
  v_start timestamp := p_booking.date + p_booking.start_time;
begin
  if p_booking.status = 'cancelado' then return 'Este agendamento foi cancelado.'; end if;
  if p_booking.status = 'concluido' then return 'Este atendimento já foi realizado.'; end if;
  if p_booking.status = 'faltou' then return 'Este horário já passou.'; end if;
  if private.now_sp() >= v_start then return 'O horário deste atendimento já passou.'; end if;
  if private.now_sp() > v_start - v_hours * interval '1 hour' then
    return 'Faltam menos de ' || v_hours || ' horas para o atendimento. Para mudar, fale com o salão pelo WhatsApp.';
  end if;
  return null;
end;
$$;

-- Lista de horários livres (usada pelo agendamento e pela remarcação).
-- p_exclude_booking: ignora o próprio agendamento, para a cliente poder "andar" o horário.
create or replace function private.available_slots(
  p_service_id      text,
  p_date            date,
  p_professional_id text default null,
  p_exclude_booking uuid default null
)
returns table (slot_time time, professional_ids text[])
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_service  public.services;
  v_settings public.business_settings;
  v_hours    public.business_hours;
  v_now      timestamp := private.now_sp();
  v_step     int;
  v_t        time;
  v_free     text[];
begin
  select * into v_service from public.services where id = p_service_id and active;
  if not found then return; end if;

  select * into v_settings from public.business_settings where id = 1;
  v_step := coalesce(v_settings.slot_step_minutes, 30);

  -- Só entre hoje e o limite de antecedência
  if p_date < v_now::date or p_date > v_now::date + coalesce(v_settings.max_advance_days, 30) then
    return;
  end if;

  select * into v_hours from public.business_hours where day_of_week = extract(dow from p_date)::int;
  if not found or v_hours.closed then return; end if;

  v_t := v_hours.open_time;
  while extract(epoch from v_t) / 60 + v_service.duration <= extract(epoch from v_hours.close_time) / 60 loop
    -- Hoje: respeita a antecedência mínima
    if p_date + v_t > v_now + coalesce(v_settings.min_lead_time_minutes, 30) * interval '1 minute' then
      select coalesce(array_agg(p.id order by p.sort_order, p.name), '{}')
        into v_free
      from public.professionals p
      where p.active
        and (p_professional_id is null or p.id = p_professional_id)
        and private.professional_can_do_service(p.id, v_service.id)
        and private.slot_unavailable_reason(p.id, p_date, v_t, v_service.duration, p_exclude_booking) is null;

      if cardinality(v_free) > 0 then
        slot_time := v_t;
        professional_ids := v_free;
        return next;
      end if;
    end if;

    -- Evita dar a volta na meia-noite
    exit when extract(epoch from v_t) / 60 + v_step >= 1440;
    v_t := v_t + v_step * interval '1 minute';
  end loop;
end;
$$;

-- O agendamento normal passa a usar a função acima (mesmo resultado de antes)
create or replace function public.get_available_slots(
  p_service_id      text,
  p_date            date,
  p_professional_id text default null
)
returns table (slot_time time, professional_ids text[])
language sql
stable
security definer
set search_path = ''
as $$
  select * from private.available_slots(p_service_id, p_date, p_professional_id, null);
$$;

-- ═════════════════════════════════════════════
-- 3. MENSAGENS PARA A CLIENTE AGORA LEVAM O LINK
-- ═════════════════════════════════════════════

create or replace function private.enqueue_notification(p_booking public.bookings, p_type text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_when    text := to_char(p_booking.date, 'DD/MM/YYYY') || ' às ' || to_char(p_booking.start_time, 'HH24:MI');
  v_first   text := split_part(p_booking.client_name, ' ', 1);
  v_link    text := private.manage_url(p_booking.manage_token);
  v_message text;
  v_at      timestamptz := now();
begin
  v_message := case p_type
    when 'booking_created' then
      'Olá, ' || v_first || '! Recebemos sua solicitação de ' || p_booking.service_name ||
      ' com ' || p_booking.professional_name || ' em ' || v_when || '. Em breve confirmamos.' ||
      E'\n\nPrecisa remarcar ou cancelar? Use seu link: ' || v_link || E'\n\nCuidare Espaço de Beleza.'
    when 'booking_rescheduled' then
      'Olá, ' || v_first || '! Seu horário de ' || p_booking.service_name ||
      ' foi remarcado para ' || v_when || ' com ' || p_booking.professional_name || '.' ||
      E'\n\nSeu link do agendamento: ' || v_link || E'\n\nCuidare Espaço de Beleza.'
    when 'booking_cancelled' then
      'Olá, ' || v_first || '. Seu horário de ' || p_booking.service_name || ' em ' || v_when ||
      ' foi cancelado. Para agendar de novo, acesse nosso site ou fale com a gente pelo WhatsApp. Cuidare Espaço de Beleza.'
    when 'reminder_24h' then
      'Olá, ' || v_first || '! Lembrete: amanhã, ' || v_when || ', você tem ' || p_booking.service_name ||
      ' com ' || p_booking.professional_name || '. Até lá!' ||
      E'\n\nSe precisar mudar: ' || v_link || E'\n\nCuidare Espaço de Beleza.'
  end;

  if p_type = 'reminder_24h' then
    v_at := ((p_booking.date + p_booking.start_time) at time zone 'America/Sao_Paulo') - interval '24 hours';
    if v_at <= now() then return; end if; -- falta menos de 24h: sem lembrete
  end if;

  insert into public.notification_queue (booking_id, recipient_phone, recipient_name, message, type, scheduled_for)
  values (p_booking.id, p_booking.client_phone, p_booking.client_name, v_message, p_type, v_at);
end;
$$;

-- ═════════════════════════════════════════════
-- 4. TRIGGER: a chave nunca muda e "quem alterou" mostra a cliente
-- ═════════════════════════════════════════════

create or replace function private.bookings_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff public.staff_members := private.current_staff();
  v_actor text := nullif(current_setting('cuidare.actor', true), '');
  v_rate  numeric(4,3);
begin
  new.client_phone := private.normalize_phone(new.client_phone);
  new.client_name  := trim(new.client_name);

  if new.service_name is null or new.service_name = '' then
    select name into new.service_name from public.services where id = new.service_id;
  end if;
  if tg_op = 'INSERT' or new.professional_id is distinct from old.professional_id or new.professional_name is null then
    select name into new.professional_name from public.professionals where id = new.professional_id;
  end if;

  -- Liga à ficha da cliente pelo telefone (cria a ficha se ainda não existir)
  if new.client_id is null then
    insert into public.clients (phone, name, email)
    values (new.client_phone, new.client_name, new.client_email)
    on conflict (phone) do nothing;
    select id into new.client_id from public.clients where phone = new.client_phone;
  end if;

  if tg_op = 'INSERT' then
    new.created_by      := coalesce(new.created_by, auth.uid());
    new.created_by_name := coalesce(new.created_by_name, v_staff.name);
  else
    new.updated_by      := auth.uid();
    new.updated_by_name := coalesce(v_staff.name, v_actor);
    -- Campos que nunca mudam depois de criados
    new.created_at      := old.created_at;
    new.created_by      := old.created_by;
    new.created_by_name := old.created_by_name;
    new.manage_token    := old.manage_token;
  end if;

  -- Comissão: a taxa fica guardada no agendamento. Mudar a taxa da profissional
  -- depois não altera atendimentos antigos.
  if new.commission_rate is null then
    select coalesce(p.commission_rate, s.commission_default_rate, 0.5) into v_rate
    from public.professionals p
    left join public.business_settings s on s.id = 1
    where p.id = new.professional_id;
    new.commission_rate := v_rate;
  end if;
  if new.status = 'concluido' then
    new.commission_amount := round(new.price * new.commission_rate, 2);
  elsif tg_op = 'UPDATE' and old.status = 'concluido' then
    new.commission_amount := null;
  end if;

  -- Remarcação: se data, hora ou profissional mudaram e ninguém anotou, anota aqui
  if tg_op = 'UPDATE'
     and (new.date, new.start_time, new.professional_id) is distinct from (old.date, old.start_time, old.professional_id)
     and new.reschedule_history = old.reschedule_history then
    new.reschedule_history := old.reschedule_history || jsonb_build_array(jsonb_build_object(
      'previousDate', old.date, 'previousTime', to_char(old.start_time, 'HH24:MI'),
      'previousProfessionalId', old.professional_id, 'previousProfessionalName', old.professional_name,
      'newDate', new.date, 'newTime', to_char(new.start_time, 'HH24:MI'),
      'newProfessionalId', new.professional_id, 'newProfessionalName', new.professional_name,
      'reason', '', 'changedAt', now(), 'changedBy', auth.uid(), 'changedByName', coalesce(v_staff.name, v_actor)));
  end if;

  return new;
end;
$$;

-- ═════════════════════════════════════════════
-- 5. FUNÇÕES PÚBLICAS DO LINK
-- ═════════════════════════════════════════════

-- Agendamento do site agora devolve a chave do link
create or replace function public.create_public_booking(
  p_service_id      text,
  p_date            date,
  p_time            time,
  p_client_name     text,
  p_client_phone    text,
  p_professional_id text default null,
  p_client_email    text default null,
  p_notes           text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_service  public.services;
  v_settings public.business_settings;
  v_pro      public.professionals;
  v_now      timestamp := private.now_sp();
  v_name     text := trim(regexp_replace(coalesce(p_client_name, ''), '\s+', ' ', 'g'));
  v_phone    text := private.normalize_phone(p_client_phone);
  v_email    text := nullif(lower(trim(coalesce(p_client_email, ''))), '');
  v_notes    text := nullif(trim(coalesce(p_notes, '')), '');
  v_pro_id   text;
  v_client   uuid;
  v_booking  public.bookings;
  v_reason   text;
begin
  -- 1. Dados da cliente
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    return jsonb_build_object('success', false, 'error', 'Informe seu nome (mínimo 2 letras).');
  end if;
  if length(v_phone) not in (12, 13) then
    return jsonb_build_object('success', false, 'error', 'Informe um WhatsApp válido com DDD.');
  end if;
  if v_email is not null and (char_length(v_email) > 160 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    return jsonb_build_object('success', false, 'error', 'E-mail inválido.');
  end if;
  if v_notes is not null and char_length(v_notes) > 500 then
    return jsonb_build_object('success', false, 'error', 'Observações devem ter no máximo 500 caracteres.');
  end if;

  -- 2. Serviço e período permitido
  select * into v_service from public.services where id = p_service_id and active;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Serviço não encontrado.');
  end if;

  select * into v_settings from public.business_settings where id = 1;
  if p_date < v_now::date or p_date > v_now::date + coalesce(v_settings.max_advance_days, 30) then
    return jsonb_build_object('success', false, 'error', 'Data fora do período de agendamento online.');
  end if;
  if p_date + p_time <= v_now + coalesce(v_settings.min_lead_time_minutes, 30) * interval '1 minute' then
    return jsonb_build_object('success', false, 'error', 'Este horário já passou ou está muito próximo. Escolha outro.');
  end if;

  -- 3. Clique duplo: mesma solicitação nos últimos 2 minutos devolve o agendamento já criado
  select * into v_booking from public.bookings b
  where b.client_phone = v_phone and b.service_id = p_service_id
    and b.date = p_date and b.start_time = p_time and b.status <> 'cancelado'
    and b.created_at > now() - interval '2 minutes'
  limit 1;
  if found then
    return jsonb_build_object('success', true, 'booking', private.public_booking_json(v_booking));
  end if;

  -- 4. Proteção contra abuso: no máximo 5 agendamentos futuros em aberto por telefone
  if (select count(*) from public.bookings b
      where b.client_phone = v_phone and b.status in ('pendente', 'confirmado')
        and b.date >= v_now::date) >= 5 then
    return jsonb_build_object('success', false,
      'error', 'Você já tem vários agendamentos em aberto. Fale com a recepção pelo WhatsApp.');
  end if;

  -- 5. Profissional: a escolhida, ou a primeira livre que atende o serviço
  if p_professional_id is not null then
    if not private.professional_can_do_service(p_professional_id, p_service_id) then
      return jsonb_build_object('success', false, 'error', 'Esta profissional não realiza o serviço escolhido.');
    end if;
    v_reason := private.slot_unavailable_reason(p_professional_id, p_date, p_time, v_service.duration);
    if v_reason is not null then
      return jsonb_build_object('success', false,
        'error', 'O horário escolhido não está mais disponível. Por favor, selecione outro.');
    end if;
    v_pro_id := p_professional_id;
  else
    select p.id into v_pro_id
    from public.professionals p
    where p.active
      and private.professional_can_do_service(p.id, p_service_id)
      and private.slot_unavailable_reason(p.id, p_date, p_time, v_service.duration) is null
    order by p.sort_order, p.name
    limit 1;
    if v_pro_id is null then
      return jsonb_build_object('success', false,
        'error', 'O horário escolhido não está mais disponível. Por favor, selecione outro.');
    end if;
  end if;

  select * into v_pro from public.professionals where id = v_pro_id;

  -- 6. Cliente: cadastra se for nova. Um visitante nunca altera dados de quem já existe.
  insert into public.clients (phone, name, email)
  values (v_phone, v_name, v_email)
  on conflict (phone) do nothing;
  select id into v_client from public.clients where phone = v_phone;

  -- 7. Grava. A trava bookings_sem_sobreposicao impede reserva dupla em acessos simultâneos.
  begin
    insert into public.bookings (
      service_id, service_name, professional_id, professional_name,
      client_id, client_name, client_phone, client_email,
      date, start_time, duration, notes, status, price, commission_rate, origin
    ) values (
      v_service.id, v_service.name, v_pro.id, v_pro.name,
      v_client, v_name, v_phone, v_email,
      p_date, p_time, v_service.duration, v_notes, 'pendente', v_service.price_base,
      coalesce(v_pro.commission_rate, v_settings.commission_default_rate, 0.5), 'site'
    )
    returning * into v_booking;
  exception when exclusion_violation then
    return jsonb_build_object('success', false,
      'error', 'Este horário acabou de ser reservado por outra pessoa. Por favor, selecione outro.');
  end;

  return jsonb_build_object('success', true, 'booking', private.public_booking_json(v_booking));
end;
$$;

-- O que a cliente pode ver do próprio agendamento (nunca dados de outras pessoas)
create or replace function private.public_booking_json(p_booking public.bookings)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_booking.id, 'serviceId', p_booking.service_id, 'serviceName', p_booking.service_name,
    'professionalId', p_booking.professional_id, 'professionalName', p_booking.professional_name,
    'date', p_booking.date, 'time', to_char(p_booking.start_time, 'HH24:MI'),
    'endTime', to_char(p_booking.end_time, 'HH24:MI'), 'duration', p_booking.duration,
    'status', p_booking.status, 'price', p_booking.price, 'manageToken', p_booking.manage_token);
$$;

-- Abre o agendamento pelo link
create or replace function public.get_booking_by_token(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_b        public.bookings;
  v_settings public.business_settings;
  v_block    text;
  v_max      int;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('success', false, 'error', 'Link inválido. Confira se copiou o endereço inteiro.');
  end if;

  select * into v_b from public.bookings where manage_token = p_token;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Agendamento não encontrado. Confira se copiou o endereço inteiro.');
  end if;

  -- Depois do horário do atendimento, o link deixa de funcionar
  if private.now_sp() >= v_b.date + v_b.end_time then
    return jsonb_build_object('success', false, 'expired', true,
      'error', 'Este link expirou porque o horário do atendimento já passou.');
  end if;

  select * into v_settings from public.business_settings where id = 1;
  v_max   := coalesce(v_settings.client_max_reschedules, 2);
  v_block := private.client_change_block_reason(v_b);

  return jsonb_build_object('success', true, 'booking',
    private.public_booking_json(v_b) || jsonb_build_object(
      'clientFirstName', split_part(v_b.client_name, ' ', 1),
      'canCancel', v_block is null,
      'canReschedule', v_block is null and v_b.client_reschedule_count < v_max,
      'blockReason', coalesce(v_block, case when v_b.client_reschedule_count >= v_max then
        'Você já remarcou este agendamento ' || v_max || ' vezes. Para mudar de novo, fale com o salão pelo WhatsApp.' end),
      'reschedulesLeft', greatest(v_max - v_b.client_reschedule_count, 0),
      'minHours', coalesce(v_settings.client_change_min_hours, 12)
    ));
end;
$$;

-- Horários livres para remarcar (o próprio horário atual conta como livre)
create or replace function public.get_reschedule_slots(
  p_token           text,
  p_date            date,
  p_professional_id text default null
)
returns table (slot_time time, professional_ids text[])
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_b public.bookings;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return; end if;
  select * into v_b from public.bookings where manage_token = p_token;
  if not found or private.client_change_block_reason(v_b) is not null then return; end if;

  return query select * from private.available_slots(v_b.service_id, p_date, p_professional_id, v_b.id);
end;
$$;

-- A cliente remarca
create or replace function public.client_reschedule_booking(
  p_token           text,
  p_date            date,
  p_time            time,
  p_professional_id text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_b        public.bookings;
  v_new      public.bookings;
  v_settings public.business_settings;
  v_now      timestamp := private.now_sp();
  v_block    text;
  v_pro_id   text;
  v_pro      public.professionals;
  v_max      int;
  v_old_when text;
  v_new_when text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('success', false, 'error', 'Link inválido.');
  end if;

  -- Trava o agendamento enquanto remarca (evita dois cliques ao mesmo tempo)
  select * into v_b from public.bookings where manage_token = p_token for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Agendamento não encontrado.');
  end if;

  v_block := private.client_change_block_reason(v_b);
  if v_block is not null then
    return jsonb_build_object('success', false, 'error', v_block);
  end if;

  select * into v_settings from public.business_settings where id = 1;
  v_max := coalesce(v_settings.client_max_reschedules, 2);
  if v_b.client_reschedule_count >= v_max then
    return jsonb_build_object('success', false,
      'error', 'Você já remarcou este agendamento ' || v_max || ' vezes. Para mudar de novo, fale com o salão pelo WhatsApp.');
  end if;

  -- Novo horário dentro do período permitido
  if p_date is null or p_time is null then
    return jsonb_build_object('success', false, 'error', 'Escolha o novo dia e horário.');
  end if;
  if p_date < v_now::date or p_date > v_now::date + coalesce(v_settings.max_advance_days, 30) then
    return jsonb_build_object('success', false, 'error', 'Data fora do período de agendamento online.');
  end if;
  if p_date + p_time <= v_now + coalesce(v_settings.min_lead_time_minutes, 30) * interval '1 minute' then
    return jsonb_build_object('success', false, 'error', 'Este horário já passou ou está muito próximo. Escolha outro.');
  end if;

  -- Profissional: a escolhida; senão a atual (se estiver livre); senão a primeira livre
  if p_professional_id is not null then
    if not private.professional_can_do_service(p_professional_id, v_b.service_id) then
      return jsonb_build_object('success', false, 'error', 'Esta profissional não realiza este serviço.');
    end if;
    if private.slot_unavailable_reason(p_professional_id, p_date, p_time, v_b.duration, v_b.id) is not null then
      return jsonb_build_object('success', false,
        'error', 'O horário escolhido não está mais disponível. Por favor, selecione outro.');
    end if;
    v_pro_id := p_professional_id;
  else
    select p.id into v_pro_id
    from public.professionals p
    where p.active
      and private.professional_can_do_service(p.id, v_b.service_id)
      and private.slot_unavailable_reason(p.id, p_date, p_time, v_b.duration, v_b.id) is null
    order by (p.id = v_b.professional_id) desc, p.sort_order, p.name
    limit 1;
    if v_pro_id is null then
      return jsonb_build_object('success', false,
        'error', 'O horário escolhido não está mais disponível. Por favor, selecione outro.');
    end if;
  end if;

  if (p_date, p_time, v_pro_id) = (v_b.date, v_b.start_time, v_b.professional_id) then
    return jsonb_build_object('success', false, 'error', 'Este já é o seu horário atual. Escolha outro.');
  end if;

  select * into v_pro from public.professionals where id = v_pro_id;
  perform set_config('cuidare.actor', 'Cliente (pelo link)', true);

  begin
    update public.bookings set
      date                    = p_date,
      start_time              = p_time,
      professional_id         = v_pro.id,
      professional_name       = v_pro.name,
      -- Trocou de profissional: vale a comissão da nova
      commission_rate         = case when v_pro.id = v_b.professional_id then v_b.commission_rate else null end,
      client_reschedule_count = v_b.client_reschedule_count + 1,
      reschedule_history      = v_b.reschedule_history || jsonb_build_array(jsonb_build_object(
        'previousDate', v_b.date, 'previousTime', to_char(v_b.start_time, 'HH24:MI'),
        'previousProfessionalId', v_b.professional_id, 'previousProfessionalName', v_b.professional_name,
        'newDate', p_date, 'newTime', to_char(p_time, 'HH24:MI'),
        'newProfessionalId', v_pro.id, 'newProfessionalName', v_pro.name,
        'reason', 'Remarcado pela cliente pelo link', 'changedAt', now(),
        'changedBy', null, 'changedByName', 'Cliente (pelo link)'))
    where id = v_b.id
    returning * into v_new;
  exception when exclusion_violation then
    return jsonb_build_object('success', false,
      'error', 'Este horário acabou de ser reservado por outra pessoa. Por favor, selecione outro.');
  end;

  -- Avisos por WhatsApp para a equipe
  v_old_when := private.when_label(v_b.date, v_b.start_time);
  v_new_when := private.when_label(v_new.date, v_new.start_time);

  if v_new.professional_id <> v_b.professional_id then
    perform private.enqueue_staff_alert(v_b.id, v_b.professional_id,
      'Aviso Cuidare: a cliente ' || v_b.client_name || ' remarcou ' || v_b.service_name ||
      ' de ' || v_old_when || '. O atendimento passou para ' || v_new.professional_name ||
      ' em ' || v_new_when || '. Seu horário ficou livre.');
    perform private.enqueue_staff_alert(v_b.id, v_new.professional_id,
      'Aviso Cuidare: novo atendimento para você! ' || v_b.client_name || ' - ' || v_b.service_name ||
      ' - ' || v_new_when || '. (Remarcado pela cliente; antes era com ' || v_b.professional_name || ' em ' || v_old_when || '.)');
  else
    perform private.enqueue_staff_alert(v_b.id, v_b.professional_id,
      'Aviso Cuidare: a cliente ' || v_b.client_name || ' remarcou ' || v_b.service_name ||
      ' de ' || v_old_when || ' para ' || v_new_when || '.');
  end if;

  return jsonb_build_object('success', true, 'booking', private.public_booking_json(v_new));
end;
$$;

-- A cliente cancela
create or replace function public.client_cancel_booking(p_token text, p_reason text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_b      public.bookings;
  v_block  text;
  v_reason text := nullif(trim(regexp_replace(coalesce(p_reason, ''), '\s+', ' ', 'g')), '');
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('success', false, 'error', 'Link inválido.');
  end if;
  if v_reason is not null and char_length(v_reason) > 300 then
    return jsonb_build_object('success', false, 'error', 'O motivo deve ter no máximo 300 caracteres.');
  end if;

  select * into v_b from public.bookings where manage_token = p_token for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Agendamento não encontrado.');
  end if;

  v_block := private.client_change_block_reason(v_b);
  if v_block is not null then
    return jsonb_build_object('success', false, 'error', v_block);
  end if;

  perform set_config('cuidare.actor', 'Cliente (pelo link)', true);
  update public.bookings set
    status        = 'cancelado',
    cancel_reason = 'Cancelado pela cliente pelo link' || coalesce(': ' || v_reason, '')
  where id = v_b.id;

  perform private.enqueue_staff_alert(v_b.id, v_b.professional_id,
    'Aviso Cuidare: a cliente ' || v_b.client_name || ' cancelou ' || v_b.service_name ||
    ' de ' || private.when_label(v_b.date, v_b.start_time) || '. O horário ficou livre.' ||
    coalesce(' Motivo: ' || v_reason, ''));

  return jsonb_build_object('success', true);
end;
$$;

-- ═════════════════════════════════════════════
-- 6. PERMISSÕES
-- ═════════════════════════════════════════════

-- Funções internas novas: ninguém de fora chama direto
revoke all on function
  private.manage_url(text),
  private.when_label(date, time),
  private.enqueue_staff_alert(uuid, text, text),
  private.client_change_block_reason(public.bookings),
  private.available_slots(text, date, text, uuid),
  private.public_booking_json(public.bookings)
from public, anon, authenticated;

-- Funções do link: liberadas para o site
revoke all on function
  public.get_booking_by_token(text),
  public.get_reschedule_slots(text, date, text),
  public.client_reschedule_booking(text, date, time, text),
  public.client_cancel_booking(text, text)
from public;
grant execute on function
  public.get_booking_by_token(text),
  public.get_reschedule_slots(text, date, text),
  public.client_reschedule_booking(text, date, time, text),
  public.client_cancel_booking(text, text)
to anon, authenticated;
