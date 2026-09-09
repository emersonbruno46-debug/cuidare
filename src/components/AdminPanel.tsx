// ─────────────────────────────────────────────
// CUIDARE — AdminPanel (refatorado)
// Painel completo da administradora com auth real
// ─────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, Calendar, Users, ArrowLeft,
  AlertCircle, Search, LayoutDashboard,
  Award, Bell, Menu, Settings, UserCog, LogOut
} from 'lucide-react';
import type { Booking, Client, AuthUser } from '../types';
import {
  getBookings, getClients, getProfessionals, seedDemoData
} from '../lib/dataService';
import { signOut, seedDefaultAccounts } from '../lib/auth';
import CalendarView from './admin/CalendarView';
import AppointmentModal from './admin/AppointmentModal';
import NewAppointmentForm from './admin/NewAppointmentForm';
import ClientDetail from './admin/ClientDetail';
import BusinessSettingsPanel from './admin/BusinessSettingsPanel';
import StaffManager from './admin/StaffManager';

interface AdminPanelProps {
  currentUser: AuthUser;
}

type AdminTab = 'dashboard' | 'agenda' | 'clientes' | 'comissoes' | 'configuracoes' | 'staff';

const Logo = () => (
  <div className="w-8 h-8 rounded-lg bg-[#29231F] flex items-center justify-center text-white font-bold text-sm">C</div>
);

