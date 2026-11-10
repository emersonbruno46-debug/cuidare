// ─────────────────────────────────────────────
// CUIDARE — Dados do salão (Supabase)
//
// Como funciona:
//  • Os dados ficam no banco do Supabase. Este arquivo busca o que a pessoa
//    logada pode ver e guarda uma cópia na memória do navegador.
//  • As telas leem essa cópia na hora (getBookings, getClients...).
//  • Toda alteração vai para o banco primeiro; se o banco aceitar, a cópia é atualizada.
//  • O banco é quem decide regras importantes: conflito de horário, comissão,
//    histórico da cliente, mensagens de WhatsApp e registro de alterações.
// ─────────────────────────────────────────────

import { useSyncExternalStore } from 'react';
import type {
  Booking, BookingStatus, BookingOrigin, Client, ClientHistoryEntry, AvailabilityRule,
  ScheduleBlock, AuditLog, Professional, NotificationJob, BusinessSettings,
  RescheduleEntry, ServiceCategory, UserRole
} from '../types';
import { professionals as staticProfessionals } from '../data/professionalsData';
import { getCurrentUser } from './auth';
import { getSupabase, isSupabaseConfigured, friendlyDbError } from './supabase';
import { timeToMinutes, isProfessionalAvailableForWindow, getNowInSaoPaulo } from './availability';
import {
  getBusinessSettings, setBusinessSettingsCache, normalizeBrazilianPhone, DEFAULT_SETTINGS
} from './businessSettings';

// ═════════════════════════════════════════════
// MEMÓRIA (cópia local do que veio do banco)
// ═════════════════════════════════════════════

export interface StaffMember {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  professionalId?: string;
  active: boolean;
  createdAt: string;
}

interface Cache {
  professionals: Professional[];
  bookings: Booking[];
  clients: Client[];
  history: ClientHistoryEntry[];
  rules: AvailabilityRule[];
  blocks: ScheduleBlock[];
  staff: StaffMember[];
  auditLogs: AuditLog[];
}

const emptyCache = (): Cache => ({
  professionals: [], bookings: [], clients: [], history: [], rules: [], blocks: [], staff: [], auditLogs: []
});

let cache: Cache = emptyCache();
let version = 0;
const listeners = new Set<() => void>();

function changed() {
  version++;
  listeners.forEach(l => l());
}

/** Faz a tela redesenhar quando os dados chegam ou mudam. */
export function useDataVersion(): number {
  return useSyncExternalStore(
    l => { listeners.add(l); return () => listeners.delete(l); },
    () => version,
    () => version
  );
}

// ═════════════════════════════════════════════
// CONVERSÃO banco ⇄ site
// ═════════════════════════════════════════════

type Row = Record<string, unknown>;
const hhmm = (t: unknown): string => (typeof t === 'string' ? t.slice(0, 5) : '');
const optHhmm = (t: unknown): string | undefined => (typeof t === 'string' ? t.slice(0, 5) : undefined);
const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
const optNum = (v: unknown): number | undefined => (v === null || v === undefined ? undefined : Number(v));
const optStr = (v: unknown): string | undefined => (v === null || v === undefined || v === '' ? undefined : String(v));

function toProfessional(r: Row): Professional {
  return {
    id: String(r.id),
    name: String(r.name),
    role: String(r.role ?? ''),
    categories: (r.categories as ServiceCategory[]) ?? [],
    photoUrl: optStr(r.photo_url),
    avatarUrl: optStr(r.avatar_url),
    bio: String(r.bio ?? ''),
    specialties: (r.specialties as string[]) ?? [],
    specialtyHighlight: optStr(r.specialty_highlight),
    specialtyBadge: optStr(r.specialty_badge),
    providerType: (r.provider_type as Professional['providerType']) ?? 'internal',
    whatsapp: optStr(r.whatsapp),
    instagram: optStr(r.instagram),
    commissionRate: num(r.commission_rate),
    active: r.active !== false
  };
}

function toBooking(r: Row): Booking {
  return {
    id: String(r.id),
    serviceId: String(r.service_id),
    serviceName: String(r.service_name),
    professionalId: String(r.professional_id),
    professionalName: String(r.professional_name),
    date: String(r.date),
    time: hhmm(r.start_time),
    endTime: hhmm(r.end_time),
    duration: num(r.duration),
    clientId: optStr(r.client_id),
    clientName: String(r.client_name),
    clientPhone: String(r.client_phone),
    clientEmail: optStr(r.client_email),
    notes: optStr(r.notes),
    status: r.status as BookingStatus,
    price: num(r.price),
    commissionRate: optNum(r.commission_rate),
    commissionAmount: optNum(r.commission_amount),
    paymentStatus: r.payment_status as Booking['paymentStatus'],
    paymentMethod: optStr(r.payment_method),
    origin: r.origin as BookingOrigin,
    createdBy: optStr(r.created_by),
    createdByName: optStr(r.created_by_name),
    updatedBy: optStr(r.updated_by),
    updatedByName: optStr(r.updated_by_name),
    createdAt: String(r.created_at),
    updatedAt: optStr(r.updated_at),
    rescheduleHistory: (r.reschedule_history as RescheduleEntry[]) ?? [],
    cancelReason: optStr(r.cancel_reason),
    manageToken: optStr(r.manage_token)
  };
}

