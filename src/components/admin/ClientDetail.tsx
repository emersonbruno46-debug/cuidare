// ─────────────────────────────────────────────
// CUIDARE — ClientDetail
// Ficha completa da cliente com histórico
// ─────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, Plus, Calendar, Clock } from 'lucide-react';
import type { Client, AuthUser } from '../../types';
import { getClientHistory, getBookings, addManualHistoryEntry, getProfessionals } from '../../lib/dataService';
import { services } from '../../data/servicesData';
import { buildWhatsAppLink } from '../../lib/businessSettings';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientDetailProps {
  client: Client;
  onClose: () => void;
  currentUser: AuthUser;
}

export default function ClientDetail({ client, onClose, currentUser: _currentUser }: ClientDetailProps) {
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualService, setManualService] = useState('');
  const [manualPro, setManualPro] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const professionals = getProfessionals();
  const history = getClientHistory(client.id);
  const upcomingBookings = getBookings().filter(
    b => b.clientPhone.replace(/\D/g, '') === client.phone.replace(/\D/g, '') &&
    b.date >= new Date().toISOString().split('T')[0] &&
    b.status !== 'cancelado'
  ).sort((a, b) => a.date.localeCompare(b.date));

  const whatsappLink = buildWhatsAppLink(
    client.phone,
    `Olá ${client.name}! Aqui é da Cuidare Espaço de Beleza. Como podemos ajudar?`
  );

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  const timeAgo = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr + 'T12:00:00'), { addSuffix: true, locale: ptBR });
    } catch { return ''; }
  };

  const handleAddManual = async () => {
    if (!manualService || !manualPro || !manualDate) return;
    setSaving(true);
    const pro = professionals.find(p => p.id === manualPro);
    const svc = services.find(s => s.id === manualService);
    addManualHistoryEntry(client.id, {
      serviceName: svc?.name ?? manualService,
      professionalId: manualPro,
      professionalName: pro?.name ?? manualPro,
      date: manualDate,
      price: parseFloat(manualPrice) || 0,
      notes: manualNotes || undefined,
    });
    setShowManualForm(false);
    setManualService(''); setManualPro(''); setManualDate(''); setManualPrice(''); setManualNotes('');
    setSaving(false);
    setRefreshKey(k => k + 1);
  };

  const statusColors: Record<string, string> = {
    concluido: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    pendente: 'text-amber-700 bg-amber-50 border-amber-200',
    faltou: 'text-red-700 bg-red-50 border-red-200',
    cancelado: 'text-gray-600 bg-gray-100 border-gray-200',
  };

  return (
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
        <div className="flex items-start justify-between p-5 border-b border-[rgba(37,27,23,0.09)] shrink-0">
          <div>
            <h3 className="font-semibold text-[#29231F] text-lg">{client.name}</h3>
            <p className="text-sm text-[#7C736D] mt-0.5">{client.phone}</p>
          </div>
          <div className="flex items-center gap-2">
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] text-white rounded-lg text-xs font-semibold hover:bg-[#20ba5a] transition-colors"
              >
                <Phone size={13} /> WhatsApp
              </a>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-md">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 divide-x divide-[rgba(37,27,23,0.09)] border-b border-[rgba(37,27,23,0.09)]">
            {[
              { label: 'Total de visitas', value: client.totalVisits },
              { label: 'Total gasto', value: `R$ ${client.totalSpent.toFixed(2).replace('.', ',')}` },
              { label: 'Última visita', value: client.lastVisit ? timeAgo(client.lastVisit) : '—' },
            ].map(stat => (
              <div key={stat.label} className="p-4 text-center">
                <div className="text-lg font-bold text-[#29231F]">{stat.value}</div>
                <div className="text-[10px] text-[#7C736D] uppercase tracking-wider font-semibold mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="p-5 space-y-6">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {client.firstVisit && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[#7C736D] block">Primeira visita</span>
                  <span className="text-[#29231F]">{formatDate(client.firstVisit)}</span>
                </div>
              )}
              {client.lastVisit && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[#7C736D] block">Última visita</span>
                  <span className="text-[#29231F]">{formatDate(client.lastVisit)}</span>
                </div>
              )}
              {client.email && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[#7C736D] block">E-mail</span>
                  <span className="text-[#29231F]">{client.email}</span>
                </div>
              )}
              {client.notes && (
                <div className="col-span-2">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[#7C736D] block">Observações</span>
                  <span className="text-[#29231F]">{client.notes}</span>
                </div>
              )}
            </div>

            {/* Upcoming */}
            {upcomingBookings.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#7C736D] mb-3 flex items-center gap-2">
                  <Calendar size={13} className="text-[#C7A15D]" /> Próximos agendamentos
                </h4>
                <div className="space-y-2">
                  {upcomingBookings.map(b => (
                    <div key={b.id} className="flex items-center justify-between p-3 bg-[#F8F5F0] rounded-lg text-sm">
                      <div>
                        <span className="font-medium text-[#29231F]">{b.serviceName}</span>
                        <span className="text-[#7C736D] mx-2">·</span>
                        <span className="text-[#7C736D]">{b.professionalName}</span>
                      </div>
                      <div className="text-right text-xs text-[#7C736D]">
                        <div>{formatDate(b.date)}</div>
                        <div className="font-semibold">{b.time}h</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#7C736D] flex items-center gap-2">
                  <Clock size={13} className="text-[#C7A15D]" /> Histórico de procedimentos
                </h4>
                <button
                  onClick={() => setShowManualForm(!showManualForm)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#C7A15D] hover:text-[#a87d37] transition-colors"
                >
                  <Plus size={13} /> Adicionar antigo
                </button>
              </div>

              {/* Manual entry form */}
              <AnimatePresence>
                {showManualForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 p-4 bg-[#F8F5F0] rounded-xl border border-[rgba(37,27,23,0.08)] space-y-3 overflow-hidden"
                  >
                    <p className="text-xs text-[#7C736D]">Cadastrar procedimento realizado antes do sistema</p>
                    <div className="grid grid-cols-2 gap-2">
                      <select value={manualService} onChange={e => setManualService(e.target.value)} className="h-9 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-xs focus:outline-none focus:border-[#C7A15D] col-span-2">
                        <option value="">Serviço *</option>
                        {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <select value={manualPro} onChange={e => setManualPro(e.target.value)} className="h-9 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-xs focus:outline-none focus:border-[#C7A15D]">
                        <option value="">Profissional *</option>
                        {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="h-9 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-xs focus:outline-none focus:border-[#C7A15D]" />
                      <input type="number" value={manualPrice} onChange={e => setManualPrice(e.target.value)} placeholder="Valor R$" className="h-9 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-xs focus:outline-none focus:border-[#C7A15D]" />
                      <input type="text" value={manualNotes} onChange={e => setManualNotes(e.target.value)} placeholder="Observação (opcional)" className="h-9 px-3 border border-[rgba(37,27,23,0.12)] rounded-lg text-xs focus:outline-none focus:border-[#C7A15D]" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowManualForm(false)} className="flex-1 h-8 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50">Cancelar</button>
                      <button onClick={handleAddManual} disabled={saving || !manualService || !manualPro || !manualDate} className="flex-1 h-8 bg-[#251B17] text-white rounded-lg text-xs font-semibold disabled:opacity-50 hover:bg-[#1a120e] transition-colors">
                        {saving ? '...' : 'Salvar'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* History entries */}
              {history.length === 0 ? (
                <div className="py-8 text-center text-sm text-[#7C736D]">
                  <p>Nenhum histórico registrado ainda.</p>
                </div>
              ) : (
                <div className="space-y-3" key={refreshKey}>
                  {history.map(entry => (
                    <div key={entry.id} className="p-4 bg-white border border-[rgba(37,27,23,0.09)] rounded-xl shadow-sm">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="font-semibold text-sm text-[#29231F]">{entry.serviceName}</span>
                          {entry.addedManually && (
                            <span className="ml-2 text-[9px] px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-bold uppercase">Manual</span>
                          )}
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded border font-bold uppercase shrink-0 ${statusColors[entry.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {entry.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#7C736D]">
                        <span>{entry.professionalName}</span>
                        <span>{formatDate(entry.date)}</span>
                        <span className="text-[#7C736D] italic">{timeAgo(entry.date)}</span>
                        <span className="font-semibold text-[#29231F]">R$ {entry.price.toFixed(2).replace('.', ',')}</span>
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-[#7C736D] mt-1.5 italic">"{entry.notes}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
