import type { Service } from '../types';

export const services: Service[] = [
  // ESCOVAS
  {
    id: 'escova-simples',
    name: 'Escova',
    category: 'escovas',
    priceBase: 35,
    priceDetails: { P: 35, M: 45, G: 55 },
    duration: 45,
    description: 'Lavagem e escovação profissional para alinhar os fios e dar brilho.',
    variablePrice: true
  },
  {
    id: 'cachos',
    name: 'Cachos',
    category: 'escovas',
    priceBase: 35,
    priceDetails: { P: 35, M: 45, G: 60 },
    duration: 45,
    description: 'Modelagem de cachos com babyliss ou prancha para um visual elegante.',
    variablePrice: true
  },
  {
    id: 'escova-babyliss',
    name: 'Escova + Babyliss',
    category: 'escovas',
    priceBase: 60,
    priceDetails: { P: 60, M: 70, G: 80 },
    duration: 60,
    description: 'Escovação seguida de modelagem com babyliss para maior durabilidade e volume.',
    variablePrice: true
  },
  {
    id: 'escova-chapa',
    name: 'Escova + Chapa',
    category: 'escovas',
    priceBase: 45,
    priceDetails: { P: 45, M: 55, G: 65 },
    duration: 50,
    description: 'Escova lisa finalizada com prancha para um alinhamento perfeito e duradouro.',
    variablePrice: true
  },
  {
    id: 'chapa',
    name: 'Chapa',
    category: 'escovas',
    priceBase: 25,
    priceDetails: { P: 25, M: 35, G: 45 },
    duration: 30,
    description: 'Modelagem lisa rápida utilizando apenas prancha (cabelo já limpo e seco).',
    variablePrice: true
  },

  // TRATAMENTOS
  {
    id: 'corte',
    name: 'Corte Feminino',
    category: 'tratamentos',
    priceBase: 70,
    duration: 60,
    description: 'Corte feminino completo (lavagem, corte e secagem rápida).',
    recommendations: ['Venha com o cabelo desembaraçado se possível.']
  },
  {
    id: 'mega-hair',
    name: 'Mega Hair (Colocação)',
    category: 'tratamentos',
    priceBase: 120,
    duration: 120,
    description: 'Aplicação profissional de extensões de cabelo (avaliação presencial recomendada).',
    variablePrice: true,
    recommendations: ['Requer avaliação prévia do cabelo e da técnica ideal.']
  },
  {
    id: 'finalizacao-p',
    name: 'Finalização P',
    category: 'tratamentos',
    priceBase: 50,
    duration: 45,
    description: 'Lavagem e finalização especial para cabelos curtos (comprimento P).',
  },
  {
    id: 'finalizacao-m',
    name: 'Finalização M',
    category: 'tratamentos',
    priceBase: 60,
    duration: 45,
    description: 'Lavagem e finalização especial para cabelos médios (comprimento M).',
  },
  {
    id: 'realinhamento',
    name: 'Realinhamento Térmico',
    category: 'tratamentos',
    priceBase: 180,
    duration: 120,
    description: 'Tratamento redutor de volume e frizz, mantendo os fios alinhados e sedosos.',
    variablePrice: true
  },
  {
    id: 'lavada',
    name: 'Lavada Especial',
    category: 'tratamentos',
    priceBase: 20,
    duration: 20,
    description: 'Lavagem profunda com shampoo e condicionador de linhas profissionais.',
  },
  {
    id: 'hidratacao-simples',
    name: 'Hidratação (sem ozônio)',
    category: 'tratamentos',
    priceBase: 80,
    duration: 40,
    description: 'Tratamento de nutrição intensa dos fios com máscaras profissionais de alto impacto.',
  },
  {
    id: 'hidratacao-ozonio',
    name: 'Hidratação + Ozonioterapia',
    category: 'tratamentos',
    priceBase: 120,
    duration: 50,
    description: 'Tratamento com vapor de ozônio para abrir cutículas e potenciar a hidratação capilar profunda.',
  },
  {
    id: 'terapia-capilar',
    name: 'Terapia Capilar Especializada',
    category: 'tratamentos',
    priceBase: 150,
    duration: 60,
    description: 'Tratamento focado na saúde do couro cabeludo e estimulação de crescimento dos fios.',
    recommendations: ['Ideal para queda de cabelo, caspa ou couro cabeludo sensível.']
  },
  {
    id: 'tonalizacao',
    name: 'Tonalização',
    category: 'tratamentos',
    priceBase: 120,
    duration: 60,
    description: 'Banho de brilho ou matização de cor sem amônia, ideal para reviver a cor.',
    variablePrice: true
  },

  // QUÍMICAS
  {
    id: 'progressiva-sem-formol',
    name: 'Progressiva Sem Formol',
    category: 'quimicas',
    priceBase: 180,
    priceRange: { min: 180, max: 250 },
    duration: 150,
    description: 'Alisamento capilar orgânico e seguro, sem ardência, proporcionando brilho extremo.',
    variablePrice: true,
    recommendations: ['Indique no formulário se possui químicas anteriores.']
  },
  {
    id: 'progressiva-com-formol',
    name: 'Progressiva Com Formol',
    category: 'quimicas',
    priceBase: 190,
    priceRange: { min: 190, max: 350 },
    duration: 150,
    description: 'Alisamento tradicional de alta eficácia com selagem térmica dos fios.',
    variablePrice: true,
    recommendations: ['Certifique-se de não possuir sensibilidade respiratória ao formol.']
  },

  // UNHAS
  {
    id: 'manicure-simples',
    name: 'Manicure Completa',
    category: 'unhas',
    priceBase: 35,
    duration: 40,
    description: 'Corte, lixamento, remoção de cutículas e esmaltação das mãos.'
  },
  {
    id: 'pedicure-simples',
    name: 'Pedicure Completa',
    category: 'unhas',
    priceBase: 40,
    duration: 40,
    description: 'Cuidado completo dos pés: corte, cuticulagem, lixamento e esmaltação.'
  },
  {
    id: 'pe-e-mao',
    name: 'Pé e Mão',
    category: 'unhas',
    priceBase: 70,
    duration: 80,
    description: 'Combo de atendimento completo para mãos e pés na mesma sessão.'
  },
  {
    id: 'spa-dos-pes',
    name: 'Spa dos Pés',
    category: 'unhas',
    priceBase: 60,
    duration: 40,
    description: 'Esfoliação profunda, hidratação morna, massagem relaxante e cuidados com calosidades.'
  },
  {
    id: 'spa-pes-pedicure',
    name: 'Spa dos Pés + Pedicure',
    category: 'unhas',
    priceBase: 85,
    duration: 70,
    description: 'Combo completo de Spa dos Pés aliado ao serviço tradicional de Pedicure.'
  },

  // SOBRANCELHAS
  {
    id: 'design-sobrancelha',
    name: 'Design de Sobrancelha',
    category: 'sobrancelhas',
    priceBase: 40,
    duration: 30,
    description: 'Mapeamento facial e pinçamento para harmonia perfeita do seu olhar.'
  },
  {
    id: 'design-henna',
    name: 'Design + Henna',
    category: 'sobrancelhas',
    priceBase: 55,
    duration: 45,
    description: 'Design de sobrancelha finalizado com aplicação de henna para preenchimento natural e brilho.'
  },

  // CÍLIOS
  {
    id: 'cilios-classico',
    name: 'Extensão de Cílios Fio a Fio',
    category: 'cilios',
    priceBase: 120,
    duration: 120,
    description: 'Alongamento natural aplicando um fio sintético sobre cada cílio natural.'
  },
  {
    id: 'cilios-volume',
    name: 'Extensão de Cílios Volume Russo',
    category: 'cilios',
    priceBase: 160,
    duration: 150,
    description: 'Extensão de cílios com leques artesanais de fios ultrafinos para efeito volumoso e glamouroso.'
  },

  // MAQUIAGEM & PENTEADOS (MAÍSA RODRIGUES)
  {
    id: 'make-social-maisa',
    name: 'Maquiagem Social',
    category: 'maquiagem',
    priceBase: 120,
    duration: 60,
    description: 'Maquiagem social sofisticada com alta durabilidade para festas e eventos.',
    professionalIds: ['maisa']
  },
  {
    id: 'make-social',
    name: 'Maquiagem Social (Roberta)',
    category: 'maquiagem',
    priceBase: 150,
    duration: 60,
    description: 'Maquiagem profissional para festas, formaturas e eventos sociais (sem cílios postiços).',
    professionalIds: ['roberta']
  },
  {
    id: 'make-completa',
    name: 'Maquiagem + Cílios Postiços',
    category: 'maquiagem',
    priceBase: 180,
    duration: 70,
    description: 'Maquiagem profissional com preparação de pele de alta durabilidade e aplicação de cílios postiços premium.',
    professionalIds: ['roberta', 'maisa']
  },
  {
    id: 'ondas-tradicionais',
    name: 'Ondas Tradicionais',
    category: 'penteados',
    priceBase: 80,
    duration: 45,
    description: 'Ondas clássicas e elegantes com textura e movimento.',
    note: 'Todos os penteados incluem finalização, texturização e volume.',
    professionalIds: ['maisa']
  },
  {
    id: 'ondas-hollywoodianas',
    name: 'Ondas Hollywoodianas',
    category: 'penteados',
    priceBase: 120,
    duration: 60,
    description: 'Ondas marcadas estilo Hollywood com brilho e estrutura refinada.',
    note: 'Todos os penteados incluem finalização, texturização e volume.',
    professionalIds: ['maisa']
  },
  {
    id: 'penteado-semipreso',
    name: 'Penteado Semipreso',
    category: 'penteados',
    priceBase: 150,
    duration: 60,
    description: 'Penteado semipreso elegante para noivas, formandas e convidadas.',
    note: 'Todos os penteados incluem finalização, texturização e volume.',
    professionalIds: ['maisa']
  },
  {
    id: 'penteado-coque',
    name: 'Penteado Coque',
    category: 'penteados',
    priceBase: 180,
    duration: 70,
    description: 'Coque clássico, desestruturado ou baixo de alta fixação.',
    note: 'Todos os penteados incluem finalização, texturização e volume.',
    professionalIds: ['maisa']
  },
  {
    id: 'preparacao-cabelo',
    name: 'Preparação do Cabelo',
    category: 'escovas',
    priceBase: 35,
    priceType: 'range',
    priceDetails: { P: 35, M: 45, G: 55 },
    priceRange: { min: 55, max: 60 },
    duration: 45,
    description: 'Lavagem + escova realizada no Espaço Cuidare.',
    variablePrice: true,
    professionalIds: ['maisa', 'railma', 'fernanda']
  },

  // ESTÉTICA
  {
    id: 'drenagem-corporal',
    name: 'Estética Corporal (Drenagem Linfática)',
    category: 'estetica',
    priceBase: 100,
    duration: 60,
    description: 'Massagem focada na redução de inchaço corporal, retenção de líquidos e ativação da circulação.'
  },
  {
    id: 'limpeza-pele',
    name: 'Estética Facial (Limpeza de Pele Profunda)',
    category: 'estetica',
    priceBase: 120,
    duration: 60,
    description: 'Extração de cravos e impurezas com vapor de ozônio, esfoliação e máscara calmante.',
    recommendations: ['Evite exposição solar direta nas 24h seguintes.']
  },
  {
    id: 'depilacao-laser',
    name: 'Depilação a Laser (Sessão)',
    category: 'estetica',
    priceBase: 90,
    duration: 30,
    description: 'Remoção duradoura de pelos com tecnologia de laser de última geração (valor por área).',
    variablePrice: true,
    recommendations: ['Não depilar com pinça ou cera nas 3 semanas anteriores.']
  },
  {
    id: 'massagem-relaxante',
    name: 'Massagem Relaxante',
    category: 'estetica',
    priceBase: 110,
    duration: 60,
    description: 'Manobras suaves e profundas para aliviar tensões musculares, estresse e fadiga mental.'
  }
];
