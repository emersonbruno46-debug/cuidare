-- ─────────────────────────────────────────────
-- CUIDARE — Supabase Migration 002: Concurrency & Atomic Functions
-- Version: 20260925000002
-- ─────────────────────────────────────────────

-- Helper function: Convert HH:MM to integer minutes
CREATE OR REPLACE FUNCTION time_to_minutes(p_time VARCHAR(5))
RETURNS INT AS $$
DECLARE
  h INT;
  m INT;
BEGIN
  IF p_time IS NULL OR p_time = '' THEN RETURN 0; END IF;
  h := SPLIT_PART(p_time, ':', 1)::INT;
  m := SPLIT_PART(p_time, ':', 2)::INT;
  RETURN h * 60 + m;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function: Convert integer minutes to HH:MM
CREATE OR REPLACE FUNCTION minutes_to_time(p_minutes INT)
RETURNS VARCHAR(5) AS $$
DECLARE
  h INT;
  m INT;
BEGIN
  h := p_minutes / 60;
  m := p_minutes % 60;
  RETURN LPAD(h::text, 2, '0') || ':' || LPAD(m::text, 2, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- RPC: Atomic booking creation with FOR UPDATE lock on professional's schedule for that date
CREATE OR REPLACE FUNCTION create_booking_atomic(
  p_service_id VARCHAR(64),
  p_professional_id VARCHAR(64),
  p_date DATE,
  p_time VARCHAR(5),
  p_duration INT,
  p_client_name VARCHAR(120),
  p_client_phone VARCHAR(20),
  p_client_email VARCHAR(120) DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_origin booking_origin DEFAULT 'site'
)
RETURNS JSONB AS $$
DECLARE
  v_new_start INT;
  v_new_end INT;
  v_end_time VARCHAR(5);
  v_service_name VARCHAR(120);
  v_service_price NUMERIC(10,2);
  v_pro_name VARCHAR(120);
  v_pro_rate NUMERIC(4,3);
  v_conflict_count INT;
  v_conflict_client VARCHAR(120);
  v_conflict_time VARCHAR(5);
  v_client_id VARCHAR(64);
  v_booking_id VARCHAR(64);
  v_result JSONB;
BEGIN
  -- 1. Validate inputs
  IF p_client_name IS NULL OR CHAR_LENGTH(TRIM(p_client_name)) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nome do cliente é obrigatório (mínimo 2 caracteres).');
  END IF;

  IF p_client_phone IS NULL OR CHAR_LENGTH(REGEXP_REPLACE(p_client_phone, '\D', '', 'g')) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Telefone do cliente é obrigatório e inválido.');
  END IF;

  v_new_start := time_to_minutes(p_time);
  v_new_end := v_new_start + p_duration;
  v_end_time := minutes_to_time(v_new_end);

  -- 2. Fetch service & professional info
  SELECT name, price_base INTO v_service_name, v_service_price FROM services WHERE id = p_service_id;
  IF v_service_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Serviço não encontrado.');
  END IF;

  SELECT name, commission_rate INTO v_pro_name, v_pro_rate FROM professionals WHERE id = p_professional_id AND active = true;
  IF v_pro_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profissional não encontrada ou inativa.');
  END IF;

  -- 3. Lock active bookings for this professional on this date to prevent concurrent double-booking
  PERFORM id FROM bookings
  WHERE professional_id = p_professional_id AND date = p_date AND status != 'cancelado'
  FOR UPDATE;

  -- 4. Check conflict
  SELECT COUNT(*), MAX(client_name), MAX(time) INTO v_conflict_count, v_conflict_client, v_conflict_time
  FROM bookings
  WHERE professional_id = p_professional_id
    AND date = p_date
    AND status != 'cancelado'
    AND (v_new_start < time_to_minutes(end_time) AND v_new_end > time_to_minutes(time));

  IF v_conflict_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Conflito de horário! Já existe um agendamento para ' || v_conflict_client || ' às ' || v_conflict_time || 'h.'
    );
  END IF;

  -- 5. Upsert client
  SELECT id INTO v_client_id FROM clients WHERE REGEXP_REPLACE(phone, '\D', '', 'g') = REGEXP_REPLACE(p_client_phone, '\D', '', 'g');
  IF v_client_id IS NULL THEN
    v_client_id := 'cli_' || uuid_generate_v4()::text;
    INSERT INTO clients (id, phone, name, email, first_visit, total_visits, total_spent)
    VALUES (v_client_id, p_client_phone, p_client_name, p_client_email, p_date, 1, 0.00);
  ELSE
    UPDATE clients
    SET name = p_client_name,
        email = COALESCE(p_client_email, email),
        total_visits = total_visits + 1,
        updated_at = NOW()
    WHERE id = v_client_id;
  END IF;

  -- 6. Insert booking
  v_booking_id := 'bk_' || uuid_generate_v4()::text;
  INSERT INTO bookings (
    id, service_id, service_name, professional_id, professional_name,
    date, time, end_time, duration, client_id, client_name, client_phone,
    client_email, notes, status, price, commission_rate, commission_amount, origin
  ) VALUES (
    v_booking_id, p_service_id, v_service_name, p_professional_id, v_pro_name,
    p_date, p_time, v_end_time, p_duration, v_client_id, p_client_name, p_client_phone,
    p_client_email, p_notes, 'pendente', v_service_price, v_pro_rate, (v_service_price * v_pro_rate), p_origin
  );

  -- 7. Enqueue notification job
  INSERT INTO notification_queue (booking_id, recipient_phone, recipient_name, message, type)
  VALUES (
    v_booking_id, p_client_phone, p_client_name,
    'Olá ' || p_client_name || ', sua solicitação para ' || v_service_name || ' em ' || p_date::text || ' às ' || p_time || 'h foi recebida.',
    'booking_created'
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking', jsonb_build_object(
      'id', v_booking_id,
      'serviceId', p_service_id,
      'serviceName', v_service_name,
      'professionalId', p_professional_id,
      'professionalName', v_pro_name,
      'date', p_date,
      'time', p_time,
      'endTime', v_end_time,
      'duration', p_duration,
      'clientName', p_client_name,
      'clientPhone', p_client_phone,
      'status', 'pendente',
      'price', v_service_price
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
