// All courses data used by both Courses.jsx and CourseDetail.jsx
export const ALL_COURSES = [
  // ── UNIVERSAIS (aparecem para todos) ──
  {
    id: 'budgeting-basics',
    title: 'Orçamento Básico',
    description: 'Aprende os fundamentos de criar e manter um orçamento.',
    level: 1,
    icon: '📊',
    xp_reward: 100,
    goals: ['all'],
    lessons: [
      { id: 'l1', title: 'O que é um Orçamento?', duration: '5 min' },
      { id: 'l2', title: 'A Regra 50/30/20', duration: '7 min' },
      { id: 'l3', title: 'Controlar Despesas', duration: '6 min' },
      { id: 'l4', title: 'Criar o Teu Orçamento', duration: '8 min' },
    ],
    quizQuestions: 5,
  },

  // ── SAVE_MORE ──
  {
    id: 'saving-strategies',
    title: 'Estratégias de Poupança',
    description: 'Descobre técnicas comprovadas para aumentar as tuas poupanças mensalmente.',
    level: 1,
    icon: '💰',
    xp_reward: 120,
    goals: ['save_more'],
    lessons: [
      { id: 'l1', title: 'Porque Poupar?', duration: '5 min' },
      { id: 'l2', title: 'Paga-te Primeiro', duration: '6 min' },
      { id: 'l3', title: 'Fundo de Emergência', duration: '7 min' },
      { id: 'l4', title: 'Automatizar Poupanças', duration: '5 min' },
    ],
    quizQuestions: 5,
  },
  {
    id: 'smart-spending',
    title: 'Gastar com Inteligência',
    description: 'Como reduzir gastos desnecessários sem abrir mão do que importa.',
    level: 2,
    icon: '🛒',
    xp_reward: 140,
    goals: ['save_more'],
    lessons: [
      { id: 'l1', title: 'Necessidade vs Desejo', duration: '5 min' },
      { id: 'l2', title: 'Cortar Subscriptions', duration: '6 min' },
      { id: 'l3', title: 'Compras por Impulso', duration: '7 min' },
      { id: 'l4', title: 'Desafio dos 30 Dias', duration: '5 min' },
    ],
    quizQuestions: 5,
  },
  {
    id: 'savings-goals-advanced',
    title: 'Metas de Poupança Avançadas',
    description: 'Cria e gere múltiplas metas de poupança com sucesso.',
    level: 3,
    icon: '🏆',
    xp_reward: 180,
    goals: ['save_more'],
    lessons: [
      { id: 'l1', title: 'Método dos Envelopes', duration: '6 min' },
      { id: 'l2', title: 'Sistemas de Múltiplas Contas', duration: '7 min' },
      { id: 'l3', title: 'Poupar para Grandes Compras', duration: '8 min' },
      { id: 'l4', title: 'Celebrar Marcos', duration: '4 min' },
    ],
    quizQuestions: 5,
  },

  // ── REDUCE_DEBT ──
  {
    id: 'debt-management',
    title: 'Gerir Dívidas',
    description: 'Domina estratégias para pagar dívidas mais rápido e com menos juros.',
    level: 1,
    icon: '🎯',
    xp_reward: 150,
    goals: ['reduce_debt'],
    lessons: [
      { id: 'l1', title: 'Dívida Boa vs Má', duration: '6 min' },
      { id: 'l2', title: 'Método Bola de Neve', duration: '7 min' },
      { id: 'l3', title: 'Método Avalanche', duration: '7 min' },
      { id: 'l4', title: 'Viver Sem Dívidas', duration: '6 min' },
    ],
    quizQuestions: 5,
  },
  {
    id: 'credit-cards-mastery',
    title: 'Dominar Cartões de Crédito',
    description: 'Usa o crédito a teu favor sem cair nas armadilhas dos juros.',
    level: 2,
    icon: '💳',
    xp_reward: 160,
    goals: ['reduce_debt'],
    lessons: [
      { id: 'l1', title: 'Como Funcionam os Juros', duration: '6 min' },
      { id: 'l2', title: 'Score de Crédito', duration: '7 min' },
      { id: 'l3', title: 'Pagar Apenas o Mínimo: O Perigo', duration: '6 min' },
      { id: 'l4', title: 'Sair do Vermelho', duration: '8 min' },
    ],
    quizQuestions: 5,
  },
  {
    id: 'debt-free-life',
    title: 'Vida Sem Dívidas',
    description: 'Constrói um estilo de vida sustentável para nunca mais entrar em dívidas.',
    level: 3,
    icon: '🆓',
    xp_reward: 180,
    goals: ['reduce_debt'],
    lessons: [
      { id: 'l1', title: 'Consolidação de Dívidas', duration: '7 min' },
      { id: 'l2', title: 'Negociar com Bancos', duration: '8 min' },
      { id: 'l3', title: 'Reconstruir após Dívidas', duration: '6 min' },
      { id: 'l4', title: 'Manter-se Livre de Dívidas', duration: '5 min' },
    ],
    quizQuestions: 5,
  },

  // ── INVEST ──
  {
    id: 'investing-101',
    title: 'Investir 101',
    description: 'Começa a tua jornada de investimento com confiança e estratégia.',
    level: 1,
    icon: '📈',
    xp_reward: 180,
    goals: ['invest'],
    lessons: [
      { id: 'l1', title: 'Porquê Investir?', duration: '5 min' },
      { id: 'l2', title: 'Risco vs Retorno', duration: '7 min' },
      { id: 'l3', title: 'Tipos de Investimentos', duration: '10 min' },
      { id: 'l4', title: 'Juros Compostos', duration: '6 min' },
    ],
    quizQuestions: 5,
  },
  {
    id: 'etf-investing',
    title: 'Investir em ETFs',
    description: 'Aprende a investir em fundos de índice de forma simples e eficiente.',
    level: 2,
    icon: '🌍',
    xp_reward: 200,
    goals: ['invest'],
    lessons: [
      { id: 'l1', title: 'O que são ETFs?', duration: '6 min' },
      { id: 'l2', title: 'ETFs Globais vs Regionais', duration: '7 min' },
      { id: 'l3', title: 'Como Comprar ETFs em Portugal', duration: '8 min' },
      { id: 'l4', title: 'Estratégia Dollar-Cost Averaging', duration: '6 min' },
    ],
    quizQuestions: 5,
  },
  {
    id: 'portfolio-building',
    title: 'Construir um Portfolio',
    description: 'Cria e gere um portfolio diversificado para o longo prazo.',
    level: 3,
    icon: '🗂️',
    xp_reward: 220,
    goals: ['invest'],
    lessons: [
      { id: 'l1', title: 'Alocação de Ativos', duration: '7 min' },
      { id: 'l2', title: 'Rebalancear o Portfolio', duration: '6 min' },
      { id: 'l3', title: 'Investir em Crise', duration: '8 min' },
      { id: 'l4', title: 'Impostos sobre Investimentos', duration: '7 min' },
    ],
    quizQuestions: 5,
  },

  // ── EMERGENCY_FUND ──
  {
    id: 'emergency-fund-basics',
    title: 'Criar Fundo de Emergência',
    description: 'Constrói a tua rede de segurança financeira passo a passo.',
    level: 1,
    icon: '🛡️',
    xp_reward: 120,
    goals: ['emergency_fund'],
    lessons: [
      { id: 'l1', title: 'Porque Precisas de Emergências?', duration: '5 min' },
      { id: 'l2', title: 'Quanto Poupar?', duration: '6 min' },
      { id: 'l3', title: 'Onde Guardar o Fundo', duration: '5 min' },
      { id: 'l4', title: 'Atingir €1.000 em 3 Meses', duration: '7 min' },
    ],
    quizQuestions: 5,
  },
  {
    id: 'financial-security',
    title: 'Segurança Financeira',
    description: 'Protege-te de imprevistos com seguros, reservas e planeamento.',
    level: 2,
    icon: '🔐',
    xp_reward: 150,
    goals: ['emergency_fund'],
    lessons: [
      { id: 'l1', title: 'Seguros Essenciais', duration: '7 min' },
      { id: 'l2', title: 'Perda de Emprego: O que Fazer', duration: '8 min' },
      { id: 'l3', title: 'Despesas Inesperadas Comuns', duration: '6 min' },
      { id: 'l4', title: 'Plano B Financeiro', duration: '7 min' },
    ],
    quizQuestions: 5,
  },
  {
    id: 'resilience-advanced',
    title: 'Resiliência Financeira Avançada',
    description: 'Vai além do fundo básico e constrói uma fortaleza financeira.',
    level: 3,
    icon: '💪',
    xp_reward: 180,
    goals: ['emergency_fund'],
    lessons: [
      { id: 'l1', title: 'Fundo de 12 Meses', duration: '6 min' },
      { id: 'l2', title: 'Diversificar Fontes de Rendimento', duration: '8 min' },
      { id: 'l3', title: 'Investir o Excesso do Fundo', duration: '7 min' },
      { id: 'l4', title: 'Revisão Anual do Plano', duration: '5 min' },
    ],
    quizQuestions: 5,
  },

  // ── RETIREMENT ──
  {
    id: 'retirement-planning',
    title: 'Planear a Reforma',
    description: 'Garante o teu futuro com planeamento inteligente desde hoje.',
    level: 1,
    icon: '🏖️',
    xp_reward: 200,
    goals: ['retirement'],
    lessons: [
      { id: 'l1', title: 'Quanto Precisas para a Reforma?', duration: '8 min' },
      { id: 'l2', title: 'PPR e Benefícios Fiscais', duration: '10 min' },
      { id: 'l3', title: 'Estratégias por Idade', duration: '7 min' },
      { id: 'l4', title: 'Criar Rendimento na Reforma', duration: '6 min' },
    ],
    quizQuestions: 5,
  },
  {
    id: 'tax-optimization',
    title: 'Otimização Fiscal',
    description: 'Estratégias legais para pagar menos impostos e guardar mais.',
    level: 2,
    icon: '📋',
    xp_reward: 200,
    goals: ['retirement'],
    lessons: [
      { id: 'l1', title: 'Escalões de IRS', duration: '7 min' },
      { id: 'l2', title: 'Deduções Fiscais', duration: '8 min' },
      { id: 'l3', title: 'Benefícios Fiscais', duration: '10 min' },
      { id: 'l4', title: 'Planeamento Fiscal Anual', duration: '6 min' },
    ],
    quizQuestions: 5,
  },
  {
    id: 'passive-income',
    title: 'Rendimentos Passivos',
    description: 'Constrói fontes de rendimento que trabalham enquanto dormes.',
    level: 3,
    icon: '💸',
    xp_reward: 220,
    goals: ['retirement'],
    lessons: [
      { id: 'l1', title: 'Tipos de Rendimento Passivo', duration: '7 min' },
      { id: 'l2', title: 'Dividendos e Rendas', duration: '8 min' },
      { id: 'l3', title: 'Imobiliário como Investimento', duration: '9 min' },
      { id: 'l4', title: 'Liberdade Financeira', duration: '6 min' },
    ],
    quizQuestions: 5,
  },
];

// Filter courses for a given financial goal
export function getCoursesForGoal(goal) {
  return ALL_COURSES.filter(
    (c) => c.goals.includes('all') || c.goals.includes(goal)
  );
}

export const GOAL_LABELS = {
  save_more: 'Poupar Mais',
  reduce_debt: 'Reduzir Dívidas',
  invest: 'Investir',
  emergency_fund: 'Fundo de Emergência',
  retirement: 'Reforma',
};

export const GOAL_ICONS = {
  save_more: '💰',
  reduce_debt: '🎯',
  invest: '📈',
  emergency_fund: '🛡️',
  retirement: '🏖️',
};