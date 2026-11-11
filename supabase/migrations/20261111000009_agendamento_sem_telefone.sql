-- ─────────────────────────────────────────────
-- CUIDARE — Agendamento sem telefone
--
-- Usado para importar a agenda de papel, onde muitas vezes só há o primeiro nome.
-- Sem telefone: o agendamento ocupa o horário normalmente, mas não cria ficha
-- de cliente e não gera mensagens de WhatsApp para a cliente.
-- O site continua exigindo WhatsApp de quem agenda online.
-- ─────────────────────────────────────────────

alter table public.bookings alter column client_phone drop not null;

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
  -- Telefone vazio vira "sem telefone" (null)
  new.client_phone := nullif(private.normalize_phone(new.client_phone), '');
  new.client_name  := trim(new.client_name);

  if new.service_name is null or new.service_name = '' then
    select name into new.service_name from public.services where id = new.service_id;
  end if;
  if tg_op = 'INSERT' or new.professional_id is distinct from old.professional_id or new.professional_name is null then
    select name into new.professional_name from public.professionals where id = new.professional_id;
  end if;

  -- Liga à ficha da cliente pelo telefone (cria a ficha se ainda não existir).
  -- Sem telefone, fica sem ficha.
  if new.client_id is null and new.client_phone is not null then
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
  -- Sem telefone (ex.: importado da agenda de papel): nenhuma mensagem para a cliente
  if p_booking.client_phone is null then return; end if;

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
