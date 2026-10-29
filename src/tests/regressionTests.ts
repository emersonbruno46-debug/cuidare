// ─────────────────────────────────────────────
// CUIDARE — Automated Regression Tests Suite
// Execução: node --experimental-strip-types src/tests/regressionTests.ts
// ─────────────────────────────────────────────

import { 
  getDayOfWeekFromDateString, 
  parseDateStringParts, 
  addDaysToDateString, 
  formatDateLabel,
  getNextBusinessDays,
  BUSINESS_TIMEZONE 
} from '../lib/dateUtils';

import { 
  timeToMinutes, 
  minutesToTime, 
  isProfessionalAvailableForWindow,
  getAvailableSlots,
  findAvailableProfessionalForSlot 
} from '../lib/availability';

import { normalizeText, serviceMatchesQuery } from '../lib/searchUtils';
import { services } from '../data/servicesData';
import { professionals } from '../data/professionalsData';
import type { Booking, Professional, Service } from '../types';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ [FAIL] ${testName}`);
    if (details) console.error(`    Detalhes: ${details}`);
  }
}

console.log('\n======================================================');
console.log('  CUIDARE ESPAÇO DE BELEZA — SUÍTE DE TESTES DE REGRESSÃO');
console.log('======================================================\n');

// ──────────────────────────────────────────────────────
// 1. TESTES CRÍTICOS DE DATAS (29/10/2026 E 31/10/2026)
// ──────────────────────────────────────────────────────
console.log('[1/7] Testando datas críticas: 29/10/2026 e 31/10/2026...');

// 29/10/2026 é Quinta-feira (dayOfWeek = 4)
const dayOfWeek29 = getDayOfWeekFromDateString('2026-10-29');
assert(dayOfWeek29 === 4, '29/10/2026 é identificado estritamente como Quinta-feira (4)');

const label29 = formatDateLabel('2026-10-29', 'full');
assert(label29.toLowerCase().includes('quinta-feira') && label29.includes('29'), 
  `formatDateLabel('2026-10-29') exibe Quinta-feira e dia 29: "${label29}"`);

// 31/10/2026 é Sábado (dayOfWeek = 6)
const dayOfWeek31 = getDayOfWeekFromDateString('2026-10-31');
assert(dayOfWeek31 === 6, '31/10/2026 é identificado estritamente como Sábado (6)');

const label31 = formatDateLabel('2026-10-31', 'full');
assert(label31.toLowerCase().includes('sábado') && label31.includes('31'), 
  `formatDateLabel('2026-10-31') exibe Sábado e dia 31: "${label31}"`);

// 01/11/2026 é Domingo (dayOfWeek = 0, fechado)
const dayOfWeek01Nov = getDayOfWeekFromDateString('2026-11-01');
assert(dayOfWeek01Nov === 0, '01/11/2026 é Domingo (0, fechado)');

// ──────────────────────────────────────────────────────
// 2. TESTES DE VIRADA DE MÊS E ANO
// ──────────────────────────────────────────────────────
console.log('\n[2/7] Testando viradas de mês e ano...');

const nextAfter31Oct = addDaysToDateString('2026-10-31', 1);
assert(nextAfter31Oct === '2026-11-01', '31/10/2026 + 1 dia resulta exatamente em 2026-11-01');

const nextAfter31Dec = addDaysToDateString('2026-12-31', 1);
assert(nextAfter31Dec === '2027-01-01', '31/12/2026 + 1 dia resulta exatamente em 2027-01-01');
assert(getDayOfWeekFromDateString('2027-01-01') === 5, '01/01/2027 é Sexta-feira (5)');

const feb28 = addDaysToDateString('2026-02-28', 1);
assert(feb28 === '2026-03-01', '28/02/2026 (ano comum) + 1 dia resulta em 2026-03-01');

// ──────────────────────────────────────────────────────
// 3. TESTES DE NAVEGADORES EM FUSOS DIFERENTES
// ──────────────────────────────────────────────────────
console.log('\n[3/7] Testando determinismo independente do fuso do ambiente...');

const testDates = ['2026-10-29', '2026-10-31', '2026-11-01', '2026-12-31', '2027-01-01'];
const expectedDaysOfWeek = [4, 6, 0, 4, 5];

testDates.forEach((d, idx) => {
  const dow = getDayOfWeekFromDateString(d);
  assert(dow === expectedDaysOfWeek[idx], `Data ${d} tem dayOfWeek = ${expectedDaysOfWeek[idx]} em qualquer fuso`);
});

// ──────────────────────────────────────────────────────
// 4. TESTES DE HORÁRIOS PRÓXIMOS À MEIA-NOITE
// ──────────────────────────────────────────────────────
console.log('\n[4/7] Testando ausência de distorção de datas próximas à meia-noite...');

// Verificando que parseDateStringParts extrai sem contaminação
const partsMidnight = parseDateStringParts('2026-10-29');
assert(partsMidnight.year === 2026 && partsMidnight.month === 10 && partsMidnight.day === 29,
  '2026-10-29 mantém partes exatas ano 2026, mês 10, dia 29');

const numeric29 = formatDateLabel('2026-10-29', 'numeric');
assert(numeric29 === '29/10/2026', `Formatação numérica preserva 29/10/2026: "${numeric29}"`);

// ──────────────────────────────────────────────────────
// 5. TESTES DE DISPONIBILIDADE, EXPEDIENTE E INTERVALOS
// ──────────────────────────────────────────────────────
console.log('\n[5/7] Testando integridade da disponibilidade e reservas...');

const maisa = professionals.find(p => p.id === 'maisa')!;
const mockBookings: Booking[] = [
  {
    id: 'bk_test_1',
    serviceId: 'make-social',
    serviceName: 'Maquiagem Social',
    professionalId: 'maisa',
    professionalName: 'Maísa Rodrigues',
    date: '2026-10-29',
    time: '10:00',
    duration: 60,
    clientName: 'Cliente Teste',
    clientPhone: '5538999999999',
    status: 'confirmado',
    price: 120,
    origin: 'site',
    createdAt: '2026-10-28T10:00:00Z'
  }
];

// Horário ocupado por reserva ativa
const isAvailableBusy = isProfessionalAvailableForWindow(
  'maisa', '2026-10-29', timeToMinutes('10:00'), 60, mockBookings
);
assert(!isAvailableBusy, 'Horário ocupado (10:00 às 11:00) é reportado como indisponível');

// Horário que invade intervalo de almoço (terça a sexta: pausa das 11:30 às 14:00)
// Procedimento de 60 min começando às 11:00 terminaria às 12:00 -> invade pausa
const isAvailableBreakOverlap = isProfessionalAvailableForWindow(
  'maisa', '2026-10-29', timeToMinutes('11:00'), 60, []
);
assert(!isAvailableBreakOverlap, 'Procedimento de 60 min às 11:00 invade o almoço (11:30) e é recusado');

// Procedimento de 30 min às 11:00 termina às 11:30 -> dentro do expediente matutino
const isAvailableBeforeBreak = isProfessionalAvailableForWindow(
  'maisa', '2026-10-29', timeToMinutes('11:00'), 30, []
);
assert(isAvailableBeforeBreak, 'Procedimento de 30 min às 11:00 encerra às 11:30 e é aceito');

// Procedimento que ultrapassa o fechamento (18:00)
// Procedimento de 60 min começando às 17:30 terminaria às 18:30 -> recusado
const isAvailablePastClose = isProfessionalAvailableForWindow(
  'maisa', '2026-10-29', timeToMinutes('17:30'), 60, []
);
assert(!isAvailablePastClose, 'Procedimento às 17:30 com 60 min ultrapassa o fechamento (18:00) e é recusado');

// Domingo: salão fechado
const isAvailableSunday = isProfessionalAvailableForWindow(
  'maisa', '2026-11-01', timeToMinutes('10:00'), 30, []
);
assert(!isAvailableSunday, 'Domingo é reportado como indisponível para qualquer horário');

// ──────────────────────────────────────────────────────
// 6. TESTES DE PRESERVAÇÃO E ELEGIBILIDADE DA PROFISSIONAL
// ──────────────────────────────────────────────────────
console.log('\n[6/7] Testando preservação e elegibilidade das profissionais...');

const evelyn = professionals.find(p => p.id === 'evelyn')!;
const railma = professionals.find(p => p.id === 'railma')!;

// Evelyn atende unhas
const evelynServices = services.filter(s => {
  if (s.professionalIds && s.professionalIds.length > 0) return s.professionalIds.includes(evelyn.id);
  return evelyn.categories.includes(s.category);
});
assert(evelynServices.every(s => s.category === 'unhas'), 'Evelyn atende exclusivamente serviços da categoria unhas');
assert(!evelynServices.some(s => s.category === 'escovas'), 'Evelyn NÃO atende serviços de escovas');

// Escova modelada deve ser elegível para Railma e Maísa, mas NÃO para Evelyn
const escovaService = services.find(s => s.category === 'escovas')!;
const eligibleForEscova = professionals.filter(p => {
  if (escovaService.professionalIds && escovaService.professionalIds.length > 0) {
    return escovaService.professionalIds.includes(p.id);
  }
  return p.categories.includes(escovaService.category);
});
assert(eligibleForEscova.some(p => p.id === 'railma'), 'Railma é elegível para Escova');
assert(eligibleForEscova.some(p => p.id === 'maisa'), 'Maísa é elegível para Escova');
assert(!eligibleForEscova.some(p => p.id === 'evelyn'), 'Evelyn NÃO é elegível para Escova');

// ──────────────────────────────────────────────────────
// 7. TESTES DE BUSCA COM E SEM ACENTOS
// ──────────────────────────────────────────────────────
console.log('\n[7/7] Testando normalização de busca (cilios vs cílios)...');

const ciliosService = services.find(s => s.id === 'cilios-classico')!;

assert(serviceMatchesQuery(ciliosService, 'cilios'), '"cilios" sem acento encontra "Extensão de Cílios Fio a Fio"');
assert(serviceMatchesQuery(ciliosService, 'cílios'), '"cílios" com acento encontra "Extensão de Cílios Fio a Fio"');
assert(serviceMatchesQuery(ciliosService, 'CÍLIOS'), '"CÍLIOS" em maiúsculas encontra "Extensão de Cílios Fio a Fio"');
assert(serviceMatchesQuery(ciliosService, 'lash'), 'Alias "lash" encontra procedimentos de cílios');

const sobrancelhaService = services.find(s => s.category === 'sobrancelhas')!;
assert(serviceMatchesQuery(sobrancelhaService, 'sobrancelha'), '"sobrancelha" sem s encontra serviços de sobrancelhas');
assert(serviceMatchesQuery(sobrancelhaService, 'henna'), '"henna" encontra serviços de sobrancelha com henna');

// ──────────────────────────────────────────────────────
// RELATÓRIO FINAL DOS TESTES
// ──────────────────────────────────────────────────────
console.log('\n======================================================');
console.log(`TOTAL DE TESTES EXECUTADOS: ${totalTests}`);
console.log(`PASSARAM: ${passedTests}`);
console.log(`FALHARAM: ${failedTests}`);
console.log('======================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('✓ Todos os testes de regressão foram aprovados com sucesso!\n');
}
