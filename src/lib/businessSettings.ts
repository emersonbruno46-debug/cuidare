// ─────────────────────────────────────────────
// CUIDARE — Business Settings
// Configurações globais do negócio (armazenadas em localStorage)
// ─────────────────────────────────────────────

import type { BusinessSettings } from '../types';

const SETTINGS_KEY = 'cuidare_business_settings';

const DEFAULT_SETTINGS: BusinessSettings = {
  id: 'bs_1',
  salonName: 'Cuidare Espaço de Beleza',
  address: 'Rua Paracatu, 15, Centro',
  city: 'Taiobeiras',
  state: 'MG',
  instagramUrl: '', // a ser configurado pela administradora
  businessWhatsapp: '5538991007706',
  businessWhatsappMessage: 'Olá! Gostaria de solicitar informações sobre agendamento.',
  openingHours: [
    { dayOfWeek: 0, open: '', close: '', closed: true }, // Sunday
    { dayOfWeek: 1, open: '', close: '', closed: true }, // Monday
    { dayOfWeek: 2, open: '08:00', close: '18:00', closed: false, breakStart: '11:30', breakEnd: '14:00' }, // Tue
    { dayOfWeek: 3, open: '08:00', close: '18:00', closed: false, breakStart: '11:30', breakEnd: '14:00' }, // Wed
    { dayOfWeek: 4, open: '08:00', close: '18:00', closed: false, breakStart: '11:30', breakEnd: '14:00' }, // Thu
    { dayOfWeek: 5, open: '08:00', close: '18:00', closed: false, breakStart: '11:30', breakEnd: '14:00' }, // Fri
    { dayOfWeek: 6, open: '08:00', close: '18:00', closed: false }, // Saturday
  ],
  commissionDefaultRate: 0.5,
  updatedAt: new Date().toISOString()
};

export function getBusinessSettings(): BusinessSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* use defaults */ }
  return DEFAULT_SETTINGS;
}

export function updateBusinessSettings(updates: Partial<BusinessSettings>): BusinessSettings {
  const current = getBusinessSettings();
  const updated: BusinessSettings = {
    ...current,
    ...updates,
    id: current.id,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  return updated;
}

/** Build wa.me link for a professional or fallback to general */
export function buildWhatsAppLink(phone: string | undefined, message: string): string {
  const settings = getBusinessSettings();
  const number = phone ?? settings.businessWhatsapp;
  if (!number) return '';
  const clean = number.replace(/\D/g, '');
  if (!clean) return '';
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

/** Build WhatsApp link after booking for professional notification */
export function buildBookingWhatsAppMessage(data: {
  professionalWhatsapp?: string;
  professionalName: string;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  clientPhone: string;
  notes?: string;
}): string {
  const settings = getBusinessSettings();
  const formatted = new Date(data.date + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const msg = `Olá, ${data.professionalName}! Acabei de solicitar um agendamento pelo site da CUIDARE.\n\n` +
    `Cliente: ${data.clientName}\n` +
    `Serviço: ${data.serviceName}\n` +
    `Data: ${formatted}\n` +
    `Horário: ${data.time}h\n` +
    `Telefone: ${data.clientPhone}` +
    (data.notes ? `\nObservações: ${data.notes}` : '');

  const phone = data.professionalWhatsapp ?? settings.businessWhatsapp;
  return buildWhatsAppLink(phone, msg);
}
