// ─────────────────────────────────────────────
// Gera supabase/migrations/20261105000004_dados_iniciais.sql
// a partir dos dados que o site já usa (src/data).
//
// Uso: node scripts/gerar-dados-iniciais.ts
// (Node 23.6 ou mais novo; roda TypeScript direto)
// ─────────────────────────────────────────────

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { services } from '../src/data/servicesData.ts';
import { professionals } from '../src/data/professionalsData.ts';
import { CATEGORIES } from '../src/data/categoriesData.ts';

const OUT = fileURLToPath(new URL('../supabase/migrations/20261105000004_dados_iniciais.sql', import.meta.url));

const q = (v: unknown): string => {
  if (v === undefined || v === null || v === '') return 'null';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return `'${String(v).replace(/'/g, "''")}'`;
};
const arr = (list?: string[]): string =>
  !list || list.length === 0 ? "'{}'" : `array[${list.map(q).join(', ')}]::text[]`;

const phone = (p?: string): string => {
  if (!p) return 'null';
  const d = p.replace(/\D/g, '');
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) return q(d);
  if (d.length === 10 || d.length === 11) return q('55' + d);
  return q(d);
};

const lines: string[] = [];
lines.push(
  '-- ─────────────────────────────────────────────',
  '-- CUIDARE — Migração 004: Dados iniciais (categorias, equipe, serviços, horários)',
  '-- GERADO por scripts/gerar-dados-iniciais.ts a partir de src/data. Não edite à mão.',
  '-- Pode rodar de novo sem duplicar: registros já existentes são mantidos.',
  '-- ─────────────────────────────────────────────',
  ''
);

lines.push('-- Categorias');
CATEGORIES.forEach((c, i) => {
  lines.push(
    `insert into public.service_categories (id, name, short_name, description, sort_order) values ` +
    `(${q(c.id)}, ${q(c.name)}, ${q(c.shortName)}, ${q(c.description)}, ${i}) on conflict (id) do nothing;`
  );
});

lines.push('', '-- Profissionais');
professionals.forEach((p, i) => {
  lines.push(
    `insert into public.professionals (id, name, role, categories, photo_url, avatar_url, bio, specialties, ` +
    `specialty_highlight, specialty_badge, provider_type, whatsapp, instagram, commission_rate, sort_order, active) values (` +
    [
      q(p.id), q(p.name), q(p.role), arr(p.categories), q(p.photoUrl), q(p.avatarUrl), q(p.bio),
      arr(p.specialties), q(p.specialtyHighlight), q(p.specialtyBadge), q(p.providerType),
      phone(p.whatsapp), q(p.instagram), q(p.commissionRate ?? 0.5), String(i), q(p.active !== false)
    ].join(', ') +
    `) on conflict (id) do nothing;`
  );
});

lines.push('', '-- Serviços');
services.forEach((s, i) => {
  lines.push(
    `insert into public.services (id, name, category, price_base, price_type, price_min, price_max, ` +
    `price_p, price_m, price_g, duration, description, recommendations, variable_price, professional_ids, ` +
    `note, flow_type, flow_badge, sort_order) values (` +
    [
      q(s.id), q(s.name), q(s.category), q(s.priceBase), q(s.priceType ?? 'fixed'),
      q(s.priceRange?.min), q(s.priceRange?.max),
      q(s.priceDetails?.P), q(s.priceDetails?.M), q(s.priceDetails?.G),
      q(s.duration), q(s.description), arr(s.recommendations), q(s.variablePrice ?? false),
      arr(s.professionalIds), q(s.note), q(s.flowType ?? 'agendamento_direto'), q(s.flowBadge), String(i)
    ].join(', ') +
    `) on conflict (id) do nothing;`
  );
});

lines.push(
  '',
  '-- Configurações gerais (linha única)',
  'insert into public.business_settings (id) values (1) on conflict (id) do nothing;',
  '',
  '-- Horário do salão: terça a sexta 08:00–18:00 com almoço 11:30–14:00; sábado 08:00–18:00; domingo e segunda fechado',
  'insert into public.business_hours (day_of_week, closed, open_time, close_time, break_start, break_end) values',
  "  (0, true,  null,    null,    null,    null),",
  "  (1, true,  null,    null,    null,    null),",
  "  (2, false, '08:00', '18:00', '11:30', '14:00'),",
  "  (3, false, '08:00', '18:00', '11:30', '14:00'),",
  "  (4, false, '08:00', '18:00', '11:30', '14:00'),",
  "  (5, false, '08:00', '18:00', '11:30', '14:00'),",
  "  (6, false, '08:00', '18:00', null,    null)",
  'on conflict (day_of_week) do nothing;',
  ''
);

writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log(`Gerado: ${OUT}`);
console.log(`${CATEGORIES.length} categorias, ${professionals.length} profissionais, ${services.length} serviços.`);
