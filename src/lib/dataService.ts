// ─────────────────────────────────────────────
// CUIDARE — Data Service (localStorage)
// Todas as operações de CRUD centralizadas aqui.
// Quando migrar para Supabase: substitua este arquivo pelas chamadas do SDK.
// ─────────────────────────────────────────────

import type {
  Booking, Client, ClientHistoryEntry, AvailabilityRule,
  ScheduleBlock, AuditLog, Professional, NotificationJob
} from '../types';
import { professionals as seedProfessionals } from '../data/professionalsData';
import { getCurrentUser } from './auth';
import { timeToMinutes } from './availability';
import { getBusinessSettings, normalizeBrazilianPhone } from './businessSettings';

// ── Storage keys
const KEYS = {
  bookings: 'cuidare_bookings_v2',
  clients: 'cuidare_clients_v2',
  history: 'cuidare_history_v2',
  availability: 'cuidare_availability_v2',
  blocks: 'cuidare_blocks_v2',
  professionals: 'cuidare_professionals_v2',
  auditLogs: 'cuidare_audit_v2',
  notifications: 'cuidare_notifications_v2',
  demoSeeded: 'cuidare_demo_seeded_v2'
};

// ── Generic helpers
function getList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function setList<T>(key: string, list: T[]): void {
  localStorage.setItem(key, JSON.stringify(list));
}
function genId(): string {
  return Math.random().toString(36).substr(2, 12) + Date.now().toString(36);
}

// ── Audit log
function audit(action: string, entityType: string, entityId: string, prev?: unknown, next?: unknown): void {
  const user = getCurrentUser();
  const log: AuditLog = {
    id: genId(),
    userId: user?.id ?? 'public',
    userName: user?.name ?? 'Público',
    userRole: user?.role ?? 'collaborator',
    action,
    entityType,
    entityId,
    previousValues: prev as Record<string, unknown> | undefined,
    newValues: next as Record<string, unknown> | undefined,
    createdAt: new Date().toISOString()
  };
  const logs = getList<AuditLog>(KEYS.auditLogs);
  logs.unshift(log);
  setList(KEYS.auditLogs, logs.slice(0, 500));
}

// ─────────────────────────────────────
// NOTIFICATIONS QUEUE (STRUCTURE)
// ─────────────────────────────────────

export function getNotificationQueue(): NotificationJob[] {
  return getList<NotificationJob>(KEYS.notifications);
}

export function enqueueNotificationJob(
  booking: Booking,
  type: NotificationJob['type'],
  customMessage?: string
): NotificationJob {
  const phone = normalizeBrazilianPhone(booking.clientPhone);
  const msg = customMessage || `Olá ${booking.clientName}, seu agendamento de ${booking.serviceName} no Cuidare para ${booking.date} às ${booking.time}h está ${booking.status === 'confirmado' ? 'confirmado' : 'registrado'}.`;

  const job: NotificationJob = {
    id: 'job_' + genId(),
    bookingId: booking.id,
    recipientPhone: phone,
    recipientName: booking.clientName,
    message: msg,
    type,
    scheduledFor: new Date().toISOString(),
    status: 'pending',
    attempts: 0,
    createdAt: new Date().toISOString()
  };

  const queue = getNotificationQueue();
  queue.unshift(job);
  setList(KEYS.notifications, queue.slice(0, 300));
  return job;
}

export function cancelNotificationJobsForBooking(bookingId: string): void {
  const queue = getNotificationQueue().map(job => {
    if (job.bookingId === bookingId && job.status === 'pending') {
      return { ...job, status: 'cancelled' as const };
    }
    return job;
  });
  setList(KEYS.notifications, queue);
}

// ─────────────────────────────────────
// PROFESSIONALS
// ─────────────────────────────────────

export function getProfessionals(): Professional[] {
  const stored = getList<Professional>(KEYS.professionals);
  if (stored.length === 0) {
    const seeded = seedProfessionals.map(p => ({
      ...p,
      whatsapp: normalizeBrazilianPhone(p.whatsapp),
      active: p.active !== false,
      commissionRate: p.commissionRate ?? 0.5
    }));
    setList(KEYS.professionals, seeded);
    return seeded;
  }

  // Ensure missing professionals from seed are added, but DO NOT overwrite user-modified fields!
  let updated = false;
  const merged = [...stored];

  seedProfessionals.forEach(seedPro => {
    const existingIdx = merged.findIndex(p => p.id === seedPro.id);
    if (existingIdx === -1) {
      merged.push({
        ...seedPro,
        whatsapp: normalizeBrazilianPhone(seedPro.whatsapp),
        active: seedPro.active !== false,
        commissionRate: seedPro.commissionRate ?? 0.5
      });
      updated = true;
    }
  });

  if (updated) {
    setList(KEYS.professionals, merged);
  }

  return merged;
}

