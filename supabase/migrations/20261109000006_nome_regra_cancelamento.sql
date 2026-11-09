-- ─────────────────────────────────────────────
-- CUIDARE — Migração 006: nome claro para a regra "cancelamento exige motivo"
-- (o site usa esse nome para mostrar a mensagem certa)
-- ─────────────────────────────────────────────

do $$
declare
  v_name text;
begin
  select conname into v_name
  from pg_constraint
  where conrelid = 'public.bookings'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%cancel_reason%';

  if v_name is not null and v_name <> 'bookings_cancelamento_exige_motivo' then
    execute format('alter table public.bookings rename constraint %I to bookings_cancelamento_exige_motivo', v_name);
  end if;
end $$;
