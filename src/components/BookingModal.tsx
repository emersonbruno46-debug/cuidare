import { useState, useEffect, useRef, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, MessageSquare, Check, Phone, Mail, 
  ArrowLeft, ArrowRight, Search, Sparkles, MapPin, 
  AlertCircle, ShieldCheck, Clock, UserCheck
} from 'lucide-react';
import { services } from '../data/servicesData';
import { professionals as defaultProfessionals } from '../data/professionalsData';
import { CATEGORIES } from '../data/categoriesData';
import type { Service, Professional, Booking } from '../types';
import { getAvailableSlots, findAvailableProfessionalForSlot } from '../lib/availability';
import { buildWhatsAppLink } from '../lib/businessSettings';
import { getNextBusinessDays, formatDateLabel } from '../lib/dateUtils';
import { serviceMatchesQuery } from '../lib/searchUtils';
import PrivacyPolicyModal from './PrivacyPolicyModal';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialService?: Service;
  initialProfessional?: Professional;
  existingBookings: Booking[];
  onAddBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => { booking: Booking | null; error?: string } | Promise<{ booking: Booking | null; error?: string }>;
  professionals?: Professional[];
}

export default function BookingModal({ 
  isOpen, 
  onClose, 
  initialService, 
  initialProfessional,
  existingBookings, 
  onAddBooking,
  professionals: propProfessionals
}: BookingModalProps) {
  const activeProfessionals = propProfessionals || defaultProfessionals;
  const searchInputId = useId();
  const nameInputId = useId();
  const phoneInputId = useId();
  const emailInputId = useId();
  const notesInputId = useId();

  // State
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
  
  // Modals & Submission
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string }>({});
  const [savedBooking, setSavedBooking] = useState<Booking | null>(null);

  // Focus trap refs
  const modalBoxRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Initialize or reset selections on open/props change
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;

      if (initialProfessional) {
        setSelectedProfessional(initialProfessional);
        setIsFirstAvailable(false);
      } else {
        setSelectedProfessional(null);
        setIsFirstAvailable(false);
      }

      if (initialService) {
        setSelectedService(initialService);
        if (initialProfessional) {
          setStep(3); // Both defined: jump straight to date/time
        } else {
          setStep(2); // Service defined: jump to professional
        }
      } else {
        setSelectedService(null);
        setStep(1);
      }

      setSelectedDate('');
      setSelectedTime('');
      setSubmitError(null);
      setFieldErrors({});

      // Focus close button or first interactive element
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
    } else {
      // Restore focus on close
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus();
      }
    }
  }, [isOpen, initialService, initialProfessional]);

  // Focus trap inside modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 5 && !isSubmitting && !privacyOpen) {
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        if (!modalBoxRef.current) return;
        const focusableElements = modalBoxRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step, isSubmitting, privacyOpen, onClose]);

  if (!isOpen) return null;

  // Filter professionals that perform the selected service
  const eligibleProfessionals = selectedService 
    ? activeProfessionals.filter(p => {
        if (p.active === false) return false;
        if (selectedService.professionalIds && selectedService.professionalIds.length > 0) {
          return selectedService.professionalIds.includes(p.id);
        }
        return p.categories.includes(selectedService.category);
      })
    : activeProfessionals.filter(p => p.active !== false && p.categories.length > 0);

  // Filter services by search, category and selected professional compatibility
  const filteredServices = services.filter(s => {
    // If a professional was chosen first, show only services compatible with her
    if (selectedProfessional) {
      const isEligible = s.professionalIds && s.professionalIds.length > 0
        ? s.professionalIds.includes(selectedProfessional.id)
        : selectedProfessional.categories.includes(s.category);
      if (!isEligible) return false;
    }

    const matchesSearch = serviceMatchesQuery(s, searchQuery);
    const matchesCategory = selectedCategoryFilter === 'todos' || s.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Calendar days generated deterministically in America/Sao_Paulo timezone
  const calendarDays = getNextBusinessDays(14);

  // Real available slots for the selected date, respecting business hours, breaks, blocks and overlap
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
    if (!selectedService || !selectedDate || !selectedTime) return eligibleProfessionals[0] || activeProfessionals[0];

    const freePro = findAvailableProfessionalForSlot(
      selectedDate,
      selectedTime,
      selectedService.duration,
      eligibleProfessionals,
      existingBookings
    );

    return freePro || eligibleProfessionals[0] || activeProfessionals[0];
  };

  const handleNextStep = () => {
    setSubmitError(null);
    if (step === 1 && selectedService) {
      if (selectedProfessional) {
        // Professional was already selected beforehand: go directly to date/time
        setStep(3);
      } else if (eligibleProfessionals.length === 1) {
        setSelectedProfessional(eligibleProfessionals[0]);
        setIsFirstAvailable(false);
        setStep(3);
      } else {
        setStep(2);
      }
    } else if (step === 2 && (selectedProfessional || isFirstAvailable)) {
      setStep(3);
    } else if (step === 3 && selectedDate && selectedTime) {
      setStep(4);
    }
  };

  const handlePrevStep = () => {
    setSubmitError(null);
    if (step === 3 && initialProfessional && !selectedService) {
      setStep(1);
    } else if (step === 3 && selectedProfessional && eligibleProfessionals.length <= 1) {
      setStep(1);
    } else if (step > 1) {
      setStep(step - 1);
    }
  };

  const validateClientForm = (): boolean => {
    const errors: { name?: string; phone?: string } = {};
    if (!clientName.trim() || clientName.trim().length < 3) {
      errors.name = 'Informe seu nome completo (pelo menos 3 caracteres).';
    }
    const cleanPhone = clientPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 11) {
      errors.phone = 'Informe um WhatsApp válido com DDD (10 ou 11 dígitos).';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedService || (!selectedProfessional && !isFirstAvailable) || !selectedDate || !selectedTime) {
      setSubmitError('Por favor, verifique serviço, data e horário antes de prosseguir.');
      return;
    }

    if (!validateClientForm()) {
      return;
    }

    const pro = determineProfessional();

    const newBookingData: Omit<Booking, 'id' | 'createdAt'> = {
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      professionalId: pro.id,
      professionalName: pro.name,
      date: selectedDate, // YYYY-MM-DD estrito
      time: selectedTime, // HH:MM estrito
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
        setSubmitError(result.error || 'Não foi possível concluir o agendamento. O horário pode ter sido reservado por outro cliente. Por favor, tente novamente.');
        setSelectedTime(''); // Clear slot so user re-evaluates
        return;
      }

      setSavedBooking(result.booking);
      setStep(5);
    } catch {
      setIsSubmitting(false);
      setSubmitError('Ocorreu uma falha de conexão ao gravar sua solicitação. Seus dados foram preservados. Tente novamente.');
    }
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
      ? formatDateLabel(bookingToUse.date, 'numeric')
      : '';

    const message = `Olá, ${bookingToUse.professionalName}! Acabei de realizar uma solicitação de agendamento pelo site da Cuidare.

*Nome:* ${bookingToUse.clientName}
*Serviço:* ${bookingToUse.serviceName}
*Data:* ${formattedDate} (${formatDateLabel(bookingToUse.date, 'short')})
*Horário:* ${bookingToUse.time}h

Gostaria de enviar este comprovante para confirmação.`;

    const recipientPhone = pro.whatsapp || '5538991007706'; // fallback recepção Lara
    const whatsappUrl = buildWhatsAppLink(recipientPhone, message);
    const buttonLabel = `Enviar comprovante no WhatsApp`;

    return { whatsappUrl, buttonLabel, proName: pro.name };
  };

  const formatModalServicePrice = (service: Service) => {
    if (service.category === 'cursos' && service.priceBase === 0) {
      return 'Sob consulta';
    }
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

  const stepTitles = [
    'Escolha o Serviço',
    'Escolha a Profissional',
    'Escolha a Data e Horário',
    'Seus Dados e Confirmação',
    'Agendamento Registrado'
  ];

  return (
    <>
      <div 
        className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 md:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
      >
        {/* Overlay backdrop */}
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
          onClick={() => step !== 5 && !isSubmitting ? onClose() : null} 
        />

        {/* Modal box */}
        <motion.div
          ref={modalBoxRef}
          initial={{ scale: 0.96, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 16 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl bg-[#FFFDFB] border border-[#E6DFD5] rounded-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90dvh]"
        >
          {/* Header */}
          <header className="px-5 sm:px-6 py-4 border-b border-[#E6DFD5] flex justify-between items-center bg-[#FAF8F5] shrink-0">
            <div>
              <h2 id="booking-modal-title" className="text-lg sm:text-xl font-serif text-[#29231F] font-bold tracking-wide">
                Agendar no Espaço Cuidare
              </h2>
              <span className="text-[11px] text-[#7C736D] uppercase tracking-wider block">
                {stepTitles[step - 1]}
              </span>
            </div>
            {step !== 5 && (
              <button 
                ref={closeButtonRef}
                onClick={onClose} 
                disabled={isSubmitting}
                className="w-11 h-11 flex items-center justify-center text-[#7C736D] hover:text-[#29231F] hover:bg-black/5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C7A15D]"
                aria-label="Fechar janela de agendamento"
              >
                <X size={20} />
              </button>
            )}
          </header>

          {/* Progress Tracker (Steps 1 to 4) - Responsive */}
          {step < 5 && (
            <div className="bg-[#F8F1E4] border-b border-[#E6DFD5] px-4 sm:px-6 py-2.5 shrink-0" role="navigation" aria-label="Etapas do agendamento">
              {/* Mobile text stepper */}
              <div className="sm:hidden flex items-center justify-between text-xs text-[#29231F] font-medium">
                <span className="font-semibold text-[#70542D]">
                  Etapa {step} de 4: <span className="font-bold">{['Serviço', 'Profissional', 'Data e Horário', 'Identificação'][step - 1]}</span>
                </span>
                <span className="text-[10px] text-[#7C736D]">Passo {step}/4</span>
              </div>

              {/* Desktop full stepper */}
              <div className="hidden sm:flex justify-between items-center text-[11px] uppercase font-bold tracking-wider">
                {[
                  { num: 1, label: 'Serviço' },
                  { num: 2, label: 'Profissional' },
                  { num: 3, label: 'Data & Hora' },
                  { num: 4, label: 'Identificação' }
                ].map(({ num, label }) => {
                  const isCurrent = step === num;
                  const isPassed = step > num;
                  return (
                    <div 
                      key={num}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                        isCurrent 
                          ? 'text-[#70542D] bg-[#EEDCBF] shadow-sm' 
                          : isPassed 
                            ? 'text-[#5B7C65]' 
                            : 'text-[#8C837C]'
                      }`}
                      aria-current={isCurrent ? 'step' : undefined}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isCurrent ? 'bg-[#70542D] text-white' : isPassed ? 'bg-[#5B7C65] text-white' : 'bg-black/10 text-[#8C837C]'
                      }`}>
                        {isPassed ? <Check size={12} strokeWidth={3} /> : num}
                      </span>
                      <span>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Context Banner: When user started with a pre-selected professional */}
          {selectedProfessional && step < 5 && (
            <div className="bg-[#FAF3E8] border-b border-[#E6DFD5] px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-[#70542D]">
              <div className="flex items-center gap-2">
                <UserCheck size={15} className="text-[#C7A15D] shrink-0" />
                <span>
                  Agendando com <strong className="text-[#29231F]">{selectedProfessional.name}</strong> ({selectedProfessional.role})
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedProfessional(null);
                  setIsFirstAvailable(false);
                  setSelectedTime('');
                  if (step > 2) setStep(2);
                }}
                className="text-[11px] underline font-semibold hover:text-[#29231F] transition-colors ml-2"
              >
                Trocar profissional
              </button>
            </div>
          )}

          {/* Dynamic Step Content with smooth scrolling */}
          <div className="p-4 sm:p-6 overflow-y-auto grow bg-[#FFFDFB]">
            <AnimatePresence mode="wait">
              
              {/* STEP 1: SELECT SERVICE */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Search and Category Filter Section */}
                  <div className="space-y-3">
                    <div>
                      <label htmlFor={searchInputId} className="sr-only">Pesquisar serviço por nome ou categoria</label>
                      <div className="relative w-full">
                        <input 
                          id={searchInputId}
                          type="search"
                          placeholder="Pesquisar serviço (ex: escova, cilios, unha, massagem)..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full h-11 pl-10 pr-4 bg-[#FAF8F5] border border-[#E6DFD5] rounded-xl text-base sm:text-sm text-[#29231F] placeholder-[#8C837C] focus:outline-none focus:border-[#C7A15D] focus:ring-1 focus:ring-[#C7A15D] transition-colors"
                        />
                        <Search size={18} className="absolute left-3.5 top-3 text-[#8C837C] pointer-events-none" />
                      </div>
                    </div>

                    {/* Category Carousel with visible indicator */}
                    <div className="relative">
                      <div 
                        className="flex gap-1.5 overflow-x-auto py-1 scrollbar-thin scroll-smooth"
                        role="tablist"
                        aria-label="Filtro de categorias de serviços"
                      >
                        <button
                          type="button"
                          role="tab"
                          aria-selected={selectedCategoryFilter === 'todos'}
                          onClick={() => setSelectedCategoryFilter('todos')}
                          className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors min-h-[38px] ${
                            selectedCategoryFilter === 'todos' 
                              ? 'bg-[#29231F] text-white shadow-sm' 
                              : 'bg-[#F2ECE4] text-[#5C534D] hover:bg-[#E6DFD5]'
                          }`}
                        >
                          Todos os Serviços
                        </button>
                        {CATEGORIES.map(cat => {
                          const isSelected = selectedCategoryFilter === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              role="tab"
                              aria-selected={isSelected}
                              onClick={() => setSelectedCategoryFilter(cat.id)}
                              className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors min-h-[38px] flex items-center gap-1.5 ${
                                isSelected 
                                  ? 'bg-[#29231F] text-white shadow-sm' 
                                  : 'bg-[#F2ECE4] text-[#5C534D] hover:bg-[#E6DFD5]'
                              }`}
                            >
                              <cat.icon size={13} className={isSelected ? 'text-[#C7A15D]' : 'opacity-70'} />
                              {cat.shortName}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Results count indicator */}
                    <div className="flex justify-between items-center text-xs text-[#7C736D] pt-1">
                      <span aria-live="polite">
                        {filteredServices.length} {filteredServices.length === 1 ? 'serviço encontrado' : 'serviços encontrados'}
                      </span>
                      {(searchQuery || selectedCategoryFilter !== 'todos') && (
                        <button 
                          onClick={() => { setSearchQuery(''); setSelectedCategoryFilter('todos'); }}
                          className="text-[#70542D] hover:underline font-semibold"
                        >
                          Limpar busca e filtros
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Services List as Radio Group */}
                  <div 
                    role="radiogroup" 
                    aria-label="Lista de serviços disponíveis" 
                    className="space-y-2.5 pt-1"
                  >
                    {filteredServices.map(service => {
                      const isSelected = selectedService?.id === service.id;

                      return (
                        <div 
                          key={service.id}
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={0}
                          onClick={() => setSelectedService(service)}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              setSelectedService(service);
                            }
                          }}
                          className={`p-3.5 sm:p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row justify-between sm:items-center gap-3 ${
                            isSelected
                              ? 'bg-[#FAF3E8] border-[#C7A15D] ring-2 ring-[#C7A15D]/40 shadow-sm'
                              : 'border-[#E6DFD5] hover:border-[#C7A15D]/50 bg-[#FAF8F5] hover:bg-[#FAF3E8]/40'
                          }`}
                        >
                          <div className="grow space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-serif text-[#29231F] font-bold text-base">{service.name}</h3>
                              {service.flowBadge && (
                                <span className="text-[10px] bg-[#EADCC8] text-[#70542D] px-2 py-0.5 rounded font-semibold">
                                  {service.flowBadge}
                                </span>
                              )}
                            </div>
                            <p className="text-[#5C534D] text-xs line-clamp-2">{service.description}</p>
                            
                            <div className="flex gap-2 pt-1 flex-wrap items-center">
                              <span className="text-[10px] text-[#7C736D] bg-[#EDE7DF] border border-[#DDD6CC] px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                                <Clock size={11} /> {service.duration} min
                              </span>
                              {service.note && (
                                <span className="text-[11px] text-[#70542D] italic flex items-center gap-1">
                                  <Sparkles size={11} className="text-[#C7A15D]" /> {service.note}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex sm:flex-col justify-between sm:justify-center items-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E6DFD5]/60">
                            <span className="text-base font-serif font-bold text-[#29231F]">
                              {formatModalServicePrice(service)}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] text-[#70542D] font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                                <Check size={13} strokeWidth={3} /> Selecionado
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {filteredServices.length === 0 && (
                      <div className="text-center py-10 px-4 bg-[#FAF8F5] rounded-xl border border-dashed border-[#E6DFD5] space-y-3">
                        <AlertCircle size={28} className="mx-auto text-[#C7A15D]" />
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-[#29231F]">Nenhum serviço encontrado para sua busca.</p>
                          <p className="text-xs text-[#7C736D]">Tente buscar por termos genéricos como "corte", "escova", "unha" ou limpe os filtros.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setSearchQuery(''); setSelectedCategoryFilter('todos'); }}
                          className="px-4 py-2 bg-[#29231F] text-white text-xs font-semibold rounded-lg hover:bg-[#3D342E]"
                        >
                          Ver todos os serviços
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* STEP 2: SELECT PROFESSIONAL */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="text-center mb-2">
                    <h3 className="text-sm uppercase tracking-wider text-[#70542D] font-bold mb-0.5">
                      Quem realizará seu atendimento?
                    </h3>
                    <p className="text-xs text-[#5C534D]">
                      Serviço selecionado: <strong className="text-[#29231F]">{selectedService?.name}</strong> ({selectedService?.duration} min)
                    </p>
                  </div>

                  <div role="radiogroup" aria-label="Escolha a profissional para o atendimento" className="space-y-3">
                    {/* Option: First Available */}
                    <div 
                      role="radio"
                      aria-checked={isFirstAvailable}
                      tabIndex={0}
                      onClick={() => {
                        setSelectedProfessional(null);
                        setIsFirstAvailable(true);
                        setSelectedTime(''); // Reset time slot when changing professional
                      }}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          setSelectedProfessional(null);
                          setIsFirstAvailable(true);
                          setSelectedTime('');
                        }
                      }}
                      className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex justify-between items-center ${
                        isFirstAvailable 
                          ? 'bg-[#FAF3E8] border-[#C7A15D] ring-2 ring-[#C7A15D]/40 shadow-sm' 
                          : 'border-[#E6DFD5] hover:border-[#C7A15D]/50 bg-[#FAF8F5]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-full bg-[#EADCC8] border border-[#D5C2A7] flex items-center justify-center text-[#70542D] shrink-0">
                          <Sparkles size={20} />
                        </div>
                        <div>
                          <h4 className="font-serif font-bold text-[#29231F] text-base">Primeira profissional disponível</h4>
                          <p className="text-xs text-[#5C534D]">Maior flexibilidade de horários para o seu dia.</p>
                        </div>
                      </div>
                      {isFirstAvailable && <Check className="text-[#70542D] shrink-0" size={20} strokeWidth={3} />}
                    </div>

                    {/* Eligible Professionals List */}
                    {eligibleProfessionals.map((pro) => {
                      const isSelected = selectedProfessional?.id === pro.id && !isFirstAvailable;
                      return (
                        <div 
                          key={pro.id}
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={0}
                          onClick={() => {
                            setSelectedProfessional(pro);
                            setIsFirstAvailable(false);
                            setSelectedTime(''); // Reset time slot when changing professional
                          }}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              setSelectedProfessional(pro);
                              setIsFirstAvailable(false);
                              setSelectedTime('');
                            }
                          }}
                          className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex justify-between items-center ${
                            isSelected
                              ? 'bg-[#FAF3E8] border-[#C7A15D] ring-2 ring-[#C7A15D]/40 shadow-sm' 
                              : 'border-[#E6DFD5] hover:border-[#C7A15D]/50 bg-[#FAF8F5]'
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            {/* Avatar or fallback */}
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-[#EADCC8] border border-[#D5C2A7] shrink-0 flex items-center justify-center">
                              {pro.avatarUrl || pro.photoUrl ? (
                                <img 
                                  src={pro.avatarUrl || pro.photoUrl} 
                                  alt={pro.name}
                                  width={48}
                                  height={48}
                                  className="w-full h-full object-cover object-top"
                                  loading="lazy"
                                />
                              ) : (
                                <span className="font-serif font-bold text-[#70542D] text-lg">
                                  {pro.name.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div className="space-y-0.5">
                              <h4 className="font-serif font-bold text-[#29231F] text-base">{pro.name}</h4>
                              <p className="text-xs text-[#5C534D]">{pro.role}</p>
                              <div className="flex gap-1.5 pt-0.5 flex-wrap">
                                {pro.specialties.slice(0, 2).map((s, i) => (
                                  <span key={i} className="text-[9px] px-2 py-0.5 bg-[#EDE7DF] text-[#5C534D] rounded font-semibold">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          {isSelected && <Check className="text-[#70542D] shrink-0" size={20} strokeWidth={3} />}
                        </div>
                      );
                    })}

                    {eligibleProfessionals.length === 0 && (
                      <div className="text-center py-8 text-xs text-[#5C534D] bg-[#FAF8F5] border border-dashed border-[#E6DFD5] rounded-xl p-4">
                        Este serviço requer agendamento ou orientação prévia com a recepção do Cuidare.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* STEP 3: DATE & TIME SELECTOR */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <div className="text-center mb-1">
                    <h3 className="text-sm uppercase tracking-wider text-[#70542D] font-bold mb-0.5">
                      Escolha o dia e o horário
                    </h3>
                    <p className="text-xs text-[#5C534D]">
                      Profissional: <strong className="text-[#29231F]">{isFirstAvailable ? 'Primeira disponível' : selectedProfessional?.name}</strong> • Duração: <strong className="text-[#29231F]">{selectedService?.duration} min</strong>
                    </p>
                  </div>

                  {/* Day selector carousel */}
                  <div className="space-y-2">
                    <span className="text-xs text-[#5C534D] uppercase tracking-wider font-bold block">
                      Selecione uma data disponível:
                    </span>
                    <div 
                      className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin"
                      role="radiogroup"
                      aria-label="Datas disponíveis para agendamento"
                    >
                      {calendarDays.map((calDay) => {
                        const isSelected = selectedDate === calDay.dateString;
                        return (
                          <button
                            key={calDay.dateString}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={`${calDay.dayNameFull}, ${calDay.dayNumber} de ${calDay.monthNameFull}`}
                            onClick={() => {
                              setSelectedDate(calDay.dateString);
                              setSelectedTime(''); // Reset time slot when changing day
                              setSubmitError(null);
                            }}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border min-w-[76px] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C7A15D] ${
                              isSelected 
                                ? 'bg-[#29231F] text-white border-[#29231F] shadow-md scale-[1.02]' 
                                : 'bg-[#FAF8F5] hover:bg-[#FAF3E8] text-[#5C534D] hover:text-[#29231F] border-[#E6DFD5]'
                            }`}
                          >
                            <span className="text-[10px] uppercase font-bold tracking-wider">{calDay.dayName}</span>
                            <span className="text-2xl font-serif font-bold my-0.5 leading-none">{calDay.dayNumber}</span>
                            <span className="text-[9px] uppercase tracking-wider opacity-80">{calDay.monthName}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Hour slots selector */}
                  {selectedDate && (
                    <div className="space-y-3 pt-2 border-t border-[#E6DFD5]">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#5C534D] uppercase tracking-wider font-bold">
                          Horários livres:
                        </span>
                        <span className="text-xs font-semibold text-[#70542D]">
                          {formatDateLabel(selectedDate, 'full')}
                        </span>
                      </div>

                      {availableTimeSlots.length > 0 ? (
                        <div 
                          role="radiogroup" 
                          aria-label="Horários disponíveis para o dia selecionado"
                          className="grid grid-cols-4 sm:grid-cols-5 gap-2.5"
                        >
                          {availableTimeSlots.map((time) => {
                            const isSelected = selectedTime === time;
                            return (
                              <button
                                key={time}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                aria-label={`${time} horas`}
                                onClick={() => {
                                  setSelectedTime(time);
                                  setSubmitError(null);
                                }}
                                className={`h-11 rounded-lg border text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C7A15D] ${
                                  isSelected 
                                    ? 'bg-[#29231F] text-white border-[#29231F] shadow-md scale-[1.02]' 
                                    : 'bg-[#FAF8F5] hover:bg-[#FAF3E8] text-[#29231F] border-[#E6DFD5]'
                                }`}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-[#70542D] bg-[#FAF3E8] border border-[#E6DFD5] rounded-xl text-xs space-y-1">
                          <p className="font-semibold">Não há horários disponíveis para agendamento nesta data.</p>
                          <p className="text-[#5C534D]">Por favor, escolha outro dia no calendário acima.</p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 4: CUSTOMER IDENTIFICATION FORM & SUMMARY */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <div className="text-center mb-2">
                    <h3 className="text-sm uppercase tracking-wider text-[#70542D] font-bold mb-0.5">
                      Conferência do Agendamento
                    </h3>
                    <p className="text-xs text-[#5C534D]">
                      Confira os dados do seu procedimento e informe seu contato.
                    </p>
                  </div>

                  {submitError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs font-semibold flex items-start gap-2">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <div>{submitError}</div>
                    </div>
                  )}

                  {/* Complete Summary Card */}
                  <div className="bg-[#FAF3E8] border border-[#E6DFD5] rounded-xl p-4 sm:p-5 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#70542D] flex items-center justify-between border-b border-[#E6DFD5] pb-2">
                      <span>Resumo da Solicitação</span>
                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="text-[11px] underline font-semibold text-[#70542D] hover:text-[#29231F]"
                      >
                        Alterar horário
                      </button>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#29231F]">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#7C736D] block">Serviço:</span>
                        <span className="font-bold text-sm">{selectedService?.name}</span>
                        <span className="text-[11px] text-[#7C736D] block">{formatModalServicePrice(selectedService!)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#7C736D] block">Profissional:</span>
                        <span className="font-bold text-sm">
                          {isFirstAvailable 
                            ? `${determineProfessional().name} (Primeira disponível)` 
                            : selectedProfessional?.name}
                        </span>
                        <span className="text-[11px] text-[#7C736D] block">{determineProfessional().role}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#7C736D] block">Data e Horário:</span>
                        <span className="font-bold text-sm">{formatDateLabel(selectedDate, 'full')}</span>
                        <span className="text-[11px] text-[#7C736D] block">
                          Às {selectedTime}h (duração prevista: {selectedService?.duration} min)
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#7C736D] block">Local do Atendimento:</span>
                        <span className="font-semibold text-xs flex items-center gap-1">
                          <MapPin size={12} className="text-[#C7A15D]" /> Rua Paracatu, 15, Centro, Taiobeiras
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Identification Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name Input */}
                    <div>
                      <label htmlFor={nameInputId} className="block text-xs uppercase tracking-wider text-[#5C534D] font-bold mb-1">
                        Seu Nome Completo *
                      </label>
                      <div className="relative">
                        <input 
                          id={nameInputId}
                          type="text" 
                          required
                          autoComplete="name"
                          value={clientName}
                          onChange={(e) => {
                            setClientName(e.target.value);
                            if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: undefined }));
                          }}
                          placeholder="Ex: Maria Oliveira"
                          aria-invalid={!!fieldErrors.name}
                          aria-describedby={fieldErrors.name ? `${nameInputId}-err` : undefined}
                          className="w-full h-11 pl-10 pr-4 bg-[#FAF8F5] border border-[#E6DFD5] focus:border-[#C7A15D] focus:ring-1 focus:ring-[#C7A15D] rounded-xl text-base sm:text-sm text-[#29231F] focus:outline-none transition-colors"
                        />
                        <User size={16} className="absolute left-3.5 top-3.5 text-[#8C837C] pointer-events-none" />
                      </div>
                      {fieldErrors.name && (
                        <span id={`${nameInputId}-err`} className="text-xs text-red-600 mt-1 block font-medium">
                          {fieldErrors.name}
                        </span>
                      )}
                    </div>

                    {/* WhatsApp Input */}
                    <div>
                      <label htmlFor={phoneInputId} className="block text-xs uppercase tracking-wider text-[#5C534D] font-bold mb-1">
                        WhatsApp para Confirmação *
                      </label>
                      <div className="relative">
                        <input 
                          id={phoneInputId}
                          type="tel" 
                          required
                          autoComplete="tel"
                          value={clientPhone}
                          onChange={(e) => {
                            setClientPhone(e.target.value);
                            if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: undefined }));
                          }}
                          placeholder="Ex: (38) 99123-4567"
                          aria-invalid={!!fieldErrors.phone}
                          aria-describedby={fieldErrors.phone ? `${phoneInputId}-err` : undefined}
                          className="w-full h-11 pl-10 pr-4 bg-[#FAF8F5] border border-[#E6DFD5] focus:border-[#C7A15D] focus:ring-1 focus:ring-[#C7A15D] rounded-xl text-base sm:text-sm text-[#29231F] focus:outline-none transition-colors"
                        />
                        <Phone size={16} className="absolute left-3.5 top-3.5 text-[#8C837C] pointer-events-none" />
                      </div>
                      {fieldErrors.phone ? (
                        <span id={`${phoneInputId}-err`} className="text-xs text-red-600 mt-1 block font-medium">
                          {fieldErrors.phone}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#7C736D] mt-1 block">
                          Enviaremos o comprovante e confirmação direta no WhatsApp.
                        </span>
                      )}
                    </div>

                    {/* Email Input */}
                    <div>
                      <label htmlFor={emailInputId} className="block text-xs uppercase tracking-wider text-[#5C534D] font-bold mb-1">
                        E-mail (Opcional)
                      </label>
                      <div className="relative">
                        <input 
                          id={emailInputId}
                          type="email" 
                          autoComplete="email"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          placeholder="Ex: seuemail@exemplo.com"
                          className="w-full h-11 pl-10 pr-4 bg-[#FAF8F5] border border-[#E6DFD5] focus:border-[#C7A15D] focus:ring-1 focus:ring-[#C7A15D] rounded-xl text-base sm:text-sm text-[#29231F] focus:outline-none transition-colors"
                        />
                        <Mail size={16} className="absolute left-3.5 top-3.5 text-[#8C837C] pointer-events-none" />
                      </div>
                    </div>

                    {/* Notes Input */}
                    <div>
                      <label htmlFor={notesInputId} className="block text-xs uppercase tracking-wider text-[#5C534D] font-bold mb-1">
                        Observações do Atendimento (Opcional)
                      </label>
                      <div className="relative">
                        <textarea 
                          id={notesInputId}
                          value={clientNotes}
                          onChange={(e) => setClientNotes(e.target.value)}
                          placeholder="Ex: comprimento dos fios, químicas recentes ou preferências para o atendimento..."
                          rows={2}
                          className="w-full p-3 pl-10 bg-[#FAF8F5] border border-[#E6DFD5] focus:border-[#C7A15D] focus:ring-1 focus:ring-[#C7A15D] rounded-xl text-base sm:text-sm text-[#29231F] focus:outline-none transition-colors resize-none"
                        />
                        <MessageSquare size={16} className="absolute left-3.5 top-3.5 text-[#8C837C] pointer-events-none" />
                      </div>
                    </div>

                    {/* Privacy Disclaimer */}
                    <div className="pt-1 flex items-start gap-2 text-xs text-[#7C736D]">
                      <ShieldCheck size={16} className="text-[#5B7C65] shrink-0 mt-0.5" />
                      <p>
                        Seus dados são protegidos e usados unicamente para o agendamento no Espaço Cuidare.{' '}
                        <button
                          type="button"
                          onClick={() => setPrivacyOpen(true)}
                          className="text-[#70542D] underline font-semibold hover:text-[#29231F]"
                        >
                          Ver política de privacidade e cancelamento
                        </button>.
                      </p>
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
                  transition={{ duration: 0.25 }}
                  className="text-center py-4 space-y-5"
                >
                  <div className="w-16 h-16 rounded-full bg-[#E5EFE7] text-[#3F6649] flex items-center justify-center mx-auto shadow-sm border border-[#C5DAC8]">
                    <Check size={32} strokeWidth={3} />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-2xl font-serif text-[#29231F] tracking-wide font-bold">
                      {savedBooking?.status === 'confirmado' ? 'Agendamento Confirmado!' : 'Solicitação Recebida!'}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#70542D] font-semibold max-w-md mx-auto">
                      {savedBooking?.status === 'confirmado' 
                        ? 'Seu horário foi confirmado com sucesso na agenda Cuidare.' 
                        : 'Sua solicitação de agendamento foi registrada com sucesso no sistema Cuidare.'}
                    </p>
                  </div>

                  {/* Receipt Ticket Summary */}
                  <div className="bg-[#FAF8F5] p-5 rounded-2xl max-w-md mx-auto text-left space-y-3 border border-[#E6DFD5] shadow-sm relative">
                    <div className="flex justify-between items-center pb-2.5 border-b border-[#E6DFD5]">
                      <span className="text-[10px] text-[#7C736D] uppercase tracking-widest font-bold">Comprovante Cuidare</span>
                      <span className="text-[10px] bg-[#E5EFE7] text-[#3F6649] px-2 py-0.5 rounded font-bold uppercase">
                        {savedBooking?.status === 'confirmado' ? 'Confirmado' : 'Registrado'}
                      </span>
                    </div>

                    <div className="text-xs space-y-2 text-[#29231F]">
                      <div>
                        <span className="text-[#7C736D] block text-[10px] uppercase font-bold">Cliente:</span>
                        <span className="font-semibold text-sm">{savedBooking?.clientName || clientName}</span>
                      </div>
                      <div>
                        <span className="text-[#7C736D] block text-[10px] uppercase font-bold">Serviço:</span>
                        <span className="font-semibold text-sm">{savedBooking?.serviceName || selectedService?.name}</span>
                      </div>
                      <div>
                        <span className="text-[#7C736D] block text-[10px] uppercase font-bold">Profissional Responsável:</span>
                        <span className="font-semibold text-sm">{savedBooking?.professionalName || determineProfessional().name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-1">
                        <div>
                          <span className="text-[#7C736D] block text-[10px] uppercase font-bold">Data:</span>
                          <span className="font-bold text-sm">{formatDateLabel(savedBooking?.date || selectedDate, 'numeric')}</span>
                          <span className="text-[10px] text-[#7C736D] block">{formatDateLabel(savedBooking?.date || selectedDate, 'short')}</span>
                        </div>
                        <div>
                          <span className="text-[#7C736D] block text-[10px] uppercase font-bold">Horário:</span>
                          <span className="font-bold text-sm">{savedBooking?.time || selectedTime}h</span>
                          <span className="text-[10px] text-[#7C736D] block">{selectedService?.duration} min</span>
                        </div>
                      </div>
                      <div className="pt-1">
                        <span className="text-[#7C736D] block text-[10px] uppercase font-bold">Endereço do Espaço:</span>
                        <span className="text-xs font-medium flex items-center gap-1 text-[#5C534D]">
                          <MapPin size={12} className="text-[#C7A15D] shrink-0" /> Rua Paracatu, 15, Centro, Taiobeiras - MG
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <p className="text-xs text-[#5C534D] max-w-sm mx-auto leading-relaxed">
                      Clique no botão abaixo para enviar o comprovante com os detalhes para a profissional via WhatsApp.
                    </p>
                    <div className="flex flex-col gap-2 max-w-xs mx-auto">
                      <a
                        href={getWhatsAppDetails().whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full min-h-[48px] bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold uppercase tracking-wider text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                      >
                        <Phone size={16} /> {getWhatsAppDetails().buttonLabel}
                      </a>
                      <button
                        type="button"
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
                        className="w-full min-h-[44px] border border-[#DDD6CC] hover:bg-black/5 text-[#29231F] text-xs font-semibold uppercase tracking-wider rounded-xl transition-colors"
                      >
                        Concluir e Voltar ao Site
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Footer Controls (for steps 1-4) - Touch Targets >= 44px */}
          {step < 5 && (
            <footer className="px-5 sm:px-6 py-3.5 border-t border-[#E6DFD5] bg-[#FAF8F5] flex justify-between items-center shrink-0">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={step === 1 || isSubmitting}
                className={`min-h-[44px] px-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#C7A15D] ${
                  step === 1 || isSubmitting
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-[#5C534D] hover:text-[#29231F] hover:bg-black/5'
                }`}
              >
                <ArrowLeft size={16} /> Voltar
              </button>

              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={
                    (step === 1 && !selectedService) ||
                    (step === 2 && !selectedProfessional && !isFirstAvailable) ||
                    (step === 3 && (!selectedDate || !selectedTime))
                  }
                  className={`min-h-[44px] px-6 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C7A15D] ${
                    (step === 1 && !selectedService) ||
                    (step === 2 && !selectedProfessional && !isFirstAvailable) ||
                    (step === 3 && (!selectedDate || !selectedTime))
                      ? 'bg-[#E6DFD5] text-gray-400 cursor-not-allowed'
                      : 'bg-[#29231F] text-white hover:bg-[#3D342E] shadow-sm active:scale-95'
                  }`}
                >
                  Avançar <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const formBtn = document.getElementById('submit-booking-form-btn');
                    if (formBtn) formBtn.click();
                  }}
                  disabled={isSubmitting}
                  className="min-h-[44px] px-6 bg-[#29231F] text-white font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-[#3D342E] active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C7A15D]"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Gravando...
                    </>
                  ) : (
                    'Finalizar Agendamento'
                  )}
                </button>
              )}
            </footer>
          )}
        </motion.div>
      </div>

      <PrivacyPolicyModal isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </>
  );
}
