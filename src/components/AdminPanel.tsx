import { useState } from 'react';
import { 
  TrendingUp, DollarSign, Calendar, Users, ArrowLeft, 
  Trash2, AlertCircle, Search
} from 'lucide-react';
import { professionals } from '../data/professionalsData';
import type { Booking, Client } from '../types';

interface AdminPanelProps {
  onBackToLanding: () => void;
  bookings: Booking[];
  onUpdateBookingStatus: (id: string, status: Booking['status']) => void;
  onDeleteBooking: (id: string) => void;
}

export default function AdminPanel({ 
  onBackToLanding, 
  bookings, 
  onUpdateBookingStatus, 
  onDeleteBooking 
}: AdminPanelProps) {
  const [currentView, setCurrentView] = useState<'owner' | 'professional'>('owner');
  const [selectedProId, setSelectedProId] = useState<string>(professionals[0].id);
  const [ownerTab, setOwnerTab] = useState<'dashboard' | 'agenda' | 'clientes' | 'comissoes'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [agendaDateFilter, setAgendaDateFilter] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Helpers for calculations
  const getCompletedBookings = () => bookings.filter(b => b.status === 'concluido');
  const getPendenteBookings = () => bookings.filter(b => b.status === 'pendente');
  const getFaltouBookings = () => bookings.filter(b => b.status === 'faltou');
  const getCanceladoBookings = () => bookings.filter(b => b.status === 'cancelado');

  // Calculates financial stats
  const calculateStats = () => {
    const completed = getCompletedBookings();
    const totalRev = completed.reduce((acc, curr) => acc + curr.price, 0);
    const pendenteRev = getPendenteBookings().reduce((acc, curr) => acc + curr.price, 0);
    
    return {
      completedCount: completed.length,
      pendingCount: getPendenteBookings().length,
      cancellationRate: bookings.length > 0 
        ? Math.round((getCanceladoBookings().length / bookings.length) * 100) 
        : 0,
      revenueTotal: totalRev,
      projectedRevenue: totalRev + pendenteRev,
      noShowCount: getFaltouBookings().length
    };
  };

  const stats = calculateStats();

  // Extract unique clients from bookings
  const getClientDatabase = (): Client[] => {
    const clientMap = new Map<string, Client>();
    
    bookings.forEach(b => {
      const phoneKey = b.clientPhone;
      const existing = clientMap.get(phoneKey);
      
      if (existing) {
        existing.totalVisits += 1;
        if (b.status === 'concluido' && (!existing.lastVisit || new Date(b.date) > new Date(existing.lastVisit))) {
          existing.lastVisit = b.date;
        }
      } else {
        clientMap.set(phoneKey, {
          phone: b.clientPhone,
          name: b.clientName,
          email: b.clientEmail,
          totalVisits: 1,
          lastVisit: b.status === 'concluido' ? b.date : undefined,
          notes: b.notes
        });
      }
    });

    return Array.from(clientMap.values());
  };

  const clients = getClientDatabase();
  
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery)
  );

  // Calculates commissions: salon takes 50% cut, professional takes 50%
  const getComissionReport = () => {
    const proCommissionList = professionals.map(pro => {
      // Filter bookings of this professional
      const proBookings = bookings.filter(b => b.professionalId === pro.id && b.status === 'concluido');
      const totalProduction = proBookings.reduce((sum, b) => sum + b.price, 0);
      const commissionPro = totalProduction * 0.5; // 50% commission
      const salonCut = totalProduction * 0.5;

      return {
        proId: pro.id,
        proName: pro.name,
        role: pro.role,
        appointmentsCount: proBookings.length,
        totalProduction,
        commissionPro,
        salonCut
      };
    });

    const totalProductionAll = proCommissionList.reduce((sum, item) => sum + item.totalProduction, 0);
    const totalCommissionAll = totalProductionAll * 0.5;
    const totalSalonCutAll = totalProductionAll * 0.5;

    return {
      professionalsList: proCommissionList,
      totalProductionAll,
      totalCommissionAll,
      totalSalonCutAll
    };
  };

  const commissionData = getComissionReport();

  // Agenda list filtered by date and professional search
  const agendaBookings = bookings.filter(b => {
    const matchesDate = b.date === agendaDateFilter;
    return matchesDate;
  });

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'concluido': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25';
      case 'pendente': return 'bg-amber-500/10 text-amber-400 border border-amber-500/25';
      case 'faltou': return 'bg-red-500/10 text-red-400 border border-red-500/25';
      case 'cancelado': return 'bg-gray-500/10 text-gray-400 border border-gray-500/25';
      default: return 'bg-white/5 text-white';
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-gold selection:text-black">
      {/* Light orbs */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-gold/5 blur-[120px] rounded-full pointer-events-none" />

      {/* ADMIN HEADER */}
      <nav className="glass-panel border-b border-gold/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBackToLanding}
              className="p-2 hover:bg-white/5 rounded-lg text-gold hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <span className="font-serif text-lg tracking-wide text-gold">Painel Administrativo</span>
              <span className="text-[10px] uppercase text-gray-500 block">Cuidare Espaço de Beleza</span>
            </div>
          </div>

          {/* View switcher (Lane/Owner vs individual staff) */}
          <div className="flex bg-luxury-black/90 p-1.5 rounded-xl border border-gold/10">
            <button
              onClick={() => setCurrentView('owner')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                currentView === 'owner' 
                  ? 'bg-gold text-black font-bold' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Proprietária (Lane)
            </button>
            <button
              onClick={() => setCurrentView('professional')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                currentView === 'professional' 
                  ? 'bg-gold text-black font-bold' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Profissionais
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ======================================================== */}
        {/* VIEW 1: OWNER (LANE'S) GENERAL CONTROL DASHBOARD */}
        {/* ======================================================== */}
        {currentView === 'owner' && (
          <div className="space-y-8 animate-fade-in">
            {/* Owner Tab Switcher */}
            <div className="flex border-b border-gold/10 gap-6">
              {[
                { id: 'dashboard', name: 'Visão Geral', icon: TrendingUp },
                { id: 'agenda', name: 'Agenda Geral', icon: Calendar },
                { id: 'clientes', name: 'Base de Clientes', icon: Users },
                { id: 'comissoes', name: 'Produção & Comissões', icon: DollarSign }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = ownerTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setOwnerTab(tab.id as any)}
                    className={`flex items-center gap-2 pb-4 text-sm font-semibold tracking-wide border-b-2 transition-all relative ${
                      isActive 
                        ? 'border-gold text-gold font-bold' 
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    <Icon size={16} />
                    {tab.name}
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENT: DASHBOARD VISÃO GERAL */}
            {ownerTab === 'dashboard' && (
              <div className="space-y-8">
                {/* Stats cards grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Total revenue generated from completed appointments */}
                  <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Faturamento Realizado</span>
                    <h3 className="text-3xl font-serif text-gold font-bold">R$ {stats.revenueTotal},00</h3>
                    <span className="text-[10px] text-gray-400 mt-2 block">De atendimentos concluídos</span>
                    <DollarSign className="absolute right-4 bottom-4 h-12 w-12 text-gold/5 pointer-events-none" />
                  </div>

                  {/* Projected revenue including pending */}
                  <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Faturamento Projetado</span>
                    <h3 className="text-3xl font-serif text-white font-bold">R$ {stats.projectedRevenue},00</h3>
                    <span className="text-[10px] text-gray-400 mt-2 block">Incluindo agendados pendentes</span>
                    <TrendingUp className="absolute right-4 bottom-4 h-12 w-12 text-white/5 pointer-events-none" />
                  </div>

                  {/* Appointments stats */}
                  <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Total de Agendamentos</span>
                    <h3 className="text-3xl font-serif text-white font-bold">{bookings.length}</h3>
                    <div className="flex gap-2.5 text-[10px] text-gray-400 mt-2">
                      <span className="text-emerald-400">{stats.completedCount} concluintes</span>
                      <span>•</span>
                      <span className="text-amber-400">{stats.pendingCount} pendentes</span>
                    </div>
                    <Calendar className="absolute right-4 bottom-4 h-12 w-12 text-white/5 pointer-events-none" />
                  </div>

                  {/* Cancellation and No-Shows */}
                  <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Faltas e Cancelamentos</span>
                    <h3 className="text-3xl font-serif text-red-400 font-bold">{stats.noShowCount + getCanceladoBookings().length}</h3>
                    <div className="flex gap-2.5 text-[10px] text-gray-400 mt-2">
                      <span className="text-red-400">{stats.noShowCount} faltas (no-show)</span>
                      <span>•</span>
                      <span>{stats.cancellationRate}% cancelados</span>
                    </div>
                    <AlertCircle className="absolute right-4 bottom-4 h-12 w-12 text-white/5 pointer-events-none" />
                  </div>
                </div>

                {/* Dashboard detailed grid: recent bookings + professional production list */}
                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Recent bookings lists */}
                  <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-6">
                    <h4 className="font-serif text-lg text-white">Últimos Agendamentos Recebidos</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-gold/10 text-gray-500 text-xs uppercase font-bold">
                            <th className="pb-3">Cliente</th>
                            <th className="pb-3">Serviço</th>
                            <th className="pb-3">Profissional</th>
                            <th className="pb-3">Data/Hora</th>
                            <th className="pb-3">Valor</th>
                            <th className="pb-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {bookings.slice(0, 6).map(b => (
                            <tr key={b.id} className="hover:bg-white/5">
                              <td className="py-3 font-semibold text-white">{b.clientName}</td>
                              <td className="py-3 text-gray-300">{b.serviceName}</td>
                              <td className="py-3 text-gray-400">{b.professionalName}</td>
                              <td className="py-3 text-gray-400 text-xs">
                                {new Date(b.date + 'T00:00:00').toLocaleDateString('pt-BR')} às {b.time}h
                              </td>
                              <td className="py-3 text-gold font-medium">R$ {b.price},00</td>
                              <td className="py-3">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${getStatusColor(b.status)}`}>
                                  {b.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {bookings.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-gray-500">
                                Nenhum agendamento registrado ainda.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Summary of services demand */}
                  <div className="glass-panel p-6 rounded-2xl space-y-6">
                    <h4 className="font-serif text-lg text-white">Produção do Salão</h4>
                    <div className="space-y-4">
                      {commissionData.professionalsList.map(item => (
                        <div key={item.proId} className="flex justify-between items-center">
                          <div>
                            <span className="font-serif text-sm text-white block">{item.proName}</span>
                            <span className="text-[10px] text-gray-500 uppercase">{item.appointmentsCount} atendimentos concluintes</span>
                          </div>
                          <div className="text-right">
                            <span className="text-gold font-semibold text-sm block">R$ {item.totalProduction},00</span>
                            <span className="text-[10px] text-gray-500">Repasse: R$ {item.commissionPro},00</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: AGENDA GERAL */}
            {ownerTab === 'agenda' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-luxury-dark/40 p-4 rounded-xl border border-gold/10">
                  <div className="flex items-center gap-4">
                    <span className="text-xs uppercase tracking-wider text-gray-400 font-bold">Verificar data:</span>
                    <input 
                      type="date" 
                      value={agendaDateFilter}
                      onChange={(e) => setAgendaDateFilter(e.target.value)}
                      className="bg-luxury-black border border-gold/20 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-gold"
                    />
                  </div>

                  <div className="text-xs text-gold font-semibold">
                    Visualização Geral do dia: {new Date(agendaDateFilter + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {professionals.map(pro => {
                    const proBookings = agendaBookings.filter(b => b.professionalId === pro.id);
                    return (
                      <div key={pro.id} className="glass-panel rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-luxury-dark border-b border-gold/10 flex justify-between items-center">
                          <h4 className="font-serif text-white font-medium">{pro.name}</h4>
                          <span className="text-[9px] uppercase bg-gold/10 border border-gold/20 text-gold px-2 py-0.5 rounded font-bold">
                            {proBookings.length} agendados
                          </span>
                        </div>

                        <div className="p-4 space-y-3.5 min-h-[250px] max-h-[400px] overflow-y-auto">
                          {proBookings.map(b => (
                            <div key={b.id} className="bg-luxury-black/60 p-3 rounded-lg border border-gold/5 space-y-2 relative">
                              <button
                                onClick={() => onDeleteBooking(b.id)}
                                className="absolute right-3 top-3 text-red-500 hover:text-red-300 opacity-60 hover:opacity-100 transition-opacity"
                                title="Excluir agendamento"
                              >
                                <Trash2 size={13} />
                              </button>
                              <div className="flex items-center justify-between">
                                <span className="font-sans text-xs font-bold text-white">{b.time}h</span>
                                <span className={`text-[8px] uppercase px-1.5 py-0.5 rounded-full font-bold ${getStatusColor(b.status)}`}>
                                  {b.status}
                                </span>
                              </div>
                              <div className="text-xs">
                                <strong className="text-white block">{b.clientName}</strong>
                                <span className="text-gray-400 block mt-0.5">{b.serviceName}</span>
                              </div>
                              {b.notes && (
                                <p className="text-[10px] text-gold/80 italic bg-gold/5 border border-gold/10 p-1.5 rounded">
                                  Obs: {b.notes}
                                </p>
                              )}
                              {b.status === 'pendente' && (
                                <div className="flex gap-2 pt-2 border-t border-white/5">
                                  <button
                                    onClick={() => onUpdateBookingStatus(b.id, 'concluido')}
                                    className="flex-1 py-1 text-[10px] font-bold uppercase bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black rounded transition-colors"
                                  >
                                    Concluir
                                  </button>
                                  <button
                                    onClick={() => onUpdateBookingStatus(b.id, 'faltou')}
                                    className="flex-1 py-1 text-[10px] font-bold uppercase bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-black rounded transition-colors"
                                  >
                                    Falta
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                          {proBookings.length === 0 && (
                            <div className="h-full flex items-center justify-center py-20 text-center text-gray-500 text-xs font-light">
                              Sem compromissos agendados para este dia.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT: CLIENT DATABASE */}
            {ownerTab === 'clientes' && (
              <div className="glass-panel p-6 rounded-2xl space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-serif text-lg text-white">Central de Relacionamento & Clientes</h4>
                  <div className="relative w-64">
                    <input 
                      type="text"
                      placeholder="Buscar cliente por nome ou celular..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-9 pl-8 pr-4 bg-luxury-black border border-gold/20 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none"
                    />
                    <Search size={14} className="absolute left-2.5 top-2.5 text-gray-500" />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gold/10 text-gray-500 text-xs uppercase font-bold">
                        <th className="pb-3">Nome</th>
                        <th className="pb-3">WhatsApp / Telefone</th>
                        <th className="pb-3">E-mail</th>
                        <th className="pb-3">Total de Visitas</th>
                        <th className="pb-3">Último Atendimento</th>
                        <th className="pb-3">Ações de Relacionamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredClients.map(c => (
                        <tr key={c.phone} className="hover:bg-white/5">
                          <td className="py-3.5 font-semibold text-white">{c.name}</td>
                          <td className="py-3.5 text-gray-300">{c.phone}</td>
                          <td className="py-3.5 text-gray-400">{c.email || '—'}</td>
                          <td className="py-3.5 text-center font-bold text-gold">{c.totalVisits}</td>
                          <td className="py-3.5 text-gray-400 text-xs">
                            {c.lastVisit 
                              ? new Date(c.lastVisit + 'T00:00:00').toLocaleDateString('pt-BR') 
                              : 'Sem conclusão'}
                          </td>
                          <td className="py-3.5">
                            <a
                              href={`https://wa.me/${c.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${c.name}, tudo bem? Sentimos sua falta no Cuidare Studio de Beleza! Vamos agendar sua manutenção?`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1 bg-gold/10 border border-gold/20 text-gold hover:bg-gold hover:text-black font-semibold text-[10px] uppercase rounded transition-colors"
                            >
                              Lembrete Reativação
                            </a>
                          </td>
                        </tr>
                      ))}
                      {filteredClients.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-gray-500">
                            Nenhum cliente cadastrado correspondendo à busca.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: COMMISSIONS & PRODUCTION */}
            {ownerTab === 'comissoes' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Global revenue generated */}
                  <div className="glass-panel p-6 rounded-xl">
                    <span className="text-xs text-gray-400 uppercase">Faturamento Bruto</span>
                    <h3 className="text-3xl text-gold font-serif font-bold mt-1">R$ {commissionData.totalProductionAll},00</h3>
                  </div>
                  {/* Comission share to professionals */}
                  <div className="glass-panel p-6 rounded-xl">
                    <span className="text-xs text-gray-400 uppercase">Comissões Devidas (Repasse 50%)</span>
                    <h3 className="text-3xl text-white font-serif font-bold mt-1">R$ {commissionData.totalCommissionAll},00</h3>
                  </div>
                  {/* Salon cut (net margin) */}
                  <div className="glass-panel p-6 rounded-xl">
                    <span className="text-xs text-gray-400 uppercase">Lucro Líquido do Salão (Cota 50%)</span>
                    <h3 className="text-3xl text-emerald-400 font-serif font-bold mt-1">R$ {commissionData.totalSalonCutAll},00</h3>
                  </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl">
                  <h4 className="font-serif text-lg text-white mb-6">Detalhamento de Rateio por Profissional</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-gold/10 text-gray-500 text-xs uppercase font-bold">
                          <th className="pb-3">Profissional</th>
                          <th className="pb-3">Cargo / Setor</th>
                          <th className="pb-3 text-center">Atendimentos Concluídos</th>
                          <th className="pb-3 text-right">Produção Bruta</th>
                          <th className="pb-3 text-right">Comissão (50%)</th>
                          <th className="pb-3 text-right">Salão (50%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {commissionData.professionalsList.map(item => (
                          <tr key={item.proId} className="hover:bg-white/5">
                            <td className="py-4 font-semibold text-white">{item.proName}</td>
                            <td className="py-4 text-gray-400 text-xs">{item.role}</td>
                            <td className="py-4 text-center text-gray-300 font-bold">{item.appointmentsCount}</td>
                            <td className="py-4 text-right text-gold font-medium">R$ {item.totalProduction},00</td>
                            <td className="py-4 text-right text-white font-semibold">R$ {item.commissionPro},00</td>
                            <td className="py-4 text-right text-emerald-400 font-medium">R$ {item.salonCut},00</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: INDIVIDUAL STAFF VIEW (RESTRICTED ACCESS VIEW) */}
        {/* ======================================================== */}
        {currentView === 'professional' && (
          <div className="space-y-8 animate-fade-in">
            {/* Select Professional Profile drop box */}
            <div className="glass-panel p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl font-serif text-white mb-1">Agenda de Serviços Individuais</h3>
                <p className="text-xs text-gray-400">Selecione seu perfil profissional para visualizar e gerenciar seus agendamentos.</p>
              </div>

              <div>
                <select
                  value={selectedProId}
                  onChange={(e) => setSelectedProId(e.target.value)}
                  className="bg-luxury-black border border-gold/30 text-white text-sm font-semibold rounded-lg px-4 py-2.5 focus:outline-none focus:border-gold cursor-pointer"
                >
                  {professionals.map(pro => (
                    <option key={pro.id} value={pro.id}>{pro.name} ({pro.role.split(',')[0]})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Individual Professional Appointments List */}
            <div className="glass-panel p-6 rounded-2xl space-y-6">
              <div className="flex justify-between items-center border-b border-gold/10 pb-4">
                <h4 className="font-serif text-lg text-white">
                  Compromissos Agendados de {professionals.find(p => p.id === selectedProId)?.name}
                </h4>
                <span className="text-xs uppercase bg-gold/10 text-gold border border-gold/20 px-3 py-1 rounded-full font-bold">
                  {bookings.filter(b => b.professionalId === selectedProId && b.status !== 'cancelado').length} Agendas Ativas
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gold/10 text-gray-500 text-xs uppercase font-bold">
                      <th className="pb-3">Data</th>
                      <th className="pb-3">Horário</th>
                      <th className="pb-3">Cliente / Contato</th>
                      <th className="pb-3">Procedimento</th>
                      <th className="pb-3">Preço Acordado</th>
                      <th className="pb-3">Comissão (50%)</th>
                      <th className="pb-3">Status Atual</th>
                      <th className="pb-3 text-center">Ações Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {bookings.filter(b => b.professionalId === selectedProId).map(b => (
                      <tr key={b.id} className="hover:bg-white/5">
                        <td className="py-4 text-gray-300 font-semibold">
                          {new Date(b.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-4 text-white font-bold">{b.time}h</td>
                        <td className="py-4">
                          <div className="text-xs">
                            <strong className="text-white block">{b.clientName}</strong>
                            <span className="text-gray-400 block">{b.clientPhone}</span>
                          </div>
                        </td>
                        <td className="py-4 text-gray-300">{b.serviceName}</td>
                        <td className="py-4 text-gold font-medium">R$ {b.price},00</td>
                        <td className="py-4 text-white font-semibold">R$ {b.price * 0.5},00</td>
                        <td className="py-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${getStatusColor(b.status)}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          {b.status === 'pendente' ? (
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => onUpdateBookingStatus(b.id, 'concluido')}
                                className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black font-semibold text-[10px] uppercase rounded transition-colors"
                              >
                                Concluir
                              </button>
                              <button
                                onClick={() => onUpdateBookingStatus(b.id, 'faltou')}
                                className="px-3 py-1 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-black font-semibold text-[10px] uppercase rounded transition-colors"
                              >
                                Falta
                              </button>
                              <button
                                onClick={() => onUpdateBookingStatus(b.id, 'cancelado')}
                                className="px-3 py-1 bg-gray-500/10 hover:bg-gray-500 text-gray-400 hover:text-white font-semibold text-[10px] uppercase rounded transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">Encerrado</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {bookings.filter(b => b.professionalId === selectedProId).length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-gray-500">
                          Nenhum agendamento encontrado para esta profissional.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
