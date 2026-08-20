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
        className="w-full max-w-2xl bg-paper border border-border-subtle rounded-2xl overflow-hidden shadow-2xl relative z-10"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border-subtle flex justify-between items-center bg-ivory">
          <div>
            <h3 className="text-xl font-serif text-espresso tracking-wide">Agendar seu Horário</h3>
            <span className="text-[10px] text-taupe uppercase tracking-wider">Cuidare Espaço de Beleza</span>
          </div>
          {step !== 5 && (
            <button onClick={onClose} className="text-text-secondary hover:text-champagne transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Progress Tracker (Steps 1 to 4) */}
        {step < 5 && (
          <div className="bg-warm-sand/50 border-b border-border-subtle px-6 py-3.5 flex justify-between text-[10px] uppercase font-bold text-text-secondary tracking-wider">
            <span className={step > 1 ? 'text-sage' : step === 1 ? 'text-champagne-dark bg-champagne-soft px-2 py-1 rounded' : ''}>1. Serviço</span>
            <span className={step > 2 ? 'text-sage' : step === 2 ? 'text-champagne-dark bg-champagne-soft px-2 py-1 rounded' : ''}>2. Profissional</span>
            <span className={step > 3 ? 'text-sage' : step === 3 ? 'text-champagne-dark bg-champagne-soft px-2 py-1 rounded' : ''}>3. Horário</span>
            <span className={step === 4 ? 'text-champagne-dark bg-champagne-soft px-2 py-1 rounded' : ''}>4. Identificação</span>
          </div>
        )}

        {/* Dynamic Step Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto bg-[#FFFDFB]">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: SELECT SERVICE */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="space-y-6 animate-fade-in"
              >
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full sm:w-72">
                    <input 
                      type="text"
                      placeholder="Pesquisar serviço..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-10 pl-9 pr-4 bg-paper border border-border-subtle rounded-lg text-sm text-espresso placeholder-text-secondary focus:outline-none focus:border-champagne transition-colors"
                    />
                    <Search size={16} className="absolute left-3 top-3 text-taupe" />
                  </div>

                  <div className="flex gap-1 overflow-x-auto w-full sm:w-auto py-1 no-scrollbar">
                    {categoriesList.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategoryFilter(cat.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                          selectedCategoryFilter === cat.id 
                            ? 'bg-champagne text-espresso' 
                            : 'bg-warm-sand text-[#685D55] hover:text-espresso'
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
                      className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex justify-between items-center ${
                        selectedService?.id === service.id
                          ? 'bg-[#F8F1E4] border-champagne ring-1 ring-[rgba(199,161,93,0.15)] scale-[1.01]'
                          : 'border-border-subtle hover:border-champagne/40 bg-paper hover:bg-[#F8F1E4]/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif text-espresso font-bold">{service.name}</h4>
                          <span className="text-[10px] text-taupe font-semibold uppercase">{service.category}</span>
                        </div>
                        <p className="text-text-secondary text-xs mt-1 max-w-md line-clamp-1">{service.description}</p>
                        <span className="text-[10px] text-taupe bg-warm-sand border border-border-subtle px-2 py-0.5 rounded mt-2 inline-block font-semibold">
                          🕒 {service.duration} min
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-espresso font-serif text-sm font-bold">
                          {service.variablePrice ? 'A partir de' : ''} R$ {service.priceBase},00
                        </div>
                        {selectedService?.id === service.id && (
                          <span className="text-[10px] text-champagne-dark font-bold uppercase tracking-wider block mt-1">Selecionado</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredServices.length === 0 && (
                    <div className="text-center py-12 text-[#5C3D30] text-sm">
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
                  <h4 className="text-sm uppercase tracking-wider text-champagne font-semibold mb-1">Quem realizará o atendimento?</h4>
                  <p className="text-xs text-text-secondary">Serviço selecionado: <strong className="text-espresso">{selectedService?.name}</strong></p>
                </div>

                {/* Option: First Available */}
                <div 
                  onClick={() => {
                    setSelectedProfessional(null);
                    setIsFirstAvailable(true);
                  }}
                  className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex justify-between items-center ${
                    isFirstAvailable 
                      ? 'bg-[#F8F1E4] border-champagne ring-1 ring-[rgba(199,161,93,0.15)] scale-[1.01]' 
                      : 'border-border-subtle hover:border-champagne/40 bg-paper hover:bg-[#F8F1E4]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-champagne-soft border border-champagne/40 flex items-center justify-center text-champagne-dark">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h4 className="font-serif text-espresso font-bold">Primeira Profissional Disponível</h4>
                      <p className="text-text-secondary text-xs mt-0.5">Encontre o horário mais próximo disponível</p>
                    </div>
                  </div>
                  {isFirstAvailable && <Check className="text-champagne-dark" size={20} />}
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
                      className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                        selectedProfessional?.id === pro.id && !isFirstAvailable
                          ? 'bg-[#F8F1E4] border-champagne ring-1 ring-[rgba(199,161,93,0.15)] scale-[1.01]'
                          : 'border-border-subtle hover:border-champagne/40 bg-paper hover:bg-[#F8F1E4]/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-champagne-soft border border-champagne/40 flex items-center justify-center text-champagne-dark font-serif font-bold text-lg">
                          {pro.name[0]}
                        </div>
                        <div>
                          <h4 className="font-serif text-espresso font-bold">{pro.name}</h4>
                          <span className="text-[10px] text-taupe uppercase font-semibold">{pro.role.split(',')[0]}</span>
                        </div>
                      </div>
                      <p className="text-text-secondary text-xs line-clamp-2 leading-relaxed mb-4">
                        "{pro.bio}"
                      </p>
                      <div className="flex justify-between items-center pt-2 border-t border-border-subtle">
                        <div className="flex gap-1">
                          {pro.specialties.slice(0, 2).map((s, i) => (
                            <span key={i} className="text-[9px] px-2 py-0.5 bg-warm-sand text-text-secondary rounded font-semibold">
                              {s}
                            </span>
                          ))}
                        </div>
                        {selectedProfessional?.id === pro.id && !isFirstAvailable && (
                          <Check className="text-champagne-dark shrink-0" size={16} />
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
                  <h4 className="text-sm uppercase tracking-wider text-champagne font-semibold mb-1">Escolha a data e o horário</h4>
                  <p className="text-xs text-text-secondary">
                    Profissional: <strong className="text-espresso">{isFirstAvailable ? 'Primeira disponível' : selectedProfessional?.name}</strong>
                  </p>
                </div>

                {/* Day selector carousel */}
                <div className="space-y-2">
                  <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold">Escolha o dia:</span>
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
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border min-w-[72px] transition-all duration-200 ${
                            isSelected 
                              ? 'bg-espresso text-ivory border-espresso shadow-lg scale-[1.03]' 
                              : 'bg-white hover:bg-champagne-soft text-text-secondary hover:text-espresso border-border-subtle'
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
                      <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold">Horários disponíveis:</span>
                      <span className="text-[10px] text-champagne-dark">{formatDateLabel(selectedDate)}</span>
                    </div>

                    {availableTimeSlots.length > 0 ? (
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                        {availableTimeSlots.map((time) => {
                          const isSelected = selectedTime === time;
                          return (
                            <button
                              key={time}
                              onClick={() => setSelectedTime(time)}
                              className={`h-11 rounded-lg border text-sm font-semibold transition-all duration-200 ${
                                isSelected 
                                  ? 'bg-espresso text-white border-espresso shadow-lg scale-[1.03]' 
                                  : 'bg-paper hover:bg-champagne-soft text-text-secondary hover:text-espresso border-border-subtle'
                              }`}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-taupe bg-warm-sand border border-border-subtle rounded-xl text-xs">
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
                  <h4 className="text-sm uppercase tracking-wider text-champagne font-semibold mb-1">Confirme seus dados para finalizar</h4>
                  <p className="text-xs text-text-secondary">Resumo: <strong className="text-espresso">{selectedService?.name}</strong> em <strong className="text-espresso">{formatDateLabel(selectedDate)}</strong> às <strong className="text-espresso">{selectedTime}h</strong></p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name Input */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-text-secondary font-semibold mb-1">Seu Nome Completo *</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        required
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Ex: Maria Oliveira"
                        className="w-full h-11 pl-10 pr-4 bg-ivory border border-border-subtle focus:border-champagne focus:bg-paper rounded-xl text-sm text-espresso focus:outline-none transition-colors"
                      />
                      <User size={16} className="absolute left-3.5 top-3.5 text-taupe" />
                    </div>
                  </div>

                  {/* WhatsApp Input */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-text-secondary font-semibold mb-1">WhatsApp para Lembretes *</label>
                    <div className="relative">
                      <input 
                        type="tel" 
                        required
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="Ex: (38) 99100-7706"
                        className="w-full h-11 pl-10 pr-4 bg-ivory border border-border-subtle focus:border-champagne focus:bg-paper rounded-xl text-sm text-espresso focus:outline-none transition-colors"
                      />
                      <Phone size={16} className="absolute left-3.5 top-3.5 text-taupe" />
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1.5 block">Enviaremos lembretes automáticos de confirmação 24h antes do serviço.</span>
                  </div>

                  {/* Email Input */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-text-secondary font-semibold mb-1">E-mail (Opcional)</label>
                    <div className="relative">
                      <input 
                        type="email" 
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        placeholder="Ex: maria@exemplo.com"
                        className="w-full h-11 pl-10 pr-4 bg-ivory border border-border-subtle focus:border-champagne focus:bg-paper rounded-xl text-sm text-espresso focus:outline-none transition-colors"
                      />
                      <Mail size={16} className="absolute left-3.5 top-3.5 text-taupe" />
                    </div>
                  </div>

                  {/* Notes / Special Instructions */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-text-secondary font-semibold mb-1">Observações Importantes</label>
                    <div className="relative">
                      <textarea 
                        value={clientNotes}
                        onChange={(e) => setClientNotes(e.target.value)}
                        placeholder="Comprimento do cabelo, químicas anteriores, sensibilidades capilares, ou observações..."
                        rows={3}
                        className="w-full p-3.5 pl-10 bg-ivory border border-border-subtle focus:border-champagne focus:bg-paper rounded-xl text-sm text-espresso focus:outline-none transition-colors resize-none"
                      />
                      <MessageSquare size={16} className="absolute left-3.5 top-3.5 text-taupe" />
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
                <div className="w-16 h-16 rounded-full bg-sage-soft text-sage flex items-center justify-center mx-auto shadow-lg shadow-sage/10 animate-bounce border border-sage/20">
                  <Check size={32} strokeWidth={3} />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-serif text-espresso tracking-wide font-bold">Agendamento Realizado!</h3>
                  <p className="text-sm text-champagne-dark font-semibold">Seu horário foi reservado com sucesso no salão.</p>
                </div>

                {/* Receipt ticket summary */}
                <div className="bg-ivory p-5 rounded-xl max-w-sm mx-auto text-left space-y-3.5 border border-dashed border-border-strong relative shadow-sm">
                  {/* Decorative ticket notch left */}
                  <div className="absolute w-4 h-8 bg-paper border-r border-border-subtle rounded-r-full -left-1.5 top-1/2 -translate-y-1/2" />
                  {/* Decorative ticket notch right */}
                  <div className="absolute w-4 h-8 bg-paper border-l border-border-subtle rounded-l-full -right-1.5 top-1/2 -translate-y-1/2" />

                  <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Cuidare Recibo</span>
                    <span className="text-[10px] text-sage font-bold uppercase">Confirmado</span>
                  </div>

                  <div className="text-xs space-y-2 text-text-secondary">
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase font-bold">Cliente:</span>
                      <span className="font-semibold text-espresso">{clientName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase font-bold">Serviço:</span>
                      <span className="font-semibold text-espresso">{selectedService?.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase font-bold">Profissional Habilitada:</span>
                      <span className="font-semibold text-espresso">{determineProfessional().name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-500 block text-[9px] uppercase font-bold">Data:</span>
                        <span className="font-semibold text-espresso">{formatDateLabel(selectedDate).split('-')[0]}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[9px] uppercase font-bold">Horário:</span>
                        <span className="font-semibold text-espresso">{selectedTime}h</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase font-bold">Endereço Cuidare:</span>
                      <span className="text-text-secondary font-light flex items-center gap-1">
                        <MapPin size={10} className="text-champagne-dark" /> Rua Paracatu, 15, Centro, Taiobeiras
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
                    Você também receberá um lembrete automático 24h antes do seu atendimento. Clique no botão abaixo para enviar os detalhes no WhatsApp do salão e confirmar sua presença imediatamente.
                  </p>
                  <div className="flex flex-col gap-2 max-w-xs mx-auto">
                    <a
                      href={getWhatsAppLink()}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full h-12 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold uppercase tracking-wider text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
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
                      className="w-full h-11 border border-border-strong hover:border-champagne hover:bg-champagne/10 text-espresso text-xs font-semibold uppercase tracking-wider rounded-xl transition-all"
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
          <div className="px-6 py-4 border-t border-border-subtle bg-warm-sand flex justify-between items-center">
            <button
              onClick={handlePrevStep}
              disabled={step === 1 && !initialService}
              className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                step === 1 && !initialService
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-text-secondary hover:text-espresso'
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
                    ? 'bg-border-subtle text-gray-400 cursor-not-allowed border border-gray-200'
                    : 'bg-espresso text-ivory hover:bg-[#3B2B24]'
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
                className={`px-6 py-2.5 bg-espresso text-ivory font-bold uppercase tracking-wider text-xs rounded-lg hover:shadow-lg hover:shadow-black/10 hover:bg-[#3B2B24] active:scale-95 transition-all`}
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
