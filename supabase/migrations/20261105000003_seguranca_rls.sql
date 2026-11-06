-- ─────────────────────────────────────────────
-- CUIDARE — Migração 003: Permissões (Row Level Security)
--
-- Resumo:
--   Visitante do site → vê serviços, profissionais e horário do salão;
--                       agenda só pelas funções get_available_slots e create_public_booking.
--                       Nunca lê agendamentos, clientes ou valores.
--   Colaboradora      → vê e gerencia a PRÓPRIA agenda, folgas e clientes que atendeu.
--   Administradora    → acesso completo.
-- O papel vem da tabela staff_members (não do token), então desativar alguém vale na hora.
-- ─────────────────────────────────────────────

-- ── Acesso às funções auxiliares usadas nas regras
grant usage on schema private to anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function
  private.is_admin(),
  private.is_staff(),
  private.my_professional_id(),
  private.current_staff(),
  private.normalize_phone(text),
  private.now_sp()
to anon, authenticated;

-- ── Funções públicas do site
revoke all on function public.get_available_slots(text, date, text) from public;
revoke all on function public.create_public_booking(text, date, time, text, text, text, text, text) from public;
grant execute on function public.get_available_slots(text, date, text) to anon, authenticated;
grant execute on function public.create_public_booking(text, date, time, text, text, text, text, text) to anon, authenticated;

-- ── Liga a proteção em todas as tabelas
alter table public.service_categories enable row level security;
alter table public.professionals      enable row level security;
alter table public.services           enable row level security;
alter table public.staff_members      enable row level security;
alter table public.clients            enable row level security;
alter table public.bookings           enable row level security;
alter table public.client_history     enable row level security;
alter table public.business_hours     enable row level security;
alter table public.availability_rules enable row level security;
alter table public.schedule_blocks    enable row level security;
alter table public.business_settings  enable row level security;
alter table public.audit_logs         enable row level security;
alter table public.notification_queue enable row level security;

-- ═════════════════════════════════════════════
-- CATÁLOGO PÚBLICO
-- ═════════════════════════════════════════════
create policy "Público vê categorias ativas" on public.service_categories
  for select to anon, authenticated using (active or (select private.is_staff()));
create policy "Admin gerencia categorias" on public.service_categories
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Público vê profissionais ativas" on public.professionals
  for select to anon, authenticated using (active or (select private.is_staff()));
create policy "Admin gerencia profissionais" on public.professionals
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Público vê serviços ativos" on public.services
  for select to anon, authenticated using (active or (select private.is_staff()));
create policy "Admin gerencia serviços" on public.services
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Público vê horário do salão" on public.business_hours
  for select to anon, authenticated using (true);
create policy "Admin gerencia horário do salão" on public.business_hours
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Público vê configurações" on public.business_settings
  for select to anon, authenticated using (true);
create policy "Admin altera configurações" on public.business_settings
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- ═════════════════════════════════════════════
-- EQUIPE
-- ═════════════════════════════════════════════
create policy "Cada pessoa vê o próprio cadastro" on public.staff_members
  for select to authenticated using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy "Admin gerencia equipe" on public.staff_members
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- ═════════════════════════════════════════════
-- AGENDAMENTOS
-- ═════════════════════════════════════════════
create policy "Admin acesso total aos agendamentos" on public.bookings
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Colaboradora vê a própria agenda" on public.bookings
  for select to authenticated using (professional_id = (select private.my_professional_id()));
create policy "Colaboradora cria na própria agenda" on public.bookings
  for insert to authenticated with check (professional_id = (select private.my_professional_id()));
create policy "Colaboradora altera a própria agenda" on public.bookings
  for update to authenticated
  using (professional_id = (select private.my_professional_id()))
  with check (professional_id = (select private.my_professional_id()));
-- Sem regra de DELETE para colaboradora: agendamento é cancelado com motivo, não apagado.

-- ═════════════════════════════════════════════
-- CLIENTES E HISTÓRICO (dados pessoais — LGPD)
-- ═════════════════════════════════════════════
create policy "Admin acesso total às clientes" on public.clients
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Colaboradora vê clientes que atendeu" on public.clients
  for select to authenticated using (
    exists (
      select 1 from public.bookings b
      where b.client_id = clients.id and b.professional_id = (select private.my_professional_id())
    )
  );
create policy "Colaboradora atualiza clientes que atendeu" on public.clients
  for update to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.client_id = clients.id and b.professional_id = (select private.my_professional_id())
    )
  )
  with check (true);

create policy "Admin acesso total ao histórico" on public.client_history
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Colaboradora vê o próprio histórico" on public.client_history
  for select to authenticated using (professional_id = (select private.my_professional_id()));
create policy "Colaboradora lança histórico manual" on public.client_history
  for insert to authenticated
  with check (professional_id = (select private.my_professional_id()) and added_manually);

-- ═════════════════════════════════════════════
-- HORÁRIOS PRÓPRIOS E BLOQUEIOS
-- ═════════════════════════════════════════════
create policy "Admin gerencia horários próprios" on public.availability_rules
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Colaboradora gerencia os próprios horários" on public.availability_rules
  for all to authenticated
  using (professional_id = (select private.my_professional_id()))
  with check (professional_id = (select private.my_professional_id()));

create policy "Admin gerencia bloqueios" on public.schedule_blocks
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Colaboradora gerencia os próprios bloqueios" on public.schedule_blocks
  for all to authenticated
  using (professional_id = (select private.my_professional_id()))
  with check (professional_id = (select private.my_professional_id()));

-- ═════════════════════════════════════════════
-- REGISTRO DE ALTERAÇÕES E FILA DE MENSAGENS
-- Gravados só pelo próprio banco; ninguém edita nem apaga pelo site.
-- ═════════════════════════════════════════════
create policy "Admin lê o registro de alterações" on public.audit_logs
  for select to authenticated using ((select private.is_admin()));

create policy "Admin vê a fila de mensagens" on public.notification_queue
  for select to authenticated using ((select private.is_admin()));
-- O envio das mensagens será feito por uma Edge Function com a chave service_role,
-- que não passa por estas regras.

-- Dados do registro de alterações não podem ser modificados por quem usa a API
revoke insert, update, delete, truncate on public.audit_logs from anon, authenticated;
revoke insert, update, delete, truncate on public.notification_queue from anon, authenticated;
