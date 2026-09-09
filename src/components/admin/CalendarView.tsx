// ─────────────────────────────────────────────
// CUIDARE — CalendarView
// Calendário mensal com indicadores visuais e
// painel lateral de horários por profissional
// ─────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import type { Professional } from '../../types';
import { getBookings } from '../../lib/dataService';

interface DayInfo {
  date: string; // YYYY-MM-DD
  dayNum: number;
  inMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isClosed: boolean; // Mon/Sun
  bookingCount: number;
  hasBlock: boolean;
}

interface CalendarViewProps {
  professionals: Professional[];
  currentUserProfessionalId?: string; // set for collaborator view
  onSelectSlot: (date: string, time: string, professionalId: string) => void;
  onNewAppointment: (date?: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-amber-400',
  confirmado: 'bg-blue-400',
  concluido: 'bg-emerald-400',
  faltou: 'bg-red-400',
  cancelado: 'bg-gray-300',
};

const STATUS_LABELS: Record<string, string> = {
  livre: 'Livre',
  agendado: 'Agendado',
  concluido: 'Concluído',
  faltou: 'Faltou',
  cancelado: 'Cancelado',
  bloqueado: 'Bloqueado',
  intervalo: 'Intervalo',
};

function getYearMonth(date: Date): { year: number; month: number } {
  return { year: date.getFullYear(), month: date.getMonth() };
}

export default function CalendarView({ professionals, currentUserProfessionalId, onSelectSlot, onNewAppointment }: CalendarViewProps) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const [viewDate, setViewDate] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().split('T')[0]);

  const allBookings = getBookings();

  // ── Build calendar grid
  const calendarDays: DayInfo[] = useMemo(() => {
    const { year, month } = viewDate;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Start on Sunday
    const startOffset = firstDay.getDay();
    const days: DayInfo[] = [];

    // Previous month fill
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({ date: dateStr, dayNum: d.getDate(), inMonth: false, isToday: false, isWeekend: d.getDay() === 0 || d.getDay() === 6, isClosed: d.getDay() === 0 || d.getDay() === 1, bookingCount: 0, hasBlock: false });
    }

    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dt = new Date(year, month, d);
      const dateStr = dt.toISOString().split('T')[0];
      const dow = dt.getDay();
      const count = allBookings.filter(b => b.date === dateStr && b.status !== 'cancelado').length;
      days.push({
        date: dateStr,
        dayNum: d,
        inMonth: true,
        isToday: dateStr === todayStr,
        isWeekend: dow === 0 || dow === 6,
        isClosed: dow === 0 || dow === 1,
        bookingCount: count,
        hasBlock: false,
      });
    }

    // Next month fill
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({ date: dateStr, dayNum: d.getDate(), inMonth: false, isToday: false, isWeekend: d.getDay() === 0 || d.getDay() === 6, isClosed: d.getDay() === 0 || d.getDay() === 1, bookingCount: 0, hasBlock: false });
    }

    return days;
  }, [viewDate, allBookings]);

  const monthName = new Date(viewDate.year, viewDate.month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev.year, prev.month - 1, 1);
      return getYearMonth(d);
    });
  };
  const nextMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev.year, prev.month + 1, 1);
      return getYearMonth(d);
    });
  };
  const goToToday = () => {
    setViewDate(getYearMonth(today));
    setSelectedDate(today.toISOString().split('T')[0]);
  };

  // ── Selected day info
  const selectedDayBookings = allBookings.filter(b => b.date === selectedDate);

  const visibleProfessionals = currentUserProfessionalId
    ? professionals.filter(p => p.id === currentUserProfessionalId)
    : professionals;

  const selectedDateFormatted = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  // Day color logic
  const getDayClasses = (day: DayInfo) => {
    const isSelected = day.date === selectedDate;
    if (!day.inMonth) return 'text-gray-300 cursor-default';
    if (day.isClosed) {
      return `text-gray-400 cursor-pointer ${isSelected ? 'ring-2 ring-gray-300' : 'hover:bg-gray-50'}`;
    }
    if (isSelected) {
      return 'bg-[#251B17] text-white rounded-lg cursor-pointer';
    }
    if (day.isToday) {
      return 'ring-2 ring-[#C7A15D] rounded-lg cursor-pointer hover:bg-[#F1E6D0]';
    }
    if (day.bookingCount > 0) {
      return 'cursor-pointer hover:bg-[#F1EBE4] rounded-lg';
    }
    return 'cursor-pointer hover:bg-gray-50 rounded-lg text-[#251B17]';
  };

  const getDotColor = (day: DayInfo) => {
    if (day.bookingCount === 0) return '';
    if (day.bookingCount >= 5) return 'bg-red-400';
    if (day.bookingCount >= 3) return 'bg-amber-400';
    return 'bg-emerald-400';
  };

  const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-6">
      {/* ── Calendar Header */}
      <div className="bg-white rounded-xl border border-[rgba(37,27,23,0.09)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[rgba(37,27,23,0.09)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar size={18} className="text-[#C7A15D]" />
            <h3 className="font-semibold text-[#29231F] capitalize">{monthName}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-xs font-semibold text-[#756B65] border border-[rgba(37,27,23,0.12)] rounded-md hover:bg-[#F8F5F0] transition-colors"
            >
              Hoje
            </button>
            <button onClick={prevMonth} aria-label="Mês anterior" className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={nextMonth} aria-label="Próximo mês" className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => onNewAppointment(selectedDate)}
              className="ml-2 px-4 py-1.5 bg-[#251B17] text-white text-xs font-semibold rounded-md hover:bg-[#1a120e] transition-colors"
            >
              + Novo agendamento
            </button>
          </div>
        </div>

        {/* Weekday labels */}
        <div className="grid grid-cols-7 border-b border-[rgba(37,27,23,0.06)]">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-semibold uppercase text-[#7C736D] tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 p-2 gap-1">
          {calendarDays.map(day => (
            <button
              key={day.date}
              onClick={() => day.inMonth && setSelectedDate(day.date)}
              disabled={!day.inMonth}
              className={`relative flex flex-col items-center justify-start py-2 px-1 min-h-[56px] sm:min-h-[64px] transition-all duration-150 ${getDayClasses(day)}`}
              aria-label={`${day.date}${day.bookingCount > 0 ? `, ${day.bookingCount} agendamentos` : ''}`}
            >
              <span className={`text-sm font-semibold ${day.date === selectedDate ? 'text-white' : day.isToday ? 'text-[#C7A15D]' : ''}`}>
                {day.dayNum}
              </span>
              {day.inMonth && day.bookingCount > 0 && (
                <div className="flex items-center gap-0.5 mt-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${day.date === selectedDate ? 'bg-white/70' : getDotColor(day)}`} />
                  <span className={`text-[9px] font-bold ${day.date === selectedDate ? 'text-white/70' : 'text-gray-500'}`}>
                    {day.bookingCount}
                  </span>
                </div>
              )}
              {day.isClosed && day.inMonth && (
                <span className="text-[8px] text-gray-400 mt-0.5">fechado</span>
              )}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="px-4 py-3 border-t border-[rgba(37,27,23,0.06)] flex flex-wrap gap-4">
          {[
            { color: 'bg-emerald-400', label: '1–2 agendamentos' },
            { color: 'bg-amber-400', label: '3–4 agendamentos' },
            { color: 'bg-red-400', label: '5+ agendamentos' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${item.color}`} />
              <span className="text-[11px] text-[#7C736D]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Selected Day Detail */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDate}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-[#C7A15D]" />
              <h4 className="font-semibold text-[#29231F] capitalize">{selectedDateFormatted}</h4>
            </div>
            <span className="text-xs text-[#7C736D] font-medium">
              {selectedDayBookings.filter(b => b.status !== 'cancelado').length} agendamentos
            </span>
          </div>

          {/* Professional cards for the selected day */}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleProfessionals.map(pro => {
              const proBookings = selectedDayBookings.filter(b => b.professionalId === pro.id && b.status !== 'cancelado');
              const proBookingsAll = selectedDayBookings.filter(b => b.professionalId === pro.id);

              return (
                <div
                  key={pro.id}
                  className="bg-white rounded-xl border border-[rgba(37,27,23,0.09)] shadow-sm overflow-hidden"
                >
                  {/* Pro header */}
                  <div className="p-3 bg-[#FCFBF9] border-b border-[rgba(37,27,23,0.09)] flex items-center gap-3">
                    {pro.photoUrl ? (
                      <img
                        src={pro.photoUrl}
                        alt={pro.name}
                        className="w-8 h-8 rounded-full object-cover border border-[rgba(37,27,23,0.1)]"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#F1E6D0] flex items-center justify-center text-[#C7A15D] font-serif font-bold text-xs border border-[rgba(199,161,93,0.3)]">
                        {pro.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-[#29231F] truncate">{pro.name}</div>
                      <div className="text-[10px] text-[#7C736D] truncate">{pro.role.split(',')[0]}</div>
                    </div>
                    <span className="text-xs font-semibold text-[#7C736D] shrink-0">{proBookings.length}</span>
                  </div>

                  {/* Appointments */}
                  <div className="divide-y divide-[rgba(37,27,23,0.06)] max-h-[300px] overflow-y-auto">
                    {proBookingsAll.length === 0 ? (
                      <div
                        className="p-4 text-center cursor-pointer hover:bg-[#F8F5F0] transition-colors"
                        onClick={() => onNewAppointment(selectedDate)}
                      >
                        <p className="text-xs text-[#7C736D]">Nenhum agendamento</p>
                        <p className="text-[10px] text-[#C7A15D] font-semibold mt-1">+ Agendar aqui</p>
                      </div>
                    ) : (
                      proBookingsAll
                        .sort((a, b) => a.time.localeCompare(b.time))
                        .map(booking => (
                          <button
                            key={booking.id}
                            onClick={() => onSelectSlot(booking.date, booking.time, booking.professionalId)}
                            className="w-full p-3 text-left hover:bg-[#F8F5F0] transition-colors group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[booking.status] ?? 'bg-gray-300'}`} />
                                <span className="text-xs font-bold text-[#29231F] shrink-0">{booking.time}</span>
                                <span className="text-xs text-[#29231F] font-medium truncate">{booking.clientName}</span>
                              </div>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border shrink-0 ${
                                booking.status === 'concluido' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                booking.status === 'pendente' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                booking.status === 'faltou' ? 'bg-red-50 text-red-700 border-red-200' :
                                'bg-gray-100 text-gray-600 border-gray-300'
                              }`}>
                                {booking.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#7C736D] mt-1 ml-4 truncate">{booking.serviceName} · {booking.duration}min</p>
                          </button>
                        ))
                    )}
                  </div>

                  {/* Quick action */}
                  <div className="p-2 border-t border-[rgba(37,27,23,0.06)]">
                    <button
                      onClick={() => onNewAppointment(selectedDate)}
                      className="w-full py-1.5 text-[11px] font-semibold text-[#C7A15D] hover:text-[#a87d37] transition-colors"
                    >
                      + Agendar com {pro.name.split(' ')[0]}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Status legend */}
          <div className="flex flex-wrap gap-3 pt-2">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[key] ?? 'bg-gray-300'}`} />
                <span className="text-[11px] text-[#7C736D]">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
