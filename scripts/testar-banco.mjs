// Testa as migrações do Cuidare num Postgres em memória (PGlite), imitando o Supabase.
// Uso: npm run test:db
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIG = process.argv[2];
const db = new PGlite({ extensions: { btree_gist } });

let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗', name, extra); }
};
const q = async (sql, params) => (await db.query(sql, params)).rows;
const expectError = async (sql, params, name, match) => {
  try { await db.query(sql, params); ok(false, name, '(não deu erro)'); }
  catch (e) { ok(!match || String(e.message).includes(match), name, e.message); }
};

// ── Ambiente parecido com o Supabase
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema extensions; create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
  grant usage on schema public, auth, extensions to anon, authenticated;
  grant execute on function auth.uid(), auth.jwt() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`);

for (const f of readdirSync(MIG).filter(f => f.endsWith('.sql')).sort()) {
  try { await db.exec(readFileSync(join(MIG, f), 'utf8')); console.log('aplicada:', f); }
  catch (e) { console.log('FALHOU', f, e.message); process.exit(1); }
}

// Reaplicar os dados iniciais não duplica
await db.exec(readFileSync(join(MIG, '20261105000004_dados_iniciais.sql'), 'utf8'));
ok((await q('select count(*)::int n from services'))[0].n === 47, 'dados iniciais podem rodar de novo sem duplicar');

// Contas: admin Lane, colaboradoras Railma e Maísa
const ADMIN = '00000000-0000-0000-0000-00000000000a';
const RAILMA = '00000000-0000-0000-0000-0000000000r1'.replace('r1', '01');
const MAISA = '00000000-0000-0000-0000-000000000002';
await db.exec(`
  insert into auth.users values ('${ADMIN}', 'lane@x'), ('${RAILMA}', 'railma@x'), ('${MAISA}', 'maisa@x');
  insert into staff_members (user_id, name, email, role, professional_id) values
    ('${ADMIN}', 'Lane Viana', 'lane@x', 'admin', null),
    ('${RAILMA}', 'Railma', 'railma@x', 'collaborator', 'railma'),
    ('${MAISA}', 'Maísa', 'maisa@x', 'collaborator', 'maisa');
`);

const as = async (role, uid = '') => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role ${role};`);
};

// Próxima terça e próximo domingo a partir de amanhã (fuso de São Paulo)
const [{ tue, sun, past }] = await q(`
  select (d + ((9 - extract(dow from d)::int) % 7 + 7) * interval '1 day')::date::text as tue,
         (d + ((7 - extract(dow from d)::int) % 7 + 7) * interval '1 day')::date::text as sun,
         (d - 3)::text as past
  from (select (now() at time zone 'America/Sao_Paulo')::date as d) x`);
console.log(`\nterça de teste: ${tue}, domingo: ${sun}`);

console.log('\n[Visitante do site]');
await as('anon');
const slots = await q(`select to_char(slot_time,'HH24:MI') t, professional_ids from get_available_slots('escova-simples', $1)`, [tue]);
const times = slots.map(s => s.t);
ok(times.includes('08:00'), 'horários livres começam às 08:00', times.join(' '));
ok(!times.includes('11:00') && !times.includes('12:00') && times.includes('14:00'), 'almoço 11:30–14:00 respeitado');
ok(!times.includes('17:30'), 'não oferece horário que termina depois das 18:00');
ok(slots[0].professional_ids.includes('railma') && slots[0].professional_ids.includes('maisa'), 'mostra quem está livre (Railma e Maísa fazem escova)');
ok((await q(`select * from get_available_slots('escova-simples', $1)`, [sun])).length === 0, 'domingo sem horários');
ok((await q(`select * from get_available_slots('escova-simples', $1)`, [past])).length === 0, 'data passada sem horários');

const book = async (args) => (await q(
  `select create_public_booking($1, $2, $3, $4, $5, $6, $7, $8) r`,
  [args.service ?? 'escova-simples', args.date ?? tue, args.time ?? '09:00', args.name ?? 'Ana Teste',
   args.phone ?? '(38) 99999-1111', args.pro ?? null, args.email ?? null, args.notes ?? null]))[0].r;

