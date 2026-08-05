import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, MessageSquare, Check, Phone, Mail, 
  ArrowLeft, ArrowRight, Search, Sparkles, MapPin
} from 'lucide-react';
import { services } from '../data/servicesData';
import { professionals } from '../data/professionalsData';
import type { Service, Professional, Booking } from '../types';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialService?: Service;
  existingBookings: Booking[];
  onAddBooking: (booking: Booking) => void;
}

export default function BookingModal({ 
  isOpen, 
  onClose, 
  initialService, 
  existingBookings, 
  onAddBooking 
}: BookingModalProps) {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [isFirstAvailable, setIsFirstAvailable] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD
  const [selectedTime, setSelectedTime] = useState<string>(''); // HH:MM
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('todos');

  // Pre-select service if passed
  useEffect(() => {
    if (initialService) {
      setSelectedService(initialService);
      setStep(2); // Go directly to professional step
    } else {
      setSelectedService(null);
      setStep(1);
    }
  }, [initialService, isOpen]);

  if (!isOpen) return null;

  // Filter services by search and category
  const filteredServices = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategoryFilter === 'todos' || s.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Filter professionals that perform the selected service
  const eligibleProfessionals = selectedService 
    ? professionals.filter(p => p.categories.includes(selectedService.category))
    : professionals;

  // Generate calendar days for the next 14 days
  const getNext14Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const nextDay = new Date(today);
      nextDay.setDate(today.getDate() + i);
      const dayOfWeek = nextDay.getDay(); // 0: Sun, 1: Mon, ... 6: Sat
      
      // Skip Mondays (closed) and Sundays (closed)
      if (dayOfWeek !== 0 && dayOfWeek !== 1) {
        days.push(nextDay);
      }
    }
    return days;
  };

  const calendarDays = getNext14Days();

  // Generate hourly slots for the selected day based on salon schedule
  const getAvailableSlots = (dateString: string) => {
    if (!dateString) return [];
    
    const date = new Date(dateString + 'T00:00:00');
    const dayOfWeek = date.getDay(); // 2 to 6 (Tue to Sat)
    
    let slots: string[] = [];
    
    if (dayOfWeek >= 2 && dayOfWeek <= 5) {
      // Terça a Sexta: 08:00 às 11:00 and 14:00 às 18:00
      slots = [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
      ];
    } else if (dayOfWeek === 6) {
      // Sábado: 08:00 às 18:00 (sem intervalo)
      slots = [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
        '16:00', '16:30', '17:00', '17:30'
      ];
    }

    // Filter out slots that are already booked
    return slots.filter(time => {
      // If we selected a specific professional
      if (selectedProfessional) {
        const isBooked = existingBookings.some(
          b => b.date === dateString && 
               b.time === time && 
               b.professionalId === selectedProfessional.id &&
               b.status !== 'cancelado'
        );
        return !isBooked;
      }
      
      // If "First Available" professional is selected:
      // It is available if at least one eligible professional is free
      const freeProfessionals = eligibleProfessionals.filter(p => {
        const isBooked = existingBookings.some(
          b => b.date === dateString && 
               b.time === time && 
               b.professionalId === p.id &&
               b.status !== 'cancelado'
        );
        return !isBooked;
      });

      return freeProfessionals.length > 0;
    });
  };

  const availableTimeSlots = getAvailableSlots(selectedDate);

  // Auto-allocate first available professional if needed
  const determineProfessional = (): Professional => {
    if (selectedProfessional) return selectedProfessional;
    
    // Find an eligible professional who is free at the selected date & time
    const freePro = eligibleProfessionals.find(p => {
      const isBooked = existingBookings.some(
        b => b.date === selectedDate && 
             b.time === selectedTime && 
             b.professionalId === p.id &&
             b.status !== 'cancelado'
      );
      return !isBooked;
    });

    return freePro || eligibleProfessionals[0];
  };

  const handleNextStep = () => {
    if (step === 1 && selectedService) {
      // Find eligible pros. If only one, select her by default
      const pros = professionals.filter(p => p.categories.includes(selectedService.category));
      if (pros.length === 1) {
        setSelectedProfessional(pros[0]);
        setIsFirstAvailable(false);
      }
      setStep(2);
    } else if (step === 2 && (selectedProfessional || isFirstAvailable)) {
      setStep(3);
    } else if (step === 3 && selectedDate && selectedTime) {
      setStep(4);
    }
  };

  const handlePrevStep = () => {
    if (step === 2) {
      // If we had initialService, closing or resetting goes to 1
      setStep(1);
    } else if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || (!selectedProfessional && !isFirstAvailable) || !selectedDate || !selectedTime || !clientName || !clientPhone) {
      return;
    }

    const pro = determineProfessional();

    const newBooking: Booking = {
      id: 'bk_' + Math.random().toString(36).substr(2, 9),
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      professionalId: pro.id,
      professionalName: pro.name,
      date: selectedDate,
      time: selectedTime,
      clientName,
      clientPhone,
      clientEmail: clientEmail || undefined,
      notes: clientNotes || undefined,
      status: 'pendente',
      createdAt: new Date().toISOString(),
      price: selectedService.priceBase, // standard price
      duration: selectedService.duration
    };

    onAddBooking(newBooking);
    setStep(5); // Go to success confirmation screen
  };

  const formatDateLabel = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  // Pre-filled WhatsApp link builder
  const getWhatsAppLink = () => {
    if (!selectedService || !selectedDate || !selectedTime) return '#';
    const pro = determineProfessional();
    const formattedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR');
    const message = `Olá Cuidare! Acabei de agendar meu horário pelo site!\n\n📌 *Detalhes do Agendamento:*\n🔹 *Cliente:* ${clientName}\n🔹 *Serviço:* ${selectedService.name}\n🔹 *Profissional:* ${pro.name}\n🔹 *Data:* ${formattedDate}\n🔹 *Horário:* ${selectedTime}h\n\nPor favor, confirmem na minha agenda! Obrigado.`;
    return `https://wa.me/5538991007706?text=${encodeURIComponent(message)}`;
  };

  // Categories helper list for search step
  const categoriesList = [
    { id: 'todos', name: 'Todos' },
    { id: 'escovas', name: 'Escovas' },
    { id: 'tratamentos', name: 'Tratamentos' },
    { id: 'quimicas', name: 'Químicas' },
    { id: 'unhas', name: 'Unhas' },
    { id: 'sobrancelhas', name: 'Sobrancelhas' },
    { id: 'cilios', name: 'Cílios' },
    { id: 'maquiagem', name: 'Maquiagem' },
    { id: 'estetica', name: 'Estética' }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Overlay backdrop */}
      <div 
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity" 
        onClick={() => step !== 5 ? onClose() : null} 
      />

      {/* Modal box */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-2xl glass-panel rounded-2xl overflow-hidden shadow-2xl relative z-10"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gold/10 flex justify-between items-center bg-luxury-dark/90">
          <div>
            <h3 className="text-xl font-serif text-white tracking-wide">Agendar seu Horário</h3>
            <span className="text-[10px] text-gold uppercase tracking-wider">Cuidare Espaço de Beleza</span>
          </div>
          {step !== 5 && (
            <button onClick={onClose} className="text-gray-400 hover:text-gold transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Progress Tracker (Steps 1 to 4) */}
        {step < 5 && (
          <div className="bg-luxury-black border-b border-gold/5 px-6 py-3 flex justify-between text-[10px] uppercase font-semibold text-gray-500 tracking-wider">
            <span className={step === 1 ? 'text-gold' : step > 1 ? 'text-gold/60' : ''}>1. Serviço</span>
            <span className={step === 2 ? 'text-gold' : step > 2 ? 'text-gold/60' : ''}>2. Profissional</span>
            <span className={step === 3 ? 'text-gold' : step > 3 ? 'text-gold/60' : ''}>3. Horário</span>
            <span className={step === 4 ? 'text-gold' : ''}>4. Identificação</span>
          </div>
        )}

        {/* Dynamic Step Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto bg-luxury-black/95">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: SELECT SERVICE */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full sm:w-72">
                    <input 
                      type="text"
                      placeholder="Pesquisar serviço..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-10 pl-9 pr-4 bg-luxury-dark/60 border border-gold/20 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold transition-colors"
                    />
                    <Search size={16} className="absolute left-3 top-3 text-gray-500" />
                  </div>

                  <div className="flex gap-1 overflow-x-auto w-full sm:w-auto py-1 no-scrollbar">
                    {categoriesList.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategoryFilter(cat.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                          selectedCategoryFilter === cat.id 
                            ? 'bg-gold text-black' 
                            : 'bg-luxury-dark text-gray-400 hover:text-white'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredServices.map(service => (
                    <div 
                      key={service.id}
                      onClick={() => setSelectedService(service)}
                      className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex justify-between items-center backdrop-blur-md ${
                        selectedService?.id === service.id
                          ? 'border-gold bg-gold/10 shadow-lg shadow-gold/10 scale-[1.01]'
                          : 'border-gold/10 hover:border-gold/35 bg-white/[0.02] hover:bg-white/[0.07]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif text-white font-medium">{service.name}</h4>
                          <span className="text-[10px] text-gray-500 font-semibold uppercase">{service.category}</span>
                        </div>
                        <p className="text-gray-400 text-xs mt-1 max-w-md line-clamp-1">{service.description}</p>
                        <span className="text-[10px] text-gold/80 bg-gold/5 border border-gold/10 px-2 py-0.5 rounded mt-2 inline-block">
                          🕒 {service.duration} min
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-gold font-serif text-sm font-semibold">
                          {service.variablePrice ? 'A partir de' : ''} R$ {service.priceBase},00
                        </div>
                        {selectedService?.id === service.id && (
                          <span className="text-[10px] text-gold font-bold uppercase tracking-wider block mt-1">Selecionado</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredServices.length === 0 && (
                    <div className="text-center py-12 text-gray-500 text-sm">
                      Nenhum serviço encontrado para sua busca.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 2: SELECT PROFESSIONAL */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="space-y-6"
              >
                <div className="text-center mb-4">
                  <h4 className="text-sm uppercase tracking-wider text-gold font-semibold mb-1">Quem realizará o atendimento?</h4>
                  <p className="text-xs text-gray-400">Serviço selecionado: <strong className="text-white">{selectedService?.name}</strong></p>
                </div>

                {/* Option: First Available */}
                <div 
                  onClick={() => {
                    setSelectedProfessional(null);
                    setIsFirstAvailable(true);
                  }}
                  className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex justify-between items-center backdrop-blur-md ${
                    isFirstAvailable 
                      ? 'border-gold bg-gold/10 shadow-lg shadow-gold/10 scale-[1.01]' 
                      : 'border-gold/10 hover:border-gold/35 bg-white/[0.02] hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h4 className="font-serif text-white font-medium">Primeira Profissional Disponível</h4>
                      <p className="text-gray-400 text-xs mt-0.5">Encontre o horário mais próximo disponível</p>
                    </div>
                  </div>
                  {isFirstAvailable && <Check className="text-gold" size={20} />}
                </div>

                {/* Individual Professionals */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {eligibleProfessionals.map(pro => (
                    <div 
                      key={pro.id}
                      onClick={() => {
                        setSelectedProfessional(pro);
                        setIsFirstAvailable(false);
                      }}
                      className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between backdrop-blur-md ${
                        selectedProfessional?.id === pro.id && !isFirstAvailable
                          ? 'border-gold bg-gold/10 shadow-lg shadow-gold/10 scale-[1.01]'
                          : 'border-gold/10 hover:border-gold/35 bg-white/[0.02] hover:bg-white/[0.07]'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gold/30 to-gold/5 border border-gold/20 flex items-center justify-center text-gold font-serif font-bold text-lg">
                          {pro.name[0]}
                        </div>
                        <div>
                          <h4 className="font-serif text-white font-medium">{pro.name}</h4>
                          <span className="text-[10px] text-gray-500 uppercase font-semibold">{pro.role.split(',')[0]}</span>
                        </div>
                      </div>
                      <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed mb-4">
                        "{pro.bio}"
                      </p>
                      <div className="flex justify-between items-center pt-2 border-t border-white/5">
                        <div className="flex gap-1">
                          {pro.specialties.slice(0, 2).map((s, i) => (
                            <span key={i} className="text-[9px] px-2 py-0.5 bg-white/5 text-gray-300 rounded font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                        {selectedProfessional?.id === pro.id && !isFirstAvailable && (
                          <Check className="text-gold shrink-0" size={16} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 3: DATE & TIME SELECTOR */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="space-y-6"
              >
                <div className="text-center mb-2">
                  <h4 className="text-sm uppercase tracking-wider text-gold font-semibold mb-1">Escolha a data e o horário</h4>
                  <p className="text-xs text-gray-400">
                    Profissional: <strong className="text-white">{isFirstAvailable ? 'Primeira disponível' : selectedProfessional?.name}</strong>
                  </p>
                </div>

                {/* Day selector carousel */}
                <div className="space-y-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Escolha o dia:</span>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                    {calendarDays.map((date) => {
                      const dateString = date.toISOString().split('T')[0];
                      const isSelected = selectedDate === dateString;
                      const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' });
                      const dayNumber = date.getDate();
                      const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });

                      return (
                        <button
                          key={dateString}
                          onClick={() => {
                            setSelectedDate(dateString);
                            setSelectedTime(''); // Reset hour selection
                          }}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border min-w-[72px] transition-all duration-200 backdrop-blur-sm ${
                            isSelected 
                              ? 'bg-gold-gradient text-black border-gold shadow-lg shadow-gold/15 scale-[1.03]' 
                              : 'bg-white/[0.02] hover:bg-white/[0.07] text-gray-400 hover:text-white border-gold/10 hover:border-gold/30'
                          }`}
                        >
                          <span className="text-[10px] uppercase font-bold tracking-wider">{dayName.replace('.', '')}</span>
                          <span className="text-xl font-serif font-bold my-0.5">{dayNumber}</span>
                          <span className="text-[9px] uppercase tracking-wider opacity-80">{monthName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Hour slots selector */}
                {selectedDate && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Horários disponíveis:</span>
                      <span className="text-[10px] text-gold">{formatDateLabel(selectedDate)}</span>
                    </div>

                    {availableTimeSlots.length > 0 ? (
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                        {availableTimeSlots.map((time) => {
                          const isSelected = selectedTime === time;
                          return (
                            <button
                              key={time}
                              onClick={() => setSelectedTime(time)}
                              className={`h-11 rounded-lg border text-sm font-semibold transition-all duration-200 backdrop-blur-sm ${
                                isSelected 
                                  ? 'bg-gold-gradient text-black border-gold shadow-lg shadow-gold/15 scale-[1.03]' 
                                  : 'bg-white/[0.02] hover:bg-white/[0.07] text-gray-300 border-gold/10 hover:border-gold/30'
                              }`}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gold/80 bg-gold/5 border border-gold/10 rounded-xl text-xs">
                        ⚠️ Não há horários disponíveis para agendamento nesta data. Por favor, selecione outro dia.
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 4: CUSTOMER IDENTIFICATION FORM */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <div className="text-center mb-6">
                  <h4 className="text-sm uppercase tracking-wider text-gold font-semibold mb-1">Confirme seus dados para finalizar</h4>
                  <p className="text-xs text-gray-400">Resumo: <strong className="text-white">{selectedService?.name}</strong> em <strong className="text-white">{formatDateLabel(selectedDate)}</strong> às <strong className="text-white">{selectedTime}h</strong></p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name Input */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Seu Nome Completo *</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        required
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Ex: Maria Oliveira"
                        className="w-full h-11 pl-10 pr-4 bg-luxury-dark/60 border border-gold/20 rounded-xl text-sm text-white focus:outline-none focus:border-gold transition-colors"
                      />
                      <User size={16} className="absolute left-3.5 top-3.5 text-gray-500" />
                    </div>
                  </div>

                  {/* WhatsApp Input */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">WhatsApp para Lembretes *</label>
                    <div className="relative">
                      <input 
                        type="tel" 
                        required
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="Ex: (38) 99100-7706"
                        className="w-full h-11 pl-10 pr-4 bg-luxury-dark/60 border border-gold/20 rounded-xl text-sm text-white focus:outline-none focus:border-gold transition-colors"
                      />
                      <Phone size={16} className="absolute left-3.5 top-3.5 text-gray-500" />
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1 block">Enviaremos lembretes automáticos de confirmação 24h antes do serviço.</span>
                  </div>

                  {/* Email Input */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">E-mail (Opcional)</label>
                    <div className="relative">
                      <input 
                        type="email" 
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        placeholder="Ex: maria@exemplo.com"
                        className="w-full h-11 pl-10 pr-4 bg-luxury-dark/60 border border-gold/20 rounded-xl text-sm text-white focus:outline-none focus:border-gold transition-colors"
                      />
                      <Mail size={16} className="absolute left-3.5 top-3.5 text-gray-500" />
                    </div>
                  </div>

                  {/* Notes / Special Instructions */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Observações Importantes</label>
                    <div className="relative">
                      <textarea 
                        value={clientNotes}
                        onChange={(e) => setClientNotes(e.target.value)}
                        placeholder="Comprimento do cabelo, químicas anteriores, sensibilidades capilares, ou observações..."
                        rows={3}
                        className="w-full p-3.5 pl-10 bg-luxury-dark/60 border border-gold/20 rounded-xl text-sm text-white focus:outline-none focus:border-gold transition-colors resize-none"
                      />
                      <MessageSquare size={16} className="absolute left-3.5 top-3.5 text-gray-500" />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button 
                    type="submit"
                    className="hidden" 
                    id="submit-booking-form-btn" 
                  />
                </form>
              </motion.div>
            )}

            {/* STEP 5: SUCCESS CONFIRMATION */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="text-center py-6 space-y-6"
              >
                <div className="w-16 h-16 rounded-full bg-gold-gradient text-black flex items-center justify-center mx-auto shadow-lg shadow-gold/25 animate-bounce">
                  <Check size={32} strokeWidth={3} />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-serif text-white tracking-wide">Agendamento Realizado!</h3>
                  <p className="text-sm text-gold">Seu horário foi reservado com sucesso no salão.</p>
                </div>

                {/* Receipt ticket summary */}
                <div className="glass-panel p-5 rounded-xl max-w-sm mx-auto text-left space-y-3.5 border-dashed relative">
                  {/* Decorative ticket notch left */}
                  <div className="absolute w-4 h-8 bg-luxury-black border-r border-gold/15 rounded-r-full -left-1.5 top-1/2 -translate-y-1/2" />
                  {/* Decorative ticket notch right */}
                  <div className="absolute w-4 h-8 bg-luxury-black border-l border-gold/15 rounded-l-full -right-1.5 top-1/2 -translate-y-1/2" />

                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Cuidare Recibo</span>
                    <span className="text-[10px] text-gold font-bold uppercase">Confirmado</span>
                  </div>

                  <div className="text-xs space-y-2 text-gray-300">
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase font-bold">Cliente:</span>
                      <span className="font-semibold text-white">{clientName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase font-bold">Serviço:</span>
                      <span className="font-semibold text-white">{selectedService?.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase font-bold">Profissional Habilitada:</span>
                      <span className="font-semibold text-white">{determineProfessional().name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-500 block text-[9px] uppercase font-bold">Data:</span>
                        <span className="font-semibold text-white">{formatDateLabel(selectedDate).split('-')[0]}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[9px] uppercase font-bold">Horário:</span>
                        <span className="font-semibold text-white">{selectedTime}h</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase font-bold">Endereço Cuidare:</span>
                      <span className="text-gray-400 font-light flex items-center gap-1">
                        <MapPin size={10} className="text-gold" /> Rua Paracatu, 15, Centro, Taiobeiras
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                    Você também receberá um lembrete automático 24h antes do seu atendimento. Clique no botão abaixo para enviar os detalhes no WhatsApp do salão e confirmar sua presença imediatamente.
                  </p>
                  <div className="flex flex-col gap-2 max-w-xs mx-auto">
                    <a
                      href={getWhatsAppLink()}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full h-12 bg-[#25D366] hover:bg-[#20ba5a] text-black font-bold uppercase tracking-wider text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <Phone size={16} /> Confirmar no WhatsApp
                    </a>
                    <button
                      onClick={() => {
                        onClose();
                        setStep(1);
                        setSelectedService(null);
                        setSelectedProfessional(null);
                        setSelectedDate('');
                        setSelectedTime('');
                        setClientName('');
                        setClientPhone('');
                        setClientEmail('');
                        setClientNotes('');
                      }}
                      className="w-full h-11 border border-gold/30 hover:border-gold hover:bg-gold/5 text-gold text-xs font-semibold uppercase tracking-wider rounded-xl transition-all"
                    >
                      Voltar para o site
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer controls (for steps 1-4) */}
        {step < 5 && (
          <div className="px-6 py-4 border-t border-gold/10 bg-luxury-dark/90 flex justify-between items-center">
            <button
              onClick={handlePrevStep}
              disabled={step === 1 && !initialService}
              className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                step === 1 && !initialService
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:text-gold'
              }`}
            >
              <ArrowLeft size={14} /> Voltar
            </button>

            {step < 4 ? (
              <button
                onClick={handleNextStep}
                disabled={
                  (step === 1 && !selectedService) ||
                  (step === 2 && !selectedProfessional && !isFirstAvailable) ||
                  (step === 3 && (!selectedDate || !selectedTime))
                }
                className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all duration-300 ${
                  (step === 1 && !selectedService) ||
                  (step === 2 && !selectedProfessional && !isFirstAvailable) ||
                  (step === 3 && (!selectedDate || !selectedTime))
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5'
                    : 'bg-gold text-black hover:bg-gold-light'
                }`}
              >
                Avançar <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={() => {
                  const formBtn = document.getElementById('submit-booking-form-btn');
                  if (formBtn) formBtn.click();
                }}
                className={`px-6 py-2.5 bg-gold-gradient text-black font-bold uppercase tracking-wider text-xs rounded-lg hover:shadow-lg hover:shadow-gold/20 active:scale-95 transition-all`}
              >
                Concluir Agendamento
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
