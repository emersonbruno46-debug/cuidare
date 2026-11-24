-- Segunda-feira aberta para agendamentos (08:00, último início 19:30, sem pausa).
update public.business_hours
set closed = false, open_time = '08:00', close_time = '19:30', break_start = null, break_end = null
where day_of_week = 1;
