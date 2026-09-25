// ─────────────────────────────────────────────
// CUIDARE — Natural Language Parser (pt-BR)
// Interpreta mensagens de texto em agendamentos
// Sem dependência de IA externa — parser puro em português
// ─────────────────────────────────────────────

import type { ParsedBookingMessage } from '../types';
import { professionals } from '../data/professionalsData';
import { services } from '../data/servicesData';

// ── Month map
const MONTHS: Record<string, number> = {
  janeiro: 0, fevereiro: 1, março: 2, marco: 2, abril: 3, maio: 4,
  junho: 5, julho: 6, agosto: 7, setembro: 8, outubro: 9,
  novembro: 10, dezembro: 11,
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11
};

function normalizeText(str: string): string {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s:/-]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

/** Parse date from various Portuguese formats */
function parseDate(text: string): { date: string; raw: string } | null {
  const norm = normalizeText(text);
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  // "hoje"
  if (/\bhoje\b/.test(norm)) {
    return { date: today.toISOString().split('T')[0], raw: 'hoje' };
  }

  // "amanhã" / "amanha"
  if (/\bamanh[aã]\b/.test(norm)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return { date: d.toISOString().split('T')[0], raw: 'amanhã' };
  }

  // "depois de amanhã"
  if (/depois de amanh[aã]/.test(norm)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return { date: d.toISOString().split('T')[0], raw: 'depois de amanhã' };
  }

  // DD/MM/YYYY or DD/MM/YY or DD/MM
  const slashMatch = norm.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1]);
    const month = parseInt(slashMatch[2]) - 1;
    let year = slashMatch[3] ? parseInt(slashMatch[3]) : today.getFullYear();
    if (year < 100) year += 2000;
    let d = new Date(year, month, day, 12, 0, 0);
    // If date is in the past (and no year was specified), use next year
    if (!slashMatch[3] && d < today) {
      d = new Date(year + 1, month, day, 12, 0, 0);
    }
    return { date: d.toISOString().split('T')[0], raw: slashMatch[0] };
  }

  // "27 de setembro" / "setembro 27"
  const monthNames = Object.keys(MONTHS).join('|');
  const longMatch = norm.match(new RegExp(`(\\d{1,2})\\s+de\\s+(${monthNames})(?:\\s+(\\d{2,4}))?`));
  if (longMatch) {
    const day = parseInt(longMatch[1]);
    const month = MONTHS[longMatch[2]];
    let year = longMatch[3] ? parseInt(longMatch[3]) : today.getFullYear();
    if (year < 100) year += 2000;
    let d = new Date(year, month, day, 12, 0, 0);
    if (!longMatch[3] && d < today) {
      d = new Date(year + 1, month, day, 12, 0, 0);
    }
    return { date: d.toISOString().split('T')[0], raw: longMatch[0] };
  }

  // "setembro 27" (reversed)
  const revMatch = norm.match(new RegExp(`(${monthNames})\\s+(\\d{1,2})(?:\\s+(\\d{2,4}))?`));
  if (revMatch) {
    const month = MONTHS[revMatch[1]];
    const day = parseInt(revMatch[2]);
    let year = revMatch[3] ? parseInt(revMatch[3]) : today.getFullYear();
    if (year < 100) year += 2000;
    let d = new Date(year, month, day, 12, 0, 0);
    if (!revMatch[3] && d < today) {
      d = new Date(year + 1, month, day, 12, 0, 0);
    }
    return { date: d.toISOString().split('T')[0], raw: revMatch[0] };
  }

  return null;
}

/** Parse time from various Portuguese formats */
function parseTime(text: string): { time: string; raw: string } | null {
  const norm = normalizeText(text);

  // "8h30" / "8h" / "8:30" / "08:00" / "às 8" / "as 8h"
  const timeMatch = norm.match(/(?:as\s+|às\s+)?(\d{1,2})(?::(\d{2})|h(\d{2})?)?(?:\s*h)?(?=\s|$)/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2] ?? timeMatch[3] ?? '0');
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      return { time, raw: timeMatch[0].trim() };
    }
  }

  return null;
}

/** Find professional by approximate name match */
function findProfessional(text: string): { professionalId: string; professionalName: string; raw: string } | null {
  const norm = normalizeText(text);
  for (const pro of professionals) {
    const proNorm = normalizeText(pro.name);
    if (norm.includes(proNorm)) {
      return { professionalId: pro.id, professionalName: pro.name, raw: pro.name };
    }
  }
  return null;
}

