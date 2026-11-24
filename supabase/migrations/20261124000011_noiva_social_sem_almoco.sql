-- Nome do pacote social de noiva e agenda sem pausa de almoço
-- (as profissionais fazem rodízio no almoço).
update public.services set name = 'Noiva Social (Experiência 01)' where id = 'producao-noiva';
update public.business_hours set break_start = null, break_end = null where day_of_week between 2 and 6;