let r = await book({ pro: 'railma' });
ok(r.success && r.booking.professionalId === 'railma' && r.booking.endTime === '09:45', 'cliente agenda com a Railma às 09:00 (fim 09:45)', JSON.stringify(r));
const firstId = r.booking.id;
r = await book({ pro: 'railma' });
ok(r.success && r.booking.id === firstId, 'clique duplo devolve o mesmo agendamento');
r = await book({ pro: 'railma', name: 'Bia Outra', phone: '38988887777', time: '09:30' });
ok(!r.success && !String(r.error).includes('Ana'), 'horário sobreposto recusado sem revelar o nome da outra cliente', r.error);
r = await book({ name: 'Bia Outra', phone: '38988887777' });
ok(r.success && r.booking.professionalId === 'maisa', '"primeira disponível" escolhe a Maísa quando a Railma está ocupada');
r = await book({ name: 'Carla', phone: '38977776666' });
ok(!r.success, 'sem ninguém livre às 09:00, recusa');
r = await book({ time: '11:00', name: 'Dani', phone: '38966665555' });
ok(!r.success, 'recusa horário que invade o almoço');
r = await book({ date: sun, name: 'Dani', phone: '38966665555' });
ok(!r.success, 'recusa domingo');
r = await book({ date: past, name: 'Dani', phone: '38966665555' });
ok(!r.success, 'recusa data passada');
r = await book({ pro: 'evelyn', name: 'Dani', phone: '38966665555' });
ok(!r.success && r.error.includes('não realiza'), 'recusa profissional que não faz o serviço');
r = await book({ name: 'X', phone: '123' });
ok(!r.success, 'recusa nome/telefone inválidos');

ok((await q('select * from bookings')).length === 0, 'visitante NÃO lê agendamentos');
ok((await q('select * from clients')).length === 0, 'visitante NÃO lê clientes');
ok((await q('select * from audit_logs')).length === 0, 'visitante NÃO lê o registro de alterações');
ok((await q('select * from services')).length === 47, 'visitante vê os 47 serviços');
await expectError(`insert into bookings (service_id, service_name, professional_id, professional_name, client_name, client_phone, date, start_time, duration, price) values ('escova-simples','x','railma','x','Hacker','5538911112222','${tue}','15:00',45,0)`,
  [], 'visitante NÃO grava agendamento direto na tabela');
ok((await q(`update services set price_base = 1 returning id`).catch(() => [])).length === 0, 'visitante NÃO altera preços');
await expectError(`select private.slot_unavailable_reason('railma', '${tue}', '09:00', 30)`, [], 'visitante NÃO chama funções internas');

console.log('\n[Colaboradora Railma]');
await as('authenticated', RAILMA);
const mine = await q('select * from bookings');
ok(mine.length === 1 && mine[0].professional_id === 'railma', 'vê só a própria agenda');
ok((await q('select * from clients')).length === 1, 'vê só as clientes que atendeu');
await expectError(`insert into bookings (service_id, service_name, professional_id, professional_name, client_name, client_phone, date, start_time, duration, price, origin) values ('escova-simples','','maisa','','Zé','38955554444','${tue}','15:00',45,45,'manual_colaboradora')`,
  [], 'não cria agendamento na agenda da Maísa');
await q(`insert into bookings (service_id, service_name, professional_id, professional_name, client_name, client_phone, date, start_time, duration, price, origin) values ('corte','','railma','','Zé Encaixe','(38) 95555-4444',$1,'15:00',60,70,'manual_colaboradora')`, [tue]);
ok(true, 'cria encaixe na própria agenda');
await expectError(`insert into bookings (service_id, service_name, professional_id, professional_name, client_name, client_phone, date, start_time, duration, price, origin) values ('corte','','railma','','Sobreposta','38944443333','${tue}','15:30',60,70,'manual_colaboradora')`,
  [], 'trava do banco impede sobreposição mesmo vinda do painel', 'bookings_sem_sobreposicao');
await expectError(`update bookings set status='cancelado' where id = '${firstId}'`, [], 'cancelar sem motivo é recusado');
await q(`update bookings set status='concluido', price=60 where id = $1`, [firstId]);
const done = (await q(`select commission_rate::float r, commission_amount::float a, updated_by_name from bookings where id = $1`, [firstId]))[0];
ok(done.r === 0.5 && done.a === 30 && done.updated_by_name === 'Railma', 'concluído grava comissão (50% de R$60 = R$30) e quem alterou', JSON.stringify(done));
ok((await q(`select * from client_history where booking_id = $1`, [firstId])).length === 1, 'concluído entra no histórico da cliente');
await expectError(`update bookings set professional_id='maisa' where id = '${firstId}'`, [], 'não passa agendamento para outra profissional');
const del = await q(`delete from bookings where id = $1 returning id`, [firstId]).catch(() => []);
ok(del.length === 0, 'apagar não tem efeito para colaboradora');

