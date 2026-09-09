// ─────────────────────────────────────────────
// CUIDARE — NewAppointmentForm
// Formulário de agendamento manual com parser NL
// ─────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Sparkles, AlertCircle, Check, Search } from 'lucide-react';
import type { AuthUser, BookingOrigin, BookingStatus } from '../../types';
import { services } from '../../data/servicesData';
import { getProfessionals, createBooking, getClientByPhone } from '../../lib/dataService';
import { parseBookingMessage, formatParsedDate } from '../../lib/nlParser';
import { getAvailableSlots } from '../../lib/availability';
import { getBookings } from '../../lib/dataService';

interface NewAppointmentFormProps {
  initialDate?: string;
  currentUser: AuthUser;
  onClose: () => void;
  onCreated: () => void;
}

type FormStep = 'form' | 'nl' | 'success';

export default function NewAppointmentForm({ initialDate, currentUser, onClose, onCreated }: NewAppointmentFormProps) {
  const professionals = getProfessionals().filter(p => p.active !== false);
  const isAdmin = currentUser.role === 'admin';

  const [step, setStep] = useState<FormStep>('form');
  const [nlMessage, setNlMessage] = useState('');
  const [nlParsed, setNlParsed] = useState<ReturnType<typeof parseBookingMessage> | null>(null);
  const [nlLoading, setNlLoading] = useState(false);

  // Form fields
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [professionalId, setProfessionalId] = useState(
    currentUser.role === 'collaborator' ? currentUser.professionalId ?? '' : ''
  );
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(initialDate ?? '');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [origin, setOrigin] = useState<BookingOrigin>('manual_admin');
  const [status, setStatus] = useState<BookingStatus>('pendente');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [clientFound, setClientFound] = useState(false);

  const selectedService = services.find(s => s.id === serviceId);
  const selectedPro = professionals.find(p => p.id === professionalId);
  const allBookings = getBookings();

  // Auto-fill service duration and price
  useEffect(() => {
    if (selectedService) {
      setDuration(selectedService.duration);
      setPrice(String(selectedService.priceBase));
    }
  }, [selectedService]);

  // Auto-lookup client by phone
  useEffect(() => {
    if (clientPhone.replace(/\D/g, '').length >= 10) {
      const found = getClientByPhone(clientPhone);
      if (found) {
        setClientName(found.name);
        setClientEmail(found.email ?? '');
        setClientFound(true);
      } else {
        setClientFound(false);
      }
    }
  }, [clientPhone]);

  // Available slots
  const availableSlots = date && professionalId
    ? getAvailableSlots(date, professionalId, duration, allBookings, professionals)
    : [];

  // NL Parser
  const handleParseMessage = () => {
    setNlLoading(true);
    setTimeout(() => {
      const parsed = parseBookingMessage(nlMessage);
      setNlParsed(parsed);
      // Pre-fill form
      if (parsed.clientName) setClientName(parsed.clientName);
      if (parsed.clientPhone) setClientPhone(parsed.clientPhone);
      if (parsed.professionalId && isAdmin) setProfessionalId(parsed.professionalId);
      if (parsed.serviceId) setServiceId(parsed.serviceId);
      if (parsed.date) setDate(parsed.date);
      if (parsed.time) setTime(parsed.time);
      if (parsed.notes) setNotes(parsed.notes);
      setNlLoading(false);
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!clientName.trim() || !clientPhone.trim()) {
      setError('Nome e telefone do cliente são obrigatórios.'); return;
    }
    if (!serviceId) { setError('Selecione um serviço.'); return; }
    if (!professionalId) { setError('Selecione uma profissional.'); return; }
    if (!date) { setError('Selecione a data.'); return; }
    if (!time) { setError('Selecione o horário.'); return; }

    setLoading(true);
    const result = createBooking({
      serviceId,
      serviceName: selectedService?.name ?? serviceId,
      professionalId,
      professionalName: selectedPro?.name ?? professionalId,
      date,
      time,
      duration,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      clientEmail: clientEmail.trim() || undefined,
      notes: notes.trim() || undefined,
      status,
      price: parseFloat(price) || (selectedService?.priceBase ?? 0),
      origin,
    });
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setStep('success');
      setTimeout(() => { onCreated(); onClose(); }, 1500);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="relative w-full sm:max-w-xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl z-10 max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[rgba(37,27,23,0.09)] shrink-0">
            <h3 className="font-semibold text-[#29231F]">Novo Agendamento</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep(step === 'nl' ? 'form' : 'nl')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  step === 'nl' ? 'bg-[#251B17] text-white' : 'bg-[#F1EBE4] text-[#786A61] hover:bg-[#E8DED2]'
                }`}
              >
                <MessageSquare size={13} /> Agendar por mensagem
              </button>
              <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-md">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {step === 'success' ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check size={28} className="text-emerald-600" />
                </div>
                <p className="font-semibold text-[#29231F]">Agendamento criado!</p>
              </div>
            ) : step === 'nl' ? (
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-sm text-[#7C736D] mb-3">
                    Cole ou digite uma mensagem descrevendo o agendamento. O sistema vai interpretar e preencher os campos automaticamente.
                  </p>
                  <p className="text-xs text-[#C7A15D] font-semibold mb-2">Exemplo:</p>
                  <p className="text-xs text-[#756B65] bg-[#F8F5F0] p-3 rounded-lg italic mb-3">
                    "Agendar horário de Bruna às 8:00 do dia 27/09 com Fernanda para escova"
                  </p>
                  <textarea
                    value={nlMessage}
                    onChange={e => setNlMessage(e.target.value)}
                    rows={4}
                    placeholder="Cole ou escreva a mensagem aqui..."
                    className="w-full p-3 border border-[rgba(37,27,23,0.12)] rounded-xl text-sm focus:outline-none focus:border-[#C7A15D] resize-none"
                  />
                </div>
                <button
                  onClick={handleParseMessage}
                  disabled={!nlMessage.trim() || nlLoading}
                  className="w-full h-11 bg-[#251B17] text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#1a120e] disabled:opacity-50 transition-colors"
                >
                  <Sparkles size={16} />
                  {nlLoading ? 'Interpretando...' : 'Interpretar mensagem'}
                </button>

                {/* Preview */}
                {nlParsed && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <h4 className="font-semibold text-sm text-[#29231F]">Prévia interpretada:</h4>
                    <div className="bg-[#F8F5F0] rounded-xl p-4 space-y-2 border border-[rgba(37,27,23,0.08)]">
                      {[
                        { label: 'Cliente', value: nlParsed.clientName },
                        { label: 'Telefone', value: nlParsed.clientPhone },
                        { label: 'Profissional', value: nlParsed.professionalName },
                        { label: 'Serviço', value: nlParsed.serviceName },
                        { label: 'Data', value: nlParsed.date ? formatParsedDate(nlParsed.date) : undefined },
                        { label: 'Horário', value: nlParsed.time ? `${nlParsed.time}h` : undefined },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between text-sm">
                          <span className="text-[#7C736D] text-xs font-semibold uppercase">{label}</span>
                          {value ? (
                            <span className="font-medium text-[#29231F]">{value}</span>
                          ) : (
                            <span className="text-amber-600 text-xs font-medium flex items-center gap-1">
                              <AlertCircle size={12} /> Não encontrado
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {nlParsed.ambiguous.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs text-amber-700 font-semibold">
                          Campos que precisam de confirmação: {nlParsed.ambiguous.join(', ')}
                        </p>
                      </div>
                    )}

                    <button
                      onClick={() => setStep('form')}
                      className="w-full h-11 border-2 border-[#C7A15D] text-[#C7A15D] rounded-xl font-semibold text-sm hover:bg-[#F1E6D0] transition-colors"
                    >
                      Revisar e confirmar →
                    </button>
                  </motion.div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Client section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#7C736D]">Cliente</h4>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1">
                      Telefone / WhatsApp *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={clientPhone}
                        onChange={e => setClientPhone(e.target.value)}
                        placeholder="(38) 99100-0000"
                        className={`w-full h-10 pl-4 pr-10 border rounded-lg text-sm focus:outline-none focus:border-[#C7A15D] transition-colors ${
                          clientFound ? 'border-emerald-300 bg-emerald-50' : 'border-[rgba(37,27,23,0.12)]'
                        }`}
                      />
                      {clientFound && <Check size={14} className="absolute right-3 top-3 text-emerald-600" />}
                    </div>
                    {clientFound && (
                      <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                        <Search size={11} /> Cliente encontrado: {clientName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1">
                      Nome completo *
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      placeholder="Nome da cliente"
                      className="w-full h-10 px-4 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]"
                    />
                  </div>
                </div>

                {/* Professional & Service */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#7C736D]">Profissional e Serviço</h4>
                  
                  {/* Professional */}
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1">Profissional *</label>
                    {isAdmin ? (
                      <select
                        value={professionalId}
                        onChange={e => {
                          const newProId = e.target.value;
                          setProfessionalId(newProId);
                          // Reset serviceId if it doesn't belong to new pro
                          if (serviceId) {
                            const newPro = professionals.find(p => p.id === newProId);
                            const currentServ = services.find(s => s.id === serviceId);
                            if (currentServ && newPro) {
                              const isEligible = currentServ.professionalIds 
                                ? currentServ.professionalIds.includes(newProId)
                                : newPro.categories.includes(currentServ.category);
                              if (!isEligible) setServiceId('');
                            }
                          }
                        }}
                        className="w-full h-10 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]"
                      >
                        <option value="">Selecione a profissional</option>
                        {professionals.map(p => (
                          <option key={p.id} value={p.id}>{p.name} {p.specialtyBadge ? `(${p.specialtyBadge})` : ''}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={selectedPro?.name ?? ''}
                        readOnly
                        className="w-full h-10 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm bg-gray-50 text-[#7C736D]"
                      />
                    )}
                  </div>

                  {/* Service */}
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1">Serviço *</label>
                    <select
                      value={serviceId}
                      onChange={e => setServiceId(e.target.value)}
                      className="w-full h-10 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]"
                    >
                      <option value="">Selecione um serviço</option>
                      {services
                        .filter(s => {
                          if (!professionalId) return true;
                          if (s.professionalIds && s.professionalIds.length > 0) {
                            return s.professionalIds.includes(professionalId);
                          }
                          return selectedPro ? selectedPro.categories.includes(s.category) : true;
                        })
                        .map(s => {
                          const priceStr = (s.priceType === 'range' && s.priceRange)
                            ? `R$ ${s.priceRange.min} a R$ ${s.priceRange.max}`
                            : `R$ ${s.priceBase}`;
                          return (
                            <option key={s.id} value={s.id}>{s.name} – {priceStr}</option>
                          );
                        })}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1">Duração (min)</label>
                      <input
                        type="number"
                        value={duration}
                        onChange={e => setDuration(parseInt(e.target.value) || 30)}
                        min={15}
                        step={15}
                        className="w-full h-10 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1">Valor (R$)</label>
                      <input
                        type="number"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        className="w-full h-10 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]"
                      />
                    </div>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#7C736D]">Data e Horário</h4>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1">Data *</label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => { setDate(e.target.value); setTime(''); }}
                      className="w-full h-10 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]"
                    />
                  </div>
                  {date && professionalId && (
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1.5">
                        Horário *
                        {availableSlots.length === 0 && <span className="text-red-500 ml-1">(Sem slots disponíveis)</span>}
                      </label>
                      {availableSlots.length > 0 ? (
                        <div className="grid grid-cols-5 sm:grid-cols-7 gap-1.5">
                          {availableSlots.map(slot => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setTime(slot)}
                              className={`h-9 text-xs font-semibold rounded-lg border transition-all ${
                                time === slot
                                  ? 'bg-[#251B17] text-white border-[#251B17]'
                                  : 'bg-white text-[#29231F] border-[rgba(37,27,23,0.12)] hover:border-[#C7A15D] hover:bg-[#F1EBE4]'
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div>
                          <input
                            type="time"
                            value={time}
                            onChange={e => setTime(e.target.value)}
                            className="w-full h-10 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]"
                          />
                          <p className="text-[11px] text-amber-600 mt-1">⚠️ Nenhum slot automático disponível. Insira manualmente e será validado.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Extra fields */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1">Observações</label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={2}
                      className="w-full p-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D] resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1">Status</label>
                      <select
                        value={status}
                        onChange={e => setStatus(e.target.value as BookingStatus)}
                        className="w-full h-10 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]"
                      >
                        <option value="pendente">Pendente</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="concluido">Concluído</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#756B65] mb-1">Origem</label>
                      <select
                        value={origin}
                        onChange={e => setOrigin(e.target.value as BookingOrigin)}
                        className="w-full h-10 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-sm focus:outline-none focus:border-[#C7A15D]"
                      >
                        <option value="manual_admin">Manual (Admin)</option>
                        <option value="manual_colaboradora">Manual (Colaboradora)</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="presencial">Presencial</option>
                        <option value="site">Site</option>
                      </select>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertCircle size={14} /> {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={onClose} className="flex-1 h-11 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-11 bg-[#251B17] text-white rounded-xl text-sm font-semibold hover:bg-[#1a120e] disabled:opacity-60 transition-colors"
                  >
                    {loading ? 'Salvando...' : 'Confirmar agendamento'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
