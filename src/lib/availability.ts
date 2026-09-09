import type { Booking } from '../types';
import { getScheduleBlocks, getAvailabilityRules, getDefaultAvailabilityRules } from './dataService';

export interface TimeSlot {
  time: string;
  available: boolean;
}

// Converte 'HH:MM' para minutos desde a meia noite
export const timeToMinutes = (time: string): number => {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Converte minutos para 'HH:MM'
export const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export interface SlotInfo {
  time: string;
  status: 'livre' | 'agendado' | 'bloqueado' | 'intervalo';
}

/** Get available slots for public booking widget */
export const getAvailableSlots = (
  date: string,
  professionalId: string | null,
  serviceDuration: number,
  existingBookings: Booking[],
  allProfessionals: { id: string }[]
): string[] => {
  if (!date) return [];

  const selectedDate = new Date(date + 'T00:00:00');
  const dayOfWeek = selectedDate.getDay();

  if (dayOfWeek === 0 || dayOfWeek === 1) return []; // Closed Sun & Mon

  const operatingBlocks: { startMinutes: number; endMinutes: number }[] = [];

  if (dayOfWeek >= 2 && dayOfWeek <= 5) {
    operatingBlocks.push({ startMinutes: 8 * 60, endMinutes: 11 * 60 + 30 });
    operatingBlocks.push({ startMinutes: 14 * 60, endMinutes: 18 * 60 });
  } else if (dayOfWeek === 6) {
    operatingBlocks.push({ startMinutes: 8 * 60, endMinutes: 18 * 60 });
  }

  // Check schedule blocks (folgas, férias etc.)
  const scheduleBlocks = getScheduleBlocks(professionalId ?? undefined);
  const dayBlocked = scheduleBlocks.some(b =>
    b.date === date && b.allDay
  );
  if (dayBlocked) return [];

  let relevantBookings = professionalId
    ? existingBookings.filter(b => b.professionalId === professionalId && b.date === date && b.status !== 'cancelado')
    : existingBookings.filter(b => b.date === date && b.status !== 'cancelado');

  const slots: string[] = [];
  const step = 30;

  for (const block of operatingBlocks) {
    for (let current = block.startMinutes; current + serviceDuration <= block.endMinutes; current += step) {
      const slotEnd = current + serviceDuration;

      // Check schedule block for this specific time
      const timeBlocked = scheduleBlocks.some(blk => {
        if (blk.date !== date) return false;
        if (blk.allDay) return true;
        if (!blk.startTime || !blk.endTime) return false;
        const blkStart = timeToMinutes(blk.startTime);
        const blkEnd = timeToMinutes(blk.endTime);
        return current < blkEnd && slotEnd > blkStart;
      });
      if (timeBlocked) continue;

      let hasConflict = false;

      if (professionalId) {
        hasConflict = relevantBookings.some(booking => {
          const bStart = timeToMinutes(booking.time);
          const bEnd = bStart + booking.duration;
          return current < bEnd && slotEnd > bStart;
        });
      } else {
        let conflictingCount = 0;
        relevantBookings.forEach(booking => {
          const bStart = timeToMinutes(booking.time);
          const bEnd = bStart + booking.duration;
          if (current < bEnd && slotEnd > bStart) conflictingCount++;
        });
        hasConflict = conflictingCount >= allProfessionals.length;
      }

      if (!hasConflict) {
        slots.push(minutesToTime(current));
      }
    }
  }

  return slots;
};

/** Get full slot info for a professional on a given day (used in admin calendar) */
export const getProfessionalDaySlots = (
  professionalId: string,
  date: string,
  existingBookings: Booking[]
): SlotInfo[] => {
  const selectedDate = new Date(date + 'T00:00:00');
  const dayOfWeek = selectedDate.getDay();

  // Get availability rules (or defaults)
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

      // Check break
      if (breakStart !== null && breakEnd !== null && current >= breakStart && current < breakEnd) {
        slots.push({ time, status: 'intervalo' });
        continue;
      }

      // Check schedule block
      const blocked = scheduleBlocks.some(blk => {
        if (blk.date !== date) return false;
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

      // Check booking
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
