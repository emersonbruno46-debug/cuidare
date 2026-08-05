import { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import BookingModal from './components/BookingModal';
import AdminPanel from './components/AdminPanel';
import type { Booking, Service } from './types';

// Realistic initial bookings data to make the dashboard look stunning and full on first load
const initialDummyBookings = (): Booking[] => {
  
  // Helper to generate dates relative to today
  const getRelativeDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  return [
    {
      id: 'bk_1',
      serviceId: 'corte',
      serviceName: 'Corte Feminino',
      professionalId: 'fernanda',
      professionalName: 'Fernanda',
      date: getRelativeDate(-2),
      time: '09:00',
      clientName: 'Ana Paula Santos',
      clientPhone: '38 98845-1243',
      clientEmail: 'anapaula@gmail.com',
      status: 'concluido',
      createdAt: new Date().toISOString(),
      price: 70,
      duration: 60
    },
    {
      id: 'bk_2',
      serviceId: 'pe-e-mao',
      serviceName: 'Pé e Mão',
      professionalId: 'evelyn',
      professionalName: 'Evelyn',
      date: getRelativeDate(-2),
      time: '14:30',
      clientName: 'Beatriz Souza',
      clientPhone: '38 99122-3847',
      status: 'concluido',
      createdAt: new Date().toISOString(),
      price: 70,
      duration: 80
    },
    {
      id: 'bk_3',
      serviceId: 'progressiva-sem-formol',
      serviceName: 'Progressiva Sem Formol',
      professionalId: 'railma',
      professionalName: 'Railma',
      date: getRelativeDate(-1),
      time: '08:30',
      clientName: 'Camila Lima',
      clientPhone: '38 99823-1122',
      notes: 'Possui mechas loiras, quer alinhamento com brilho',
      status: 'concluido',
      createdAt: new Date().toISOString(),
      price: 210, // medium price
      duration: 150
    },
    {
      id: 'bk_4',
      serviceId: 'hidratacao-ozonio',
      serviceName: 'Hidratação + Ozonioterapia',
      professionalId: 'rosy',
      professionalName: 'Rosy',
      date: getRelativeDate(-1),
      time: '15:00',
      clientName: 'Débora Maria Santos',
      clientPhone: '38 99104-5544',
      status: 'concluido',
      createdAt: new Date().toISOString(),
      price: 120,
      duration: 50
    },
    {
      id: 'bk_5',
      serviceId: 'spa-dos-pes',
      serviceName: 'Spa dos Pés',
      professionalId: 'evelyn',
      professionalName: 'Evelyn',
      date: getRelativeDate(0), // Today
      time: '09:00',
      clientName: 'Amanda Silva',
      clientPhone: '38 99201-4477',
      status: 'concluido',
      createdAt: new Date().toISOString(),
      price: 60,
      duration: 40
    },
    {
      id: 'bk_6',
      serviceId: 'make-completa',
      serviceName: 'Maquiagem + Cílios Postiços',
      professionalId: 'roberta',
      professionalName: 'Roberta',
      date: getRelativeDate(0), // Today
      time: '11:00',
      clientName: 'Juliana Costa',
      clientPhone: '38 98822-7711',
      notes: 'Formatura à noite. Prefere tons terrosos.',
      status: 'concluido',
      createdAt: new Date().toISOString(),
      price: 180,
      duration: 70
    },
    {
      id: 'bk_7',
      serviceId: 'drenagem-corporal',
      serviceName: 'Estética Corporal (Drenagem Linfática)',
      professionalId: 'fabiana',
      professionalName: 'Fabiana',
      date: getRelativeDate(0), // Today
      time: '14:30',
      clientName: 'Patrícia Alves',
      clientPhone: '38 99144-8855',
      status: 'concluido',
      createdAt: new Date().toISOString(),
      price: 100,
      duration: 60
    },
    {
      id: 'bk_8',
      serviceId: 'design-henna',
      serviceName: 'Design + Henna',
      professionalId: 'railma',
      professionalName: 'Railma',
      date: getRelativeDate(0), // Today
      time: '16:00',
      clientName: 'Letícia Dias',
      clientPhone: '38 99920-5521',
      status: 'pendente',
      createdAt: new Date().toISOString(),
      price: 55,
      duration: 45
    },
    {
      id: 'bk_9',
      serviceId: 'escova-simples',
      serviceName: 'Escova',
      professionalId: 'fernanda',
      professionalName: 'Fernanda',
      date: getRelativeDate(0), // Today
      time: '17:00',
      clientName: 'Bruna Gomes',
      clientPhone: '38 99200-1122',
      status: 'pendente',
      createdAt: new Date().toISOString(),
      price: 45, // M size
      duration: 45
    },
    {
      id: 'bk_10',
      serviceId: 'cilios-volume',
      serviceName: 'Extensão de Cílios Volume Russo',
      professionalId: 'geovanna',
      professionalName: 'Geovanna',
      date: getRelativeDate(1), // Tomorrow
      time: '09:30',
      clientName: 'Sofia Melo',
      clientPhone: '38 99182-3847',
      notes: 'Primeira vez fazendo extensão.',
      status: 'pendente',
      createdAt: new Date().toISOString(),
      price: 160,
      duration: 150
    }
  ];
};

function App() {
  const [view, setView] = useState<'landing' | 'admin'>('landing');
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | undefined>(undefined);
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Load bookings from localStorage or set defaults
  useEffect(() => {
    const saved = localStorage.getItem('cuidare_bookings');
    if (saved) {
      try {
        setBookings(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved bookings", e);
        const initial = initialDummyBookings();
        setBookings(initial);
        localStorage.setItem('cuidare_bookings', JSON.stringify(initial));
      }
    } else {
      const initial = initialDummyBookings();
      setBookings(initial);
      localStorage.setItem('cuidare_bookings', JSON.stringify(initial));
    }
  }, []);

  // Save bookings to localStorage when modified
  const saveBookings = (newBookings: Booking[]) => {
    setBookings(newBookings);
    localStorage.setItem('cuidare_bookings', JSON.stringify(newBookings));
  };

  const handleOpenBooking = (service?: Service) => {
    setSelectedService(service);
    setIsBookingOpen(true);
  };

  const handleCloseBooking = () => {
    setIsBookingOpen(false);
    setSelectedService(undefined);
  };

  const handleAddBooking = (newBooking: Booking) => {
    const updated = [newBooking, ...bookings];
    saveBookings(updated);
  };

  const handleUpdateBookingStatus = (id: string, status: Booking['status']) => {
    const updated = bookings.map(b => b.id === id ? { ...b, status } : b);
    saveBookings(updated);
  };

  const handleDeleteBooking = (id: string) => {
    const updated = bookings.filter(b => b.id !== id);
    saveBookings(updated);
  };

  return (
    <>
      {view === 'landing' ? (
        <LandingPage 
          onOpenBooking={handleOpenBooking} 
          onNavigateToAdmin={() => setView('admin')} 
        />
      ) : (
        <AdminPanel 
          onBackToLanding={() => setView('landing')} 
          bookings={bookings}
          onUpdateBookingStatus={handleUpdateBookingStatus}
          onDeleteBooking={handleDeleteBooking}
        />
      )}

      {isBookingOpen && (
        <BookingModal 
          isOpen={isBookingOpen} 
          onClose={handleCloseBooking} 
          initialService={selectedService}
          existingBookings={bookings}
          onAddBooking={handleAddBooking}
        />
      )}
    </>
  );
}

export default App;
