-- ─────────────────────────────────────────────
-- CUIDARE — Supabase Migration 003: Row Level Security (RLS) Policies
-- Version: 20260925000003
-- ─────────────────────────────────────────────

-- 1. Enable RLS on all tables
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- 2. PUBLIC / ANON ACCESS POLICIES (Privacy First)
-- Anyone can view active professionals, active services, and public business settings
CREATE POLICY "Public read active professionals" ON professionals
  FOR SELECT USING (active = true);

CREATE POLICY "Public read services" ON services
  FOR SELECT USING (true);

CREATE POLICY "Public read business settings" ON business_settings
  FOR SELECT USING (true);

-- IMPORTANT: Public (anon) CANNOT select from bookings, clients, client_history, or audit_logs!
-- This protects customer names, phones, notes, and financial data from scraping/exposure.

-- 3. COLLABORATOR ROLE POLICIES
-- Collaborator can read/update bookings for their own professional_id
CREATE POLICY "Collaborator read own bookings" ON bookings
  FOR SELECT USING (
    (auth.jwt() ->> 'role' = 'collaborator' AND professional_id = (auth.jwt() ->> 'professional_id'))
    OR (auth.jwt() ->> 'role' = 'admin')
  );

CREATE POLICY "Collaborator update own bookings" ON bookings
  FOR UPDATE USING (
    (auth.jwt() ->> 'role' = 'collaborator' AND professional_id = (auth.jwt() ->> 'professional_id'))
    OR (auth.jwt() ->> 'role' = 'admin')
  );

CREATE POLICY "Collaborator read clients" ON clients
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('collaborator', 'admin')
  );

-- 4. ADMIN ROLE POLICIES
-- Admin has full CRUD access to all tables
CREATE POLICY "Admin full access professionals" ON professionals
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access services" ON services
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access clients" ON clients
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access bookings" ON bookings
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access client_history" ON client_history
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access availability_rules" ON availability_rules
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access schedule_blocks" ON schedule_blocks
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access business_settings" ON business_settings
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access audit_logs" ON audit_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access notification_queue" ON notification_queue
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Grant execute on stored RPC to anon & authenticated
GRANT EXECUTE ON FUNCTION create_booking_atomic TO anon, authenticated;