function toClient(r: Row): Client {
  return {
    id: String(r.id),
    phone: String(r.phone),
    name: String(r.name),
    email: optStr(r.email),
    birthDate: optStr(r.birth_date),
    notes: optStr(r.notes),
    firstVisit: optStr(r.first_visit),
    lastVisit: optStr(r.last_visit),
    totalVisits: num(r.total_visits),
    totalSpent: num(r.total_spent),
    createdAt: String(r.created_at),
    updatedAt: optStr(r.updated_at)
  };
}

function toHistory(r: Row): ClientHistoryEntry {
  return {
    id: String(r.id),
    clientId: String(r.client_id),
    bookingId: optStr(r.booking_id),
    serviceName: String(r.service_name),
    professionalId: String(r.professional_id ?? ''),
    professionalName: String(r.professional_name),
    date: String(r.date),
    price: num(r.price),
    commissionRate: optNum(r.commission_rate),
    commissionAmount: optNum(r.commission_amount),
    status: r.status as BookingStatus,
    notes: optStr(r.notes),
    origin: r.origin as BookingOrigin,
    addedManually: r.added_manually === true,
    createdBy: optStr(r.created_by),
    createdByName: optStr(r.created_by_name),
    createdAt: String(r.created_at)
  };
}

function toRule(r: Row): AvailabilityRule {
  return {
    id: String(r.id),
    professionalId: String(r.professional_id),
    dayOfWeek: num(r.day_of_week) as AvailabilityRule['dayOfWeek'],
    startTime: hhmm(r.start_time),
    endTime: hhmm(r.end_time),
    breakStart: optHhmm(r.break_start),
    breakEnd: optHhmm(r.break_end),
    slotDuration: num(r.slot_duration) || 30,
    active: r.active !== false
  };
}

function toBlock(r: Row): ScheduleBlock {
  return {
    id: String(r.id),
    professionalId: String(r.professional_id),
    date: optStr(r.date),
    startTime: optHhmm(r.start_time),
    endTime: optHhmm(r.end_time),
    allDay: r.all_day === true,
    reason: optStr(r.reason),
    type: r.type as ScheduleBlock['type'],
    createdBy: optStr(r.created_by),
    createdAt: String(r.created_at)
  };
}

function toStaff(r: Row): StaffMember {
  return {
    userId: String(r.user_id),
    name: String(r.name),
    email: String(r.email),
    role: r.role as UserRole,
    professionalId: optStr(r.professional_id),
    active: r.active !== false,
    createdAt: String(r.created_at)
  };
}

function toAudit(r: Row): AuditLog {
  return {
    id: String(r.id),
    userId: String(r.user_id ?? 'public'),
    userName: String(r.user_name ?? 'Site (público)'),
    userRole: (r.user_role as UserRole) ?? 'collaborator',
    action: String(r.action),
    entityType: String(r.entity_type),
    entityId: String(r.entity_id ?? ''),
    previousValues: (r.previous_values as Record<string, unknown>) ?? undefined,
    newValues: (r.new_values as Record<string, unknown>) ?? undefined,
    createdAt: String(r.created_at)
  };
}

function toSettings(s: Row | null, hours: Row[]): BusinessSettings {
  const base = { ...DEFAULT_SETTINGS };
  const openingHours = hours.length === 7
    ? [...hours]
        .sort((a, b) => num(a.day_of_week) - num(b.day_of_week))
        .map(h => ({
          dayOfWeek: num(h.day_of_week),
          closed: h.closed === true,
          open: hhmm(h.open_time),
          close: hhmm(h.close_time),
          breakStart: optHhmm(h.break_start),
          breakEnd: optHhmm(h.break_end)
        }))
    : base.openingHours;
  if (!s) return { ...base, openingHours };
  return {
    id: String(s.id),
    salonName: String(s.salon_name),
    address: String(s.address),
    city: String(s.city),
    state: String(s.state),
    instagramUrl: optStr(s.instagram_url) ?? '',
    businessWhatsapp: optStr(s.business_whatsapp),
    businessWhatsappMessage: optStr(s.business_whatsapp_message),
    openingHours,
    commissionDefaultRate: num(s.commission_default_rate),
    minLeadTimeMinutes: num(s.min_lead_time_minutes),
    maxAdvanceDays: num(s.max_advance_days),
    updatedAt: String(s.updated_at)
  };
}

/** Busca todas as linhas, de 1000 em 1000 (limite do Supabase por pedido). */
async function fetchAll(table: string, configure?: (q: any) => any): Promise<Row[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: Row[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    let q = getSupabase().from(table).select('*');
    if (configure) q = configure(q);
    const { data, error } = await q.range(from, from + page - 1);
    if (error) throw error;
    out.push(...(data as Row[]));
    if (!data || data.length < page) break;
  }
  return out;
}

