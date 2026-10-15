import type { Professional } from '../types';

export const professionals: Professional[] = [
  {
    id: 'evelyn',
    name: 'Evelyn',
    role: 'Manicure, Pedicure & Nail Designer',
    categories: ['unhas'],
    photoUrl: '/team/evelyn.webp',
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
    photoUrl: '/team/railma.webp',
    bio: 'Profissional versátil com mais de 7 anos de experiência, atuando no design de sobrancelhas, cuidados capilares e manicure.',
    specialties: ['Design de Sobrancelha', 'Escova com Modelagem', 'Design + Henna'],
    providerType: 'internal',
    whatsapp: '5538992697559'
  },
  {
    id: 'maisa',
    name: 'Maísa Rodrigues',
    role: 'Cabeleireira, Penteados & Maquiagem',
    categories: ['maquiagem', 'penteados', 'escovas', 'noivas', 'cursos'],
    photoUrl: '/team/maisa.webp',
    bio: 'Cabeleireira em geral há mais de 20 anos, especialista em penteados sofisticados e maquiagens de alta durabilidade para momentos especiais, noivas e debutantes. Ministra cursos de penteado e maquiagem para iniciantes.',
    specialties: ['Produção de Noivas & Debutantes', 'Especialização em Penteados', 'Cursos para Iniciantes'],
    specialtyHighlight: 'Noivas, Debutantes & Cursos',
    specialtyBadge: 'NOIVAS & CURSOS',
    providerType: 'internal',
    whatsapp: '5538992380097'
  },
  {
    id: 'tania',
    name: 'Tânia',
    role: 'Especialista em Beleza & Cuidados',
    categories: ['escovas', 'tratamentos', 'quimicas'],
    photoUrl: '/team/tania.webp',
    bio: 'Profissional dedicada à excelência em atendimento, tratamentos e cuidados capilares.',
    specialties: ['Escova Modelada', 'Tratamentos Capilares', 'Cuidados Especiais'],
    providerType: 'internal'
  },
  {
    id: 'fabiane',
    name: 'Fabiane',
    role: 'Esteticista & Massoterapeuta',
    categories: ['estetica'],
    photoUrl: '/team/FABIANE.png',
    bio: 'Especialista em drenagem linfática, cuidados de pele avançados, massagens terapêuticas e depilação a laser de alta tecnologia.',
    specialties: ['Massagem Relaxante', 'Limpeza de Pele Profunda', 'Depilação a Laser'],
    providerType: 'internal'
  },
  {
    id: 'lara',
    name: 'Lara',
    role: 'Recepção & Atendimento Cuidare',
    categories: [],
    photoUrl: '/team/LARA.png',
    bio: 'Responsável pelo acolhimento, recepção e agendamento de todas as clientes com dedicação, carinho e excelência.',
    specialties: ['Recepção Cuidare', 'Atendimento Humanizado', 'Agendamentos'],
    providerType: 'internal',
    whatsapp: '5538991007706'
  }
];