console.log('\n[Administradora Lane]');
await as('authenticated', ADMIN);
ok((await q('select * from bookings')).length === 3, 'vê todos os agendamentos');
const ov = (await q(`select total_visits::int v, total_spent::float s from clients_overview where phone = '5538999991111'`))[0];
ok(ov && ov.v === 1 && ov.s === 60, 'totais da cliente calculados (1 visita, R$60)', JSON.stringify(ov));
await q(`update professionals set commission_rate = 0.6 where id = 'railma'`);
ok((await q(`select commission_amount::float a from bookings where id = $1`, [firstId]))[0].a === 30, 'mudar a taxa depois não altera comissão antiga');
const bia = (await q(`select id from bookings where client_name = 'Bia Outra'`))[0].id;
await q(`update bookings set start_time = '16:00' where id = $1`, [bia]);
const hist = (await q(`select reschedule_history h from bookings where id = $1`, [bia]))[0].h;
ok(hist.length === 1 && hist[0].previousTime === '09:00' && hist[0].newTime === '16:00', 'remarcação anotada automaticamente');
await q(`update bookings set status = 'cancelado', cancel_reason = 'Cliente pediu' where id = $1`, [bia]);
const nq = await q(`select type, status from notification_queue where booking_id = $1 order by created_at, type`, [bia]);
const types = nq.map(n => `${n.type}:${n.status}`).join(' ');
ok(types.includes('booking_created') && types.includes('booking_rescheduled') && types.includes('booking_cancelled:pending') && !types.includes('reminder_24h:pending'),
  'mensagens: criado, remarcado, cancelado; lembrete cancelado', types);
ok((await q(`select * from get_available_slots('escova-simples', $1, 'maisa') where slot_time = '09:00'`, [tue])).length === 1, 'horário cancelado volta a ficar livre');
const logs = await q(`select user_name, action, entity_type from audit_logs`);
ok(logs.some(l => l.user_name === 'Site (público)' && l.entity_type === 'bookings') && logs.some(l => l.user_name === 'Railma') && logs.some(l => l.user_name === 'Lane Viana'),
  'registro de alterações identifica site, colaboradora e admin');
await expectError(`delete from audit_logs`, [], 'nem a admin apaga o registro de alterações');

console.log('\n[Cliente pelo link pessoal]');
await as('anon');
r = await book({ pro: 'railma', name: 'Eva Link', phone: '38933332222', time: '10:00' });
const tok = r.booking?.manageToken;
ok(r.success && /^[0-9a-f]{64}$/.test(tok ?? ''), 'agendamento do site devolve a chave do link', JSON.stringify(r));
const openLink = async (t) => (await q('select get_booking_by_token($1) r', [t]))[0].r;
let g = await openLink(tok);
ok(g.success && g.booking.canReschedule && g.booking.canCancel && g.booking.reschedulesLeft === 2 && !JSON.stringify(g).includes('33332222'),
  'link abre o agendamento sem mostrar o telefone', JSON.stringify(g));
ok(!(await openLink('a'.repeat(64))).success && !(await openLink('abc')).success, 'chave errada não abre nada');
const rs = await q(`select to_char(slot_time,'HH24:MI') t from get_reschedule_slots($1, $2, 'railma')`, [tok, tue]);
ok(rs.some(s => s.t === '10:00') && rs.some(s => s.t === '10:30'), 'remarcação considera o próprio horário como livre', rs.map(s => s.t).join(' '));
ok((await q(`select * from get_reschedule_slots($1, $2)`, ['b'.repeat(64), tue])).length === 0, 'chave errada não lista horários');
await expectError(`select * from private.available_slots('escova-simples', '${tue}', null, null)`, [], 'visitante NÃO chama a lista interna de horários');

const move = async (date, time, pro) => (await q('select client_reschedule_booking($1,$2,$3,$4) r', [tok, date, time, pro]))[0].r;
let mv = await move(tue, '10:30', 'maisa');
ok(mv.success && mv.booking.professionalId === 'maisa' && mv.booking.time === '10:30', '1ª remarcação: passa para a Maísa às 10:30', JSON.stringify(mv));
const evaId = mv.booking.id;
await db.exec('reset role');
let alerts = await q(`select recipient_name, message from notification_queue where booking_id = $1 and type = 'staff_alert' order by created_at, recipient_name`, [evaId]);
ok(alerts.length === 2 && alerts.some(a => a.recipient_name === 'Railma' && a.message.includes('ficou livre'))
  && alerts.some(a => a.recipient_name.startsWith('Maísa') && a.message.includes('novo atendimento')),
  'avisa a profissional substituída e a substituta', JSON.stringify(alerts));
