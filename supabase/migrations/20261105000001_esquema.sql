-- ─────────────────────────────────────────────
-- CUIDARE — Migração 001: Estrutura das tabelas
-- Substitui as migrações de 25/09/2026 (que nunca foram aplicadas).
-- ─────────────────────────────────────────────

create extension if not exists btree_gist with schema extensions;

-- Schema interno: funções auxiliares que NÃO ficam expostas na API do Supabase.
create schema if not exists private;

-- ── 1. CATEGORIAS DE SERVIÇO
create table public.service_categories (
  id          text primary key check (id ~ '^[a-z0-9_-]+$'),
  name        text not null,
  short_name  text not null,
  description text not null default '',
  sort_order  int  not null default 0,
  active      boolean not null default true
);

-- ── 2. PROFISSIONAIS
create table public.professionals (
  id                  text primary key check (id ~ '^[a-z0-9_-]+$'),
  name                text not null check (char_length(name) between 2 and 120),
  role                text not null default '',
  categories          text[] not null default '{}',
  photo_url           text,
  avatar_url          text,
  bio                 text not null default '',
  specialties         text[] not null default '{}',
  specialty_highlight text,
  specialty_badge     text,
  provider_type       text not null default 'internal'
                      check (provider_type in ('internal', 'external_room_provider')),
  whatsapp            text check (whatsapp is null or whatsapp ~ '^[0-9]{10,13}$'),
  instagram           text,
  commission_rate     numeric(4,3) not null default 0.500 check (commission_rate between 0 and 1),
  sort_order          int not null default 0,
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── 3. SERVIÇOS
create table public.services (
  id               text primary key check (id ~ '^[a-z0-9_-]+$'),
  name             text not null,
  category         text not null references public.service_categories(id) on update cascade,
  price_base       numeric(10,2) not null check (price_base >= 0),
  price_type       text not null default 'fixed' check (price_type in ('fixed', 'range', 'details')),
  price_min        numeric(10,2) check (price_min >= 0),
  price_max        numeric(10,2) check (price_max >= 0),
  price_p          numeric(10,2) check (price_p >= 0),
  price_m          numeric(10,2) check (price_m >= 0),
  price_g          numeric(10,2) check (price_g >= 0),
  duration         int not null check (duration between 5 and 720),
  description      text not null default '',
  recommendations  text[] not null default '{}',
  variable_price   boolean not null default false,
  professional_ids text[] not null default '{}',
  note             text,
  flow_type        text not null default 'agendamento_direto'
                   check (flow_type in ('agendamento_direto', 'curso_turmas', 'avaliacao_previa', 'consulta_recepcao')),
  flow_badge       text,
  sort_order       int not null default 0,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (price_min is null or price_max is null or price_min <= price_max)
);
create index services_category_idx on public.services (category);

-- ── 4. EQUIPE COM ACESSO AO PAINEL
-- Liga um usuário do Supabase Auth a um papel (admin / colaboradora).
-- Desativar aqui bloqueia o acesso na hora, sem esperar o login expirar.
create table public.staff_members (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  name            text not null,
  email           text not null,
  role            text not null check (role in ('admin', 'collaborator')),
  professional_id text references public.professionals(id) on update cascade on delete set null,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (role = 'admin' or professional_id is not null)
);

-- ── 5. CLIENTES
-- O telefone (só números, com 55) identifica a cliente.
-- Totais de visitas e gastos são calculados pela view clients_overview, nunca guardados à mão.
create table public.clients (
  id         uuid primary key default gen_random_uuid(),
  phone      text not null unique check (phone ~ '^[0-9]{8,13}$'),
  name       text not null check (char_length(name) between 2 and 120),
  email      text check (email is null or char_length(email) <= 160),
  birth_date date,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 6. AGENDAMENTOS
create table public.bookings (
  id                 uuid primary key default gen_random_uuid(),
  service_id         text not null references public.services(id) on update cascade on delete restrict,
  service_name       text not null,
  professional_id    text not null references public.professionals(id) on update cascade on delete restrict,
  professional_name  text not null,
  client_id          uuid references public.clients(id) on delete set null,
  client_name        text not null check (char_length(client_name) between 2 and 120),
  client_phone       text not null check (client_phone ~ '^[0-9]{8,13}$'),
  client_email       text check (client_email is null or char_length(client_email) <= 160),
  date               date not null,
  start_time         time(0) not null,
  duration           int not null check (duration between 5 and 720),
  -- Calculados pelo banco: fim do atendimento e intervalo ocupado na agenda
  end_time           time(0) generated always as (start_time + duration * interval '1 minute') stored,
  periodo            tsrange generated always as (
                       tsrange(date + start_time, date + start_time + duration * interval '1 minute', '[)')
                     ) stored,
  notes              text check (notes is null or char_length(notes) <= 1000),
  status             text not null default 'pendente'
                     check (status in ('pendente', 'confirmado', 'concluido', 'faltou', 'cancelado')),
  price              numeric(10,2) not null check (price >= 0),
  commission_rate    numeric(4,3) check (commission_rate between 0 and 1),
  commission_amount  numeric(10,2) check (commission_amount >= 0),
  payment_status     text not null default 'pendente' check (payment_status in ('pendente', 'pago', 'parcial')),
  payment_method     text,
  origin             text not null default 'site'
                     check (origin in ('site', 'manual_admin', 'manual_colaboradora', 'whatsapp', 'presencial')),
  created_by         uuid,
  created_by_name    text,
  updated_by         uuid,
  updated_by_name    text,
  reschedule_history jsonb not null default '[]'::jsonb check (jsonb_typeof(reschedule_history) = 'array'),
  cancel_reason      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- O atendimento termina no mesmo dia
  check (extract(epoch from start_time) / 60 + duration <= 1440),
  -- Cancelamento exige motivo
  check (status <> 'cancelado' or char_length(coalesce(trim(cancel_reason), '')) > 0),
  -- Trava definitiva contra dois agendamentos sobrepostos para a mesma profissional
  constraint bookings_sem_sobreposicao
    exclude using gist (professional_id with =, periodo with &&)
    where (status <> 'cancelado')
);
create index bookings_date_idx         on public.bookings (date);
create index bookings_pro_date_idx     on public.bookings (professional_id, date);
create index bookings_client_idx       on public.bookings (client_id);
create index bookings_client_phone_idx on public.bookings (client_phone);

-- ── 7. HISTÓRICO DA CLIENTE
-- Atendimentos concluídos entram aqui automaticamente; registros antigos podem ser lançados à mão.
create table public.client_history (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients(id) on delete cascade,
  booking_id        uuid unique references public.bookings(id) on delete set null,
  service_name      text not null,
  professional_id   text references public.professionals(id) on update cascade on delete set null,
  professional_name text not null,
  date              date not null,
  price             numeric(10,2) not null check (price >= 0),
  commission_rate   numeric(4,3) check (commission_rate between 0 and 1),
  commission_amount numeric(10,2) check (commission_amount >= 0),
  status            text not null check (status in ('pendente', 'confirmado', 'concluido', 'faltou', 'cancelado')),
  notes             text,
  origin            text not null default 'site'
                    check (origin in ('site', 'manual_admin', 'manual_colaboradora', 'whatsapp', 'presencial')),
  added_manually    boolean not null default false,
  created_by        uuid,
  created_by_name   text,
  created_at        timestamptz not null default now()
);
create index client_history_client_idx on public.client_history (client_id, date desc);

-- ── 8. HORÁRIO DO SALÃO (um registro por dia da semana; 0 = domingo)
create table public.business_hours (
  day_of_week int primary key check (day_of_week between 0 and 6),
  closed      boolean not null default false,
  open_time   time(0),
  close_time  time(0),
  break_start time(0),
  break_end   time(0),
  check (closed or (open_time is not null and close_time > open_time)),
  check ((break_start is null) = (break_end is null)),
  check (break_start is null or break_end > break_start)
);

-- ── 9. HORÁRIO PRÓPRIO DE CADA PROFISSIONAL (opcional; sem regra = segue o salão)
create table public.availability_rules (
  id              uuid primary key default gen_random_uuid(),
  professional_id text not null references public.professionals(id) on update cascade on delete cascade,
  day_of_week     int not null check (day_of_week between 0 and 6),
  start_time      time(0) not null,
  end_time        time(0) not null,
  break_start     time(0),
  break_end       time(0),
  slot_duration   int not null default 30 check (slot_duration between 5 and 240),
  active          boolean not null default true,
  check (end_time > start_time),
  check ((break_start is null) = (break_end is null)),
  check (break_start is null or break_end > break_start)
);
create index availability_rules_pro_idx on public.availability_rules (professional_id, day_of_week);

-- ── 10. FOLGAS, FÉRIAS E BLOQUEIOS (sem data = repete todos os dias)
create table public.schedule_blocks (
  id              uuid primary key default gen_random_uuid(),
  professional_id text not null references public.professionals(id) on update cascade on delete cascade,
  date            date,
  start_time      time(0),
  end_time        time(0),
  all_day         boolean not null default false,
  reason          text,
  type            text not null default 'bloqueio'
                  check (type in ('folga', 'ferias', 'bloqueio', 'intervalo', 'extraordinario')),
  created_by      uuid,
  created_at      timestamptz not null default now(),
  check (all_day or (start_time is not null and end_time > start_time))
);
create index schedule_blocks_pro_date_idx on public.schedule_blocks (professional_id, date);

-- ── 11. CONFIGURAÇÕES GERAIS (sempre uma única linha, id = 1)
create table public.business_settings (
  id                        int primary key default 1 check (id = 1),
  salon_name                text not null default 'Cuidare Espaço de Beleza',
  address                   text not null default 'Rua Paracatu, 15, Centro',
  city                      text not null default 'Taiobeiras',
  state                     text not null default 'MG',
  instagram_url             text,
  business_whatsapp         text default '5538991007706',
  business_whatsapp_message text default 'Olá! Gostaria de solicitar informações sobre agendamento.',
  commission_default_rate   numeric(4,3) not null default 0.500 check (commission_default_rate between 0 and 1),
  min_lead_time_minutes     int not null default 30 check (min_lead_time_minutes between 0 and 1440),
  max_advance_days          int not null default 30 check (max_advance_days between 1 and 365),
  slot_step_minutes         int not null default 30 check (slot_step_minutes between 5 and 120),
  updated_at                timestamptz not null default now()
);

-- ── 12. REGISTRO DE ALTERAÇÕES (somente leitura para a administração)
create table public.audit_logs (
  id              bigint generated always as identity primary key,
  user_id         uuid,
  user_name       text,
  user_role       text,
  action          text not null,
  entity_type     text not null,
  entity_id       text,
  previous_values jsonb,
  new_values      jsonb,
  created_at      timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx  on public.audit_logs (entity_type, entity_id);

-- ── 13. FILA DE MENSAGENS DE WHATSAPP
-- O agendamento é salvo mesmo se o envio falhar; um serviço separado lê esta fila e envia.
create table public.notification_queue (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references public.bookings(id) on delete cascade,
  recipient_phone text not null,
  recipient_name  text not null,
  message         text not null,
  type            text not null
                  check (type in ('booking_created', 'booking_rescheduled', 'booking_cancelled', 'reminder_24h')),
  scheduled_for   timestamptz not null default now(),
  status          text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'cancelled')),
  attempts        int not null default 0,
  last_attempt_at timestamptz,
  error_message   text,
  created_at      timestamptz not null default now()
);
create index notification_queue_pending_idx on public.notification_queue (scheduled_for) where status = 'pending';
create index notification_queue_booking_idx on public.notification_queue (booking_id);

-- ── 14. VISÃO DAS CLIENTES COM TOTAIS CALCULADOS
-- security_invoker: a view respeita as mesmas regras de acesso das tabelas.
create view public.clients_overview with (security_invoker = true) as
select
  c.*,
  coalesce(s.total_visits, 0)  as total_visits,
  coalesce(s.total_spent, 0)   as total_spent,
  s.first_visit,
  s.last_visit
from public.clients c
left join lateral (
  select
    count(*) filter (where b.status = 'concluido')               as total_visits,
    sum(b.price) filter (where b.status = 'concluido')           as total_spent,
    min(b.date) filter (where b.status <> 'cancelado')           as first_visit,
    max(b.date) filter (where b.status = 'concluido')            as last_visit
  from public.bookings b
  where b.client_id = c.id
) s on true;