export function updateProfessional(id: string, updates: Partial<Professional>): Professional | null {
  const list = getProfessionals();
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) return null;
  const prev = { ...list[idx] };

  if (updates.whatsapp) {
    updates.whatsapp = normalizeBrazilianPhone(updates.whatsapp);
  }

  list[idx] = { ...list[idx], ...updates };
  setList(KEYS.professionals, list);
  audit('update_professional', 'professional', id, prev, list[idx]);
  return list[idx];
}

// ─────────────────────────────────────
// BOOKINGS
// ─────────────────────────────────────

export function getBookings(): Booking[] {
  return getList<Booking>(KEYS.bookings);
}

export function getBookingById(id: string): Booking | undefined {
  return getBookings().find(b => b.id === id);
}

/** Validates no time overlap for the same professional (excludes cancelled) */
export function validateConflict(
  professionalId: string,
  date: string,
  startTime: string,
  duration: number,
  excludeId?: string
): { conflict: boolean; conflictWith?: Booking } {
  const bookings = getBookings().filter(
    b => b.professionalId === professionalId &&
      b.date === date &&
      b.status !== 'cancelado' &&
      b.id !== excludeId
  );

  const newStart = timeToMinutes(startTime);
  const newEnd = newStart + duration;

  for (const b of bookings) {
    const bStart = timeToMinutes(b.time);
    const bEnd = bStart + b.duration;
    if (newStart < bEnd && newEnd > bStart) {
      return { conflict: true, conflictWith: b };
    }
  }
  return { conflict: false };
}

export function createBooking(data: Omit<Booking, 'id' | 'createdAt'>): { booking: Booking | null; error?: string } {
  // Validate inputs
  if (!data.clientName || data.clientName.trim().length < 2) {
    return { booking: null, error: 'Nome do cliente é obrigatório (mínimo 2 caracteres).' };
  }
  if (!data.clientPhone || data.clientPhone.replace(/\D/g, '').length < 8) {
    return { booking: null, error: 'Telefone do cliente é obrigatório e inválido.' };
  }
  if (data.price < 0 || isNaN(data.price)) {
    return { booking: null, error: 'Valor do serviço inválido.' };
  }
  if (data.duration <= 0 || isNaN(data.duration)) {
    return { booking: null, error: 'Duração do serviço inválida.' };
  }

  const normalizedPhone = normalizeBrazilianPhone(data.clientPhone);

  const { conflict, conflictWith } = validateConflict(
    data.professionalId, data.date, data.time, data.duration
  );
  if (conflict) {
    return { booking: null, error: `Conflito de horário com o agendamento de ${conflictWith?.clientName} às ${conflictWith?.time}.` };
  }

  const pro = getProfessionals().find(p => p.id === data.professionalId);
  const settings = getBusinessSettings();
  const rate = pro?.commissionRate ?? settings.commissionDefaultRate ?? 0.5;

  const user = getCurrentUser();
  const [h, m] = data.time.split(':').map(Number);
  const endMin = h * 60 + m + data.duration;
  const endHour = Math.floor(endMin / 60);
  const endMinutes = endMin % 60;
  const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

  const booking: Booking = {
    ...data,
    clientPhone: normalizedPhone,
    id: 'bk_' + genId(),
    endTime,
    commissionRate: rate,
    commissionAmount: data.price * rate,
    createdBy: user?.id,
    createdByName: user?.name,
    origin: data.origin || 'site',
    createdAt: new Date().toISOString()
  };

  const list = getBookings();
  list.unshift(booking);
  setList(KEYS.bookings, list);

  // Sync client record and history
  syncClient(booking);
  if (booking.status === 'concluido') {
    addToClientHistory(booking);
  }

  // Queue notification
  enqueueNotificationJob(booking, 'booking_created');

  audit('create_booking', 'booking', booking.id, undefined, booking);
  return { booking };
}