// ═════════════════════════════════════════════
// CARREGAMENTO
// ═════════════════════════════════════════════

/** Limpa dados de versões antigas do site que ficavam guardados no navegador. */
export function clearLegacyLocalData(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('cuidare_')) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  } catch { /* navegador sem acesso ao armazenamento */ }
}

let publicLoaded = false;

/** Dados que qualquer visitante pode ver: equipe e horário do salão. */
export async function loadPublicData(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const supabase = getSupabase();
  const [pros, settings, hours] = await Promise.all([
    supabase.from('professionals').select('*').order('sort_order'),
    supabase.from('business_settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('business_hours').select('*')
  ]);
  if (!pros.error && pros.data) cache.professionals = (pros.data as Row[]).map(toProfessional);
  if (!settings.error && !hours.error) {
    setBusinessSettingsCache(toSettings((settings.data as Row) ?? null, (hours.data as Row[]) ?? []));
  }
  publicLoaded = true;
  changed();
}

let staffLoading: Promise<void> | null = null;

/**
 * Dados do painel. O banco só devolve o que a pessoa logada pode ver
 * (a colaboradora recebe só a própria agenda e as clientes que atendeu).
 */
export function loadStaffData(): Promise<void> {
  if (staffLoading) return staffLoading;
  staffLoading = (async () => {
    try {
      const user = getCurrentUser();
      if (!user) return;
      if (!publicLoaded) await loadPublicData();

      // Agenda: do último ano e meio para a frente (suficiente para relatórios e histórico recente)
      const since = new Date();
      since.setDate(since.getDate() - 550);
      const sinceStr = since.toISOString().slice(0, 10);

      const isAdmin = user.role === 'admin';
      const [pros, bookings, clients, history, rules, blocks, staff, audit] = await Promise.all([
        fetchAll('professionals', q => q.order('sort_order')),
        fetchAll('bookings', q => q.gte('date', sinceStr).order('date', { ascending: false }).order('start_time', { ascending: false })),
        fetchAll('clients_overview', q => q.order('name')),
        fetchAll('client_history', q => q.order('date', { ascending: false })),
        fetchAll('availability_rules'),
        fetchAll('schedule_blocks'),
        isAdmin ? fetchAll('staff_members', q => q.order('name')) : Promise.resolve([]),
        isAdmin
          ? getSupabase().from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200)
              .then(r => { if (r.error) throw r.error; return r.data as Row[]; })
          : Promise.resolve([])
      ]);

      cache = {
        professionals: pros.map(toProfessional),
        bookings: bookings.map(toBooking),
        clients: clients.map(toClient),
        history: history.map(toHistory),
        rules: rules.map(toRule),
        blocks: blocks.map(toBlock),
        staff: staff.map(toStaff),
        auditLogs: audit.map(toAudit)
      };
      changed();
    } finally {
      staffLoading = null;
    }
  })();
  return staffLoading;
}

/** Ao sair do painel: esquece os dados pessoais que estavam na memória. */
export function clearStaffData(): void {
  const professionals = cache.professionals;
  cache = { ...emptyCache(), professionals };
  changed();
}

// ═════════════════════════════════════════════
// PROFISSIONAIS
// ═════════════════════════════════════════════

export function getProfessionals(): Professional[] {
  return cache.professionals.length > 0 ? cache.professionals : staticProfessionals;
}

export async function updateProfessional(id: string, updates: Partial<Professional>): Promise<{ error?: string }> {
  const patch: Row = {};
  if (updates.whatsapp !== undefined) patch.whatsapp = updates.whatsapp ? normalizeBrazilianPhone(updates.whatsapp) : null;
  if (updates.photoUrl !== undefined) patch.photo_url = updates.photoUrl || null;
  if (updates.bio !== undefined) patch.bio = updates.bio;
  if (updates.commissionRate !== undefined) patch.commission_rate = Math.min(1, Math.max(0, updates.commissionRate));
  if (updates.active !== undefined) patch.active = updates.active;

  const { data, error } = await getSupabase().from('professionals').update(patch).eq('id', id).select().single();
  if (error) return { error: friendlyDbError(error) };
  cache.professionals = cache.professionals.map(p => (p.id === id ? toProfessional(data as Row) : p));
  changed();
  return {};
}

/** Transforma o nome em um código simples (ex.: "Ana Júlia" → "ana-julia"). */
function slugify(name: string): string {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'profissional';
}

export interface NewProfessionalInput {
  name: string;
  role: string;
  categories: ServiceCategory[];
  whatsapp?: string;
  photoUrl?: string;
  bio?: string;
  commissionRate: number;
}

