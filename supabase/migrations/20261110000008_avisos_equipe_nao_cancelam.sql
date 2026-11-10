-- ─────────────────────────────────────────────
-- CUIDARE — Avisos para a equipe nunca são descartados
--
-- Quando um agendamento muda ou é cancelado, as mensagens antigas PARA A CLIENTE
-- que ainda não saíram são descartadas (ficariam desatualizadas).
-- Os avisos para as profissionais (staff_alert) precisam sair mesmo assim:
-- ex.: a cliente remarca e depois cancela — a profissional que perdeu o horário
-- ainda precisa saber da remarcação.
-- ─────────────────────────────────────────────

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
      where booking_id = new.id and status = 'pending' and type <> 'staff_alert';
    perform private.enqueue_notification(new, 'booking_cancelled');
  elsif new.status in ('concluido', 'faltou') and old.status not in ('concluido', 'faltou') then
    update public.notification_queue set status = 'cancelled'
      where booking_id = new.id and status = 'pending' and type <> 'staff_alert';
  elsif v_moved and new.status in ('pendente', 'confirmado') then
    update public.notification_queue set status = 'cancelled'
      where booking_id = new.id and status = 'pending' and type <> 'staff_alert';
    perform private.enqueue_notification(new, 'booking_rescheduled');
    perform private.enqueue_notification(new, 'reminder_24h');
  end if;

  return null;
end;
$$;