const evaRow = (await q(`select updated_by_name, reschedule_history h, client_reschedule_count c, commission_rate::float cr from bookings where id = $1`, [evaId]))[0];
ok(evaRow.updated_by_name === 'Cliente (pelo link)' && evaRow.h.at(-1).changedByName === 'Cliente (pelo link)' && evaRow.c === 1,
  'histórico mostra que foi a cliente', JSON.stringify(evaRow));
const clientMsg = (await q(`select message from notification_queue where booking_id = $1 and type = 'booking_rescheduled' and status = 'pending'`, [evaId]))[0];
ok(clientMsg && clientMsg.message.includes('/meu-agendamento/' + tok), 'mensagem da cliente leva o link pessoal');

await as('anon');
mv = await move(tue, '14:00', null);
ok(mv.success && mv.booking.professionalId === 'maisa' && mv.booking.time === '14:00', '2ª remarcação: "qualquer profissional" mantém a atual se ela estiver livre', JSON.stringify(mv));
mv = await move(tue, '15:00', null);
ok(!mv.success && mv.error.includes('2 vezes'), '3ª remarcação é recusada (limite de 2)', JSON.stringify(mv));
g = await openLink(tok);
ok(g.success && !g.booking.canReschedule && g.booking.canCancel && g.booking.reschedulesLeft === 0, 'depois do limite ainda pode cancelar', JSON.stringify(g));

let cx = (await q('select client_cancel_booking($1, $2) r', [tok, 'Imprevisto']))[0].r;
ok(cx.success, 'cliente cancela pelo link', JSON.stringify(cx));
await db.exec('reset role');
const cancelled = (await q(`select status, cancel_reason from bookings where id = $1`, [evaId]))[0];
ok(cancelled.status === 'cancelado' && cancelled.cancel_reason === 'Cancelado pela cliente pelo link: Imprevisto', 'cancelamento registra o motivo', JSON.stringify(cancelled));
alerts = await q(`select message from notification_queue where booking_id = $1 and type = 'staff_alert'`, [evaId]);
ok(alerts.length === 4 && alerts.some(a => a.message.includes('cancelou')), 'profissional é avisada do cancelamento');
const pendingAlerts = (await q(`select count(*)::int n from notification_queue where booking_id = $1 and type = 'staff_alert' and status = 'pending'`, [evaId]))[0].n;
ok(pendingAlerts === 4, 'avisos da equipe não são descartados quando a cliente muda de novo', String(pendingAlerts));
await as('anon');
cx = (await q('select client_cancel_booking($1) r', [tok]))[0].r;
ok(!cx.success, 'não cancela duas vezes');
ok((await q(`select * from get_available_slots('escova-simples', $1, 'maisa') where slot_time = '14:00'`, [tue])).length === 1, 'horário cancelado pela cliente volta a ficar livre');

// Regra das 12 horas e validade do link
await db.exec('reset role');
const [{ tk: nearTok }] = await q(`
  insert into bookings (service_id, service_name, professional_id, professional_name, client_name, client_phone, date, start_time, duration, price)
  select 'escova-simples', '', 'fabiane', '', 'Perto', '38922221111', t::date, date_trunc('minute', t)::time, 5, 0
  from (select private.now_sp() + interval '6 hours' t) x returning manage_token tk`);
const [{ tk: pastTok }] = await q(`
  insert into bookings (service_id, service_name, professional_id, professional_name, client_name, client_phone, date, start_time, duration, price)
  values ('escova-simples', '', 'lara', '', 'Passado', '38911110000', $1, '09:00', 30, 0) returning manage_token tk`, [past]);
await as('anon');
g = await openLink(nearTok);
ok(g.success && !g.booking.canCancel && !g.booking.canReschedule && g.booking.blockReason.includes('12 horas'), 'com menos de 12h não deixa mudar', JSON.stringify(g));
cx = (await q('select client_cancel_booking($1) r', [nearTok]))[0].r;
ok(!cx.success && cx.error.includes('12 horas'), 'cancelar com menos de 12h é recusado no banco');
g = await openLink(pastTok);
ok(!g.success && g.expired, 'link expira depois do horário do atendimento', JSON.stringify(g));

