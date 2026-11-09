-- ─────────────────────────────────────────────
-- CUIDARE — Migração 005: Índices sugeridos pela verificação de desempenho do Supabase
-- (deixam as buscas por serviço, profissional e equipe mais rápidas)
-- ─────────────────────────────────────────────

create index if not exists bookings_service_idx            on public.bookings (service_id);
create index if not exists client_history_professional_idx on public.client_history (professional_id);
create index if not exists staff_members_professional_idx  on public.staff_members (professional_id);
