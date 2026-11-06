-- ─────────────────────────────────────────────
-- CUIDARE — Migração 002: Regras de agendamento, automações e registro de alterações
-- Todas as funções com SECURITY DEFINER fixam search_path = '' por segurança.
-- ─────────────────────────────────────────────

-- ═════════════════════════════════════════════
-- A. FUNÇÕES AUXILIARES (schema private, fora da API)
-- ═════════════════════════════════════════════

-- Telefone brasileiro só com números e com 55 (mesma regra do site: normalizeBrazilianPhone)
create or replace function private.normalize_phone(p_phone text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when d = '' then ''
    when d like '55%' and length(d) in (12, 13) then d
    when length(d) in (10, 11) then '55' || d
    else d
  end
  from (select regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') as d) x;
$$;

-- Data e hora atuais no fuso do salão
create or replace function private.now_sp()
returns timestamp
language sql
stable
set search_path = ''
as $$ select (now() at time zone 'America/Sao_Paulo'); $$;

-- Cadastro da pessoa logada na equipe (vazio para visitantes e contas desativadas)
create or replace function private.current_staff()
returns public.staff_members
language sql
stable
security definer
set search_path = ''
as $$
  select s.* from public.staff_members s
  where s.user_id = auth.uid() and s.active
  limit 1;
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_members s
    where s.user_id = auth.uid() and s.active and s.role = 'admin'
  );
$$;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff_members s where s.user_id = auth.uid() and s.active);
$$;

create or replace function private.my_professional_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.professional_id from public.staff_members s
  where s.user_id = auth.uid() and s.active
  limit 1;
$$;

-- A profissional atende este serviço? (mesma regra do site)
create or replace function private.professional_can_do_service(p_professional_id text, p_service_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.services s
    join public.professionals p on p.id = p_professional_id
    where s.id = p_service_id
      and p.active
      and case
            when cardinality(s.professional_ids) > 0 then p.id = any (s.professional_ids)
            else s.category = any (p.categories)
          end
  );
$$;