await as('authenticated', ADMIN);
await q(`update bookings set manage_token = 'trocada' where id = $1`, [evaId]);
ok((await q(`select manage_token from bookings where id = $1`, [evaId]))[0].manage_token === tok, 'a chave do link nunca muda');

console.log('\n[Serviços e preços pelo painel]');
await as('authenticated', ADMIN);
await q(`update services set price_base = 99.5, professional_ids = '{maisa}' where id = 'corte'`);
await q(`insert into services (id, name, category, price_base, duration, description, sort_order)
         values ('servico-novo', 'Serviço Novo', 'unhas', 42, 30, 'Teste', 100)`);
await as('anon');
ok((await q(`select id from services where id = 'servico-novo'`)).length === 1, 'serviço criado pela admin aparece para o site');
const corteSlots = await q(`select professional_ids from get_available_slots('corte', $1)`, [tue]);
ok(corteSlots.length > 0 && corteSlots.every(s => s.professional_ids.length === 1 && s.professional_ids[0] === 'maisa'),
  'serviço restrito à Maísa só oferece horários dela', JSON.stringify(corteSlots[0]));
r = await book({ service: 'corte', time: '16:30', name: 'Preço Novo', phone: '38955550000' });
ok(r.success && r.booking.professionalId === 'maisa' && Number(r.booking.price) === 99.5, 'agendamento novo usa o preço atualizado', JSON.stringify(r));
r = await book({ service: 'corte', pro: 'railma', time: '17:00', name: 'Preço Novo', phone: '38955550001' });
ok(!r.success, 'profissional fora da lista do serviço é recusada');

await as('authenticated', ADMIN);
await q(`update services set active = false where id = 'servico-novo'`);
await as('anon');
ok((await q(`select id from services where id = 'servico-novo'`)).length === 0, 'serviço tirado do site some para o visitante');
r = await book({ service: 'servico-novo', name: 'Fora', phone: '38955550002' });
ok(!r.success, 'serviço tirado do site não pode ser agendado');

await as('authenticated', RAILMA);
const colabUpd = await q(`update services set price_base = 1 where id = 'corte' returning id`).catch(() => []);
ok(colabUpd.length === 0, 'colaboradora NÃO altera preços');
await expectError(`insert into services (id, name, category, price_base, duration) values ('hack', 'Hack', 'unhas', 1, 30)`, [], 'colaboradora NÃO cria serviços');
await as('authenticated', ADMIN);

console.log('\n[Agendamento sem telefone (agenda de papel)]');
await as('authenticated', ADMIN);
const clientsBefore = (await q(`select count(*)::int n from clients`))[0].n;
const [semTel] = await q(`
  insert into bookings (service_id, service_name, professional_id, professional_name, client_name, client_phone, date, start_time, duration, price, status, origin)
  values ('escova-simples', '', 'railma', '', 'Jaque', null, $1, '13:00', 45, 35, 'confirmado', 'manual_admin') returning id, client_id, client_phone`, [tue]);
ok(semTel && semTel.client_id === null && semTel.client_phone === null, 'grava agendamento sem telefone e sem ficha de cliente', JSON.stringify(semTel));
await db.exec('reset role');
ok((await q(`select count(*)::int n from clients`))[0].n === clientsBefore, 'não cria cliente falsa');
ok((await q(`select count(*)::int n from notification_queue where booking_id = $1`, [semTel.id]))[0].n === 0, 'nenhuma mensagem para quem não tem telefone');
await as('authenticated', ADMIN);
await expectError(`insert into bookings (service_id, service_name, professional_id, professional_name, client_name, client_phone, date, start_time, duration, price, origin)
  values ('escova-simples', '', 'railma', '', 'Outra', null, '${tue}', '13:15', 45, 35, 'manual_admin')`, [], 'sem telefone também respeita a trava de horário', 'bookings_sem_sobreposicao');
await as('anon');
r = await book({ phone: '', name: 'Site Sem Fone', time: '16:30' });
ok(!r.success, 'no site o WhatsApp continua obrigatório');
await as('authenticated', ADMIN);

console.log('\n[Equipe desativada]');
await as('authenticated', ADMIN);
await q(`update staff_members set active = false where user_id = $1`, [RAILMA]);
await as('authenticated', RAILMA);
ok((await q('select * from bookings')).length === 0, 'colaboradora desativada perde o acesso na hora');

await db.exec('reset role');
console.log(`\n${pass} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