/** Adiciona uma profissional nova à equipe (aparece no site e no agendamento). */
export async function createProfessional(input: NewProfessionalInput): Promise<{ error?: string; id?: string }> {
  const name = input.name.trim();
  if (name.length < 2) return { error: 'Informe o nome da profissional.' };
  if (input.categories.length === 0) return { error: 'Marque pelo menos um tipo de serviço que ela faz.' };

  const all = getProfessionals();
  const base = slugify(name);
  let id = base;
  for (let n = 2; all.some(p => p.id === id); n++) id = `${base}-${n}`;

  const { data, error } = await getSupabase().from('professionals').insert({
    id,
    name,
    role: input.role.trim(),
    categories: input.categories,
    whatsapp: input.whatsapp ? normalizeBrazilianPhone(input.whatsapp) : null,
    photo_url: input.photoUrl?.trim() || null,
    bio: input.bio?.trim() ?? '',
    commission_rate: Math.min(1, Math.max(0, input.commissionRate)),
    sort_order: all.length + 1,
    active: true
  }).select().single();
  if (error) return { error: friendlyDbError(error) };

  cache.professionals = [...cache.professionals, toProfessional(data as Row)];
  changed();
  return { id };
}

/** Agendamentos futuros (não cancelados) de uma profissional. */
export function getUpcomingBookingsCount(professionalId: string): number {
  const { todayStr } = getNowInSaoPaulo();
  return getBookings().filter(
    b => b.professionalId === professionalId && b.date >= todayStr && b.status !== 'cancelado' && b.status !== 'faltou' && b.status !== 'concluido'
  ).length;
}

/**
 * Tira a profissional da equipe sem apagar o histórico:
 * ela some do site e do agendamento, e o acesso dela ao painel é bloqueado.
 */
export async function removeProfessional(id: string): Promise<{ error?: string }> {
  const result = await updateProfessional(id, { active: false });
  if (result.error) return result;
  const account = cache.staff.find(s => s.professionalId === id && s.active);
  if (account) {
    const blocked = await setStaffActive(account.userId, false);
    if (blocked.error) return { error: `Ela saiu do site, mas o acesso ao painel não foi bloqueado: ${blocked.error}` };
  }
  return {};
}

/** Traz de volta uma profissional que tinha saído. O acesso ao painel é religado à parte. */
export async function restoreProfessional(id: string): Promise<{ error?: string }> {
  return updateProfessional(id, { active: true });
}

// ═════════════════════════════════════════════
// AGENDAMENTOS
// ═════════════════════════════════════════════

export function getBookings(): Booking[] {
  return cache.bookings;
}

export function getBookingById(id: string): Booking | undefined {
  return cache.bookings.find(b => b.id === id);
}

/** Confere sobreposição com os agendamentos já carregados (o banco confere de novo ao gravar). */
export function validateConflict(
  professionalId: string, date: string, startTime: string, duration: number, excludeId?: string
): { conflict: boolean; conflictWith?: Booking } {
  const newStart = timeToMinutes(startTime);
  const newEnd = newStart + duration;
  const conflictWith = cache.bookings.find(b =>
    b.professionalId === professionalId && b.date === date && b.status !== 'cancelado' && b.id !== excludeId &&
    newStart < timeToMinutes(b.time) + b.duration && newEnd > timeToMinutes(b.time)
  );
  return { conflict: Boolean(conflictWith), conflictWith };
}

function upsertBookingInCache(row: Row) {
  const b = toBooking(row);
  const idx = cache.bookings.findIndex(x => x.id === b.id);
  if (idx >= 0) cache.bookings[idx] = b;
  else cache.bookings.unshift(b);
  cache.bookings = [...cache.bookings];
  return b;
}

/** Depois de concluir ou cancelar, o banco atualiza clientes e histórico sozinho; buscamos de novo. */
async function refreshClientsAndHistory() {
  try {
    const [clients, history] = await Promise.all([
      fetchAll('clients_overview', q => q.order('name')),
      fetchAll('client_history', q => q.order('date', { ascending: false }))
    ]);
    cache.clients = clients.map(toClient);
    cache.history = history.map(toHistory);
    changed();
  } catch { /* a próxima atualização completa resolve */ }
}

/** Agendamento criado pelo painel (admin ou colaboradora). */
export async function createBooking(data: Omit<Booking, 'id' | 'createdAt'>): Promise<{ booking: Booking | null; error?: string }> {
  if (!data.clientName || data.clientName.trim().length < 2) {
    return { booking: null, error: 'Nome do cliente é obrigatório (mínimo 2 caracteres).' };
  }
  const phone = normalizeBrazilianPhone(data.clientPhone);
  if (phone.length < 12 || phone.length > 13) {
    return { booking: null, error: 'Telefone do cliente inválido. Use DDD + número.' };
  }
  if (!(data.price >= 0)) return { booking: null, error: 'Valor do serviço inválido.' };
  if (!(data.duration > 0)) return { booking: null, error: 'Duração do serviço inválida.' };

  const { conflict, conflictWith } = validateConflict(data.professionalId, data.date, data.time, data.duration);
  if (conflict) {
    return { booking: null, error: `Conflito com o agendamento de ${conflictWith?.clientName} às ${conflictWith?.time}.` };
  }

  const { data: row, error } = await getSupabase().from('bookings').insert({
    service_id: data.serviceId,
    service_name: data.serviceName,
    professional_id: data.professionalId,
    professional_name: data.professionalName,
    client_name: data.clientName.trim(),
    client_phone: phone,
    client_email: data.clientEmail?.trim() || null,
    date: data.date,
    start_time: data.time,
    duration: data.duration,
    notes: data.notes?.trim() || null,
    status: data.status,
    price: data.price,
    origin: data.origin
  }).select().single();

  if (error) return { booking: null, error: friendlyDbError(error) };
  const booking = upsertBookingInCache(row as Row);
  changed();
  refreshClientsAndHistory();
  return { booking };
}