/** Find service by approximate name match */
function findService(text: string): { serviceId: string; serviceName: string; raw: string } | null {
  const norm = normalizeText(text);
  
  // Try exact matches first, then partial
  let bestMatch: typeof services[0] | null = null;
  let bestScore = 0;

  for (const svc of services) {
    const svcNorm = normalizeText(svc.name);
    const words = svcNorm.split(' ').filter(w => w.length > 3);
    const matchCount = words.filter(w => norm.includes(w)).length;
    const score = matchCount / Math.max(words.length, 1);

    if (score > bestScore && score > 0.4) {
      bestScore = score;
      bestMatch = svc;
    }
  }

  if (bestMatch) {
    return { serviceId: bestMatch.id, serviceName: bestMatch.name, raw: bestMatch.name };
  }

  // Common synonyms
  const synonyms: Record<string, string> = {
    'escova': 'escova-simples',
    'hidratacao': 'hidratacao-simples',
    'hidratação': 'hidratacao-simples',
    'manicure': 'manicure-simples',
    'pedicure': 'pedicure-simples',
    'corte': 'corte',
    'progressiva': 'progressiva-sem-formol',
    'cilios': 'cilios-classico',
    'cílios': 'cilios-classico',
    'design': 'design-sobrancelha',
    'sobrancelha': 'design-sobrancelha',
    'henna': 'design-henna',
    'make': 'make-social',
    'maquiagem': 'make-social',
    'drenagem': 'drenagem-corporal',
    'massagem': 'massagem-relaxante',
    'depilacao': 'depilacao-laser',
    'depilação': 'depilacao-laser',
    'laser': 'depilacao-laser'
  };

  for (const [key, id] of Object.entries(synonyms)) {
    if (norm.includes(normalizeText(key))) {
      const svc = services.find(s => s.id === id);
      if (svc) return { serviceId: svc.id, serviceName: svc.name, raw: key };
    }
  }

  return null;
}

/** Extract phone number */
function findPhone(text: string): string | null {
  const match = text.match(/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[\s-]?\d{4}/);
  return match ? match[0].trim() : null;
}

/** Extract client name — look for pattern after "de" or at start */
function findClientName(text: string): string | null {
  // "agendar horário de NOME às" or "para NOME" or "cliente: NOME"
  const patterns = [
    /(?:agendar\s+(?:horário|horario)\s+de\s+)([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+(?:\s+[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+)*)/,
    /(?:cliente:\s*)([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+(?:\s+[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+)*)/i,
    /^([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+(?:\s+[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+)*)/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Make sure it's not a professional name or service
      const candidate = match[1];
      const normCand = normalizeText(candidate);
      const isPro = professionals.some(p => normalizeText(p.name) === normCand);
      if (!isPro) return candidate;
    }
  }

  return null;
}

/** Main parser function */
export function parseBookingMessage(message: string): ParsedBookingMessage {
  const result: ParsedBookingMessage = { ambiguous: [] };

  // Date
  const dateResult = parseDate(message);
  if (dateResult) {
    result.date = dateResult.date;
    result.rawDate = dateResult.raw;
  } else {
    result.ambiguous.push('date');
  }

  // Time
  const timeResult = parseTime(message);
  if (timeResult) {
    result.time = timeResult.time;
    result.rawTime = timeResult.raw;
  } else {
    result.ambiguous.push('time');
  }

  // Professional
  const proResult = findProfessional(message);
  if (proResult) {
    result.professionalId = proResult.professionalId;
    result.professionalName = proResult.professionalName;
  } else {
    result.ambiguous.push('professional');
  }

  // Service
  const svcResult = findService(message);
  if (svcResult) {
    result.serviceId = svcResult.serviceId;
    result.serviceName = svcResult.serviceName;
  } else {
    result.ambiguous.push('service');
  }

  // Client name
  const clientName = findClientName(message);
  if (clientName) {
    result.clientName = clientName;
  } else {
    result.ambiguous.push('clientName');
  }

  // Phone
  const phone = findPhone(message);
  if (phone) {
    result.clientPhone = phone;
  }

  return result;
}

/** Format parsed date for display */
export function formatParsedDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}
