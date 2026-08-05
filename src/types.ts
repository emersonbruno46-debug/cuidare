export interface Service {
  id: string;
  name: string;
  category: 'escovas' | 'tratamentos' | 'quimicas' | 'unhas' | 'sobrancelhas' | 'cilios' | 'maquiagem' | 'estetica';
  priceBase: number;
  priceDetails?: {
    P: number;
    M: number;
    G: number;
  };
  priceRange?: {
    min: number;
    max: number;
  };
  duration: number; // in minutes
  description: string;
  recommendations?: string;
  variablePrice?: boolean;
}

export interface Professional {
  id: string;
  name: string;
  role: string;
  categories: Service['category'][];
  photo?: string;
  bio: string;
  specialties: string[];
}

export interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  professionalId: string;
  professionalName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  notes?: string;
  status: 'pendente' | 'concluido' | 'faltou' | 'cancelado';
  createdAt: string;
  price: number;
  duration: number;
}

export interface Client {
  phone: string;
  name: string;
  email?: string;
  lastVisit?: string;
  totalVisits: number;
  notes?: string;
}