export async function updateBooking(id: string, updates: Partial<Booking>): Promise<{ booking: Booking | null; error?: string }> {
  const prev = getBookingById(id);
  if (!prev) return { booking: null, error: 'Agendamento não encontrado.' };

  const status = updates.status ?? prev.status;
  if (status === 'cancelado' && prev.status !== 'cancelado') {
    const reason = (updates.cancelReason ?? '').trim();
    if (reason.length < 3) return { booking: null, error: 'Informe o motivo do cancelamento (mínimo 3 caracteres).' };
  }

  // Mudou horário ou está reativando um cancelado: confere a agenda antes de enviar
  const moving = updates.time || updates.date || updates.professionalId || updates.duration;
  const reactivating = prev.status === 'cancelado' && status !== 'cancelado';
  if (moving || reactivating) {
    const ok = isProfessionalAvailableForWindow(
      updates.professionalId ?? prev.professionalId,
      updates.date ?? prev.date,
      timeToMinutes(updates.time ?? prev.time),
      updates.duration ?? prev.duration,
      cache.bookings,
      id
    );
    if (!ok) return { booking: null, error: 'Horário indisponível! Conflito de agenda ou fora do horário de funcionamento.' };
  }

  const patch: Row = {};
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.price !== undefined) patch.price = updates.price;
  if (updates.notes !== undefined) patch.notes = updates.notes?.trim() || null;
  if (updates.date !== undefined) patch.date = updates.date;
  if (updates.time !== undefined) patch.start_time = updates.time;
  if (updates.duration !== undefined) patch.duration = updates.duration;
  if (updates.professionalId !== undefined) {
    patch.professional_id = updates.professionalId;
    patch.professional_name = updates.professionalName ?? null;
  }
  if (updates.clientName !== undefined) patch.client_name = updates.clientName.trim();
  if (updates.clientPhone !== undefined) patch.client_phone = normalizeBrazilianPhone(updates.clientPhone);
  if (updates.paymentStatus !== undefined) patch.payment_status = updates.paymentStatus;
  if (updates.paymentMethod !== undefined) patch.payment_method = updates.paymentMethod || null;
  if (updates.rescheduleHistory !== undefined) patch.reschedule_history = updates.rescheduleHistory;
  if (updates.cancelReason !== undefined) patch.cancel_reason = updates.cancelReason.trim() || null;
  if (status !== 'cancelado' && prev.status === 'cancelado') patch.cancel_reason = null;

  const { data, error } = await getSupabase().from('bookings').update(patch).eq('id', id).select().single();
  if (error) return { booking: null, error: friendlyDbError(error) };
  const booking = upsertBookingInCache(data as Row);
  changed();
  if (updates.status !== undefined || updates.price !== undefined) refreshClientsAndHistory();
  return { booking };
}

