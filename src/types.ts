// ─────────────────────────────────────────────
// CUIDARE — Types (expandido para sistema completo)
// ─────────────────────────────────────────────

export type UserRole = 'admin' | 'collaborator';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  professionalId?: string; // set when role === 'collaborator'
}

export interface AuthSession {
  user: AuthUser;
  expiresAt: number; // timestamp ms
}

export type ServiceCategory =
  | 'escovas'
  | 'tratamentos'
  | 'quimicas'
  | 'unhas'
  | 'sobrancelhas'
  | 'cilios'
  | 'maquiagem'
  | 'penteados'
  | 'estetica';

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  priceBase: number;
  priceType?: 'fixed' | 'range' | 'details';
  priceDetails?: { P: number; M: number; G: number };
  priceRange?: { min: number; max: number };
  duration: number; // minutes
  description: string;
  recommendations?: string[];
  variablePrice?: boolean;
  professionalIds?: string[];
  note?: string;
}

export interface Professional {
  id: string;
  name: string;
  role: string;
  categories: ServiceCategory[];
  photoUrl?: string; // Storage URL ou undefined enquanto aguarda foto real
  bio: string;
  specialties: string[];
  specialtyHighlight?: string;
  specialtyBadge?: string;
  providerType: 'internal' | 'external_room_provider';
  whatsapp?: string; // E.164 format: '5538XXXXXXXXX'
  instagram?: string;
  commissionRate?: number; // 0–1, default 0.5
  active?: boolean;
}

export type BookingStatus = 'pendente' | 'confirmado' | 'concluido' | 'faltou' | 'cancelado';
export type BookingOrigin = 'site' | 'manual_admin' | 'manual_colaboradora' | 'whatsapp' | 'presencial';

export interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  professionalId: string;
  professionalName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  endTime?: string; // HH:MM calculado
  duration: number; // minutes
  clientId?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  notes?: string;
  status: BookingStatus;
  price: number;
  paymentStatus?: 'pendente' | 'pago' | 'parcial';
  paymentMethod?: string;
  origin: BookingOrigin;
  createdBy?: string; // user id
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt: string; // ISO
  updatedAt?: string; // ISO
}

export interface Client {
  id: string;
  phone: string; // unique key
  name: string;
  email?: string;
  birthDate?: string; // YYYY-MM-DD
  notes?: string;
  firstVisit?: string; // YYYY-MM-DD
  lastVisit?: string; // YYYY-MM-DD
  totalVisits: number;
  totalSpent: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ClientHistoryEntry {
  id: string;
  clientId: string;
  bookingId?: string; // linked to appointment
  serviceName: string;
  professionalId: string;
  professionalName: string;
  date: string; // YYYY-MM-DD
  price: number;
  status: BookingStatus;
  notes?: string;
  origin: BookingOrigin;
  addedManually?: boolean; // true for retrospective entries
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
}

export interface AvailabilityRule {
  id: string;
  professionalId: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  breakStart?: string; // HH:MM
  breakEnd?: string; // HH:MM
  slotDuration: number; // minutes
  active: boolean;
}

export interface ScheduleBlock {
  id: string;
  professionalId: string;
  date?: string; // YYYY-MM-DD (specific day) OR null for recurring
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  allDay: boolean;
  reason?: string;
  type: 'folga' | 'ferias' | 'bloqueio' | 'intervalo' | 'extraordinario';
  createdBy?: string;
  createdAt: string;
}

export interface BusinessSettings {
  id: string;
  salonName: string;
  address: string;
  city: string;
  state: string;
  instagramUrl?: string;
  businessWhatsapp?: string; // E.164
  businessWhatsappMessage?: string;
  openingHours: {
    dayOfWeek: number;
    open: string;
    close: string;
    closed: boolean;
    breakStart?: string;
    breakEnd?: string;
  }[];
  commissionDefaultRate: number; // 0–1
  updatedAt: string;
}

export interface StaffAccount {
  id: string;
  professionalId: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  lastLogin?: string;
  // password stored hashed in mock, never exposed
  passwordHash?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  createdAt: string;
}

export interface ParsedBookingMessage {
  clientName?: string;
  clientPhone?: string;
  professionalId?: string;
  professionalName?: string;
  serviceId?: string;
  serviceName?: string;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:MM
  notes?: string;
  rawDate?: string; // original string found
  rawTime?: string; // original string found
  ambiguous: string[]; // list of fields that need user confirmation
}