export default function AdminPanel({ currentUser }: AdminPanelProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [period, setPeriod] = useState<'hoje' | 'semana' | 'mes'>('hoje');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [newAppointmentDate, setNewAppointmentDate] = useState<string | undefined>(undefined);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  // Seed on mount
  useEffect(() => {
    seedDefaultAccounts();
    seedDemoData();
  }, []);

  const isAdmin = currentUser.role === 'admin';

  // Data — filtered for collaborator
  const allBookings = getBookings();
  const bookings = isAdmin
    ? allBookings
    : allBookings.filter(b => b.professionalId === currentUser.professionalId);

  const allClients = getClients();
  const clients = isAdmin
    ? allClients
    : allClients.filter(c => {
        const clientPhones = bookings.map(b => b.clientPhone.replace(/\D/g, ''));
        return clientPhones.includes(c.phone.replace(/\D/g, ''));
      });

  const professionals = getProfessionals().filter(p => p.active !== false);

  // Period filter
  const getPeriodBookings = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    return bookings.filter(b => {
      const bDate = new Date(b.date + 'T00:00:00');
      if (period === 'hoje') return b.date === todayStr;
      if (period === 'semana') {
        const diff = (bDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
        return diff >= -7 && diff <= 7;
      }
      return bDate.getMonth() === today.getMonth() && bDate.getFullYear() === today.getFullYear();
    });
  };

  const periodBookings = getPeriodBookings();

  const stats = {
    completedCount: periodBookings.filter(b => b.status === 'concluido').length,
    pendingCount: periodBookings.filter(b => b.status === 'pendente' || b.status === 'confirmado').length,
    noShowCount: periodBookings.filter(b => b.status === 'faltou').length,
    cancelledCount: periodBookings.filter(b => b.status === 'cancelado').length,
    revenueTotal: periodBookings.filter(b => b.status === 'concluido').reduce((s, b) => s + b.price, 0),
  };

  // Commission data
  const getCommissionReport = () => {
    const list = professionals.map(pro => {
      const proBookings = (isAdmin ? allBookings : bookings)
        .filter(b => b.professionalId === pro.id && b.status === 'concluido');
      const production = proBookings.reduce((s, b) => s + b.price, 0);
      const rate = pro.commissionRate ?? 0.5;
      return {
        proId: pro.id,
        proName: pro.name,
        role: pro.role,
        count: proBookings.length,
        production,
        commission: production * rate,
        salonCut: production * (1 - rate),
        rate
      };
    });
    const total = list.reduce((s, i) => s + i.production, 0);
    return { list, total, totalCommission: total * 0.5, totalSalon: total * 0.5 };
  };
  const commissionData = getCommissionReport();

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const getStatusColor = (status: Booking['status']) => {
    const map: Record<string, string> = {
      concluido: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      pendente: 'bg-amber-50 text-amber-700 border-amber-200',
      confirmado: 'bg-blue-50 text-blue-700 border-blue-200',
      faltou: 'bg-red-50 text-red-700 border-red-200',
      cancelado: 'bg-gray-100 text-gray-600 border-gray-300',
    };
    return map[status] ?? 'bg-gray-50 text-gray-700';
  };

  const formattedToday = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const navItems: { id: AdminTab; name: string; icon: typeof LayoutDashboard; adminOnly?: boolean }[] = [
    { id: 'dashboard' as AdminTab, name: 'Visão Geral', icon: LayoutDashboard },
    { id: 'agenda' as AdminTab, name: 'Agenda Geral', icon: Calendar },
    { id: 'clientes' as AdminTab, name: 'Base de Clientes', icon: Users },
    { id: 'comissoes' as AdminTab, name: 'Produção & Comissões', icon: DollarSign },
    { id: 'staff' as AdminTab, name: 'Equipe', icon: UserCog, adminOnly: true },
    { id: 'configuracoes' as AdminTab, name: 'Configurações', icon: Settings, adminOnly: true },
  ].filter(item => !item.adminOnly || isAdmin);

  const handleLogout = () => {
    signOut();
    navigate('/acesso');
  };

  const SidebarContent = () => (
    <div className="h-full flex flex-col justify-between py-6 px-4 bg-[#FCFBF9] text-[#29231F] font-sans">
      <div className="space-y-8">
        <div className="flex items-center gap-3 px-3">
          <Logo />
          <div>
            <span className="font-bold text-sm tracking-widest block leading-none">CUIDARE</span>
            <span className="text-[10px] text-gray-500 font-medium">WORKSPACE</span>
          </div>
        </div>

        <div className="flex items-center gap-3 px-3">
          <div className="w-9 h-9 rounded-full bg-[#F1E6D0] flex items-center justify-center text-[#C7A15D] font-semibold text-sm border border-[rgba(199,161,93,0.3)]">
            {currentUser.name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-semibold block truncate">{currentUser.name}</span>
            <span className="text-xs text-gray-500 font-medium block capitalize">
              {isAdmin ? 'Administradora' : 'Colaboradora'}
            </span>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setMobileSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#F1E6D0] text-[#7A5428]'
                    : 'text-[#7C736D] hover:bg-gray-100 hover:text-[#29231F]'
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                {item.name}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="px-2 space-y-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-[#7C736D] hover:text-[#29231F] hover:bg-gray-100 rounded-md text-xs font-medium transition-colors"
        >
          <LogOut size={14} /> Sair
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center justify-center gap-2 py-2 text-[#7C736D] hover:text-[#29231F] text-xs font-medium transition-colors"
        >
          <ArrowLeft size={14} /> Voltar ao site
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F5F1] text-[#29231F] flex overflow-x-hidden w-full font-sans">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 border-r border-[rgba(37,27,23,0.09)] h-screen sticky top-0 shrink-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 bottom-0 left-0 w-64 bg-[#FCFBF9] border-r border-[rgba(37,27,23,0.09)] z-50 lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto relative">
        {/* Header */}
        <header className="h-[72px] bg-white border-b border-[rgba(37,27,23,0.09)] px-6 flex justify-between items-center sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileSidebarOpen(true)} className="p-2 -ml-2 hover:bg-gray-100 rounded-md lg:hidden">
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-[#29231F] leading-tight">
                {navItems.find(i => i.id === activeTab)?.name ?? 'Painel'}
              </h1>
              <p className="text-xs text-gray-500 font-medium capitalize">{formattedToday}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#E3E9E1] text-[#71806F] rounded-full text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#71806F] animate-pulse" />
              Online
            </div>
            <button className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors">
              <Bell size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-8 max-w-7xl w-full mx-auto" key={refreshKey}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Period filter */}
                <div className="flex bg-gray-100 p-1 rounded-md w-fit">
                  {(['hoje', 'semana', 'mes'] as const).map(p => (
                    <button key={p} onClick={() => setPeriod(p)}
                      className={`px-4 py-1.5 text-xs font-semibold rounded-sm transition-colors capitalize ${period === p ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}
                    >{p}</button>
                  ))}
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Faturamento', value: `R$ ${stats.revenueTotal.toFixed(0)}`, icon: DollarSign, color: 'text-[#C7A15D]', sub: 'concluídos' },
                    { label: 'Agendamentos', value: stats.pendingCount, icon: Calendar, sub: 'ativos' },
                    { label: 'Concluídos', value: stats.completedCount, icon: Award, color: 'text-[#71806F]', sub: 'sucesso' },
                    { label: 'Faltas', value: stats.noShowCount, icon: AlertCircle, color: 'text-red-500', sub: 'ausências' },
                  ].map((m, i) => (
                    <div key={i} className="bg-white p-5 rounded-xl border border-[rgba(37,27,23,0.09)] shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{m.label}</span>
                        <m.icon size={16} className="text-gray-400" />
                      </div>
                      <div className="flex items-end justify-between">
                        <span className={`text-2xl font-bold ${m.color ?? 'text-[#29231F]'}`}>{m.value}</span>
                        <span className="text-xs font-medium text-gray-400">{m.sub}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent flow */}
                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-[rgba(37,27,23,0.09)] shadow-sm">
                    <h4 className="text-sm font-semibold text-[#29231F] mb-4">Fluxo recente</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                          <tr className="border-b border-gray-100 text-xs font-semibold uppercase text-gray-400">
                            <th className="pb-3">Cliente</th>
                            <th className="pb-3">Serviço</th>
                            <th className="pb-3">Profissional</th>
                            <th className="pb-3">Data</th>
                            <th className="pb-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {bookings.slice(0, 6).map(b => (
                            <tr key={b.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedBooking(b)}>
                              <td className="py-3 font-medium text-[#29231F]">{b.clientName}</td>
                              <td className="py-3 text-gray-600 max-w-[120px] truncate">{b.serviceName}</td>
                              <td className="py-3 text-gray-600">{b.professionalName}</td>
                              <td className="py-3 text-gray-600 text-xs">{new Date(b.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                              <td className="py-3">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${getStatusColor(b.status)}`}>
                                  {b.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-[rgba(37,27,23,0.09)] shadow-sm">
                    <h4 className="text-sm font-semibold text-[#29231F] mb-4">Serviços mais solicitados</h4>
                    {periodBookings.length === 0 ? (
                      <p className="text-xs text-gray-400">Sem dados para o período.</p>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(
                          periodBookings.reduce((acc, b) => {
                            acc[b.serviceName] = (acc[b.serviceName] ?? 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        )
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 6)
                          .map(([name, count]) => (
                            <div key={name} className="flex justify-between items-center text-sm">
                              <span className="text-[#29231F] font-medium truncate max-w-[160px]">{name}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-[#C7A15D] h-full rounded-full" style={{ width: `${Math.min(count * 15, 100)}%` }} />
                                </div>
                                <span className="text-xs text-gray-500 font-mono">{count}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* AGENDA */}
            {activeTab === 'agenda' && (
              <CalendarView
                professionals={professionals}
                currentUserProfessionalId={!isAdmin ? currentUser.professionalId : undefined}
                onSelectSlot={(date, time, professionalId) => {
                  const booking = allBookings.find(
                    b => b.date === date && b.time === time && b.professionalId === professionalId
                  );
                  if (booking) setSelectedBooking(booking);
                  else { setNewAppointmentDate(date); setShowNewAppointment(true); }
                }}
                onNewAppointment={(date) => { setNewAppointmentDate(date); setShowNewAppointment(true); }}
              />
            )}

            {/* CLIENTES */}
            {activeTab === 'clientes' && (
              <div className="bg-white rounded-xl border border-[rgba(37,27,23,0.09)] shadow-sm">
                <div className="p-5 border-b border-[rgba(37,27,23,0.09)] flex justify-between items-center">
                  <h3 className="font-semibold text-[#29231F]">Base de Clientes ({filteredClients.length})</h3>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Nome ou telefone..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#C7A15D]"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-xs font-semibold text-gray-500 uppercase">
                        <th className="px-6 py-4">Nome</th>
                        <th className="px-6 py-4">Contato</th>
                        <th className="px-6 py-4 text-center">Visitas</th>
                        <th className="px-6 py-4 text-right">Total gasto</th>
                        <th className="px-6 py-4">Última visita</th>
                        <th className="px-6 py-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredClients.length === 0 ? (
                        <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">Nenhum cliente encontrado.</td></tr>
                      ) : filteredClients.map(c => (
                        <tr key={c.phone} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedClient(c)}>
                          <td className="px-6 py-4 font-medium text-[#29231F]">{c.name}</td>
                          <td className="px-6 py-4 text-gray-600">{c.phone}</td>
                          <td className="px-6 py-4 text-center font-semibold text-[#29231F]">{c.totalVisits}</td>
                          <td className="px-6 py-4 text-right font-medium text-[#29231F]">
                            R$ {c.totalSpent.toFixed(2).replace('.', ',')}
                          </td>
                          <td className="px-6 py-4 text-gray-500 text-sm">
                            {c.lastVisit ? new Date(c.lastVisit + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={e => { e.stopPropagation(); setSelectedClient(c); }}
                              className="text-xs font-semibold text-[#C7A15D] hover:text-[#a87d37] bg-[#F1E6D0] px-3 py-1.5 rounded-md transition-colors"
                            >
                              Ver ficha
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* COMISSÕES */}
            {activeTab === 'comissoes' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { label: 'Faturamento Bruto', value: `R$ ${commissionData.total.toFixed(2).replace('.', ',')}`, color: '' },
                    { label: 'Comissões Devidas', value: `R$ ${commissionData.totalCommission.toFixed(2).replace('.', ',')}`, color: 'text-gray-600' },
                    { label: 'Resultado Salão', value: `R$ ${commissionData.totalSalon.toFixed(2).replace('.', ',')}`, color: 'text-emerald-800', bg: 'bg-emerald-50 border-emerald-100' },
                  ].map(item => (
                    <div key={item.label} className={`p-6 rounded-xl border shadow-sm ${item.bg ?? 'bg-white border-[rgba(37,27,23,0.09)]'}`}>
                      <span className="text-xs text-gray-500 font-semibold uppercase">{item.label}</span>
                      <h3 className={`text-2xl font-bold mt-2 ${item.color ?? 'text-[#29231F]'}`}>{item.value}</h3>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-xl border border-[rgba(37,27,23,0.09)] shadow-sm overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr className="text-xs font-semibold text-gray-500 uppercase">
                        <th className="px-6 py-4">Profissional</th>
                        <th className="px-6 py-4 text-center">Atendimentos</th>
                        <th className="px-6 py-4 text-right">Produção</th>
                        <th className="px-6 py-4 text-right">Taxa</th>
                        <th className="px-6 py-4 text-right">Comissão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {commissionData.list.map(item => (
                        <tr key={item.proId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-[#29231F]">{item.proName}</td>
                          <td className="px-6 py-4 text-center text-gray-600">{item.count}</td>
                          <td className="px-6 py-4 text-right font-medium text-[#29231F]">
                            R$ {item.production.toFixed(2).replace('.', ',')}
                          </td>
                          <td className="px-6 py-4 text-right text-gray-500">
                            {Math.round(item.rate * 100)}%
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-[#29231F]">
                            R$ {item.commission.toFixed(2).replace('.', ',')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* STAFF */}
            {activeTab === 'staff' && isAdmin && <StaffManager />}

            {/* CONFIGURAÇÕES */}
            {activeTab === 'configuracoes' && isAdmin && <BusinessSettingsPanel />}

          </motion.div>
        </main>
      </div>

      {/* Modals */}
      {selectedBooking && (
        <AppointmentModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onUpdated={() => { refresh(); setSelectedBooking(null); }}
          currentUser={currentUser}
        />
      )}

      {showNewAppointment && (
        <NewAppointmentForm
          initialDate={newAppointmentDate}
          currentUser={currentUser}
          onClose={() => setShowNewAppointment(false)}
          onCreated={() => { refresh(); setShowNewAppointment(false); }}
        />
      )}

      {selectedClient && (
        <ClientDetail
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
