import type { Professional } from '../types';

export const professionals: Professional[] = [
  {
    id: 'evelyn',
    name: 'Evelyn',
    role: 'Manicure, Pedicure & Nail Designer',
    categories: ['unhas'],
    bio: 'Especialista em embelezamento de mãos e pés. Focada em spa dos pés, cuticulagem perfeita e esmaltações de longa duração.',
    specialties: ['Spa dos Pés', 'Decoração de Unhas', 'Pedicure Avançada'],
    providerType: 'internal',
    whatsapp: '5538991131250'
  },
  {
    id: 'railma',
    name: 'Railma',
    role: 'Hair Stylist, Sobrancelhas & Manicure',
    categories: ['escovas', 'tratamentos', 'quimicas', 'sobrancelhas', 'unhas'],
    bio: 'Profissional versátil com mais de 7 anos de experiência, atuando no design de sobrancelhas, cuidados capilares e manicure.',
    specialties: ['Design de Sobrancelha', 'Escova com Modelagem', 'Design + Henna'],
    providerType: 'internal',
    whatsapp: '5538992697559'
  },
  {
    id: 'fernanda',
    name: 'Fernanda',
    role: 'Hair Stylist & Colorista',
    categories: ['escovas', 'tratamentos', 'quimicas'],
    bio: 'Especialista em transformações capilares, cortes modernos, escovas artísticas e químicas capilares de alta precisão.',
    specialties: ['Corte Feminino', 'Progressivas', 'Escova + Babyliss'],
    providerType: 'internal',
    whatsapp: '5538992142774'
  },
  {
    id: 'maisa',
    name: 'Maísa Rodrigues',
    role: 'Maquiagem & Penteados',
    categories: ['maquiagem', 'penteados', 'escovas'],
    bio: 'Especialista dedicada a produções sofisticadas para noivas, maquiagens de alta durabilidade e penteados exclusivos.',
    specialties: ['Maquiagem Social', 'Ondas Hollywoodianas', 'Penteado Coque'],
    specialtyHighlight: 'Especialidade: Noivas',
    specialtyBadge: 'NOIVAS',
    providerType: 'internal',
    whatsapp: '5538992380097'
  },
  {
    id: 'rosy',
    name: 'Rosy',
    role: 'Terapeuta Capilar & Cronograma Capilar',
    categories: ['tratamentos'],
    bio: 'Dedicada à saúde integrada dos cabelos. Especialista em tratar patologias do couro cabeludo e restabelecer a saúde dos fios.',
    specialties: ['Terapia Capilar', 'Ozonioterapia', 'Cronograma Personalizado'],
    providerType: 'internal'
  },
  {
    id: 'geovanna',
    name: 'Geovanna',
    role: 'Lash Artist',
    categories: ['cilios'],
    bio: 'Especialista licenciada em extensões de cílios clássicas e de alto volume, garantindo durabilidade e um olhar marcante.',
    specialties: ['Volume Russo', 'Extensão Fio a Fio', 'Lash Lifting'],
    providerType: 'internal'
  },
  {
    id: 'roberta',
    name: 'Roberta',
    role: 'Makeup Artist (Maquiadora)',
    categories: ['maquiagem'],
    bio: 'Maquiadora profissional apaixonada por realçar a beleza natural com técnicas modernas de contorno, iluminação e durabilidade.',
    specialties: ['Maquiagem Social', 'Maquiagem de Noivas', 'Aplicação de Cílios'],
    providerType: 'internal',
    whatsapp: '5538991353424'
  },
  {
    id: 'fabiana',
    name: 'Fabiana',
    role: 'Esteticista & Massoterapeuta',
    categories: ['estetica'],
    bio: 'Especialista em drenagem linfática, cuidados de pele avançados, massagens terapêuticas e depilação a laser de alta tecnologia.',
    specialties: ['Massagem Relaxante', 'Limpeza de Pele Profunda', 'Depilação a Laser'],
    providerType: 'internal'
  }
];
