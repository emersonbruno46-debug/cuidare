import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, DollarSign, Calendar, Users, ArrowLeft, 
  Trash2, AlertCircle, Search, LayoutDashboard, 
  Award, Clock, Bell, Menu, ArrowUpRight, MessageSquare
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
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

  // Agenda list filtered by date
  const agendaBookings = bookings.filter(b => b.date === agendaDateFilter);

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'concluido': return 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/25';
      case 'pendente': return 'bg-amber-500/10 text-amber-700 border border-amber-500/25';
      case 'faltou': return 'bg-red-500/10 text-red-700 border border-red-500/25';
      case 'cancelado': return 'bg-gray-500/10 text-gray-600 border border-gray-500/25';
      default: return 'bg-white/5 text-white';
    }
  };

  // Format today's date for display
  const formattedToday = new Date().toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  // Nav Items helper
  const sidebarNavItems = [
    { id: 'dashboard', name: 'Visão Geral', icon: LayoutDashboard },
    { id: 'agenda', name: 'Agenda Geral', icon: Calendar },
    { id: 'clientes', name: 'Base de Clientes', icon: Users },
    { id: 'comissoes', name: 'Produção & Comissões', icon: DollarSign }
  ];

  const SidebarContent = () => (
    <div className="h-full flex flex-col justify-between py-6 px-4">
      <div className="space-y-8">
        {/* LOGO & HEADING */}
        <div className="flex items-center gap-3 px-3">
          <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center text-gold border border-gold/20 font-serif font-semibold text-lg">
            C
          </div>
          <div>
            <span className="font-serif text-sm tracking-widest text-gold block leading-none font-bold">CUIDARE</span>
            <span className="text-[9px] uppercase tracking-wider text-gray-500">Espaço de Beleza</span>
          </div>
        </div>

        {/* ACTIVE PROFILE BOX */}
        <div className="bg-[#F4EDE4] p-4 rounded-xl border border-gold/15 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold border border-gold/30 font-bold text-sm">
            L
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-serif text-sm text-white font-bold block truncate font-bold text-[#2E1B13]">Lane Viana</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Proprietária</span>
            </div>
          </div>
        </div>

        {/* VIEW SELECTOR */}
        <div className="space-y-1.5 px-1">
          <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold block px-2 mb-1">Nível de Acesso</span>
          <div className="grid grid-cols-2 bg-[#F4EDE4] p-1 rounded-lg border border-gold/15 animate-fade-in">
            <button
              onClick={() => {
                setCurrentView('owner');
                setMobileSidebarOpen(false);
              }}
              className={`py-1.5 text-[10px] font-bold uppercase rounded transition-colors ${
                currentView === 'owner' 
                  ? 'bg-gold text-white shadow-sm' 
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              Geral
            </button>
            <button
              onClick={() => {
                setCurrentView('professional');
                setMobileSidebarOpen(false);
              }}
              className={`py-1.5 text-[10px] font-bold uppercase rounded transition-colors ${
                currentView === 'professional' 
                  ? 'bg-gold text-white shadow-sm' 
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              Staff
            </button>
          </div>
        </div>

        {/* OWNER NAV LIST */}
        {currentView === 'owner' && (
          <nav className="space-y-1 animate-fade-in">
            <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold block px-3 mb-2">Painel de Controle</span>
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    isActive 
                      ? 'bg-gold/10 text-gold border-l-2 border-gold font-bold' 
                      : 'text-gray-500 hover:bg-[#F4EDE4]/50 hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  {item.name}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* BACK TO SITE / LOGOUT */}
      <div className="px-2">
        <button
          onClick={onBackToLanding}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-transparent hover:bg-gold/5 border border-gold/20 hover:border-gold/40 text-gold text-xs font-semibold uppercase tracking-wider rounded-xl transition-all font-bold"
        >
          <ArrowLeft size={14} /> Voltar para o Site
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden selection:bg-gold selection:text-black">
      {/* BACKGROUND DECORATIONS */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-gold/5 blur-[120px] rounded-full pointer-events-none z-[0]" />

      {/* SIDEBAR - DESKTOP */}
      <aside className="hidden lg:block w-64 bg-[#FFFDFB] border-r border-gold/15 h-screen sticky top-0 shrink-0 z-30">
        <SidebarContent />
      </aside>

      {/* MOBILE SIDEBAR DRAWERS */}
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
              className="fixed top-0 bottom-0 left-0 w-64 bg-[#FFFDFB] border-r border-gold/15 z-50 lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto z-10 relative">
        {/* HEADER */}
        <header className="h-20 bg-[#FFFDFB] border-b border-gold/15 px-4 sm:px-8 flex justify-between items-center sticky top-0 z-20 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger for mobile */}
            <button 
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 hover:bg-gold/10 rounded-lg text-gold lg:hidden transition-colors"
            >
              <Menu size={20} />
            </button>
            
            <div>
              <h1 className="text-xl font-serif font-bold text-white leading-none">
                {currentView === 'owner' ? 'Visão Geral do Negócio' : 'Agenda Staff'}
              </h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1.5 font-sans">
                {formattedToday}
              </p>
            </div>
          </div>

          {/* Quick Header Widgets */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-wider font-semibold bg-gold/10 border border-gold/20 text-gold px-3 py-1 rounded-full">
              <Clock size={12} className="text-gold" /> Live Updates
            </div>
            
            <button className="p-2.5 rounded-full bg-[#F4EDE4] hover:bg-gold/20 text-white hover:text-gold border border-gold/10 transition-colors relative">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            </button>
          </div>
        </header>

        {/* WORKSPACE BODY */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-8">
          
          {/* ======================================================== */}
          {/* VIEW 1: OWNER ACCESS DASHBOARD */}
          {/* ======================================================== */}
          {currentView === 'owner' && (
            <div className="space-y-8 animate-fade-in">
              
              {/* TAB 1: VISÃO GERAL */}
              {ownerTab === 'dashboard' && (
                <div className="space-y-8">
                  {/* METRICS GRID */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Faturamento Realizado */}
                    <div className="glass-panel p-6 rounded-2xl relative flex items-center justify-between overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block">Faturamento Realizado</span>
                        <h3 className="text-2xl sm:text-3xl font-serif text-gold font-bold">R$ {stats.revenueTotal},00</h3>
                        <div className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 font-bold">
                          <ArrowUpRight size={10} /> +12.5%
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center text-gold border border-gold/20 shadow-sm shrink-0 ml-2">
                        <DollarSign size={20} />
                      </div>
                    </div>

                    {/* Faturamento Projetado */}
                    <div className="glass-panel p-6 rounded-2xl relative flex items-center justify-between overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block">Faturamento Projetado</span>
                        <h3 className="text-2xl sm:text-3xl font-serif text-white font-bold">R$ {stats.projectedRevenue},00</h3>
                        <div className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 font-bold">
                          Estimado
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-gold/5 flex items-center justify-center text-white border border-gold/10 shadow-sm shrink-0 ml-2">
                        <TrendingUp size={20} />
                      </div>
                    </div>

                    {/* Total de Agendamentos */}
                    <div className="glass-panel p-6 rounded-2xl relative flex items-center justify-between overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block">Agendamentos</span>
                        <h3 className="text-2xl sm:text-3xl font-serif text-white font-bold">{bookings.length}</h3>
                        <div className="flex gap-2 text-[9px] text-gray-400 mt-1">
                          <span className="text-emerald-700 font-bold">{stats.completedCount} ok</span>
                          <span>•</span>
                          <span className="text-amber-700 font-bold">{stats.pendingCount} pend</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-gold/5 flex items-center justify-center text-white border border-gold/10 shadow-sm shrink-0 ml-2">
                        <Calendar size={20} />
                      </div>
                    </div>

                    {/* Faltas e Cancelamentos */}
                    <div className="glass-panel p-6 rounded-2xl relative flex items-center justify-between overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block">Cancelamentos</span>
                        <h3 className="text-2xl sm:text-3xl font-serif text-red-500 font-bold">{stats.noShowCount + getCanceladoBookings().length}</h3>
                        <div className="flex gap-2 text-[9px] text-gray-400 mt-1">
                          <span className="text-red-600 font-bold">{stats.noShowCount} faltas</span>
                          <span>•</span>
                          <span className="font-semibold">{stats.cancellationRate}% taxa</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shadow-sm shrink-0 ml-2 border border-red-500/20">
                        <AlertCircle size={20} />
                      </div>
                    </div>
                  </div>

                  {/* VISUAL CHARTS ROW (PREMIUM RE-DESIGN) */}
                  <div className="grid lg:grid-cols-3 gap-8">
                    {/* SVG Wave Chart Container */}
                    <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-4 shadow-sm hover:shadow transition-shadow">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-serif text-lg text-white">Fluxo de Faturamento</h4>
                          <p className="text-[10px] text-gray-500 uppercase">Faturamento estimado semanal do salão</p>
                        </div>
                        <span className="text-xs px-2.5 py-1 bg-gold/10 text-gold rounded-full font-bold">
                          +18.4% esta semana
                        </span>
                      </div>
                      
                      <div className="h-64 w-full relative pt-4">
                        {/* Background lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-50">
                          <div className="border-b border-gold/5 w-full h-0" />
                          <div className="border-b border-gold/5 w-full h-0" />
                          <div className="border-b border-gold/5 w-full h-0" />
                          <div className="border-b border-gold/5 w-full h-0" />
                          <div className="border-b border-gold/5 w-full h-0" />
                        </div>

                        {/* Chart body */}
                        <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#C8A45D" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#C8A45D" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          {/* Fill */}
                          <path
                            d="M0 160 Q 80 120, 160 140 T 320 80 T 480 50 L 500 50 L 500 200 L 0 200 Z"
                            fill="url(#chartGrad)"
                          />
                          {/* Smooth curve line */}
                          <path
                            d="M0 160 Q 80 120, 160 140 T 320 80 T 480 50 L 500 50"
                            fill="none"
                            stroke="#C8A45D"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          {/* Nodes points */}
                          <circle cx="160" cy="140" r="5" fill="#2E1B13" stroke="#C8A45D" strokeWidth="2" />
                          <circle cx="320" cy="80" r="5" fill="#2E1B13" stroke="#C8A45D" strokeWidth="2" />
                          <circle cx="480" cy="50" r="5" fill="#2E1B13" stroke="#C8A45D" strokeWidth="2" />
                        </svg>
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px] text-gray-500 pt-2 border-t border-gold/10">
                        <span>Segunda</span>
                        <span>Quarta</span>
                        <span>Sexta</span>
                        <span>Domingo</span>
                      </div>
                    </div>

                    {/* Circular Progress Gauge */}
                    <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between space-y-6 shadow-sm hover:shadow transition-shadow">
                      <div>
                        <h4 className="font-serif text-lg text-white">Capacidade do Salão</h4>
                        <p className="text-[10px] text-gray-500 uppercase">Percentual de ocupação hoje</p>
                      </div>

                      <div className="relative flex justify-center items-center py-4">
                        <svg className="w-36 h-36" viewBox="0 0 100 100">
                          {/* Track */}
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            className="stroke-[#F4EDE4]"
                            strokeWidth="8"
                          />
                          {/* Progress */}
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            className="stroke-[#C8A45D]"
                            strokeWidth="8"
                            strokeDasharray="251.2"
                            strokeDashoffset={251.2 * (1 - 0.75)}
                            strokeLinecap="round"
                            transform="rotate(-90 50 50)"
                          />
                        </svg>
                        <div className="absolute text-center space-y-0.5">
                          <span className="text-3xl font-serif text-[#2E1B13] font-bold block">75%</span>
                          <span className="text-[8px] uppercase tracking-wider text-gray-500">Ocupado</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-gray-500 px-4 pt-2 border-t border-gold/10">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-gold" />
                          <span>Reservado</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#F4EDE4]" />
                          <span>Disponível</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DATA GRID: RECENT BOOKINGS & PRODUCTION */}
                  <div className="grid lg:grid-cols-3 gap-8">
                    {/* Recent Bookings Table */}
                    <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-6 shadow-sm">
                      <div className="flex justify-between items-center">
                        <h4 className="font-serif text-lg text-white">Últimos Agendamentos Recebidos</h4>
                        <span className="text-[10px] text-gold font-bold uppercase tracking-wider underline cursor-pointer" onClick={() => setOwnerTab('agenda')}>
                          Ver agenda geral
                        </span>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-gold/15 text-gray-500 text-xs uppercase font-bold">
                              <th className="pb-3">Cliente</th>
                              <th className="pb-3">Serviço</th>
                              <th className="pb-3">Profissional</th>
                              <th className="pb-3">Data/Hora</th>
                              <th className="pb-3">Valor</th>
                              <th className="pb-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gold/10">
                            {bookings.slice(0, 5).map(b => (
                              <tr key={b.id} className="hover:bg-gold/5 transition-colors group">
                                <td className="py-3.5 flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-gold/10 border border-gold/25 flex items-center justify-center text-[10px] text-gold font-bold uppercase group-hover:scale-105 transition-transform">
                                    {getInitials(b.clientName)}
                                  </div>
                                  <span className="font-semibold text-white">{b.clientName}</span>
                                </td>
                                <td className="py-3.5 text-gray-300">{b.serviceName}</td>
                                <td className="py-3.5 text-gray-400">{b.professionalName}</td>
                                <td className="py-3.5 text-gray-400 text-xs">
                                  {new Date(b.date + 'T00:00:00').toLocaleDateString('pt-BR')} às {b.time}h
                                </td>
                                <td className="py-3.5 text-gold font-medium">R$ {b.price},00</td>
                                <td className="py-3.5">
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

                    {/* Staff Production Summary List */}
                    <div className="glass-panel p-6 rounded-2xl space-y-6 shadow-sm">
                      <div className="flex justify-between items-center border-b border-gold/15 pb-4">
                        <h4 className="font-serif text-lg text-white">Produção do Salão</h4>
                        <Award size={18} className="text-gold" />
                      </div>
                      
                      <div className="space-y-4">
                        {commissionData.professionalsList.map(item => (
                          <div key={item.proId} className="flex justify-between items-center p-3.5 rounded-xl hover:bg-[#F4EDE4]/40 border border-transparent hover:border-gold/15 transition-all duration-300">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gold/15 flex items-center justify-center text-gold font-serif font-bold text-xs uppercase">
                                {item.proName[0]}
                              </div>
                              <div>
                                <span className="font-serif text-sm text-white block font-semibold leading-none mb-1">{item.proName}</span>
                                <span className="text-[9px] text-gray-500 uppercase">{item.appointmentsCount} atendimentos</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-gold font-semibold text-sm block">R$ {item.totalProduction},00</span>
                              <span className="text-[9px] text-gray-500">Repasse: R$ {item.commissionPro},00</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: AGENDA GERAL */}
              {ownerTab === 'agenda' && (
                <div className="space-y-6">
                  {/* Date picker row */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#F4EDE4]/60 p-4 rounded-xl border border-gold/15 shadow-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-xs uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1">
                        <Calendar size={14} className="text-gold" /> Verificar data:
                      </span>
                      <input 
                        type="date" 
                        value={agendaDateFilter}
                        onChange={(e) => setAgendaDateFilter(e.target.value)}
                        className="bg-[#FFFDFB] border border-gold/30 text-[#2E1B13] text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-gold cursor-pointer font-sans"
                      />
                    </div>

                    <div className="text-xs text-gold font-semibold uppercase tracking-wider font-serif">
                      Dia: {new Date(agendaDateFilter + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                  </div>

                  {/* KANBAN GRID FOR STAFF COLUMN */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {professionals.map(pro => {
                      const proBookings = agendaBookings.filter(b => b.professionalId === pro.id);
                      return (
                        <div key={pro.id} className="glass-panel rounded-xl overflow-hidden shadow-sm flex flex-col max-h-[500px]">
                          {/* Column Header */}
                          <div className="px-4 py-3.5 bg-[#F4EDE4] border-b border-gold/15 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-gold shrink-0" />
                              <h4 className="font-serif text-white font-semibold text-sm leading-none">{pro.name}</h4>
                            </div>
                            <span className="text-[9px] uppercase bg-gold/15 border border-gold/25 text-gold px-2.5 py-0.5 rounded font-bold">
                              {proBookings.length} agendas
                            </span>
                          </div>

                          {/* Appointments Cards list */}
                          <div className="p-4 space-y-3.5 flex-1 overflow-y-auto bg-[#FFF8F2]/40 scrollbar-thin">
                            {proBookings.map(b => (
                              <div key={b.id} className="bg-[#FFFDFB] p-4 rounded-xl border border-gold/15 space-y-3 relative shadow-sm hover:shadow hover:border-gold/30 transition-all duration-300">
                                <button
                                  onClick={() => onDeleteBooking(b.id)}
                                  className="absolute right-3.5 top-3.5 text-red-500 hover:text-red-700 opacity-40 hover:opacity-100 transition-opacity"
                                  title="Excluir agendamento"
                                >
                                  <Trash2 size={13} />
                                </button>
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1 text-[#2E1B13]">
                                    <Clock size={12} className="text-gold" />
                                    <span className="font-sans text-xs font-bold">{b.time}h</span>
                                  </div>
                                  <span className={`text-[8px] uppercase px-2 py-0.5 rounded-full font-bold ${getStatusColor(b.status)}`}>
                                    {b.status}
                                  </span>
                                </div>
                                
                                <div className="text-xs">
                                  <strong className="text-white block font-semibold text-sm">{b.clientName}</strong>
                                  <span className="text-[#5C3D30] block mt-0.5 font-light">{b.serviceName}</span>
                                </div>
                                
                                {b.notes && (
                                  <p className="text-[10px] text-[#A98D7C] italic bg-[#FFF8F2] border border-gold/10 p-2 rounded-lg mt-2 flex items-start gap-1">
                                    <MessageSquare size={10} className="shrink-0 mt-0.5 text-gold/60" />
                                    <span>Obs: {b.notes}</span>
                                  </p>
                                )}
                                
                                {b.status === 'pendente' && (
                                  <div className="flex gap-2 pt-2 border-t border-gold/10">
                                    <button
                                      onClick={() => onUpdateBookingStatus(b.id, 'concluido')}
                                      className="flex-1 py-1.5 text-[10px] font-bold uppercase bg-emerald-600/10 hover:bg-emerald-600 text-emerald-800 hover:text-white rounded-lg border border-emerald-500/20 transition-colors"
                                    >
                                      Concluir
                                    </button>
                                    <button
                                      onClick={() => onUpdateBookingStatus(b.id, 'faltou')}
                                      className="flex-1 py-1.5 text-[10px] font-bold uppercase bg-red-600/10 hover:bg-red-600 text-red-800 hover:text-white rounded-lg border border-red-500/20 transition-colors"
                                    >
                                      Falta
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                            {proBookings.length === 0 && (
                              <div className="h-full flex flex-col items-center justify-center py-20 text-center text-gray-500 text-xs font-light space-y-1">
                                <Calendar size={20} className="text-gray-400" />
                                <span>Sem compromissos hoje.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: CLIENT DATABASE */}
              {ownerTab === 'clientes' && (
                <div className="glass-panel p-6 rounded-2xl space-y-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h4 className="font-serif text-lg text-white">Central de Relacionamento & Clientes</h4>
                      <p className="text-xs text-gray-400">Gerenciamento e ações de reativação de clientes do salão.</p>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <input 
                        type="text"
                        placeholder="Buscar cliente por nome..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-9 pr-4 bg-[#FFFDFB] border border-gold/25 rounded-xl text-xs text-[#2E1B13] placeholder-gray-500 focus:outline-none focus:border-gold transition-colors shadow-sm"
                      />
                      <Search size={14} className="absolute left-3.5 top-3.5 text-gray-500" />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-gold/15 text-gray-500 text-xs uppercase font-bold">
                          <th className="pb-3">Nome</th>
                          <th className="pb-3">WhatsApp / Telefone</th>
                          <th className="pb-3">E-mail</th>
                          <th className="pb-3 text-center">Total de Visitas</th>
                          <th className="pb-3">Último Atendimento</th>
                          <th className="pb-3">Ações de Relacionamento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gold/10">
                        {filteredClients.map(c => (
                          <tr key={c.phone} className="hover:bg-gold/5 transition-colors group">
                            <td className="py-3.5 flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gold/10 border border-gold/25 flex items-center justify-center text-[10px] text-gold font-bold uppercase group-hover:scale-105 transition-transform">
                                {getInitials(c.name)}
                              </div>
                              <span className="font-semibold text-white">{c.name}</span>
                            </td>
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
                                className="px-3 py-1.5 bg-gold/10 hover:bg-gold border border-gold/25 hover:border-gold text-gold hover:text-white font-semibold text-[10px] uppercase rounded-lg transition-colors flex items-center gap-1.5 w-max shadow-sm"
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

              {/* TAB 4: COMMISSIONS & PRODUCTION */}
              {ownerTab === 'comissoes' && (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Global revenue generated */}
                    <div className="glass-panel p-6 rounded-2xl shadow-sm hover:shadow transition-shadow">
                      <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block">Faturamento Bruto</span>
                      <h3 className="text-3xl text-gold font-serif font-bold mt-2">R$ {commissionData.totalProductionAll},00</h3>
                    </div>
                    {/* Comission share to professionals */}
                    <div className="glass-panel p-6 rounded-2xl shadow-sm hover:shadow transition-shadow">
                      <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block">Comissões Devidas (Repasse 50%)</span>
                      <h3 className="text-3xl text-white font-serif font-bold mt-2">R$ {commissionData.totalCommissionAll},00</h3>
                    </div>
                    {/* Salon cut (net margin) */}
                    <div className="glass-panel p-6 rounded-2xl shadow-sm hover:shadow transition-shadow">
                      <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block">Lucro Líquido do Salão (Cota 50%)</span>
                      <h3 className="text-3xl text-emerald-700 font-serif font-bold mt-2">R$ {commissionData.totalSalonCutAll},00</h3>
                    </div>
                  </div>

                  <div className="glass-panel p-6 rounded-2xl shadow-sm">
                    <h4 className="font-serif text-lg text-white mb-6">Detalhamento de Rateio por Profissional</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-gold/15 text-gray-500 text-xs uppercase font-bold">
                            <th className="pb-3">Profissional</th>
                            <th className="pb-3">Cargo / Setor</th>
                            <th className="pb-3 text-center">Atendimentos Concluídos</th>
                            <th className="pb-3 text-right">Produção Bruta</th>
                            <th className="pb-3 text-right">Comissão (50%)</th>
                            <th className="pb-3 text-right">Salão (50%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gold/10">
                          {commissionData.professionalsList.map(item => (
                            <tr key={item.proId} className="hover:bg-gold/5 transition-colors group">
                              <td className="py-4 flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center text-[10px] text-gold font-bold uppercase group-hover:scale-105 transition-transform">
                                  {item.proName[0]}
                                </div>
                                <span className="font-semibold text-white">{item.proName}</span>
                              </td>
                              <td className="py-4 text-gray-400 text-xs">{item.role}</td>
                              <td className="py-4 text-center text-gray-300 font-bold">{item.appointmentsCount}</td>
                              <td className="py-4 text-right text-gold font-medium">R$ {item.totalProduction},00</td>
                              <td className="py-4 text-right text-white font-semibold">R$ {item.commissionPro},00</td>
                              <td className="py-4 text-right text-emerald-700 font-medium">R$ {item.salonCut},00</td>
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
          {/* VIEW 2: INDIVIDUAL STAFF VIEW */}
          {/* ======================================================== */}
          {currentView === 'professional' && (
            <div className="space-y-8 animate-fade-in">
              {/* Select Professional Profile drop box */}
              <div className="glass-panel p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                <div>
                  <h3 className="text-xl font-serif text-white mb-1">Agenda de Serviços Individuais</h3>
                  <p className="text-xs text-gray-400">Selecione seu perfil profissional para visualizar e gerenciar seus agendamentos.</p>
                </div>

                <div>
                  <select
                    value={selectedProId}
                    onChange={(e) => setSelectedProId(e.target.value)}
                    className="bg-[#FFFDFB] border border-gold/30 text-[#2E1B13] text-sm font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:border-gold cursor-pointer shadow-sm"
                  >
                    {professionals.map(pro => (
                      <option key={pro.id} value={pro.id}>{pro.name} ({pro.role.split(',')[0]})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Next appointments of staff */}
              <div className="glass-panel p-6 rounded-2xl space-y-6 shadow-sm">
                <div className="flex justify-between items-center border-b border-gold/15 pb-4">
                  <h4 className="font-serif text-lg text-white">
                    Compromissos Agendados de {professionals.find(p => p.id === selectedProId)?.name}
                  </h4>
                  <span className="text-xs uppercase bg-gold/10 text-gold border border-gold/25 px-3 py-1 rounded-full font-bold">
                    {bookings.filter(b => b.professionalId === selectedProId && b.status !== 'cancelado').length} Agendas Ativas
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gold/15 text-gray-500 text-xs uppercase font-bold">
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
                    <tbody className="divide-y divide-gold/10">
                      {bookings.filter(b => b.professionalId === selectedProId).map(b => (
                        <tr key={b.id} className="hover:bg-gold/5 transition-colors group">
                          <td className="py-4 text-gray-300 font-semibold">
                            {new Date(b.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-4 text-white font-bold">{b.time}h</td>
                          <td className="py-4 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center text-[10px] text-gold font-bold uppercase group-hover:scale-105 transition-transform">
                              {getInitials(b.clientName)}
                            </div>
                            <div className="text-xs">
                              <strong className="text-white block font-semibold">{b.clientName}</strong>
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
                                  className="px-3 py-1 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-800 hover:text-white font-semibold text-[10px] uppercase rounded-lg border border-emerald-500/20 transition-colors"
                                >
                                  Concluir
                                </button>
                                <button
                                  onClick={() => onUpdateBookingStatus(b.id, 'faltou')}
                                  className="px-3 py-1 bg-red-600/10 hover:bg-red-600 text-red-800 hover:text-white font-semibold text-[10px] uppercase rounded-lg border border-red-500/20 transition-colors"
                                >
                                  Falta
                                </button>
                                <button
                                  onClick={() => onUpdateBookingStatus(b.id, 'cancelado')}
                                  className="px-3 py-1 bg-gray-600/10 hover:bg-gray-500 text-gray-700 hover:text-white font-semibold text-[10px] uppercase rounded-lg border border-gray-500/20 transition-colors"
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
    </div>
  );
}