-- Motivo pelo qual o horário NÃO está livre (null = livre).
-- Confere: expediente, almoço, horário próprio da profissional, bloqueios e outros agendamentos.
create or replace function private.slot_unavailable_reason(
  p_professional_id text,
  p_date            date,
  p_start           time,
  p_duration        int,
  p_exclude_booking uuid default null
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_dow   int  := extract(dow from p_date)::int;
  v_end   time := p_start + p_duration * interval '1 minute';
  v_hours public.business_hours;
  v_has_rules boolean;
begin
  if p_duration <= 0 or extract(epoch from p_start) / 60 + p_duration > 1440 then
    return 'Duração inválida.';
  end if;

  -- 1. Expediente do salão
  select * into v_hours from public.business_hours where day_of_week = v_dow;
  if not found or v_hours.closed then
    return 'O salão não abre neste dia.';
  end if;
  if p_start < v_hours.open_time or v_end > v_hours.close_time then
    return 'Horário fora do expediente.';
  end if;

  -- 2. Intervalo de almoço do salão
  if v_hours.break_start is not null and p_start < v_hours.break_end and v_end > v_hours.break_start then
    return 'Horário cai no intervalo de almoço.';
  end if;

  -- 3. Horário próprio da profissional (se houver regra para o dia, precisa caber em uma)
  select exists (
    select 1 from public.availability_rules r
    where r.professional_id = p_professional_id and r.day_of_week = v_dow and r.active
  ) into v_has_rules;

  if v_has_rules and not exists (
    select 1 from public.availability_rules r
    where r.professional_id = p_professional_id and r.day_of_week = v_dow and r.active
      and p_start >= r.start_time and v_end <= r.end_time
      and not (r.break_start is not null and p_start < r.break_end and v_end > r.break_start)
  ) then
    return 'Fora do horário de atendimento da profissional.';
  end if;

  -- 4. Folgas, férias e bloqueios
  if exists (
    select 1 from public.schedule_blocks b
    where b.professional_id = p_professional_id
      and (b.date is null or b.date = p_date)
      and (b.all_day or (p_start < b.end_time and v_end > b.start_time))
  ) then
    return 'A profissional não atende neste horário.';
  end if;

  -- 5. Outros agendamentos ativos
  if exists (
    select 1 from public.bookings k
    where k.professional_id = p_professional_id
      and k.date = p_date
      and k.status <> 'cancelado'
      and (p_exclude_booking is null or k.id <> p_exclude_booking)
      and p_start < k.end_time and v_end > k.start_time
  ) then
    return 'Horário já reservado.';
  end if;

  return null;
end;
$$;

-- ═════════════════════════════════════════════
-- B. FUNÇÕES PÚBLICAS (chamadas pelo site via supabase.rpc)
-- ═════════════════════════════════════════════

-- Horários livres de um serviço numa data. Não revela nada sobre outras clientes.
-- p_professional_id = null → "primeira profissional disponível".
create or replace function public.get_available_slots(
  p_service_id      text,
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
        and private.slot_unavailable_reason(p.id, p_date, v_t, v_service.duration) is null;

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

-- Agendamento feito pela cliente no site.
-- O banco decide duração, preço e profissional; o navegador só informa a escolha.
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
    return jsonb_build_object('success', true, 'booking', jsonb_build_object(
      'id', v_booking.id, 'serviceId', v_booking.service_id, 'serviceName', v_booking.service_name,
      'professionalId', v_booking.professional_id, 'professionalName', v_booking.professional_name,
      'date', v_booking.date, 'time', to_char(v_booking.start_time, 'HH24:MI'),
      'endTime', to_char(v_booking.end_time, 'HH24:MI'), 'duration', v_booking.duration,
      'status', v_booking.status, 'price', v_booking.price));
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

  return jsonb_build_object('success', true, 'booking', jsonb_build_object(
    'id', v_booking.id, 'serviceId', v_booking.service_id, 'serviceName', v_booking.service_name,
    'professionalId', v_booking.professional_id, 'professionalName', v_booking.professional_name,
    'date', v_booking.date, 'time', to_char(v_booking.start_time, 'HH24:MI'),
    'endTime', to_char(v_booking.end_time, 'HH24:MI'), 'duration', v_booking.duration,
    'status', v_booking.status, 'price', v_booking.price));
end;
$$;

-- ═════════════════════════════════════════════
-- C. AUTOMAÇÕES (triggers)
-- ═════════════════════════════════════════════

-- updated_at automático
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.professionals   for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.services        for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.staff_members   for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.clients         for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.bookings        for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.business_settings for each row execute function private.set_updated_at();

-- Telefone sempre normalizado nas clientes
create or replace function private.clients_normalize()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.phone := private.normalize_phone(new.phone);
  new.name  := trim(new.name);
  return new;
end;
$$;
create trigger clients_normalize before insert or update on public.clients
  for each row execute function private.clients_normalize();

-- Antes de gravar um agendamento: completa dados, liga à cliente, registra quem fez,
-- guarda a comissão do dia e anota remarcações.
create or replace function private.bookings_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff public.staff_members := private.current_staff();
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
    new.updated_by_name := v_staff.name;
    -- Campos que nunca mudam depois de criados
    new.created_at      := old.created_at;
    new.created_by      := old.created_by;
    new.created_by_name := old.created_by_name;
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

  -- Remarcação: se data, hora ou profissional mudaram e o painel não anotou, anota aqui
  if tg_op = 'UPDATE'
     and (new.date, new.start_time, new.professional_id) is distinct from (old.date, old.start_time, old.professional_id)
     and new.reschedule_history = old.reschedule_history then
    new.reschedule_history := old.reschedule_history || jsonb_build_array(jsonb_build_object(
      'previousDate', old.date, 'previousTime', to_char(old.start_time, 'HH24:MI'),
      'previousProfessionalId', old.professional_id, 'previousProfessionalName', old.professional_name,
      'newDate', new.date, 'newTime', to_char(new.start_time, 'HH24:MI'),
      'newProfessionalId', new.professional_id, 'newProfessionalName', new.professional_name,
      'reason', '', 'changedAt', now(), 'changedBy', auth.uid(), 'changedByName', v_staff.name));
  end if;

  return new;
end;
$$;
create trigger bookings_before_write before insert or update on public.bookings
  for each row execute function private.bookings_before_write();

-- Monta e enfileira uma mensagem de WhatsApp
create or replace function private.enqueue_notification(p_booking public.bookings, p_type text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_when    text := to_char(p_booking.date, 'DD/MM/YYYY') || ' às ' || to_char(p_booking.start_time, 'HH24:MI');
  v_first   text := split_part(p_booking.client_name, ' ', 1);
  v_message text;
  v_at      timestamptz := now();
begin
  v_message := case p_type
    when 'booking_created' then
      'Olá, ' || v_first || '! Recebemos sua solicitação de ' || p_booking.service_name ||
      ' com ' || p_booking.professional_name || ' em ' || v_when || '. Em breve confirmamos. Cuidare Espaço de Beleza.'
    when 'booking_rescheduled' then
      'Olá, ' || v_first || '! Seu horário de ' || p_booking.service_name ||
      ' foi remarcado para ' || v_when || ' com ' || p_booking.professional_name || '. Cuidare Espaço de Beleza.'
    when 'booking_cancelled' then
      'Olá, ' || v_first || '. Seu horário de ' || p_booking.service_name || ' em ' || v_when ||
      ' foi cancelado. Para remarcar, fale com a gente pelo WhatsApp. Cuidare Espaço de Beleza.'
    when 'reminder_24h' then
      'Olá, ' || v_first || '! Lembrete: amanhã, ' || v_when || ', você tem ' || p_booking.service_name ||
      ' com ' || p_booking.professional_name || '. Até lá! Cuidare Espaço de Beleza.'
  end;

  if p_type = 'reminder_24h' then
    v_at := ((p_booking.date + p_booking.start_time) at time zone 'America/Sao_Paulo') - interval '24 hours';
    if v_at <= now() then return; end if; -- falta menos de 24h: sem lembrete
  end if;

  insert into public.notification_queue (booking_id, recipient_phone, recipient_name, message, type, scheduled_for)
  values (p_booking.id, p_booking.client_phone, p_booking.client_name, v_message, p_type, v_at);
end;
$$;

-- Depois de gravar um agendamento: histórico da cliente e mensagens
create or replace function private.bookings_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_moved boolean;
begin
  -- Histórico: atendimento concluído entra; se deixar de ser concluído, sai
  if new.status = 'concluido' and new.client_id is not null then
    insert into public.client_history (
      client_id, booking_id, service_name, professional_id, professional_name, date,
      price, commission_rate, commission_amount, status, notes, origin, added_manually,
      created_by, created_by_name
    ) values (
      new.client_id, new.id, new.service_name, new.professional_id, new.professional_name, new.date,
      new.price, new.commission_rate, new.commission_amount, new.status, new.notes, new.origin, false,
      coalesce(new.updated_by, new.created_by), coalesce(new.updated_by_name, new.created_by_name)
    )
    on conflict (booking_id) do update set
      client_id = excluded.client_id, service_name = excluded.service_name,
      professional_id = excluded.professional_id, professional_name = excluded.professional_name,
      date = excluded.date, price = excluded.price, commission_rate = excluded.commission_rate,
      commission_amount = excluded.commission_amount, status = excluded.status, notes = excluded.notes;
  elsif tg_op = 'UPDATE' and old.status = 'concluido' then
    delete from public.client_history where booking_id = new.id and not added_manually;
  end if;

  -- Mensagens
  if tg_op = 'INSERT' then
    if new.status in ('pendente', 'confirmado') then
      perform private.enqueue_notification(new, 'booking_created');
      perform private.enqueue_notification(new, 'reminder_24h');
    end if;
    return null;
  end if;

  v_moved := (new.date, new.start_time, new.professional_id) is distinct from (old.date, old.start_time, old.professional_id);

  if new.status = 'cancelado' and old.status <> 'cancelado' then
    update public.notification_queue set status = 'cancelled'
      where booking_id = new.id and status = 'pending';
    perform private.enqueue_notification(new, 'booking_cancelled');
  elsif new.status in ('concluido', 'faltou') and old.status not in ('concluido', 'faltou') then
    update public.notification_queue set status = 'cancelled'
      where booking_id = new.id and status = 'pending';
  elsif v_moved and new.status in ('pendente', 'confirmado') then
    update public.notification_queue set status = 'cancelled'
      where booking_id = new.id and status = 'pending';
    perform private.enqueue_notification(new, 'booking_rescheduled');
    perform private.enqueue_notification(new, 'reminder_24h');
  end if;

  return null;
end;
$$;
create trigger bookings_after_write after insert or update on public.bookings
  for each row execute function private.bookings_after_write();

-- Registro de alterações (quem mudou o quê e quando)
create or replace function private.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff public.staff_members := private.current_staff();
  v_old   jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new   jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row   jsonb := coalesce(v_new, v_old);
begin
  if tg_op = 'UPDATE' and v_old - 'updated_at' = v_new - 'updated_at' then
    return null; -- nada mudou de fato
  end if;

  insert into public.audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, previous_values, new_values)
  values (
    auth.uid(),
    coalesce(v_staff.name, case when auth.uid() is null then 'Site (público)' end),
    coalesce(v_staff.role, case when auth.uid() is null then 'public' end),
    lower(tg_op),
    tg_table_name,
    coalesce(v_row ->> 'id', v_row ->> 'user_id', v_row ->> 'day_of_week'),
    v_old,
    v_new
  );
  return null;
end;
$$;

create trigger audit after insert or update or delete on public.bookings          for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.clients           for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.client_history    for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.professionals     for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.services          for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.staff_members     for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.availability_rules for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.schedule_blocks   for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.business_hours    for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.business_settings for each row execute function private.audit_row();
