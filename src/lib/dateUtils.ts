// ─────────────────────────────────────────────
// CUIDARE — Date & Time Utilities (America/Sao_Paulo)
// Fuso de negócio explícito: America/Sao_Paulo
// Representação de calendário: strings estritas YYYY-MM-DD
// Representação de horário: strings estritas HH:MM
// ─────────────────────────────────────────────

export const BUSINESS_TIMEZONE = 'America/Sao_Paulo';

export interface CalendarDayOption {
  dateString: string; // YYYY-MM-DD
  dayNumber: number;  // 1..31
  dayName: string;    // 'seg', 'ter', 'qua', etc.
  dayNameFull: string;// 'Segunda-feira', etc.
  monthName: string;  // 'out', 'nov', etc.
  monthNameFull: string; // 'outubro', etc.
  dayOfWeek: number;  // 0: Domingo, 1: Segunda, ..., 6: Sábado
  isClosed: boolean;
}

/**
 * Retorna as partes de data/hora atual no fuso America/Sao_Paulo
 */
export function getNowInSaoPaulo(): {
  todayStr: string; // YYYY-MM-DD
  currentMinutes: number; // minutos desde a meia-noite
  currentHour: number;
  currentMinute: number;
} {
  const now = new Date();
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = dtf.formatToParts(now);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const year = partMap.year || '2026';
  const month = partMap.month || '01';
  const day = partMap.day || '01';
  const hour = parseInt(partMap.hour || '0', 10);
  const minute = parseInt(partMap.minute || '0', 10);

  return {
    todayStr: `${year}-${month}-${day}`,
    currentMinutes: hour * 60 + minute,
    currentHour: hour,
    currentMinute: minute
  };
}

/**
 * Converte 'YYYY-MM-DD' em partes numéricas sem depender do fuso do navegador
 */
export function parseDateStringParts(dateString: string): { year: number; month: number; day: number } {
  if (!dateString || typeof dateString !== 'string') {
    const { todayStr } = getNowInSaoPaulo();
    return parseDateStringParts(todayStr);
  }
  const clean = dateString.trim().split('T')[0];
  const [y, m, d] = clean.split('-').map(Number);
  return {
    year: y || 2026,
    month: m || 1,
    day: d || 1
  };
}

/**
 * Retorna o dia da semana (0: Dom, 1: Seg, 2: Ter, 3: Qua, 4: Qui, 5: Sex, 6: Sáb)
 * de uma string YYYY-MM-DD de forma estritamente determinística e independente do fuso local do navegador.
 */
export function getDayOfWeekFromDateString(dateString: string): number {
  const { year, month, day } = parseDateStringParts(dateString);
  // Usamos Date.UTC(year, month - 1, day, 12, 0, 0) para meio-dia UTC
  // Isso garante que getUTCDay() retorne exatamente o dia da semana correto em qualquer fuso do mundo.
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return utcDate.getUTCDay();
}

/**
 * Adiciona N dias civis a uma data YYYY-MM-DD mantendo a lógica de calendário pura.
 */
export function addDaysToDateString(dateString: string, daysToAdd: number): string {
  const { year, month, day } = parseDateStringParts(dateString);
  const utcDate = new Date(Date.UTC(year, month - 1, day + daysToAdd, 12, 0, 0));
  const y = utcDate.getUTCFullYear();
  const m = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Gera os próximos N dias de calendário a partir da data de hoje em São Paulo.
 * Filtra ou identifica dias de fechamento (Domingo: 0 e Segunda: 1).
 */
export function getNextBusinessDays(
  numberOfDays = 14,
  baseDateString?: string
): CalendarDayOption[] {
  const startDateStr = baseDateString || getNowInSaoPaulo().todayStr;
  const days: CalendarDayOption[] = [];

  // Começa do dia seguinte (ou do mesmo dia se necessário, mas agendamento padrão começa de amanhã ou hoje)
  let offset = 1;
  while (days.length < numberOfDays && offset <= 45) {
    const candidateStr = addDaysToDateString(startDateStr, offset);
    const dayOfWeek = getDayOfWeekFromDateString(candidateStr);
    const { year, month, day } = parseDateStringParts(candidateStr);

    // Criamos uma data meio-dia UTC para formatadores que exigem Date
    const refDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

    // Domingo (0) e Segunda (1) são fechados
    const isClosed = dayOfWeek === 0 || dayOfWeek === 1;

    if (!isClosed) {
      const weekdayShortFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: 'short' });
      const weekdayLongFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: 'long' });
      const monthShortFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', month: 'short' });
      const monthLongFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', month: 'long' });

      days.push({
        dateString: candidateStr,
        dayNumber: day,
        dayName: weekdayShortFormatter.format(refDate).replace('.', ''),
        dayNameFull: weekdayLongFormatter.format(refDate),
        monthName: monthShortFormatter.format(refDate).replace('.', ''),
        monthNameFull: monthLongFormatter.format(refDate),
        dayOfWeek,
        isClosed
      });
    }

    offset++;
  }

  return days;
}

/**
 * Formata uma data YYYY-MM-DD em português de forma confiável e fuso-independente.
 * Exemplo: "quinta-feira, 29 de outubro" ou "29/10/2026"
 */
export function formatDateLabel(
  dateString: string,
  variant: 'full' | 'short' | 'numeric' = 'full'
): string {
  if (!dateString) return '';
  const { year, month, day } = parseDateStringParts(dateString);
  const refDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  if (variant === 'numeric') {
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }

  if (variant === 'short') {
    const dtf = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'short'
    });
    return dtf.format(refDate);
  }

  // full
  const weekdayFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    weekday: 'long'
  });
  const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    month: 'long'
  });

  const weekday = weekdayFormatter.format(refDate);
  const monthName = monthFormatter.format(refDate);

  // Capitaliza a primeira letra do dia da semana
  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capitalizedWeekday}, ${day} de ${monthName} de ${year}`;
}
