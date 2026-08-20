import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, Calendar, Users, ArrowLeft, 
  AlertCircle, Search, LayoutDashboard, 
  Award, Bell, Menu
} from 'lucide-react';
import { professionals } from '../data/professionalsData';
import type { Booking, Client } from '../types';

interface AdminPanelProps {
  onBackToLanding: () => void;
  bookings: Booking[];
  onUpdateBookingStatus?: (id: string, status: Booking['status']) => void;
  onDeleteBooking?: (id: string) => void;
}

export default function AdminPanel({ 
  onBackToLanding, 
  bookings, 
}: AdminPanelProps) {
  const [currentView, setCurrentView] = useState<'owner' | 'professional'>('owner');
  const [ownerTab, setOwnerTab] = useState<'dashboard' | 'agenda' | 'clientes' | 'comissoes'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [agendaDateFilter, setAgendaDateFilter] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const getCompletedBookings = () => bookings.filter(b => b.status === 'concluido');
  const getPendenteBookings = () => bookings.filter(b => b.status === 'pendente');
  const getFaltouBookings = () => bookings.filter(b => b.status === 'faltou');
  const getCanceladoBookings = () => bookings.filter(b => b.status === 'cancelado');

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

  const getComissionReport = () => {
    const proCommissionList = professionals.map(pro => {
      const proBookings = bookings.filter(b => b.professionalId === pro.id && b.status === 'concluido');
      const totalProduction = proBookings.reduce((sum, b) => sum + b.price, 0);
      const commissionPro = totalProduction * 0.5;
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
  const agendaBookings = bookings.filter(b => b.date === agendaDateFilter);

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'concluido': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pendente': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'faltou': return 'bg-red-50 text-red-700 border-red-200';
      case 'cancelado': return 'bg-gray-100 text-gray-600 border-gray-300';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  const formattedToday = new Date().toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  const sidebarNavItems = [
    { id: 'dashboard', name: 'Visão Geral', icon: LayoutDashboard },
    { id: 'agenda', name: 'Agenda Geral', icon: Calendar },
    { id: 'clientes', name: 'Base de Clientes', icon: Users },
    { id: 'comissoes', name: 'Produção & Comissões', icon: DollarSign }
  ];

  const SidebarContent = () => (
    <div className="h-full flex flex-col justify-between py-6 px-4 bg-[#FCFBF9] text-[#29231F] font-sans">
      <div className="space-y-8">
        <div className="flex items-center gap-3 px-3">
          <div className="w-8 h-8 rounded-lg bg-[#29231F] flex items-center justify-center text-white font-bold text-sm">
            C
          </div>
          <div>
            <span className="font-bold text-sm tracking-widest block leading-none">CUIDARE</span>
            <span className="text-[10px] text-gray-500 font-medium">WORKSPACE</span>
          </div>
        </div>

        <div className="flex items-center gap-3 px-3">
          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-xs">
            LV
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-semibold block truncate">Lane Viana</span>
            <span className="text-xs text-gray-500 font-medium block">Administradora</span>
          </div>
        </div>

        <nav className="space-y-1">
          {sidebarNavItems.map(item => {
            const Icon = item.icon;
            const isActive = ownerTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setOwnerTab(item.id as any);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-[#F5ECD8] text-[#29231F]' 
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

      <div className="px-2 space-y-4">
        <div className="bg-gray-100 p-1 rounded-md flex">
          <button
            onClick={() => setCurrentView('owner')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-sm transition-colors ${
              currentView === 'owner' ? 'bg-white shadow-sm text-black' : 'text-gray-500'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => setCurrentView('professional')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-sm transition-colors ${
              currentView === 'professional' ? 'bg-white shadow-sm text-black' : 'text-gray-500'
            }`}
          >
            Staff
          </button>
        </div>
        
        <button
          onClick={onBackToLanding}
          className="w-full flex items-center justify-center gap-2 py-2 text-[#7C736D] hover:text-[#29231F] text-xs font-medium transition-colors"
        >
          <ArrowLeft size={14} /> Voltar ao Site
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F5F1] text-[#29231F] flex overflow-x-hidden w-full font-sans">
      <aside className="hidden lg:block w-64 border-r border-[rgba(37,27,23,0.09)] h-screen sticky top-0 shrink-0 z-30">
        <SidebarContent />
      </aside>

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

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto relative">
        <header className="h-[72px] bg-white border-b border-[rgba(37,27,23,0.09)] px-6 flex justify-between items-center sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileSidebarOpen(true)} className="p-2 -ml-2 hover:bg-gray-100 rounded-md lg:hidden">
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-[#29231F] leading-tight">
                {currentView === 'owner' ? 'Visão Geral' : 'Dashboard Staff'}
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                {formattedToday}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
              Online
            </div>
            <button className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors relative">
              <Bell size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentView === 'owner' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {/* TAB 1: DASHBOARD OVERVIEW */}
              {ownerTab === 'dashboard' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: "Faturamento Bruto", value: `R$ ${stats.revenueTotal},00`, icon: DollarSign, trend: "+12%" },
                      { label: "Agendamentos Ativos", value: stats.pendingCount, icon: Calendar, trend: "Hoje" },
                      { label: "Concluídos", value: stats.completedCount, icon: Award, trend: "Sucesso" },
                      { label: "Taxa de Falta", value: `${stats.cancellationRate}%`, icon: AlertCircle, trend: "Atenção", color: "text-red-600" }
                    ].map((metric, i) => (
                      <div key={i} className="bg-white p-5 rounded-xl border border-[rgba(37,27,23,0.09)] shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{metric.label}</span>
                          <metric.icon size={16} className="text-gray-400" />
                        </div>
                        <div className="flex items-end justify-between">
                          <span className={`text-2xl font-bold ${metric.color || 'text-[#29231F]'}`}>{metric.value}</span>
                          <span className="text-xs font-medium text-gray-400">{metric.trend}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-[rgba(37,27,23,0.09)] shadow-sm">
                      <h4 className="text-sm font-semibold text-[#29231F] mb-6">Fluxo Recente</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead>
                            <tr className="border-b border-gray-100 text-gray-400 text-xs font-semibold uppercase">
                              <th className="pb-3 font-medium">Cliente</th>
                              <th className="pb-3 font-medium">Serviço</th>
                              <th className="pb-3 font-medium">Data</th>
                              <th className="pb-3 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {bookings.slice(0, 5).map(b => (
                              <tr key={b.id} className="hover:bg-gray-50">
                                <td className="py-3 font-medium text-[#29231F]">{b.clientName}</td>
                                <td className="py-3 text-gray-600">{b.serviceName}</td>
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
                    <div className="bg-white p-6 rounded-xl border border-[rgba(37,27,23,0.09)] shadow-sm flex flex-col items-center justify-center">
                       <h4 className="text-sm font-semibold text-[#29231F] mb-4 self-start">Ocupação</h4>
                       <div className="relative w-32 h-32 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            <path className="text-gray-100 stroke-current" strokeWidth="4" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path className="text-[#29231F] stroke-current" strokeDasharray="75, 100" strokeWidth="4" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          </svg>
                          <div className="absolute text-xl font-bold text-[#29231F]">75%</div>
                       </div>
                       <p className="text-xs text-gray-500 mt-4 text-center">Taxa de ocupação da agenda hoje</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: AGENDA */}
              {ownerTab === 'agenda' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[rgba(37,27,23,0.09)] shadow-sm">
                    <div className="flex items-center gap-3">
                      <Calendar size={18} className="text-gray-500"/>
                      <input 
                        type="date" 
                        value={agendaDateFilter}
                        onChange={(e) => setAgendaDateFilter(e.target.value)}
                        className="font-medium text-sm text-[#29231F] focus:outline-none cursor-pointer bg-transparent"
                      />
                    </div>
                  </div>
                  
                  {/* Clean Visual Grid Layout for Schedule */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {professionals.map(pro => {
                      const proBookings = agendaBookings.filter(b => b.professionalId === pro.id);
                      return (
                        <div key={pro.id} className="bg-[#FCFBF9] rounded-xl border border-[rgba(37,27,23,0.09)] flex flex-col h-[500px]">
                          <div className="p-4 border-b border-[rgba(37,27,23,0.09)] bg-white rounded-t-xl flex justify-between items-center">
                            <span className="font-semibold text-sm text-[#29231F]">{pro.name}</span>
                            <span className="text-xs text-gray-500 font-medium">{proBookings.length} horários</span>
                          </div>
                          <div className="p-4 space-y-3 overflow-y-auto flex-1 scrollbar-thin">
                            {proBookings.map(b => (
                              <div key={b.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm relative group">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-xs font-bold text-[#29231F]">{b.time}</span>
                                  <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded border ${getStatusColor(b.status)}`}>
                                    {b.status}
                                  </span>
                                </div>
                                <div className="text-sm font-semibold text-[#29231F]">{b.clientName}</div>
                                <div className="text-xs text-gray-500 mt-1">{b.serviceName}</div>
                                {b.notes && <div className="text-[10px] bg-gray-50 p-2 rounded mt-2 text-gray-600 border border-gray-100">Obs: {b.notes}</div>}
                              </div>
                            ))}
                            {proBookings.length === 0 && (
                              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs py-10">
                                Livre
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: CLIENTES */}
              {ownerTab === 'clientes' && (
                <div className="bg-white rounded-xl border border-[rgba(37,27,23,0.09)] shadow-sm">
                  <div className="p-5 border-b border-[rgba(37,27,23,0.09)] flex justify-between items-center">
                    <h3 className="font-semibold text-[#29231F]">Base de Clientes</h3>
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Buscar..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-gray-400"
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50">
                        <tr className="text-xs font-semibold text-gray-500 uppercase">
                          <th className="px-6 py-4">Nome</th>
                          <th className="px-6 py-4">Contato</th>
                          <th className="px-6 py-4">Visitas</th>
                          <th className="px-6 py-4">Última Visita</th>
                          <th className="px-6 py-4 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredClients.map(c => (
                          <tr key={c.phone} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-[#29231F]">{c.name}</td>
                            <td className="px-6 py-4 text-gray-600">{c.phone}</td>
                            <td className="px-6 py-4 text-gray-900 font-semibold">{c.totalVisits}</td>
                            <td className="px-6 py-4 text-gray-500">{c.lastVisit ? new Date(c.lastVisit+'T00:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                            <td className="px-6 py-4 text-right">
                              <button className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-100">
                                WhatsApp
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: COMISSOES */}
              {ownerTab === 'comissoes' && (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-[rgba(37,27,23,0.09)] shadow-sm">
                      <span className="text-xs text-gray-500 font-semibold uppercase">Faturamento Bruto</span>
                      <h3 className="text-2xl font-bold text-[#29231F] mt-2">R$ {commissionData.totalProductionAll},00</h3>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-[rgba(37,27,23,0.09)] shadow-sm">
                      <span className="text-xs text-gray-500 font-semibold uppercase">Comissões Devidas</span>
                      <h3 className="text-2xl font-bold text-gray-600 mt-2">R$ {commissionData.totalCommissionAll},00</h3>
                    </div>
                    <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 shadow-sm">
                      <span className="text-xs text-emerald-700 font-semibold uppercase">Resultado Salão</span>
                      <h3 className="text-2xl font-bold text-emerald-800 mt-2">R$ {commissionData.totalSalonCutAll},00</h3>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-[rgba(37,27,23,0.09)] shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr className="text-xs font-semibold text-gray-500 uppercase">
                          <th className="px-6 py-4">Profissional</th>
                          <th className="px-6 py-4 text-center">Atendimentos</th>
                          <th className="px-6 py-4 text-right">Produção</th>
                          <th className="px-6 py-4 text-right">Comissão</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {commissionData.professionalsList.map(item => (
                          <tr key={item.proId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-[#29231F]">{item.proName}</td>
                            <td className="px-6 py-4 text-center text-gray-600">{item.appointmentsCount}</td>
                            <td className="px-6 py-4 text-right font-medium text-[#29231F]">R$ {item.totalProduction},00</td>
                            <td className="px-6 py-4 text-right font-semibold text-gray-600">R$ {item.commissionPro},00</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {currentView === 'professional' && (
            <div className="text-center py-20 text-gray-500 bg-white rounded-xl border border-gray-200">
              <h2 className="text-xl font-semibold text-[#29231F] mb-2">Visão do Profissional</h2>
              <p className="text-sm">Área em desenvolvimento para acesso individual das colaboradoras.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