export function updateBooking(id: string, updates: Partial<Booking>): { booking: Booking | null; error?: string } {
  const list = getBookings();
  const idx = list.findIndex(b => b.id === id);
  if (idx === -1) return { booking: null, error: 'Agendamento não encontrado.' };

  const prev = { ...list[idx] };
  const willBeActive = (updates.status ?? prev.status) !== 'cancelado';
  const wasCancelled = prev.status === 'cancelado';

  // Re-validate conflict if changing date/time/pro/duration OR if reactivating a cancelled booking
  if (
    updates.time || updates.date || updates.professionalId || updates.duration ||
    (wasCancelled && willBeActive)
  ) {
    const professionalId = updates.professionalId ?? list[idx].professionalId;
    const date = updates.date ?? list[idx].date;
    const startTime = updates.time ?? list[idx].time;
    const duration = updates.duration ?? list[idx].duration;

    const { conflict, conflictWith } = validateConflict(professionalId, date, startTime, duration, id);
    if (conflict) {
      return { booking: null, error: `Horário indisponível! Conflito com agendamento de ${conflictWith?.clientName} às ${conflictWith?.time}.` };
    }

    // Recalc endTime
    const [h, m] = startTime.split(':').map(Number);
    const endMin = h * 60 + m + duration;
    updates.endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
  }

  if (updates.clientPhone) {
    updates.clientPhone = normalizeBrazilianPhone(updates.clientPhone);
  }

  // Preserve commission rate applied at completion
  if (updates.status === 'concluido') {
    const pro = getProfessionals().find(p => p.id === (updates.professionalId ?? prev.professionalId));
    const rate = prev.commissionRate ?? pro?.commissionRate ?? 0.5;
    const price = updates.price ?? prev.price;
    updates.commissionRate = rate;
    updates.commissionAmount = price * rate;
  }

  const user = getCurrentUser();
  list[idx] = {
    ...list[idx],
    ...updates,
    updatedBy: user?.id,
    updatedByName: user?.name,
    updatedAt: new Date().toISOString()
  };
  setList(KEYS.bookings, list);

  // Sync client record
  syncClient(list[idx]);

  // Sync history entry
  if (list[idx].status === 'concluido') {
    addToClientHistory(list[idx]);
  } else {
    updateClientHistoryStatus(list[idx]);
  }

  // Handle notifications
  if (updates.status === 'cancelado' && prev.status !== 'cancelado') {
    cancelNotificationJobsForBooking(id);
    enqueueNotificationJob(list[idx], 'booking_cancelled');
  }

  audit('update_booking', 'booking', id, prev, list[idx]);
  return { booking: list[idx] };
}

/** Remarcar (Reschedule) an appointment with full history tracking */
export function rescheduleBooking(
  id: string,
  data: {
    newDate: string;
    newTime: string;
    newProfessionalId: string;
    reason: string;
  }
): { booking: Booking | null; error?: string } {
  const list = getBookings();
  const idx = list.findIndex(b => b.id === id);
  if (idx === -1) return { booking: null, error: 'Agendamento não encontrado.' };

  const current = list[idx];

  if (!data.newDate || !data.newTime || !data.newProfessionalId) {
    return { booking: null, error: 'Selecione nova data, horário e profissional.' };
  }
  if (!data.reason || data.reason.trim().length < 3) {
    return { booking: null, error: 'Informe o motivo da remarcação (mínimo 3 caracteres).' };
  }

  const { conflict, conflictWith } = validateConflict(
    data.newProfessionalId, data.newDate, data.newTime, current.duration, id
  );
  if (conflict) {
    return { booking: null, error: `Conflito no novo horário com agendamento de ${conflictWith?.clientName} às ${conflictWith?.time}.` };
  }

  const newPro = getProfessionals().find(p => p.id === data.newProfessionalId);
  const user = getCurrentUser();

  const [h, m] = data.newTime.split(':').map(Number);
  const endMin = h * 60 + m + current.duration;
  const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

  const rescheduleEntry = {
    previousDate: current.date,
    previousTime: current.time,
    previousProfessionalId: current.professionalId,
    previousProfessionalName: current.professionalName,
    newDate: data.newDate,
    newTime: data.newTime,
    newProfessionalId: data.newProfessionalId,
    newProfessionalName: newPro?.name ?? data.newProfessionalId,
    reason: data.reason.trim(),
    changedAt: new Date().toISOString(),
    changedBy: user?.id,
    changedByName: user?.name
  };

  const updatedHistory = [...(current.rescheduleHistory || []), rescheduleEntry];

  return updateBooking(id, {
    date: data.newDate,
    time: data.newTime,
    endTime,
    professionalId: data.newProfessionalId,
    professionalName: newPro?.name ?? data.newProfessionalId,
    rescheduleHistory: updatedHistory,
    status: current.status === 'cancelado' ? 'pendente' : current.status
  });
}

