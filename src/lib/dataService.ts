// ─────────────────────────────────────────────
// CUIDARE — Data Service (localStorage)
// Todas as operações de CRUD centralizadas aqui.
// Quando migrar para Supabase: substitua apenas este arquivo.
// ─────────────────────────────────────────────

import type {
  Booking, Client, ClientHistoryEntry, AvailabilityRule,
  ScheduleBlock, AuditLog, Professional
} from '../types';
import { professionals as seedProfessionals } from '../data/professionalsData';
import { getCurrentUser } from './auth';
import { timeToMinutes } from './availability';

// ── Storage keys
const KEYS = {
  bookings: 'cuidare_bookings_v2',
  clients: 'cuidare_clients_v2',
  history: 'cuidare_history_v2',
  availability: 'cuidare_availability_v2',
  blocks: 'cuidare_blocks_v2',
  professionals: 'cuidare_professionals_v2',
  auditLogs: 'cuidare_audit_v2',
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
  // Keep only last 500 logs
  setList(KEYS.auditLogs, logs.slice(0, 500));
}

// ─────────────────────────────────────
// PROFESSIONALS
// ─────────────────────────────────────

export function getProfessionals(): Professional[] {
  const stored = getList<Professional>(KEYS.professionals);
  if (stored.length === 0) {
    const seeded = seedProfessionals.map(p => ({ ...p, active: true, commissionRate: 0.5 }));
    setList(KEYS.professionals, seeded);
    return seeded;
  }

  // Ensure all seed professionals (like Maisa and updated whatsapp numbers) are merged into stored data
  let updated = false;
  const merged = [...stored];

  seedProfessionals.forEach(seedPro => {
    const existingIdx = merged.findIndex(p => p.id === seedPro.id);
    if (existingIdx === -1) {
      merged.push({ ...seedPro, active: true, commissionRate: 0.5 });
      updated = true;
    } else {
      const existing = merged[existingIdx];
      let itemChanged = false;
      const patch: Partial<Professional> = {};

      if (seedPro.whatsapp && existing.whatsapp !== seedPro.whatsapp) {
        patch.whatsapp = seedPro.whatsapp;
        itemChanged = true;
      }
      if (seedPro.specialtyHighlight && existing.specialtyHighlight !== seedPro.specialtyHighlight) {
        patch.specialtyHighlight = seedPro.specialtyHighlight;
        itemChanged = true;
      }
      if (seedPro.specialtyBadge && existing.specialtyBadge !== seedPro.specialtyBadge) {
        patch.specialtyBadge = seedPro.specialtyBadge;
        itemChanged = true;
      }

      if (itemChanged) {
        merged[existingIdx] = { ...existing, ...patch };
        updated = true;
      }
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
  const { conflict, conflictWith } = validateConflict(
    data.professionalId, data.date, data.time, data.duration
  );
  if (conflict) {
    return { booking: null, error: `Conflito de horário com o agendamento de ${conflictWith?.clientName} às ${conflictWith?.time}.` };
  }

  const user = getCurrentUser();
  const [h, m] = data.time.split(':').map(Number);
  const endMin = h * 60 + m + data.duration;
  const endHour = Math.floor(endMin / 60);
  const endMinutes = endMin % 60;
  const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

  const booking: Booking = {
    ...data,
    id: 'bk_' + genId(),
    endTime,
    createdBy: user?.id,
    createdByName: user?.name,
    origin: data.origin || 'site',
    createdAt: new Date().toISOString()
  };

  const list = getBookings();
  list.unshift(booking);
  setList(KEYS.bookings, list);

  // Sync client record
  syncClient(booking);

  audit('create_booking', 'booking', booking.id, undefined, booking);
  return { booking };
}

export function updateBooking(id: string, updates: Partial<Booking>): { booking: Booking | null; error?: string } {
  const list = getBookings();
  const idx = list.findIndex(b => b.id === id);
  if (idx === -1) return { booking: null, error: 'Agendamento não encontrado.' };

  const prev = { ...list[idx] };

  // If changing time/date/professional, re-validate conflict
  if (updates.time || updates.date || updates.professionalId || updates.duration) {
    const professionalId = updates.professionalId ?? list[idx].professionalId;
    const date = updates.date ?? list[idx].date;
    const startTime = updates.time ?? list[idx].time;
    const duration = updates.duration ?? list[idx].duration;

    const { conflict, conflictWith } = validateConflict(professionalId, date, startTime, duration, id);
    if (conflict) {
      return { booking: null, error: `Conflito com o agendamento de ${conflictWith?.clientName} às ${conflictWith?.time}.` };
    }

    // Recalc endTime
    const [h, m] = startTime.split(':').map(Number);
    const endMin = h * 60 + m + duration;
    updates.endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
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

  // If status changed to 'concluido', sync history
  if (updates.status === 'concluido' && prev.status !== 'concluido') {
    addToClientHistory(list[idx]);
  }

  audit('update_booking', 'booking', id, prev, list[idx]);
  return { booking: list[idx] };
}

export function deleteBooking(id: string): boolean {
  const list = getBookings();
  const prev = list.find(b => b.id === id);
  const filtered = list.filter(b => b.id !== id);
  setList(KEYS.bookings, filtered);
  audit('delete_booking', 'booking', id, prev, undefined);
  return true;
}

// ─────────────────────────────────────
// CLIENTS
// ─────────────────────────────────────

export function getClients(): Client[] {
  return getList<Client>(KEYS.clients);
}

export function getClientById(id: string): Client | undefined {
  return getClients().find(c => c.id === id);
}

export function getClientByPhone(phone: string): Client | undefined {
  const normalized = phone.replace(/\D/g, '');
  return getClients().find(c => c.phone.replace(/\D/g, '') === normalized);
}

function syncClient(booking: Booking): void {
  const clients = getClients();
  const normalized = booking.clientPhone.replace(/\D/g, '');
  const existingIdx = clients.findIndex(c => c.phone.replace(/\D/g, '') === normalized);

  if (existingIdx >= 0) {
    const existing = clients[existingIdx];
    const allBookings = getBookings().filter(
      b => b.clientPhone.replace(/\D/g, '') === normalized && b.status !== 'cancelado'
    );
    clients[existingIdx] = {
      ...existing,
      name: booking.clientName,
      email: booking.clientEmail ?? existing.email,
      totalVisits: allBookings.length,
      totalSpent: allBookings.filter(b => b.status === 'concluido').reduce((s, b) => s + b.price, 0),
      lastVisit: allBookings.filter(b => b.status === 'concluido').sort((a, b) => b.date.localeCompare(a.date))[0]?.date ?? existing.lastVisit,
      updatedAt: new Date().toISOString()
    };
  } else {
    const newClient: Client = {
      id: 'cli_' + genId(),
      phone: booking.clientPhone,
      name: booking.clientName,
      email: booking.clientEmail,
      firstVisit: booking.date,
      lastVisit: booking.status === 'concluido' ? booking.date : undefined,
      totalVisits: 1,
      totalSpent: booking.status === 'concluido' ? booking.price : 0,
      createdAt: new Date().toISOString()
    };
    clients.push(newClient);
  }
  setList(KEYS.clients, clients);
}

export function createOrUpdateClient(data: Partial<Client> & { phone: string; name: string }): Client {
  const clients = getClients();
  const normalized = data.phone.replace(/\D/g, '');
  const existingIdx = clients.findIndex(c => c.phone.replace(/\D/g, '') === normalized);

  if (existingIdx >= 0) {
    clients[existingIdx] = { ...clients[existingIdx], ...data, updatedAt: new Date().toISOString() };
    setList(KEYS.clients, clients);
    return clients[existingIdx];
  }

  const newClient: Client = {
    id: 'cli_' + genId(),
    totalVisits: 0,
    totalSpent: 0,
    createdAt: new Date().toISOString(),
    ...data
  };
  clients.push(newClient);
  setList(KEYS.clients, clients);
  return newClient;
}

// ─────────────────────────────────────
// CLIENT HISTORY
// ─────────────────────────────────────

export function getClientHistory(clientId: string): ClientHistoryEntry[] {
  return getList<ClientHistoryEntry>(KEYS.history)
    .filter(h => h.clientId === clientId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function addToClientHistory(booking: Booking): void {
  const client = getClientByPhone(booking.clientPhone);
  if (!client) return;

  const history = getList<ClientHistoryEntry>(KEYS.history);
  // Avoid duplicates
  if (history.find(h => h.bookingId === booking.id)) return;

  const entry: ClientHistoryEntry = {
    id: 'hist_' + genId(),
    clientId: client.id,
    bookingId: booking.id,
    serviceName: booking.serviceName,
    professionalId: booking.professionalId,
    professionalName: booking.professionalName,
    date: booking.date,
    price: booking.price,
    status: booking.status,
    notes: booking.notes,
    origin: booking.origin,
    addedManually: false,
    createdBy: booking.createdBy,
    createdByName: booking.createdByName,
    createdAt: new Date().toISOString()
  };
  history.unshift(entry);
  setList(KEYS.history, history);
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
  const entry: ClientHistoryEntry = {
    id: 'hist_' + genId(),
    clientId,
    serviceName: data.serviceName,
    professionalId: data.professionalId,
    professionalName: data.professionalName,
    date: data.date,
    price: data.price,
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
  audit('add_manual_history', 'client_history', clientId, undefined, entry);
  return entry;
}

// ─────────────────────────────────────
// AVAILABILITY
// ─────────────────────────────────────

export function getAvailabilityRules(professionalId?: string): AvailabilityRule[] {
  const all = getList<AvailabilityRule>(KEYS.availability);
  if (professionalId) return all.filter(r => r.professionalId === professionalId);
  return all;
}

export function getDefaultAvailabilityRules(professionalId: string): AvailabilityRule[] {
  // Default: Tue–Fri 08:00–11:30 break, 14:00–18:00; Sat 08:00–18:00
  const rules: AvailabilityRule[] = [];
  // Tue(2) to Fri(5)
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
  // Saturday(6)
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

// ─────────────────────────────────────
// SCHEDULE BLOCKS
// ─────────────────────────────────────

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
// SEED DEMO DATA
// ─────────────────────────────────────

export function seedDemoData(): void {
  // Only seed if bookings_v2 is empty (migration from v1)
  const existing = getList<Booking>(KEYS.bookings);
  if (existing.length > 0) {
    // Already seeded — also ensure clients are built from bookings
    rebuildClientsFromBookings();
    return;
  }

  const getRelativeDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  // Also migrate old v1 bookings if present
  const oldBookings = localStorage.getItem('cuidare_bookings');
  if (oldBookings) {
    try {
      const parsed: Omit<Booking, 'endTime' | 'origin' | 'createdByName'>[] = JSON.parse(oldBookings);
      const migrated: Booking[] = parsed.map(b => ({
        ...b,
        origin: 'site' as const,
        endTime: (() => {
          const [h, m] = b.time.split(':').map(Number);
          const end = h * 60 + m + b.duration;
          return `${String(Math.floor(end / 60)).padStart(2,'0')}:${String(end % 60).padStart(2,'0')}`;
        })()
      }));
      setList(KEYS.bookings, migrated);
      rebuildClientsFromBookings();
      return;
    } catch { /* fall through to demo data */ }
  }

  const demoBookings: Omit<Booking, 'id' | 'createdAt'>[] = [
    { serviceId:'corte', serviceName:'Corte Feminino', professionalId:'fernanda', professionalName:'Fernanda', date:getRelativeDate(-2), time:'09:00', duration:60, clientName:'Ana Paula Santos', clientPhone:'38 98845-1243', clientEmail:'anapaula@gmail.com', status:'concluido', price:70, origin:'site', endTime:'10:00' },
    { serviceId:'pe-e-mao', serviceName:'Pé e Mão', professionalId:'evelyn', professionalName:'Evelyn', date:getRelativeDate(-2), time:'14:30', duration:80, clientName:'Beatriz Souza', clientPhone:'38 99122-3847', status:'concluido', price:70, origin:'site', endTime:'15:50' },
    { serviceId:'progressiva-sem-formol', serviceName:'Progressiva Sem Formol', professionalId:'railma', professionalName:'Railma', date:getRelativeDate(-1), time:'08:30', duration:150, clientName:'Camila Lima', clientPhone:'38 99823-1122', notes:'Possui mechas loiras', status:'concluido', price:210, origin:'site', endTime:'11:00' },
    { serviceId:'hidratacao-ozonio', serviceName:'Hidratação + Ozonioterapia', professionalId:'rosy', professionalName:'Rosy', date:getRelativeDate(-1), time:'15:00', duration:50, clientName:'Débora Santos', clientPhone:'38 99104-5544', status:'concluido', price:120, origin:'site', endTime:'15:50' },
    { serviceId:'spa-dos-pes', serviceName:'Spa dos Pés', professionalId:'evelyn', professionalName:'Evelyn', date:getRelativeDate(0), time:'09:00', duration:40, clientName:'Amanda Silva', clientPhone:'38 99201-4477', status:'pendente', price:60, origin:'site', endTime:'09:40' },
    { serviceId:'make-completa', serviceName:'Maquiagem + Cílios Postiços', professionalId:'roberta', professionalName:'Roberta', date:getRelativeDate(0), time:'11:00', duration:70, clientName:'Juliana Costa', clientPhone:'38 98822-7711', notes:'Formatura. Tons terrosos.', status:'pendente', price:180, origin:'site', endTime:'12:10' },
    { serviceId:'drenagem-corporal', serviceName:'Drenagem Linfática', professionalId:'fabiana', professionalName:'Fabiana', date:getRelativeDate(0), time:'14:30', duration:60, clientName:'Patrícia Alves', clientPhone:'38 99144-8855', status:'pendente', price:100, origin:'site', endTime:'15:30' },
    { serviceId:'design-henna', serviceName:'Design + Henna', professionalId:'railma', professionalName:'Railma', date:getRelativeDate(0), time:'16:00', duration:45, clientName:'Letícia Dias', clientPhone:'38 99920-5521', status:'pendente', price:55, origin:'site', endTime:'16:45' },
    { serviceId:'escova-simples', serviceName:'Escova', professionalId:'fernanda', professionalName:'Fernanda', date:getRelativeDate(0), time:'17:00', duration:45, clientName:'Bruna Gomes', clientPhone:'38 99200-1122', status:'pendente', price:45, origin:'site', endTime:'17:45' },
    { serviceId:'cilios-volume', serviceName:'Volume Russo', professionalId:'geovanna', professionalName:'Geovanna', date:getRelativeDate(1), time:'09:30', duration:150, clientName:'Sofia Melo', clientPhone:'38 99182-3847', notes:'Primeira vez.', status:'pendente', price:160, origin:'site', endTime:'12:00' }
  ];

  const bookings: Booking[] = demoBookings.map(b => ({
    ...b,
    id: 'bk_' + genId(),
    createdAt: new Date().toISOString()
  }));

  setList(KEYS.bookings, bookings);
  rebuildClientsFromBookings();
}

function rebuildClientsFromBookings(): void {
  const bookings = getList<Booking>(KEYS.bookings);
  const clientMap = new Map<string, Client>();
  const historyEntries: ClientHistoryEntry[] = [];

  for (const b of bookings) {
    const normalized = b.clientPhone.replace(/\D/g, '');
    const existing = clientMap.get(normalized);

    if (existing) {
      existing.totalVisits += 1;
      if (b.status === 'concluido') {
        existing.totalSpent += b.price;
        if (!existing.lastVisit || b.date > existing.lastVisit) existing.lastVisit = b.date;
      }
      if (!existing.firstVisit || b.date < existing.firstVisit) existing.firstVisit = b.date;
    } else {
      clientMap.set(normalized, {
        id: 'cli_' + normalized,
        phone: b.clientPhone,
        name: b.clientName,
        email: b.clientEmail,
        firstVisit: b.date,
        lastVisit: b.status === 'concluido' ? b.date : undefined,
        totalVisits: 1,
        totalSpent: b.status === 'concluido' ? b.price : 0,
        createdAt: b.createdAt
      });
    }

    if (b.status === 'concluido') {
      const clientId = 'cli_' + normalized;
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
          status: b.status,
          notes: b.notes,
          origin: b.origin || 'site',
          addedManually: false,
          createdAt: b.createdAt
        });
      }
    }
  }

  const existingClients = getList<Client>(KEYS.clients);
  if (existingClients.length === 0) {
    setList(KEYS.clients, Array.from(clientMap.values()));
  }

  const existingHistory = getList<ClientHistoryEntry>(KEYS.history);
  if (existingHistory.length === 0) {
    setList(KEYS.history, historyEntries);
  }
}
