// ─────────────────────────────────────────────
// CUIDARE — Availability Logic (America/Sao_Paulo)
// ─────────────────────────────────────────────

import type { Booking, Professional } from '../types';
import { getScheduleBlocks, getAvailabilityRules, getDefaultAvailabilityRules } from './dataService';
import { getBusinessSettings } from './businessSettings';

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface SlotInfo {
  time: string;
  status: 'livre' | 'agendado' | 'bloqueado' | 'intervalo';
}

/** Convert 'HH:MM' to minutes since midnight */
export const timeToMinutes = (time: string): number => {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/** Convert minutes since midnight to 'HH:MM' */
export const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

/** Get today's YYYY-MM-DD string and current minutes in America/Sao_Paulo timezone */
export const getNowInSaoPaulo = (): { todayStr: string; currentMinutes: number } => {
  const now = new Date();
  const formatterDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const formatterTime = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const parts = formatterTime.formatToParts(now);
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

  return {
    todayStr: formatterDate.format(now),
    currentMinutes: hour * 60 + minute
  };
};

/** Check if a single professional is available for a given time window on a specific date */
export const isProfessionalAvailableForWindow = (
  professionalId: string,
  date: string,
  startMinutes: number,
  duration: number,
  existingBookings: Booking[]
): boolean => {
  const endMinutes = startMinutes + duration;
  const selectedDate = new Date(date + 'T00:00:00');
  const dayOfWeek = selectedDate.getDay();

  // 1. Check business opening hours for this day of week
  const settings = getBusinessSettings();
  const daySetting = settings.openingHours.find(h => h.dayOfWeek === dayOfWeek);
  if (!daySetting || daySetting.closed) return false;

  const openMin = timeToMinutes(daySetting.open);
  const closeMin = timeToMinutes(daySetting.close);
  if (startMinutes < openMin || endMinutes > closeMin) return false;

  // 2. Check lunch / break interval
  if (daySetting.breakStart && daySetting.breakEnd) {
    const breakStartMin = timeToMinutes(daySetting.breakStart);
    const breakEndMin = timeToMinutes(daySetting.breakEnd);
    if (startMinutes < breakEndMin && endMinutes > breakStartMin) {
      return false;
    }
  }

  // 3. Check professional's custom availability rules
  const customRules = getAvailabilityRules(professionalId).filter(r => r.dayOfWeek === dayOfWeek && r.active);
  if (customRules.length > 0) {
    let matchesRule = false;
    for (const rule of customRules) {
      const rStart = timeToMinutes(rule.startTime);
      const rEnd = timeToMinutes(rule.endTime);
      const rBreakStart = rule.breakStart ? timeToMinutes(rule.breakStart) : null;
      const rBreakEnd = rule.breakEnd ? timeToMinutes(rule.breakEnd) : null;

      if (startMinutes >= rStart && endMinutes <= rEnd) {
        if (rBreakStart !== null && rBreakEnd !== null) {
          if (startMinutes < rBreakEnd && endMinutes > rBreakStart) continue;
        }
        matchesRule = true;
        break;
      }
    }
    if (!matchesRule) return false;
  }

  // 4. Check schedule blocks (folgas, férias, bloqueios) for professional
  const scheduleBlocks = getScheduleBlocks(professionalId);
  const hasBlock = scheduleBlocks.some(blk => {
    if (blk.date && blk.date !== date) return false;
    if (blk.allDay) return true;
    if (!blk.startTime || !blk.endTime) return false;
    const blkStart = timeToMinutes(blk.startTime);
    const blkEnd = timeToMinutes(blk.endTime);
    return startMinutes < blkEnd && endMinutes > blkStart;
  });
  if (hasBlock) return false;

  // 5. Check active booking overlaps (excluding status = 'cancelado')
  const hasBookingConflict = existingBookings.some(b => {
    if (b.professionalId !== professionalId) return false;
    if (b.date !== date) return false;
    if (b.status === 'cancelado') return false;

    const bStart = timeToMinutes(b.time);
    const bEnd = bStart + b.duration;
    return startMinutes < bEnd && endMinutes > bStart;
  });
  if (hasBookingConflict) return false;

  return true;
};

/** Get available slots for public booking widget or admin form */
export const getAvailableSlots = (
  date: string,
  professionalId: string | null,
  serviceDuration: number,
  existingBookings: Booking[],
  eligibleProfessionals: Professional[]
): string[] => {
  if (!date) return [];

  const selectedDate = new Date(date + 'T00:00:00');
  const dayOfWeek = selectedDate.getDay();

  const settings = getBusinessSettings();
  const daySetting = settings.openingHours.find(h => h.dayOfWeek === dayOfWeek);
  if (!daySetting || daySetting.closed) return [];

  const openMin = timeToMinutes(daySetting.open);
  const closeMin = timeToMinutes(daySetting.close);
  const step = 30; // 30-min slot intervals

  const { todayStr, currentMinutes } = getNowInSaoPaulo();
  const isToday = date === todayStr;
  const leadTimeBuffer = settings.minLeadTimeMinutes ?? 30;

  // Filter active eligible professionals
  const activePros = eligibleProfessionals.filter(p => p.active !== false);
  if (activePros.length === 0) return [];

  const slots: string[] = [];

  for (let current = openMin; current + serviceDuration <= closeMin; current += step) {
    // Exclude past times if date is today in Sao Paulo
    if (isToday && current <= currentMinutes + leadTimeBuffer) {
      continue;
    }

    if (professionalId) {
      // Single specified professional
      const pro = activePros.find(p => p.id === professionalId);
      if (pro && isProfessionalAvailableForWindow(pro.id, date, current, serviceDuration, existingBookings)) {
        slots.push(minutesToTime(current));
      }
    } else {
      // "Primeira profissional disponível": Union of slots where AT LEAST ONE eligible pro is free
      const isAnyProFree = activePros.some(pro =>
        isProfessionalAvailableForWindow(pro.id, date, current, serviceDuration, existingBookings)
      );
      if (isAnyProFree) {
        slots.push(minutesToTime(current));
      }
    }
  }

  return slots;
};

/** Find an eligible professional who is free for a given slot window */
export const findAvailableProfessionalForSlot = (
  date: string,
  time: string,
  serviceDuration: number,
  eligibleProfessionals: Professional[],
  existingBookings: Booking[]
): Professional | null => {
  const startMinutes = timeToMinutes(time);
  const activePros = eligibleProfessionals.filter(p => p.active !== false);

  for (const pro of activePros) {
    if (isProfessionalAvailableForWindow(pro.id, date, startMinutes, serviceDuration, existingBookings)) {
      return pro;
    }
  }

  return null;
};

/** Get full slot info for a professional on a given day (used in admin calendar) */
export const getProfessionalDaySlots = (
  professionalId: string,
  date: string,
  existingBookings: Booking[]
): SlotInfo[] => {
  const selectedDate = new Date(date + 'T00:00:00');
  const dayOfWeek = selectedDate.getDay();

  let rules = getAvailabilityRules(professionalId).filter(r => r.dayOfWeek === dayOfWeek && r.active);
  if (rules.length === 0) {
    rules = getDefaultAvailabilityRules(professionalId).filter(r => r.dayOfWeek === dayOfWeek);
  }

  if (rules.length === 0) return []; // Day off

  const scheduleBlocks = getScheduleBlocks(professionalId);
  const dayBlocked = scheduleBlocks.some(b => b.date === date && b.allDay);
  if (dayBlocked) return [];

  const dayBookings = existingBookings.filter(
    b => b.professionalId === professionalId && b.date === date && b.status !== 'cancelado'
  );

  const slots: SlotInfo[] = [];

  for (const rule of rules) {
    const start = timeToMinutes(rule.startTime);
    const end = timeToMinutes(rule.endTime);
    const breakStart = rule.breakStart ? timeToMinutes(rule.breakStart) : null;
    const breakEnd = rule.breakEnd ? timeToMinutes(rule.breakEnd) : null;

    for (let current = start; current < end; current += rule.slotDuration) {
      const time = minutesToTime(current);

      if (breakStart !== null && breakEnd !== null && current >= breakStart && current < breakEnd) {
        slots.push({ time, status: 'intervalo' });
        continue;
      }

      const blocked = scheduleBlocks.some(blk => {
        if (blk.date && blk.date !== date) return false;
        if (blk.allDay) return true;
        if (!blk.startTime || !blk.endTime) return false;
        const blkStart = timeToMinutes(blk.startTime);
        const blkEnd = timeToMinutes(blk.endTime);
        return current >= blkStart && current < blkEnd;
      });
      if (blocked) {
        slots.push({ time, status: 'bloqueado' });
        continue;
      }

      const booking = dayBookings.find(b => {
        const bStart = timeToMinutes(b.time);
        const bEnd = bStart + b.duration;
        return current >= bStart && current < bEnd;
      });
      if (booking) {
        slots.push({ time, status: 'agendado' });
        continue;
      }

      slots.push({ time, status: 'livre' });
    }
  }

  return slots;
};

