// ─────────────────────────────────────────────
// CUIDARE — Categories Data & Config
// Centralização única das categorias do catálogo e agendamento
// ─────────────────────────────────────────────

import type { ServiceCategory } from '../types';
import { 
  Scissors, Sparkles, Heart, Star, Crown, 
  GraduationCap, Eye, Sparkle
} from 'lucide-react';

export interface CategoryItem {
  id: ServiceCategory;
  name: string;
  shortName: string;
  description: string;
  icon: typeof Scissors;
}

export const CATEGORIES: CategoryItem[] = [
  { 
    id: 'escovas', 
    name: 'Escovas & Modelagem', 
    shortName: 'Escovas', 
    description: 'Escovas modeladas, finalizações e secagens com brilho intenso.',
    icon: Scissors 
  },
  { 
    id: 'penteados', 
    name: 'Penteados & Ondas', 
    shortName: 'Penteados', 
    description: 'Penteados estruturados, ondas glamourosas e produções para eventos.',
    icon: Sparkles 
  },
  { 
    id: 'noivas', 
    name: 'Noivas & Debutantes', 
    shortName: 'Noivas', 
    description: 'Produção completa e dia da noiva com provas e atendimento exclusivo.',
    icon: Crown 
  },
  { 
    id: 'cursos', 
    name: 'Cursos Profissionais', 
    shortName: 'Cursos', 
    description: 'Cursos presenciais para iniciantes em penteado e maquiagem com Maísa Rodrigues.',
    icon: GraduationCap 
  },
  { 
    id: 'tratamentos', 
    name: 'Tratamentos Capilares', 
    shortName: 'Tratamentos', 
    description: 'Nutrição, reconstrução, cronograma intensivo e terapias de recuperação dos fios.',
    icon: Heart 
  },
  { 
    id: 'quimicas', 
    name: 'Coloração & Mechas', 
    shortName: 'Químicas', 
    description: 'Mechas personalizadas, morena iluminada, retoque de raiz e transformações.',
    icon: Sparkle 
  },
  { 
    id: 'unhas', 
    name: 'Manicure & Pedicure', 
    shortName: 'Unhas', 
    description: 'Spa dos pés, cuticulagem impecável, esmaltações de alta durabilidade e nail design.',
    icon: Sparkles 
  },
  { 
    id: 'sobrancelhas', 
    name: 'Design de Sobrancelhas', 
    shortName: 'Sobrancelhas', 
    description: 'Design personalizado respeitando a simetria facial e aplicação de henna.',
    icon: Star 
  },
  { 
    id: 'cilios', 
    name: 'Cílios & Olhar', 
    shortName: 'Cílios', 
    description: 'Extensão de cílios fio a fio e volume russo para realçar o olhar com naturalidade.',
    icon: Eye 
  },
  { 
    id: 'maquiagem', 
    name: 'Maquiagem Social', 
    shortName: 'Maquiagem', 
    description: 'Maquiagem profissional para formaturas, festas e ocasiões especiais.',
    icon: Sparkles 
  },
  { 
    id: 'estetica', 
    name: 'Estética & Massagem', 
    shortName: 'Estética', 
    description: 'Drenagem linfática, limpeza de pele profunda e massagem relaxante.',
    icon: Heart 
  }
];

export function getCategoryById(id: string): CategoryItem | undefined {
  return CATEGORIES.find(c => c.id === id);
}
