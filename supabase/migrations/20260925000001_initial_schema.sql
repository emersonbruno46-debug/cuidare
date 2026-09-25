-- ─────────────────────────────────────────────
-- CUIDARE — Supabase Migration 001: Initial Schema
-- Version: 20260925000001
-- ─────────────────────────────────────────────

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Enum types
CREATE TYPE user_role AS ENUM ('admin', 'collaborator');
CREATE TYPE service_category AS ENUM (
  'escovas', 'tratamentos', 'quimicas', 'unhas',
  'sobrancelhas', 'cilios', 'maquiagem', 'penteados', 'estetica'
);
CREATE TYPE provider_type AS ENUM ('internal', 'external_room_provider');
CREATE TYPE booking_status AS ENUM ('pendente', 'confirmado', 'concluido', 'faltou', 'cancelado');
CREATE TYPE booking_origin AS ENUM ('site', 'manual_admin', 'manual_colaboradora', 'whatsapp', 'presencial');
CREATE TYPE block_type AS ENUM ('folga', 'ferias', 'bloqueio', 'intervalo', 'extraordinario');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'cancelled');

-- 1. PROFESSIONALS
CREATE TABLE professionals (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  role VARCHAR(150) NOT NULL,
  categories service_category[] NOT NULL DEFAULT '{}',
  photo_url TEXT,
  bio TEXT DEFAULT '',
  specialties TEXT[] DEFAULT '{}',
  specialty_highlight VARCHAR(100),
  specialty_badge VARCHAR(60),
  provider_type provider_type NOT NULL DEFAULT 'internal',
  whatsapp VARCHAR(20),
  instagram VARCHAR(100),
  commission_rate NUMERIC(4,3) NOT NULL DEFAULT 0.500 CHECK (commission_rate >= 0 AND commission_rate <= 1),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- 2. SERVICES
CREATE TABLE services (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  category service_category NOT NULL,
  price_base NUMERIC(10,2) NOT NULL CHECK (price_base >= 0),
  price_type VARCHAR(20) DEFAULT 'fixed',
  price_min NUMERIC(10,2),
  price_max NUMERIC(10,2),
  price_p NUMERIC(10,2),
  price_m NUMERIC(10,2),
  price_g NUMERIC(10,2),
  duration INT NOT NULL CHECK (duration > 0),
  description TEXT DEFAULT '',
  recommendations TEXT[] DEFAULT '{}',
  variable_price BOOLEAN NOT NULL DEFAULT false,
  professional_ids VARCHAR(64)[] DEFAULT '{}',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CLIENTS
CREATE TABLE clients (
  id VARCHAR(64) PRIMARY KEY DEFAULT 'cli_' || uuid_generate_v4()::text,
  phone VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(120),
  birth_date DATE,
  notes TEXT,
  first_visit DATE,
  last_visit DATE,
  total_visits INT NOT NULL DEFAULT 0 CHECK (total_visits >= 0),
  total_spent NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_spent >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- 4. BOOKINGS
CREATE TABLE bookings (
  id VARCHAR(64) PRIMARY KEY DEFAULT 'bk_' || uuid_generate_v4()::text,
  service_id VARCHAR(64) NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  service_name VARCHAR(120) NOT NULL,
  professional_id VARCHAR(64) NOT NULL REFERENCES professionals(id) ON DELETE RESTRICT,
  professional_name VARCHAR(120) NOT NULL,
  date DATE NOT NULL,
  time VARCHAR(5) NOT NULL, -- HH:MM
  end_time VARCHAR(5) NOT NULL, -- HH:MM
  duration INT NOT NULL CHECK (duration > 0),
  client_id VARCHAR(64) REFERENCES clients(id) ON DELETE SET NULL,
  client_name VARCHAR(120) NOT NULL,
  client_phone VARCHAR(20) NOT NULL,
  client_email VARCHAR(120),
  notes TEXT,
  status booking_status NOT NULL DEFAULT 'pendente',
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  commission_rate NUMERIC(4,3) CHECK (commission_rate >= 0 AND commission_rate <= 1),
  commission_amount NUMERIC(10,2) CHECK (commission_amount >= 0),
  origin booking_origin NOT NULL DEFAULT 'site',
  created_by UUID,
  created_by_name VARCHAR(120),
  updated_by UUID,
  updated_by_name VARCHAR(120),
  reschedule_history JSONB DEFAULT '[]'::jsonb,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX idx_bookings_pro_date ON bookings(professional_id, date, status);
CREATE INDEX idx_bookings_client_phone ON bookings(client_phone);

-- 5. CLIENT HISTORY
CREATE TABLE client_history (
  id VARCHAR(64) PRIMARY KEY DEFAULT 'hist_' || uuid_generate_v4()::text,
  client_id VARCHAR(64) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  booking_id VARCHAR(64) REFERENCES bookings(id) ON DELETE SET NULL,
  service_name VARCHAR(120) NOT NULL,
  professional_id VARCHAR(64) NOT NULL REFERENCES professionals(id),
  professional_name VARCHAR(120) NOT NULL,
  date DATE NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  commission_rate NUMERIC(4,3),
  commission_amount NUMERIC(10,2),
  status booking_status NOT NULL,
  notes TEXT,
  origin booking_origin NOT NULL DEFAULT 'site',
  added_manually BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_by_name VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. AVAILABILITY RULES
CREATE TABLE availability_rules (
  id VARCHAR(64) PRIMARY KEY DEFAULT 'avail_' || uuid_generate_v4()::text,
  professional_id VARCHAR(64) NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time VARCHAR(5) NOT NULL,
  end_time VARCHAR(5) NOT NULL,
  break_start VARCHAR(5),
  break_end VARCHAR(5),
  slot_duration INT NOT NULL DEFAULT 30,
  active BOOLEAN NOT NULL DEFAULT true
);

-- 7. SCHEDULE BLOCKS
CREATE TABLE schedule_blocks (
  id VARCHAR(64) PRIMARY KEY DEFAULT 'blk_' || uuid_generate_v4()::text,
  professional_id VARCHAR(64) NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  date DATE,
  start_time VARCHAR(5),
  end_time VARCHAR(5),
  all_day BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  type block_type NOT NULL DEFAULT 'bloqueio',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. BUSINESS SETTINGS
CREATE TABLE business_settings (
  id VARCHAR(64) PRIMARY KEY DEFAULT 'bs_1',
  salon_name VARCHAR(120) NOT NULL DEFAULT 'Cuidare Espaço de Beleza',
  address VARCHAR(200) NOT NULL DEFAULT 'Rua Paracatu, 15, Centro',
  city VARCHAR(100) NOT NULL DEFAULT 'Taiobeiras',
  state VARCHAR(2) NOT NULL DEFAULT 'MG',
  instagram_url TEXT,
  business_whatsapp VARCHAR(20) DEFAULT '5538991007706',
  business_whatsapp_message TEXT,
  opening_hours JSONB NOT NULL,
  commission_default_rate NUMERIC(4,3) NOT NULL DEFAULT 0.500,
  min_lead_time_minutes INT NOT NULL DEFAULT 30,
  max_advance_days INT NOT NULL DEFAULT 30,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. AUDIT LOGS
CREATE TABLE audit_logs (
  id VARCHAR(64) PRIMARY KEY DEFAULT 'audit_' || uuid_generate_v4()::text,
  user_id VARCHAR(64),
  user_name VARCHAR(120),
  user_role user_role NOT NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  previous_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. NOTIFICATION QUEUE
CREATE TABLE notification_queue (
  id VARCHAR(64) PRIMARY KEY DEFAULT 'job_' || uuid_generate_v4()::text,
  booking_id VARCHAR(64) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  recipient_phone VARCHAR(20) NOT NULL,
  recipient_name VARCHAR(120) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(40) NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status notification_status NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