export function deleteBooking(id: string): boolean {
  const list = getBookings();
  const prev = list.find(b => b.id === id);
  const filtered = list.filter(b => b.id !== id);
  setList(KEYS.bookings, filtered);
  cancelNotificationJobsForBooking(id);
  audit('delete_booking', 'booking', id, prev, undefined);
  return true;
}

// ─────────────────────────────────────
// CLIENTS & HISTORY SYNC
// ─────────────────────────────────────

export function getClients(): Client[] {
  return getList<Client>(KEYS.clients);
}

export function getClientById(id: string): Client | undefined {
  return getClients().find(c => c.id === id);
}

export function getClientByPhone(phone: string): Client | undefined {
  const normalized = normalizeBrazilianPhone(phone);
  return getClients().find(c => normalizeBrazilianPhone(c.phone) === normalized);
}

function syncClient(booking: Booking): void {
  const clients = getClients();
  const normalized = normalizeBrazilianPhone(booking.clientPhone);
  const existingIdx = clients.findIndex(c => normalizeBrazilianPhone(c.phone) === normalized);

  const allClientBookings = getBookings().filter(
    b => normalizeBrazilianPhone(b.clientPhone) === normalized
  );

  const nonCancelledBookings = allClientBookings.filter(b => b.status !== 'cancelado');
  const completedBookings = allClientBookings.filter(b => b.status === 'concluido');

  const totalSpent = completedBookings.reduce((sum, b) => sum + b.price, 0);
  const lastVisitDate = completedBookings.sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
  const firstVisitDate = nonCancelledBookings.sort((a, b) => a.date.localeCompare(b.date))[0]?.date;

  if (existingIdx >= 0) {
    const existing = clients[existingIdx];
    clients[existingIdx] = {
      ...existing,
      name: booking.clientName,
      email: booking.clientEmail ?? existing.email,
      totalVisits: nonCancelledBookings.length,
      totalSpent,
      firstVisit: firstVisitDate ?? existing.firstVisit,
      lastVisit: lastVisitDate ?? existing.lastVisit,
      updatedAt: new Date().toISOString()
    };
  } else {
    const newClient: Client = {
      id: 'cli_' + genId(),
      phone: booking.clientPhone,
      name: booking.clientName,
      email: booking.clientEmail,
      firstVisit: firstVisitDate ?? booking.date,
      lastVisit: lastVisitDate,
      totalVisits: nonCancelledBookings.length,
      totalSpent,
      createdAt: new Date().toISOString()
    };
    clients.push(newClient);
  }
  setList(KEYS.clients, clients);
}

export function createOrUpdateClient(data: Partial<Client> & { phone: string; name: string }): Client {
  const clients = getClients();
  const normalized = normalizeBrazilianPhone(data.phone);
  const existingIdx = clients.findIndex(c => normalizeBrazilianPhone(c.phone) === normalized);

  if (existingIdx >= 0) {
    clients[existingIdx] = { ...clients[existingIdx], ...data, phone: normalized, updatedAt: new Date().toISOString() };
    setList(KEYS.clients, clients);
    return clients[existingIdx];
  }

  const newClient: Client = {
    id: 'cli_' + genId(),
    totalVisits: 0,
    totalSpent: 0,
    createdAt: new Date().toISOString(),
    ...data,
    phone: normalized
  };
  clients.push(newClient);
  setList(KEYS.clients, clients);
  return newClient;
}