/** Remarcar com motivo; o histórico de remarcações fica no próprio agendamento. */
export async function rescheduleBooking(
  id: string,
  data: { newDate: string; newTime: string; newProfessionalId: string; reason: string }
): Promise<{ booking: Booking | null; error?: string }> {
  const current = getBookingById(id);
  if (!current) return { booking: null, error: 'Agendamento não encontrado.' };
  if (!data.newDate || !data.newTime || !data.newProfessionalId) {
    return { booking: null, error: 'Selecione nova data, horário e profissional.' };
  }
  if (!data.reason || data.reason.trim().length < 3) {
    return { booking: null, error: 'Informe o motivo da remarcação (mínimo 3 caracteres).' };
  }

  const { conflict, conflictWith } = validateConflict(data.newProfessionalId, data.newDate, data.newTime, current.duration, id);
  if (conflict) {
    return { booking: null, error: `Conflito no novo horário com agendamento de ${conflictWith?.clientName} às ${conflictWith?.time}.` };
  }

  const newPro = getProfessionals().find(p => p.id === data.newProfessionalId);
  const user = getCurrentUser();
  const entry: RescheduleEntry = {
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

  return updateBooking(id, {
    date: data.newDate,
    time: data.newTime,
    professionalId: data.newProfessionalId,
    professionalName: newPro?.name,
    rescheduleHistory: [...(current.rescheduleHistory ?? []), entry],
    status: current.status === 'cancelado' ? 'pendente' : current.status
  });
}

/** Apagar de vez (só a administradora). No dia a dia, prefira cancelar com motivo. */
export async function deleteBooking(id: string): Promise<{ error?: string }> {
  const { error, count } = await getSupabase().from('bookings').delete({ count: 'exact' }).eq('id', id);
  if (error) return { error: friendlyDbError(error) };
  if (count === 0) return { error: 'Você não tem permissão para remover este agendamento.' };
  cache.bookings = cache.bookings.filter(b => b.id !== id);
  changed();
  refreshClientsAndHistory();
  return {};
}

// ═════════════════════════════════════════════
// AGENDAMENTO PELO SITE (visitante, sem login)
// ═════════════════════════════════════════════

export interface PublicSlot {
  time: string;
  professionalIds: string[];
}

/** Horários livres calculados pelo banco (não revela dados de outras clientes). */
export async function fetchAvailableSlots(serviceId: string, date: string, professionalId: string | null): Promise<PublicSlot[]> {
  const { data, error } = await getSupabase().rpc('get_available_slots', {
    p_service_id: serviceId,
    p_date: date,
    p_professional_id: professionalId
  });
  if (error) throw new Error(friendlyDbError(error));
  return ((data as Row[]) ?? []).map(r => ({
    time: hhmm(r.slot_time),
    professionalIds: (r.professional_ids as string[]) ?? []
  }));
}

export async function createPublicBooking(data: {
  serviceId: string;
  date: string;
  time: string;
  clientName: string;
  clientPhone: string;
  professionalId: string | null;
  clientEmail?: string;
  notes?: string;
}): Promise<{ booking: Booking | null; error?: string }> {
  const { data: result, error } = await getSupabase().rpc('create_public_booking', {
    p_service_id: data.serviceId,
    p_date: data.date,
    p_time: data.time,
    p_client_name: data.clientName,
    p_client_phone: data.clientPhone,
    p_professional_id: data.professionalId,
    p_client_email: data.clientEmail || null,
    p_notes: data.notes || null
  });
  if (error) return { booking: null, error: friendlyDbError(error) };

  const r = result as { success: boolean; error?: string; booking?: Row };
  if (!r?.success || !r.booking) return { booking: null, error: r?.error ?? 'Não foi possível concluir o agendamento.' };

  const b = r.booking;
  return {
    booking: {
      id: String(b.id),
      serviceId: String(b.serviceId),
      serviceName: String(b.serviceName),
      professionalId: String(b.professionalId),
      professionalName: String(b.professionalName),
      date: String(b.date),
      time: String(b.time),
      endTime: String(b.endTime),
      duration: num(b.duration),
      clientName: data.clientName.trim(),
      clientPhone: normalizeBrazilianPhone(data.clientPhone),
      clientEmail: data.clientEmail,
      notes: data.notes,
      status: b.status as BookingStatus,
      price: num(b.price),
      origin: 'site',
      createdAt: new Date().toISOString(),
      manageToken: optStr(b.manageToken)
    }
  };
}

// ═════════════════════════════════════════════
// LINK PESSOAL DA CLIENTE (remarcar ou cancelar sozinha)
// ═════════════════════════════════════════════

/** Endereço do link pessoal de um agendamento. */
export function buildManageUrl(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://cuidare-sigma.vercel.app';
  return `${origin}/meu-agendamento/${token}`;
}

export interface ManagedBooking {
  serviceId: string;
  serviceName: string;
  professionalId: string;
  professionalName: string;
  date: string;
  time: string;
  endTime: string;
  duration: number;
  status: BookingStatus;
  price: number;
  clientFirstName: string;
  canCancel: boolean;
  canReschedule: boolean;
  blockReason?: string;
  reschedulesLeft: number;
  minHours: number;
}

type LinkResult = { success: boolean; error?: string; expired?: boolean; booking?: Row };

/** Abre o agendamento pelo link. */
export async function fetchManagedBooking(token: string): Promise<{ booking?: ManagedBooking; error?: string; expired?: boolean }> {
  const { data, error } = await getSupabase().rpc('get_booking_by_token', { p_token: token });
  if (error) return { error: 'Não foi possível abrir o agendamento. Verifique sua internet e tente de novo.' };
  const r = data as LinkResult;
  if (!r?.success || !r.booking) return { error: r?.error ?? 'Agendamento não encontrado.', expired: r?.expired };
  const b = r.booking;
  return {
    booking: {
      serviceId: String(b.serviceId),
      serviceName: String(b.serviceName),
      professionalId: String(b.professionalId),
      professionalName: String(b.professionalName),
      date: String(b.date),
      time: String(b.time),
      endTime: String(b.endTime),
      duration: num(b.duration),
      status: b.status as BookingStatus,
      price: num(b.price),
      clientFirstName: String(b.clientFirstName ?? ''),
      canCancel: b.canCancel === true,
      canReschedule: b.canReschedule === true,
      blockReason: optStr(b.blockReason),
      reschedulesLeft: num(b.reschedulesLeft),
      minHours: num(b.minHours)
    }
  };
}

/** Horários livres para remarcar (o horário atual da cliente conta como livre). */
export async function fetchRescheduleSlots(token: string, date: string, professionalId: string | null): Promise<PublicSlot[]> {
  const { data, error } = await getSupabase().rpc('get_reschedule_slots', {
    p_token: token,
    p_date: date,
    p_professional_id: professionalId
  });
  if (error) throw new Error(friendlyDbError(error));
  return ((data as Row[]) ?? []).map(r => ({
    time: hhmm(r.slot_time),
    professionalIds: (r.professional_ids as string[]) ?? []
  }));
}

export async function clientRescheduleBooking(
  token: string, date: string, time: string, professionalId: string | null
): Promise<{ error?: string }> {
  const { data, error } = await getSupabase().rpc('client_reschedule_booking', {
    p_token: token, p_date: date, p_time: time, p_professional_id: professionalId
  });
  if (error) return { error: friendlyDbError(error) };
  const r = data as LinkResult;
  return r?.success ? {} : { error: r?.error ?? 'Não foi possível remarcar.' };
}

export async function clientCancelBooking(token: string, reason: string): Promise<{ error?: string }> {
  const { data, error } = await getSupabase().rpc('client_cancel_booking', {
    p_token: token, p_reason: reason.trim() || null
  });
  if (error) return { error: friendlyDbError(error) };
  const r = data as LinkResult;
  return r?.success ? {} : { error: r?.error ?? 'Não foi possível cancelar.' };
}

// ═════════════════════════════════════════════
// CLIENTES E HISTÓRICO
// ═════════════════════════════════════════════

export function getClients(): Client[] {
  return cache.clients;
}

export function getClientById(id: string): Client | undefined {
  return cache.clients.find(c => c.id === id);
}

export function getClientByPhone(phone: string): Client | undefined {
  const normalized = normalizeBrazilianPhone(phone);
  return cache.clients.find(c => c.phone === normalized);
}

export function getClientHistory(clientId: string): ClientHistoryEntry[] {
  return cache.history.filter(h => h.clientId === clientId).sort((a, b) => b.date.localeCompare(a.date));
}

/** Lança no histórico um atendimento antigo (feito antes do sistema, por exemplo). */
export async function addManualHistoryEntry(
  clientId: string,
  data: { serviceName: string; professionalId: string; professionalName: string; date: string; price: number; notes?: string }
): Promise<{ entry: ClientHistoryEntry | null; error?: string }> {
  const user = getCurrentUser();
  const pro = getProfessionals().find(p => p.id === data.professionalId);
  const rate = pro?.commissionRate ?? getBusinessSettings().commissionDefaultRate ?? 0.5;

  const { data: row, error } = await getSupabase().from('client_history').insert({
    client_id: clientId,
    service_name: data.serviceName,
    professional_id: data.professionalId,
    professional_name: data.professionalName,
    date: data.date,
    price: data.price,
    commission_rate: rate,
    commission_amount: Math.round(data.price * rate * 100) / 100,
    status: 'concluido',
    notes: data.notes?.trim() || null,
    origin: user?.role === 'admin' ? 'manual_admin' : 'manual_colaboradora',
    added_manually: true,
    created_by: user?.id ?? null,
    created_by_name: user?.name ?? null
  }).select().single();

  if (error) return { entry: null, error: friendlyDbError(error) };
  const entry = toHistory(row as Row);
  cache.history = [entry, ...cache.history];
  changed();
  return { entry };
}

// ═════════════════════════════════════════════
// HORÁRIO PRÓPRIO E BLOQUEIOS
// ═════════════════════════════════════════════

export function getAvailabilityRules(professionalId?: string): AvailabilityRule[] {
  return professionalId ? cache.rules.filter(r => r.professionalId === professionalId) : cache.rules;
}

/** Horário padrão quando a profissional não tem regra própria: segue o salão. */
export function getDefaultAvailabilityRules(professionalId: string): AvailabilityRule[] {
  return getBusinessSettings().openingHours
    .filter(h => !h.closed && h.open && h.close)
    .map(h => ({
      id: `default_${professionalId}_${h.dayOfWeek}`,
      professionalId,
      dayOfWeek: h.dayOfWeek as AvailabilityRule['dayOfWeek'],
      startTime: h.open,
      endTime: h.close,
      breakStart: h.breakStart,
      breakEnd: h.breakEnd,
      slotDuration: 30,
      active: true
    }));
}

export async function upsertAvailabilityRule(rule: Omit<AvailabilityRule, 'id'> & { id?: string }): Promise<{ error?: string }> {
  const row: Row = {
    professional_id: rule.professionalId,
    day_of_week: rule.dayOfWeek,
    start_time: rule.startTime,
    end_time: rule.endTime,
    break_start: rule.breakStart ?? null,
    break_end: rule.breakEnd ?? null,
    slot_duration: rule.slotDuration,
    active: rule.active
  };
  if (rule.id && !rule.id.startsWith('default_')) row.id = rule.id;
  const { data, error } = await getSupabase().from('availability_rules').upsert(row).select().single();
  if (error) return { error: friendlyDbError(error) };
  const saved = toRule(data as Row);
  cache.rules = [...cache.rules.filter(r => r.id !== saved.id), saved];
  changed();
  return {};
}

export function getScheduleBlocks(professionalId?: string): ScheduleBlock[] {
  return professionalId ? cache.blocks.filter(b => b.professionalId === professionalId) : cache.blocks;
}

export async function createScheduleBlock(data: Omit<ScheduleBlock, 'id' | 'createdAt'>): Promise<{ error?: string }> {
  const { data: row, error } = await getSupabase().from('schedule_blocks').insert({
    professional_id: data.professionalId,
    date: data.date ?? null,
    start_time: data.allDay ? null : data.startTime ?? null,
    end_time: data.allDay ? null : data.endTime ?? null,
    all_day: data.allDay,
    reason: data.reason ?? null,
    type: data.type,
    created_by: getCurrentUser()?.id ?? null
  }).select().single();
  if (error) return { error: friendlyDbError(error) };
  cache.blocks = [...cache.blocks, toBlock(row as Row)];
  changed();
  return {};
}

export async function deleteScheduleBlock(id: string): Promise<{ error?: string }> {
  const { error } = await getSupabase().from('schedule_blocks').delete().eq('id', id);
  if (error) return { error: friendlyDbError(error) };
  cache.blocks = cache.blocks.filter(b => b.id !== id);
  changed();
  return {};
}

// ═════════════════════════════════════════════
// CONFIGURAÇÕES DO SALÃO (só administradora)
// ═════════════════════════════════════════════

export async function updateBusinessSettings(settings: BusinessSettings): Promise<{ error?: string }> {
  const supabase = getSupabase();
  const { error } = await supabase.from('business_settings').update({
    salon_name: settings.salonName,
    address: settings.address,
    city: settings.city,
    state: settings.state,
    instagram_url: settings.instagramUrl || null,
    business_whatsapp: settings.businessWhatsapp ? normalizeBrazilianPhone(settings.businessWhatsapp) : null,
    business_whatsapp_message: settings.businessWhatsappMessage || null,
    commission_default_rate: settings.commissionDefaultRate,
    min_lead_time_minutes: settings.minLeadTimeMinutes,
    max_advance_days: settings.maxAdvanceDays
  }).eq('id', 1);
  if (error) return { error: friendlyDbError(error) };

  const hours = settings.openingHours.map(h => ({
    day_of_week: h.dayOfWeek,
    closed: h.closed,
    open_time: h.closed ? null : h.open || null,
    close_time: h.closed ? null : h.close || null,
    break_start: h.closed ? null : h.breakStart || null,
    break_end: h.closed ? null : h.breakEnd || null
  }));
  const { error: hoursError } = await supabase.from('business_hours').upsert(hours);
  if (hoursError) return { error: friendlyDbError(hoursError) };

  await loadPublicData();
  return {};
}

// ═════════════════════════════════════════════
// EQUIPE E ACESSOS (só administradora)
// ═════════════════════════════════════════════

export function listStaff(): StaffMember[] {
  return cache.staff;
}

export async function setStaffActive(userId: string, active: boolean): Promise<{ error?: string }> {
  if (userId === getCurrentUser()?.id && !active) return { error: 'Você não pode desativar o seu próprio acesso.' };
  const { data, error } = await getSupabase().from('staff_members').update({ active }).eq('user_id', userId).select().single();
  if (error) return { error: friendlyDbError(error) };
  cache.staff = cache.staff.map(s => (s.userId === userId ? toStaff(data as Row) : s));
  changed();
  return {};
}

/** Chama a função segura do servidor que cuida das contas da equipe. */
async function callStaffFunction(body: Record<string, unknown>, fallback: string): Promise<{ error?: string }> {
  const { data: result, error } = await getSupabase().functions.invoke('criar-acesso-equipe', { body });
  if (error) {
    let message = fallback;
    try {
      const payload = await (error as { context?: Response }).context?.json();
      if (payload?.error) message = payload.error;
    } catch { /* mantém a mensagem padrão */ }
    return { error: message };
  }
  if ((result as { error?: string })?.error) return { error: (result as { error: string }).error };
  return {};
}

/** Cria o acesso de uma pessoa da equipe com senha inicial. */
export async function createStaffAccount(data: {
  email: string; name: string; role: UserRole; professionalId?: string; password: string;
}): Promise<{ error?: string }> {
  const result = await callStaffFunction({ action: 'criar', ...data }, 'Não foi possível criar o acesso. Tente de novo.');
  if (!result.error) await loadStaffData();
  return result;
}

/** Define uma senha nova para alguém da equipe que esqueceu a sua. */
export async function resetStaffPassword(userId: string, password: string): Promise<{ error?: string }> {
  return callStaffFunction({ action: 'redefinir_senha', userId, password }, 'Não foi possível definir a senha. Tente de novo.');
}

// ═════════════════════════════════════════════
// REGISTRO DE ALTERAÇÕES E MENSAGENS
// ═════════════════════════════════════════════

export function getAuditLogs(limit = 100): AuditLog[] {
  return cache.auditLogs.slice(0, limit);
}

/** A fila de WhatsApp agora fica só no banco; o painel ainda não a exibe. */
export function getNotificationQueue(): NotificationJob[] {
  return [];
}
