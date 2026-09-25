// ─────────────────────────────────────────────
// CUIDARE — AppointmentModal
// Modal completo de detalhes, remarcação e ações do agendamento
// ─────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Phone, Edit2, Trash2, Check, XCircle, UserX,
  Clock, Calendar, User, MessageSquare, AlertTriangle, RefreshCw, History
} from 'lucide-react';
import type { Booking, BookingStatus, AuthUser } from '../../types';
import { updateBooking, deleteBooking, rescheduleBooking, getProfessionals, getBookings } from '../../lib/dataService';
import { buildWhatsAppLink } from '../../lib/businessSettings';
import { services } from '../../data/servicesData';
import { getAvailableSlots } from '../../lib/availability';

interface AppointmentModalProps {
  booking: Booking | null;
  onClose: () => void;
  onUpdated: () => void;
  currentUser: AuthUser;
}

const STATUS_OPTIONS: { value: BookingStatus; label: string; color: string }[] = [
  { value: 'pendente', label: 'Pendente', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { value: 'confirmado', label: 'Confirmado', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { value: 'concluido', label: 'Concluído', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { value: 'faltou', label: 'Faltou', color: 'text-red-700 bg-red-50 border-red-200' },
  { value: 'cancelado', label: 'Cancelado', color: 'text-gray-600 bg-gray-100 border-gray-300' },
];

export default function AppointmentModal({ booking, onClose, onUpdated, currentUser }: AppointmentModalProps) {
  const [mode, setMode] = useState<'view' | 'edit' | 'reschedule' | 'confirmDelete'>('view');
  
  // Edit state
  const [editNotes, setEditNotes] = useState(booking?.notes ?? '');
  const [editStatus, setEditStatus] = useState<BookingStatus>(booking?.status ?? 'pendente');
  const [editPrice, setEditPrice] = useState(String(booking?.price ?? ''));

  // Reschedule state
  const [rescheduleDate, setRescheduleDate] = useState(booking?.date ?? '');
  const [rescheduleTime, setRescheduleTime] = useState(booking?.time ?? '');
  const [rescheduleProId, setRescheduleProId] = useState(booking?.professionalId ?? '');
  const [rescheduleReason, setRescheduleReason] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!booking) return null;

  const isAdmin = currentUser.role === 'admin';
  const canEdit = isAdmin || currentUser.professionalId === booking.professionalId;
  const professionals = getProfessionals().filter(p => p.active !== false);
  const serviceObj = services.find(s => s.id === booking.serviceId);

  // Filter eligible professionals for rescheduling
  const eligibleProfessionals = serviceObj
    ? professionals.filter(p => {
        if (serviceObj.professionalIds && serviceObj.professionalIds.length > 0) {
          return serviceObj.professionalIds.includes(p.id);
        }
        return p.categories.includes(serviceObj.category);
      })
    : professionals;

  // Available slots for reschedule date
  const availableRescheduleSlots = rescheduleDate && rescheduleProId
    ? getAvailableSlots(rescheduleDate, rescheduleProId, booking.duration, getBookings(), eligibleProfessionals)
    : [];

  const statusInfo = STATUS_OPTIONS.find(s => s.value === booking.status);

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

  const handleSaveEdit = async () => {
    if (!canEdit) return;
    setLoading(true);
    setError('');

    const result = updateBooking(booking.id, {
      notes: editNotes || undefined,
      status: editStatus,
      price: parseFloat(editPrice) || booking.price
    });

    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      onUpdated();
      setMode('view');
    }
  };

  const handleStatusChange = (status: BookingStatus) => {
    setLoading(true);
    setError('');
    const result = updateBooking(booking.id, { status });
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      onUpdated();
    }
  };

  const handleExecuteReschedule = () => {
    if (!rescheduleDate || !rescheduleTime || !rescheduleProId) {
      setError('Preencha data, horário e profissional.');
      return;
    }
    if (!rescheduleReason || rescheduleReason.trim().length < 3) {
      setError('Informe o motivo da remarcação (mínimo 3 caracteres).');
      return;
    }

    setLoading(true);
    setError('');

    const result = rescheduleBooking(booking.id, {
      newDate: rescheduleDate,
      newTime: rescheduleTime,
      newProfessionalId: rescheduleProId,
      reason: rescheduleReason
    });

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      onUpdated();
      setMode('view');
    }
  };

  const handleDelete = () => {
    deleteBooking(booking.id);
    onUpdated();
    onClose();
  };

  const whatsappLink = buildWhatsAppLink(
    booking.clientPhone,
    `Olá ${booking.clientName}! Sua consulta de ${booking.serviceName} está agendada para ${formatDate(booking.date)} às ${booking.time}h com ${booking.professionalName} na Cuidare.`
  );

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-modal-title"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.97 }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl z-10 max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-[rgba(37,27,23,0.09)] shrink-0">
            <div>
              <h3 id="appointment-modal-title" className="font-semibold text-[#29231F] text-base">{booking.clientName}</h3>
              <p className="text-xs text-[#7C736D] mt-0.5">{booking.serviceName} · {booking.duration}min</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-1 rounded border font-bold uppercase ${statusInfo?.color}`}>
                {statusInfo?.label}
              </span>
              <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" aria-label="Fechar">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {mode === 'confirmDelete' ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                  <AlertTriangle size={24} className="text-red-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#29231F]">Remover agendamento?</h4>
                  <p className="text-sm text-[#7C736D] mt-1">Esta ação remove permanentemente o registro.</p>
                </div>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setMode('view')} className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={handleDelete} className="px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors">
                    Remover
                  </button>
                </div>
              </div>
            ) : mode === 'reschedule' ? (
              <div className="space-y-4">
                <div className="bg-[#F8F1E4] border border-champagne/30 rounded-lg p-3 text-xs text-champagne-dark font-semibold">
                  🔄 Remarcação de Agendamento (ID mantido: {booking.id})
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1">Profissional Elegível *</label>
                  <select
                    value={rescheduleProId}
                    onChange={e => { setRescheduleProId(e.target.value); setRescheduleTime(''); }}
                    className="w-full h-10 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]"
                  >
                    {eligibleProfessionals.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1">Nova Data *</label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={e => { setRescheduleDate(e.target.value); setRescheduleTime(''); }}
                    className="w-full h-10 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]"
                  />
                </div>

                {rescheduleDate && rescheduleProId && (
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1.5">
                      Novo Horário *
                      {availableRescheduleSlots.length === 0 && <span className="text-red-500 ml-1">(Sem slots disponíveis)</span>}
                    </label>
                    {availableRescheduleSlots.length > 0 ? (
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {availableRescheduleSlots.map(slot => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setRescheduleTime(slot)}
                            className={`h-9 text-xs font-semibold rounded-lg border transition-all ${
                              rescheduleTime === slot
                                ? 'bg-[#251B17] text-white border-[#251B17]'
                                : 'bg-white text-[#29231F] border-[rgba(37,27,23,0.12)] hover:border-[#C7A15D]'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input
                        type="time"
                        value={rescheduleTime}
                        onChange={e => setRescheduleTime(e.target.value)}
                        className="w-full h-10 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]"
                      />
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1">Motivo da Remarcação *</label>
                  <textarea
                    value={rescheduleReason}
                    onChange={e => setRescheduleReason(e.target.value)}
                    rows={2}
                    placeholder="Ex: Pedido da cliente por imprevisto..."
                    className="w-full p-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D] resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setMode('view')} className="flex-1 h-10 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">Cancelar</button>
                  <button onClick={handleExecuteReschedule} disabled={loading} className="flex-1 h-10 bg-[#251B17] text-white rounded-lg text-sm font-semibold hover:bg-[#1a120e] disabled:opacity-60">
                    {loading ? 'Remarcando...' : 'Confirmar Remarcação'}
                  </button>
                </div>
              </div>
            ) : mode === 'edit' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1.5">Status</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as BookingStatus)}
                    className="w-full h-10 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]"
                  >
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1.5">Valor (R$)</label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={e => setEditPrice(e.target.value)}
                    min={0}
                    className="w-full h-10 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1.5">Observações</label>
                  <textarea
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D] resize-none"
                    placeholder="Observações sobre o atendimento..."
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setMode('view')} className="flex-1 h-10 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">Cancelar</button>
                  <button onClick={handleSaveEdit} disabled={loading} className="flex-1 h-10 bg-[#251B17] text-white rounded-lg text-sm font-semibold hover:bg-[#1a120e] disabled:opacity-60">
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Detail rows */}
                <div className="space-y-3">
                  {[
                    { icon: Calendar, label: 'Data', value: formatDate(booking.date) },
                    { icon: Clock, label: 'Horário', value: `${booking.time}h — ${booking.endTime ?? ''}h (${booking.duration}min)` },
                    { icon: User, label: 'Profissional', value: booking.professionalName },
                    { icon: Phone, label: 'Telefone', value: booking.clientPhone },
                    { icon: MessageSquare, label: 'Observações', value: booking.notes || '—' },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-3">
                      <Icon size={14} className="text-[#C7A15D] mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-[#7C736D] block">{label}</span>
                        <span className="text-sm text-[#29231F]">{value}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-start gap-3">
                    <span className="w-3.5 h-3.5 mt-0.5 shrink-0">💰</span>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[#7C736D] block">Valor</span>
                      <span className="text-sm font-semibold text-[#29231F]">R$ {booking.price.toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[rgba(37,27,23,0.06)] text-[10px] text-[#7C736D] space-y-0.5">
                    <p>ID: {booking.id} · Origem: {booking.origin} · Criado por: {booking.createdByName ?? 'Sistema'}</p>
                    <p>Em: {new Date(booking.createdAt).toLocaleString('pt-BR')}</p>
                    {booking.updatedAt && <p>Atualizado em: {new Date(booking.updatedAt).toLocaleString('pt-BR')} por {booking.updatedByName}</p>}
                  </div>
                </div>

                {/* Reschedule history log if present */}
                {booking.rescheduleHistory && booking.rescheduleHistory.length > 0 && (
                  <div className="pt-3 border-t border-[rgba(37,27,23,0.08)] space-y-2">
                    <h5 className="text-xs font-semibold text-[#7C736D] uppercase tracking-wider flex items-center gap-1.5">
                      <History size={13} className="text-[#C7A15D]" /> Histórico de Remarcações ({booking.rescheduleHistory.length})
                    </h5>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {booking.rescheduleHistory.map((h, i) => (
                        <div key={i} className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-xs space-y-1">
                          <div className="flex justify-between font-semibold text-[#29231F]">
                            <span>De: {h.previousDate} {h.previousTime}h ({h.previousProfessionalName})</span>
                            <span>Para: {h.newDate} {h.newTime}h</span>
                          </div>
                          <p className="text-gray-600 italic">"Motivo: {h.reason}"</p>
                          <p className="text-[10px] text-gray-400">Em: {new Date(h.changedAt).toLocaleString('pt-BR')} por {h.changedByName ?? 'Usuário'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick status actions */}
                {canEdit && booking.status === 'pendente' && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[rgba(37,27,23,0.06)]">
                    <button
                      onClick={() => handleStatusChange('concluido')}
                      className="flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition-colors"
                    >
                      <Check size={14} /> Concluir
                    </button>
                    <button
                      onClick={() => handleStatusChange('faltou')}
                      className="flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors"
                    >
                      <UserX size={14} /> Faltou
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer actions */}
          {mode === 'view' && (
            <div className="p-4 border-t border-[rgba(37,27,23,0.09)] flex flex-wrap gap-2 shrink-0">
              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#25D366] text-white rounded-lg text-xs font-semibold hover:bg-[#20ba5a] transition-colors"
                >
                  <Phone size={13} /> WhatsApp
                </a>
              )}
              {canEdit && (
                <>
                  <button
                    onClick={() => {
                      setRescheduleDate(booking.date);
                      setRescheduleTime(booking.time);
                      setRescheduleProId(booking.professionalId);
                      setRescheduleReason('');
                      setError('');
                      setMode('reschedule');
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#F1E6D0] text-[#70542D] border border-[#E6D4B8] rounded-lg text-xs font-semibold hover:bg-[#e4d4b7] transition-colors"
                  >
                    <RefreshCw size={13} /> Remarcar
                  </button>

                  <button
                    onClick={() => { 
                      setEditNotes(booking.notes ?? ''); 
                      setEditStatus(booking.status); 
                      setEditPrice(String(booking.price)); 
                      setError('');
                      setMode('edit'); 
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#F1EBE4] text-[#29231F] rounded-lg text-xs font-semibold hover:bg-[#E8DED2] transition-colors"
                  >
                    <Edit2 size={13} /> Editar
                  </button>

                  {booking.status !== 'cancelado' && (
                    <button
                      onClick={() => handleStatusChange('cancelado')}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors"
                    >
                      <XCircle size={13} /> Cancelar
                    </button>
                  )}

                  <button
                    onClick={() => setMode('confirmDelete')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors ml-auto"
                  >
                    <Trash2 size={13} /> Remover
                  </button>
                </>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