export function getClientHistory(clientId: string): ClientHistoryEntry[] {
  return getList<ClientHistoryEntry>(KEYS.history)
    .filter(h => h.clientId === clientId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function addToClientHistory(booking: Booking): void {
  const client = getClientByPhone(booking.clientPhone);
  if (!client) return;

  const history = getList<ClientHistoryEntry>(KEYS.history);
  const existingIdx = history.findIndex(h => h.bookingId === booking.id);

  const entry: ClientHistoryEntry = {
    id: existingIdx >= 0 ? history[existingIdx].id : 'hist_' + genId(),
    clientId: client.id,
    bookingId: booking.id,
    serviceName: booking.serviceName,
    professionalId: booking.professionalId,
    professionalName: booking.professionalName,
    date: booking.date,
    price: booking.price,
    commissionRate: booking.commissionRate,
    commissionAmount: booking.commissionAmount,
    status: booking.status,
    notes: booking.notes,
    origin: booking.origin,
    addedManually: false,
    createdBy: booking.createdBy,
    createdByName: booking.createdByName,
    createdAt: existingIdx >= 0 ? history[existingIdx].createdAt : new Date().toISOString()
  };

  if (existingIdx >= 0) {
    history[existingIdx] = entry;
  } else {
    history.unshift(entry);
  }
  setList(KEYS.history, history);
}

function updateClientHistoryStatus(booking: Booking): void {
  const history = getList<ClientHistoryEntry>(KEYS.history);
  const idx = history.findIndex(h => h.bookingId === booking.id);
  if (idx >= 0) {
    history[idx] = {
      ...history[idx],
      status: booking.status,
      date: booking.date,
      price: booking.price
    };
    setList(KEYS.history, history);
  }
}

export function addManualHistoryEntry(
  clientId: string,
  data: {
    serviceName: string;
    professionalId: string;
    professionalName: string;
    date: string;
    price: number;
    notes?: string;
  }
): ClientHistoryEntry {
  const user = getCurrentUser();
  const pro = getProfessionals().find(p => p.id === data.professionalId);
  const settings = getBusinessSettings();
  const rate = pro?.commissionRate ?? settings.commissionDefaultRate ?? 0.5;

  const entry: ClientHistoryEntry = {
    id: 'hist_' + genId(),
    clientId,
    serviceName: data.serviceName,
    professionalId: data.professionalId,
    professionalName: data.professionalName,
    date: data.date,
    price: data.price,
    commissionRate: rate,
    commissionAmount: data.price * rate,
    status: 'concluido',
    notes: data.notes,
    origin: 'manual_admin',
    addedManually: true,
    createdBy: user?.id,
    createdByName: user?.name,
    createdAt: new Date().toISOString()
  };
  const history = getList<ClientHistoryEntry>(KEYS.history);
  history.unshift(entry);
  setList(KEYS.history, history);

  // Recalculate client totals
  const client = getClientById(clientId);
  if (client) {
    const allHistory = getClientHistory(clientId).filter(h => h.status === 'concluido');
    const totalSpent = allHistory.reduce((s, h) => s + h.price, 0);
    const lastVisit = allHistory.sort((a, b) => b.date.localeCompare(a.date))[0]?.date ?? client.lastVisit;
    createOrUpdateClient({
      phone: client.phone,
      name: client.name,
      totalSpent,
      lastVisit
    });
  }

  audit('add_manual_history', 'client_history', clientId, undefined, entry);
  return entry;
}

// ─────────────────────────────────────
// AVAILABILITY RULES & SCHEDULE BLOCKS
// ─────────────────────────────────────

export function getAvailabilityRules(professionalId?: string): AvailabilityRule[] {
  const all = getList<AvailabilityRule>(KEYS.availability);
  if (professionalId) return all.filter(r => r.professionalId === professionalId);
  return all;
}

export function getDefaultAvailabilityRules(professionalId: string): AvailabilityRule[] {
  const rules: AvailabilityRule[] = [];
  for (const day of [2, 3, 4, 5] as const) {
    rules.push({
      id: `default_${professionalId}_${day}`,
      professionalId,
      dayOfWeek: day,
      startTime: '08:00',
      endTime: '18:00',
      breakStart: '11:30',
      breakEnd: '14:00',
      slotDuration: 30,
      active: true
    });
  }
  rules.push({
    id: `default_${professionalId}_6`,
    professionalId,
    dayOfWeek: 6,
    startTime: '08:00',
    endTime: '18:00',
    slotDuration: 30,
    active: true
  });
  return rules;
}

export function upsertAvailabilityRule(rule: Omit<AvailabilityRule, 'id'> & { id?: string }): AvailabilityRule {
  const list = getList<AvailabilityRule>(KEYS.availability);
  const id = rule.id ?? 'avail_' + genId();
  const existing = list.findIndex(r => r.id === id);
  const final: AvailabilityRule = { ...rule, id };
  if (existing >= 0) {
    list[existing] = final;
  } else {
    list.push(final);
  }
  setList(KEYS.availability, list);
  return final;
}

export function getScheduleBlocks(professionalId?: string): ScheduleBlock[] {
  const all = getList<ScheduleBlock>(KEYS.blocks);
  if (professionalId) return all.filter(b => b.professionalId === professionalId);
  return all;
}

export function createScheduleBlock(data: Omit<ScheduleBlock, 'id' | 'createdAt'>): ScheduleBlock {
  const user = getCurrentUser();
  const block: ScheduleBlock = {
    ...data,
    id: 'blk_' + genId(),
    createdBy: user?.id,
    createdAt: new Date().toISOString()
  };
  const list = getList<ScheduleBlock>(KEYS.blocks);
  list.push(block);
  setList(KEYS.blocks, list);
  audit('create_block', 'schedule_block', block.id, undefined, block);
  return block;
}

export function deleteScheduleBlock(id: string): boolean {
  const list = getList<ScheduleBlock>(KEYS.blocks);
  const prev = list.find(b => b.id === id);
  setList(KEYS.blocks, list.filter(b => b.id !== id));
  audit('delete_block', 'schedule_block', id, prev, undefined);
  return true;
}

// ─────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────

export function getAuditLogs(limit = 100): AuditLog[] {
  return getList<AuditLog>(KEYS.auditLogs).slice(0, limit);
}

// ─────────────────────────────────────
// DEMO DATA SEEDING (RESTRICTED TO DEMO MODE)
// ─────────────────────────────────────

export function seedDemoData(): void {
  // Check if demo data is already initialized
  const seededFlag = localStorage.getItem(KEYS.demoSeeded);
  const existingBookings = getList<Booking>(KEYS.bookings);

  if (seededFlag || existingBookings.length > 0) {
    rebuildClientsFromBookings();
    return;
  }

  // Populate initial demo data ONLY on first launch of demo workspace
  const getRelativeDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  const demoBookings: Omit<Booking, 'id' | 'createdAt'>[] = [
    { serviceId:'corte', serviceName:'Corte Feminino', professionalId:'fernanda', professionalName:'Fernanda', date:getRelativeDate(-2), time:'09:00', duration:60, clientName:'Ana Paula Santos', clientPhone:'5538988451243', clientEmail:'anapaula@gmail.com', status:'concluido', price:70, commissionRate:0.5, commissionAmount:35, origin:'site', endTime:'10:00' },
    { serviceId:'pe-e-mao', serviceName:'Pé e Mão', professionalId:'evelyn', professionalName:'Evelyn', date:getRelativeDate(-2), time:'14:30', duration:80, clientName:'Beatriz Souza', clientPhone:'5538991223847', status:'concluido', price:70, commissionRate:0.5, commissionAmount:35, origin:'site', endTime:'15:50' },
    { serviceId:'progressiva-sem-formol', serviceName:'Progressiva Sem Formol', professionalId:'railma', professionalName:'Railma', date:getRelativeDate(-1), time:'08:30', duration:150, clientName:'Camila Lima', clientPhone:'5538998231122', notes:'Possui mechas loiras', status:'concluido', price:210, commissionRate:0.5, commissionAmount:105, origin:'site', endTime:'11:00' },
    { serviceId:'hidratacao-ozonio', serviceName:'Hidratação + Ozonioterapia', professionalId:'rosy', professionalName:'Rosy', date:getRelativeDate(-1), time:'15:00', duration:50, clientName:'Débora Santos', clientPhone:'5538991045544', status:'concluido', price:120, commissionRate:0.5, commissionAmount:60, origin:'site', endTime:'15:50' },
    { serviceId:'spa-dos-pes', serviceName:'Spa dos Pés', professionalId:'evelyn', professionalName:'Evelyn', date:getRelativeDate(0), time:'09:00', duration:40, clientName:'Amanda Silva', clientPhone:'5538992014477', status:'pendente', price:60, origin:'site', endTime:'09:40' },
    { serviceId:'make-completa', serviceName:'Maquiagem + Cílios Postiços', professionalId:'roberta', professionalName:'Roberta', date:getRelativeDate(0), time:'11:00', duration:70, clientName:'Juliana Costa', clientPhone:'5538988227711', notes:'Formatura. Tons terrosos.', status:'pendente', price:180, origin:'site', endTime:'12:10' },
    { serviceId:'drenagem-corporal', serviceName:'Drenagem Linfática', professionalId:'fabiana', professionalName:'Fabiana', date:getRelativeDate(0), time:'14:30', duration:60, clientName:'Patrícia Alves', clientPhone:'5538991448855', status:'pendente', price:100, origin:'site', endTime:'15:30' },
    { serviceId:'design-henna', serviceName:'Design + Henna', professionalId:'railma', professionalName:'Railma', date:getRelativeDate(0), time:'16:00', duration:45, clientName:'Letícia Dias', clientPhone:'5538999205521', status:'pendente', price:55, origin:'site', endTime:'16:45' },
    { serviceId:'escova-simples', serviceName:'Escova', professionalId:'fernanda', professionalName:'Fernanda', date:getRelativeDate(0), time:'17:00', duration:45, clientName:'Bruna Gomes', clientPhone:'5538992001122', status:'pendente', price:45, origin:'site', endTime:'17:45' },
    { serviceId:'cilios-volume', serviceName:'Volume Russo', professionalId:'geovanna', professionalName:'Geovanna', date:getRelativeDate(1), time:'09:30', duration:150, clientName:'Sofia Melo', clientPhone:'5538991823847', notes:'Primeira vez.', status:'pendente', price:160, origin:'site', endTime:'12:00' }
  ];

  const bookings: Booking[] = demoBookings.map(b => ({
    ...b,
    id: 'bk_' + genId(),
    createdAt: new Date().toISOString()
  }));

  setList(KEYS.bookings, bookings);
  localStorage.setItem(KEYS.demoSeeded, 'true');
  rebuildClientsFromBookings();
}

/** Explicitly reset demo data for testing */
export function resetDemoData(): void {
  localStorage.removeItem(KEYS.bookings);
  localStorage.removeItem(KEYS.clients);
  localStorage.removeItem(KEYS.history);
  localStorage.removeItem(KEYS.notifications);
  localStorage.removeItem(KEYS.demoSeeded);
  seedDemoData();
}

function rebuildClientsFromBookings(): void {
  const bookings = getList<Booking>(KEYS.bookings);
  const clientMap = new Map<string, Client>();
  const historyEntries: ClientHistoryEntry[] = [];

  for (const b of bookings) {
    const normalized = normalizeBrazilianPhone(b.clientPhone);
    const existing = clientMap.get(normalized);

    if (existing) {
      if (b.status !== 'cancelado') existing.totalVisits += 1;
      if (b.status === 'concluido') {
        existing.totalSpent += b.price;
        if (!existing.lastVisit || b.date > existing.lastVisit) existing.lastVisit = b.date;
      }
      if (!existing.firstVisit || b.date < existing.firstVisit) existing.firstVisit = b.date;
    } else {
      clientMap.set(normalized, {
        id: 'cli_' + (normalized || genId()),
        phone: b.clientPhone,
        name: b.clientName,
        email: b.clientEmail,
        firstVisit: b.date,
        lastVisit: b.status === 'concluido' ? b.date : undefined,
        totalVisits: b.status !== 'cancelado' ? 1 : 0,
        totalSpent: b.status === 'concluido' ? b.price : 0,
        createdAt: b.createdAt
      });
    }

    if (b.status === 'concluido') {
      const clientId = 'cli_' + (normalized || genId());
      if (!historyEntries.find(h => h.bookingId === b.id)) {
        historyEntries.push({
          id: 'hist_' + b.id,
          clientId,
          bookingId: b.id,
          serviceName: b.serviceName,
          professionalId: b.professionalId,
          professionalName: b.professionalName,
          date: b.date,
          price: b.price,
          commissionRate: b.commissionRate ?? 0.5,
          commissionAmount: b.commissionAmount ?? (b.price * 0.5),
          status: b.status,
          notes: b.notes,
          origin: b.origin || 'site',
          addedManually: false,
          createdAt: b.createdAt
        });
      }
    }
  }

  setList(KEYS.clients, Array.from(clientMap.values()));
  const existingHistory = getList<ClientHistoryEntry>(KEYS.history);
  if (existingHistory.length === 0) {
    setList(KEYS.history, historyEntries);
  }
}
