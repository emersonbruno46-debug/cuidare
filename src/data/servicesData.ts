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
    id: 'escova-modelada',
    name: 'Escova Modelada',
    category: 'escovas',
    priceBase: 50,
    priceDetails: { P: 50, M: 60, G: 70 },
    duration: 50,
    description: 'Escovação técnica com movimento, volume e pontas trabalhadas e modeladas.',
    variablePrice: true,
    professionalIds: ['maisa', 'railma']
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
    recommendations: ['Venha com o cabelo desembaraçado se possível.'],
    professionalIds: ['maisa', 'railma']
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
  {
    id: 'mechas',
    name: 'Mechas',
    category: 'quimicas',
    priceBase: 250,
    priceRange: { min: 250, max: 450 },
    duration: 180,
    description: 'Técnicas personalizadas de mechas, iluminação ou loiro global com proteção dos fios.',
    variablePrice: true,
    professionalIds: ['maisa', 'railma'],
    recommendations: ['Requer teste de mecha ou avaliação prévia do histórico capilar.']
  },
  {
    id: 'coloracao',
    name: 'Coloração',
    category: 'quimicas',
    priceBase: 130,
    priceRange: { min: 130, max: 190 },
    duration: 90,
    description: 'Aplicação de coloração global ou retoque de raiz com produtos de alta performance.',
    variablePrice: true,
    professionalIds: ['railma']
  },
  {
    id: 'corte-mechas',
    name: 'Corte + Mechas',
    category: 'quimicas',
    priceBase: 300,
    priceRange: { min: 300, max: 500 },
    duration: 210,
    description: 'Combo completo de transformação: corte personalizado seguido de procedimento de mechas e tonalização.',
    variablePrice: true,
    professionalIds: ['maisa', 'railma'],
    recommendations: ['Requer teste de mecha ou avaliação prévia do histórico capilar.']
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
    description: 'Alongamento natural aplicando um fio sintético sobre cada cílio natural.',
    flowType: 'consulta_recepcao',
    flowBadge: 'Sob Consulta',
    note: 'Consulte horários e disponibilidade com a Recepção Cuidare'
  },
  {
    id: 'cilios-volume',
    name: 'Extensão de Cílios Volume Russo',
    category: 'cilios',
    priceBase: 160,
    duration: 150,
    description: 'Extensão de cílios com leques artesanais de fios ultrafinos para efeito volumoso e glamouroso.',
    flowType: 'consulta_recepcao',
    flowBadge: 'Sob Consulta',
    note: 'Consulte horários e disponibilidade com a Recepção Cuidare'
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
    id: 'make-completa',
    name: 'Maquiagem + Cílios Postiços',
    category: 'maquiagem',
    priceBase: 180,
    duration: 70,
    description: 'Maquiagem profissional com preparação de pele de alta durabilidade e aplicação de cílios postiços premium.',
    professionalIds: ['maisa']
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
    professionalIds: ['maisa', 'railma']
  },

  // NOIVAS & DEBUTANTES (MAÍSA RODRIGUES)
  {
    id: 'producao-noiva',
    name: 'Produção da Noiva (Experiência 01)',
    category: 'noivas',
    priceBase: 400,
    duration: 90,
    description: 'Uma opção mais simples e objetiva para a noiva que deseja maquiagem e penteado social.',
    recommendations: [
      'Inclui maquiagem social da noiva.',
      'Inclui penteado social da noiva.',
      'Ambiente acolhedor e preparado no Espaço Cuidare.'
    ],
    note: 'Maquiagem social + penteado social da noiva',
    professionalIds: ['maisa']
  },
  {
    id: 'noiva-civil',
    name: 'Noiva Civil (Experiência 02)',
    category: 'noivas',
    priceBase: 500,
    duration: 90,
    description: 'Uma produção especial para o casamento civil, com beleza e cuidado em cada detalhe.',
    recommendations: [
      'Inclui maquiagem para o casamento civil.',
      'Inclui penteado exclusivo.',
      'Preparação necessária completa para a produção.'
    ],
    note: 'Produção completa para casamento civil',
    professionalIds: ['maisa']
  },
  {
    id: 'noiva-essencial',
    name: 'Noiva Essencial (Experiência 03)',
    category: 'noivas',
    priceBase: 1500,
    duration: 180,
    description: 'Uma experiência que começa antes do casamento, com testes e planejamento completo do visual da noiva.',
    recommendations: [
      'Teste prévio de maquiagem.',
      'Teste prévio de penteado.',
      'Maquiagem no dia do casamento.',
      'Penteado no dia do casamento.',
      'Planejamento prévio e consultoria da produção.'
    ],
    note: 'Testes prévios + produção no grande dia',
    flowType: 'avaliacao_previa',
    flowBadge: 'Planejamento & Testes',
    professionalIds: ['maisa']
  },
  {
    id: 'dia-noiva-cuidare',
    name: 'Dia da Noiva Cuidare (Experiência 04)',
    category: 'noivas',
    priceBase: 2000,
    duration: 240,
    description: 'Um dia exclusivo dedicado à noiva, com tempo privativo, cuidado, relaxamento e tranquilidade durante toda a preparação.',
    recommendations: [
      'Teste de maquiagem e teste de penteado.',
      'Maquiagem e penteado no dia do casamento.',
      'Tempo exclusivo para a noiva no Espaço Cuidare.',
      'Coffee break especial.',
      'Acompanhamento nos momentos finais da preparação e making of.'
    ],
    note: 'Exclusividade Cuidare: testes, coffee break e acompanhamento VIP',
    flowType: 'avaliacao_previa',
    flowBadge: 'Exclusivo Noivas',
    professionalIds: ['maisa']
  },
  {
    id: 'pacote-debutante',
    name: 'Pacote Debutante (Maquiagem & Penteado)',
    category: 'noivas',
    priceBase: 500,
    duration: 120,
    description: 'Uma experiência pensada para a debutante viver sua preparação com beleza, tranquilidade e todo o cuidado que o seu grande dia merece.',
    recommendations: [
      'Produção completa e personalizada de maquiagem e penteado.',
      'Harmonização com vestido e proposta da festa.',
      'Espaço para make off no Cuidare para fotos e bastidores.',
      'Apoio durante a preparação e finalização antes do evento.'
    ],
    note: 'Make & penteado personalizados + espaço para make off',
    flowType: 'avaliacao_previa',
    flowBadge: 'Avaliação Prévia',
    professionalIds: ['maisa']
  },

  // CURSOS PROFISSIONAIS (MAÍSA RODRIGUES)
  {
    id: 'curso-iniciantes-maisa',
    name: 'Curso de Penteado e Maquiagem para Iniciantes',
    category: 'cursos',
    priceBase: 0,
    variablePrice: true,
    duration: 180,
    description: 'Capacitação prática ministrada por Maísa Rodrigues, especialista com mais de 20 anos de carreira. Técnicas fundamentais de penteados e maquiagem profissional para quem deseja ingressar na área.',
    recommendations: [
      'Aulas práticas presenciais no Espaço Cuidare.',
      'Conteúdo didático do zero ao avançado.',
      'Turmas com vagas limitadas para atenção individualizada.',
      'Consulte próximas turmas, cronograma e investimento diretamente no WhatsApp.'
    ],
    note: 'Turmas abertas — Informações e inscrições via WhatsApp',
    flowType: 'curso_turmas',
    flowBadge: 'Turmas & Inscrições',
    professionalIds: ['maisa']
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
