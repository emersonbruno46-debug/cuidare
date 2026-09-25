import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, MessageSquare, Check, Phone, Mail, 
  ArrowLeft, ArrowRight, Search, Sparkles, MapPin, AlertCircle
} from 'lucide-react';
import { services } from '../data/servicesData';
import { professionals as defaultProfessionals } from '../data/professionalsData';
import type { Service, Professional, Booking } from '../types';
import { getAvailableSlots, findAvailableProfessionalForSlot } from '../lib/availability';
import { buildWhatsAppLink } from '../lib/businessSettings';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialService?: Service;
  existingBookings: Booking[];
  onAddBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => { booking: Booking | null; error?: string } | Promise<{ booking: Booking | null; error?: string }>;
  professionals?: Professional[];
}

export default function BookingModal({ 
  isOpen, 
  onClose, 
  initialService, 
  existingBookings, 
  onAddBooking,
  professionals: propProfessionals
}: BookingModalProps) {
  const activeProfessionals = propProfessionals || defaultProfessionals;
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
  
  // Submission & Error handling
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedBooking, setSavedBooking] = useState<Booking | null>(null);

  // Pre-select service if passed
  useEffect(() => {
    if (initialService) {
      setSelectedService(initialService);
      setStep(2);
    } else {
      setSelectedService(null);
      setStep(1);
    }
    setSubmitError(null);
  }, [initialService, isOpen]);

  // Keyboard accessibility: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && step !== 5) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step, onClose]);

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
    ? activeProfessionals.filter(p => {
        if (p.active === false) return false;
        if (selectedService.professionalIds && selectedService.professionalIds.length > 0) {
          return selectedService.professionalIds.includes(p.id);
        }
        return p.categories.includes(selectedService.category);
      })
    : activeProfessionals.filter(p => p.active !== false);

  // Generate calendar days for the next 14 days
  const getNext14Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const nextDay = new Date(today);
      nextDay.setDate(today.getDate() + i);
      const dayOfWeek = nextDay.getDay(); // 0: Sun, 1: Mon, ... 6: Sat
      if (dayOfWeek !== 0 && dayOfWeek !== 1) { // Closed Sun & Mon
        days.push(nextDay);
      }
    }
    return days;
  };

  const calendarDays = getNext14Days();

  // Generate hourly slots for the selected day based on real availability logic
  const availableTimeSlots = getAvailableSlots(
    selectedDate, 
    selectedProfessional?.id || null, 
    selectedService?.duration || 30, 
    existingBookings,
    eligibleProfessionals
  );

  // Auto-allocate first available professional for slot checking full duration overlap
  const determineProfessional = (): Professional => {
    if (selectedProfessional) return selectedProfessional;
    if (!selectedService || !selectedDate || !selectedTime) return eligibleProfessionals[0];

    const freePro = findAvailableProfessionalForSlot(
      selectedDate,
      selectedTime,
      selectedService.duration,
      eligibleProfessionals,
      existingBookings
    );

    return freePro || eligibleProfessionals[0];
  };

  const handleNextStep = () => {
    setSubmitError(null);
    if (step === 1 && selectedService) {
      if (eligibleProfessionals.length === 1) {
        setSelectedProfessional(eligibleProfessionals[0]);
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
    setSubmitError(null);
    if (step === 2) {
      setStep(1);
    } else if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedService || (!selectedProfessional && !isFirstAvailable) || !selectedDate || !selectedTime || !clientName || !clientPhone) {
      setSubmitError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const pro = determineProfessional();

    const newBookingData: Omit<Booking, 'id' | 'createdAt'> = {
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      professionalId: pro.id,
      professionalName: pro.name,
      date: selectedDate,
      time: selectedTime,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      clientEmail: clientEmail.trim() || undefined,
      notes: clientNotes.trim() || undefined,
      status: 'pendente',
      origin: 'site',
      price: selectedService.priceBase,
      duration: selectedService.duration
    };

    setIsSubmitting(true);

    try {
      const result = await onAddBooking(newBookingData);
      setIsSubmitting(false);

      if (result.error || !result.booking) {
        setSubmitError(result.error || 'Não foi possível concluir o agendamento. Tente novamente.');
        setSelectedTime(''); // Clear slot selection so user re-evaluates
        return;
      }

      // Success: store saved booking and display confirmation ticket
      setSavedBooking(result.booking);
      setStep(5);
    } catch {
      setIsSubmitting(false);
      setSubmitError('Ocorreu uma falha de conexão ao gravar o agendamento. Seus dados foram preservados. Tente novamente.');
    }
  };

  const formatDateLabel = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  // WhatsApp link details for step 5 confirmation
  const getWhatsAppDetails = () => {
    const bookingToUse = savedBooking || {
      clientName,
      serviceName: selectedService?.name ?? 'Atendimento',
      professionalName: determineProfessional().name,
      date: selectedDate,
      time: selectedTime,
      clientPhone
    };

    const pro = determineProfessional();
    const formattedDate = bookingToUse.date
      ? new Date(bookingToUse.date + 'T00:00:00').toLocaleDateString('pt-BR')
      : '';

    const message = `Olá, ${bookingToUse.professionalName}! Acabei de realizar uma solicitação de agendamento pelo site da Cuidare.

Nome: ${bookingToUse.clientName}
Serviço: ${bookingToUse.serviceName}
Data: ${formattedDate}
Horário: ${bookingToUse.time}h

Gostaria de enviar este comprovante.`;

    const whatsappUrl = buildWhatsAppLink(pro.whatsapp, message);
    const buttonLabel = `Enviar comprovante no WhatsApp`;

    return { whatsappUrl, buttonLabel, proName: pro.name };
  };

  const formatModalServicePrice = (service: Service) => {
    if (service.priceType === 'range' && service.priceRange) {
      return `R$ ${service.priceRange.min},00 a R$ ${service.priceRange.max},00`;
    }
    if (service.variablePrice) {
      if (service.priceRange) {
        return `R$ ${service.priceRange.min},00 a R$ ${service.priceRange.max},00`;
      }
      if (service.priceDetails) {
        return `A partir de R$ ${service.priceDetails.P},00`;
      }
      return `A partir de R$ ${service.priceBase},00`;
    }
    return `R$ ${service.priceBase},00`;
  };

  const categoriesList = [
    { id: 'todos', name: 'Todos' },
    { id: 'escovas', name: 'Escovas' },
    { id: 'penteados', name: 'Penteados' },
    { id: 'tratamentos', name: 'Tratamentos' },
    { id: 'quimicas', name: 'Químicas' },
    { id: 'unhas', name: 'Unhas' },
    { id: 'sobrancelhas', name: 'Sobrancelhas' },
    { id: 'cilios', name: 'Cílios' },
    { id: 'maquiagem', name: 'Maquiagem' },
    { id: 'estetica', name: 'Estética' }
  ];

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
    >
      {/* Overlay backdrop */}
      <div 
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity" 
        onClick={() => step !== 5 && !isSubmitting ? onClose() : null} 
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
            <h3 id="booking-modal-title" className="text-xl font-serif text-espresso tracking-wide">Agendar seu Horário</h3>
            <span className="text-[10px] text-taupe uppercase tracking-wider">Cuidare Espaço de Beleza</span>
          </div>
          {step !== 5 && (
            <button 
              onClick={onClose} 
              disabled={isSubmitting}
              className="text-text-secondary hover:text-champagne transition-colors p-1"
              aria-label="Fechar modal"
            >
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
                className="space-y-6"
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
                        {service.note && (
                          <p className="text-[11px] text-[#70542D] italic font-serif mt-0.5 flex items-center gap-1">
                            <Sparkles size={11} className="inline text-[#C7A15D]" /> {service.note}
                          </p>
                        )}
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          <span className="text-[10px] text-taupe bg-warm-sand border border-border-subtle px-2 py-0.5 rounded inline-block font-semibold">
                            🕒 {service.duration} min
                          </span>
                          {service.recommendations && service.recommendations.length > 0 && (
                            <span className="text-[10px] text-champagne-dark bg-champagne-soft border border-champagne/20 px-2 py-0.5 rounded inline-block font-semibold">
                              ⓘ Orientações
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-espresso font-serif text-sm font-bold">
                          {formatModalServicePrice(service)}
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
                      <p className="text-text-secondary text-xs mt-0.5">Encontre o horário mais próximo disponível entre a equipe elegível</p>
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
                        <div className="w-10 h-10 rounded-full bg-champagne-soft border border-champagne/40 flex items-center justify-center text-champagne-dark font-serif font-bold text-xs overflow-hidden shrink-0">
                          {pro.photoUrl ? (
                            <img src={pro.photoUrl} alt={pro.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{pro.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-serif text-espresso font-bold">{pro.name}</h4>
                            {(pro.specialtyBadge || pro.specialtyHighlight) && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-[#F8F1E4] text-[#70542D] border border-[#E6D4B8] rounded font-bold uppercase tracking-wider">
                                {pro.specialtyBadge || pro.specialtyHighlight}
                              </span>
                            )}
                          </div>
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
                            setSelectedTime('');
                            setSubmitError(null);
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
                              onClick={() => {
                                setSelectedTime(time);
                                setSubmitError(null);
                              }}
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

                {submitError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-4 text-xs font-semibold flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <div>{submitError}</div>
                  </div>
                )}

                {selectedService?.recommendations && selectedService.recommendations.length > 0 && (
                  <div className="bg-[#F8F1E4] border border-champagne/30 rounded-lg p-4 mb-6">
                    <h5 className="text-xs font-bold text-champagne-dark flex items-center gap-2 mb-2 uppercase tracking-wide">
                      <Sparkles size={14} /> Antes do seu atendimento
                    </h5>
                    <ul className="text-sm text-espresso space-y-1 list-disc list-inside">
                      {selectedService.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

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
                    <label className="block text-xs uppercase tracking-wider text-text-secondary font-semibold mb-1">WhatsApp para Contato *</label>
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
                    <span className="text-[10px] text-gray-500 mt-1.5 block">Enviaremos informações de confirmação e detalhes pelo WhatsApp.</span>
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
                        placeholder="Comprimento do cabelo, químicas anteriores, sensabilidades capilares, ou observações..."
                        rows={3}
                        className="w-full p-3.5 pl-10 bg-ivory border border-border-subtle focus:border-champagne focus:bg-paper rounded-xl text-sm text-espresso focus:outline-none transition-colors resize-none"
                      />
                      <MessageSquare size={16} className="absolute left-3.5 top-3.5 text-taupe" />
                    </div>
                  </div>

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
                <div className="w-16 h-16 rounded-full bg-sage-soft text-sage flex items-center justify-center mx-auto shadow-lg shadow-sage/10 border border-sage/20">
                  <Check size={32} strokeWidth={3} />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-serif text-espresso tracking-wide font-bold">
                    {savedBooking?.status === 'confirmado' ? 'Agendamento Confirmado!' : 'Solicitação Recebida!'}
                  </h3>
                  <p className="text-sm text-champagne-dark font-semibold">
                    {savedBooking?.status === 'confirmado' 
                      ? 'Seu horário foi confirmado com sucesso no sistema.' 
                      : 'Sua solicitação de agendamento foi registrada no sistema.'}
                  </p>
                </div>

                {/* Receipt ticket summary */}
                <div className="bg-ivory p-5 rounded-xl max-w-sm mx-auto text-left space-y-3.5 border border-dashed border-border-strong relative shadow-sm">
                  <div className="absolute w-4 h-8 bg-paper border-r border-border-subtle rounded-r-full -left-1.5 top-1/2 -translate-y-1/2" />
                  <div className="absolute w-4 h-8 bg-paper border-l border-border-subtle rounded-l-full -right-1.5 top-1/2 -translate-y-1/2" />

                  <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Cuidare Comprovante</span>
                    <span className="text-[10px] text-sage font-bold uppercase">
                      {savedBooking?.status === 'confirmado' ? 'Confirmado' : 'Registrado'}
                    </span>
                  </div>

                  <div className="text-xs space-y-2 text-text-secondary">
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase font-bold">Cliente:</span>
                      <span className="font-semibold text-espresso">{savedBooking?.clientName || clientName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase font-bold">Serviço:</span>
                      <span className="font-semibold text-espresso">{savedBooking?.serviceName || selectedService?.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase font-bold">Profissional Habilitada:</span>
                      <span className="font-semibold text-espresso">{savedBooking?.professionalName || determineProfessional().name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-500 block text-[9px] uppercase font-bold">Data:</span>
                        <span className="font-semibold text-espresso">{formatDateLabel(savedBooking?.date || selectedDate)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[9px] uppercase font-bold">Horário:</span>
                        <span className="font-semibold text-espresso">{savedBooking?.time || selectedTime}h</span>
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
                    Você pode enviar os detalhes deste agendamento para o WhatsApp da profissional ou da recepcionista para facilitar a comunicação.
                  </p>
                  <div className="flex flex-col gap-2 max-w-xs mx-auto">
                    <a
                      href={getWhatsAppDetails().whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full h-12 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold uppercase tracking-wider text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                    >
                      <Phone size={16} /> {getWhatsAppDetails().buttonLabel}
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
                        setSubmitError(null);
                        setSavedBooking(null);
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
              disabled={(step === 1 && !initialService) || isSubmitting}
              className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                (step === 1 && !initialService) || isSubmitting
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
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-espresso text-ivory font-bold uppercase tracking-wider text-xs rounded-lg hover:shadow-lg hover:shadow-black/10 hover:bg-[#3B2B24] active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isSubmitting ? 'Salvando...' : 'Concluir Agendamento'}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
