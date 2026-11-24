-- ═════════════════════════════════════════════
-- Preços novos (noivas, progressiva, sobrancelhas) e
-- "último horário de início" no lugar de "fechamento".
--
-- A partir daqui, business_hours.close_time = último horário em que
-- um atendimento pode COMEÇAR. O serviço pode terminar depois disso.
-- ═════════════════════════════════════════════

-- 1. Preços
update public.services set price_base = 500  where id = 'producao-noiva';
update public.services set price_base = 600  where id = 'noiva-civil';
update public.services set price_base = 2800 where id = 'dia-noiva-cuidare';
update public.services set price_base = 180, price_min = null, price_max = null where id = 'progressiva-com-formol';
update public.services set price_base = 30 where id = 'design-sobrancelha';
update public.services set price_base = 40 where id = 'design-henna';

-- 2. Progressiva sem formol sai do site (desativada, não apagada:
--    agendamentos antigos continuam apontando para ela)
update public.services set active = false where id = 'progressiva-sem-formol';

-- 3. Agenda aceita início até 19:30, de terça a sábado
update public.business_hours set close_time = '19:30' where day_of_week between 2 and 6 and not closed;

-- 4. Regra do expediente: o início precisa estar até o último horário
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

  -- 1. Expediente do salão (close_time = último horário de início)
  select * into v_hours from public.business_hours where day_of_week = v_dow;
  if not found or v_hours.closed then
    return 'O salão não abre neste dia.';
  end if;
  if p_start < v_hours.open_time or p_start > v_hours.close_time then
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

-- 5. Lista de horários livres: vai até o último horário de início
create or replace function private.available_slots(
  p_service_id      text,
  p_date            date,
  p_professional_id text default null,
  p_exclude_booking uuid default null
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
  while v_t <= v_hours.close_time loop
    -- Hoje: respeita a antecedência mínima
    if p_date + v_t > v_now + coalesce(v_settings.min_lead_time_minutes, 30) * interval '1 minute' then
      select coalesce(array_agg(p.id order by p.sort_order, p.name), '{}')
        into v_free
      from public.professionals p
      where p.active
        and (p_professional_id is null or p.id = p_professional_id)
        and private.professional_can_do_service(p.id, v_service.id)
        and private.slot_unavailable_reason(p.id, p_date, v_t, v_service.duration, p_exclude_booking) is null;

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
