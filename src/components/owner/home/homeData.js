// Snapshot legado preservado apenas para referência visual fora do bundle ativo.

export const STATUS_STYLES = {
  good: {
    label: "Bom",
    dot: "bg-primary",
    text: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    gauge: "text-primary",
    cardAccent: "border-primary/30",
  },
  attention: {
    label: "Atenção",
    dot: "bg-status-warning",
    text: "text-status-warning-text",
    bg: "bg-status-warning-surface",
    border: "border-status-warning/30",
    gauge: "text-status-warning-text",
    cardAccent: "border-status-warning/30",
  },
  critical: {
    label: "Crítico",
    dot: "bg-status-error",
    text: "text-status-error-text",
    bg: "bg-status-error-surface",
    border: "border-status-error/30",
    gauge: "text-status-error-text",
    cardAccent: "border-status-error/30",
  },
};

export const ICON_STYLES = {
  green: "bg-primary/10 text-primary",
  blue: "bg-status-info-surface text-status-info-text",
  purple: "bg-status-info-surface text-status-info-text",
  orange: "bg-status-warning-surface text-status-warning-text",
};

export const SPARK_COLORS = {
  green: "text-primary",
  blue: "text-status-info-text",
  purple: "text-status-info-text",
  orange: "text-status-warning-text",
};

export const mainIndicators = [
  {
    id: "forecast",
    title: "Previsão de Vendas Hoje",
    value: "2 vendas",
    complement: "6 agendamentos · Necessidade: 1,2/dia",
    trend: "Acima da necessidade do dia",
    trendUp: true,
    status: "good",
    icon: "calendarCheck",
    iconColor: "green",
    sparkline: [1, 1.2, 1.5, 1.8, 2, 2, 2, 2],
    sparkColor: "green",
  },
  {
    id: "profit",
    title: "Lucro Bruto",
    value: "R$ 218.450",
    trend: "▲ 14% vs. mês anterior",
    trendUp: true,
    status: "good",
    icon: "dollar",
    iconColor: "green",
    sparkline: [12, 15, 13, 18, 16, 20, 19, 22],
    sparkColor: "green",
  },
  {
    id: "volume",
    title: "Volume de Vendas",
    value: "18 veículos",
    complement: "Meta: 30",
    trend: "▲ 12% vs. mês anterior",
    trendUp: true,
    status: "attention",
    icon: "car",
    iconColor: "purple",
    sparkline: [5, 8, 6, 10, 12, 9, 14, 18],
    sparkColor: "purple",
  },
  {
    id: "stock",
    title: "Estoque",
    value: "42 veículos",
    complement: "11 acima de 60 dias",
    trend: "▼ 6 vs. mês anterior",
    trendUp: false,
    status: "critical",
    icon: "package",
    iconColor: "orange",
    sparkline: [48, 46, 45, 44, 43, 44, 42, 42],
    sparkColor: "orange",
  },
];

export const mxScore = {
  value: 71,
  classification: "Atenção",
  status: "attention",
  trend: "▲ 3 pontos vs. mês anterior",
  infoText:
    "Índice demonstrativo para validação da experiência. A fórmula final será definida na especificação funcional.",
};

export const salesGoal = {
  target: 30,
  achievement: 60,
  sold: 18,
  remaining: 12,
  idealPace: 1.2,
  projection: 26,
  message: "Mantido o ritmo atual, a loja encerrará o mês quatro veículos abaixo da meta.",
  action: "Ver diagnóstico comercial",
};

export const priorityIntervention = {
  title: "Estoque acima de 60 dias",
  status: "critical",
  situation: "11 veículos representam R$ 980.000 em capital imobilizado.",
  details: [
    "26% do estoque em quantidade",
    "41% do capital total de estoque",
    "3 veículos sem proposta nos últimos 30 dias",
  ],
  why: "O estoque envelhecido está reduzindo o giro do capital, aumentando o custo financeiro e pressionando a margem da loja.",
  direction:
    "Revisar os cinco veículos mais críticos e aprovar hoje uma estratégia de preço, campanha ou troca de estoque.",
  impact: [
    "Potencial de liberar R$ 410.000 em capital",
    "Redução estimada de R$ 18.000 na margem planejada",
    "Melhoria esperada no giro do estoque",
  ],
  actions: [
    { label: "Analisar veículos", icon: "search" },
    { label: "Criar plano de ação", icon: "clipboard" },
    { label: "Delegar ao gerente", icon: "user" },
    { label: "Falar com Consultor", icon: "message", consultant: true },
  ],
};

export const ownerActions = [
  { time: "08:30", title: "Revisar os 11 veículos acima de 60 dias" },
  { time: "10:00", title: "Aprovar estratégia de preço dos cinco veículos críticos" },
  { time: "14:00", title: "Alinhar conversão e leads atrasados com o gerente comercial" },
  { time: "16:00", title: "Revisar margem e política de descontos" },
  { time: "16:30", title: "Validar plano de ação pendente" },
];

export const secondaryAlerts = [
  { id: 1, title: "Conversão abaixo da meta", department: "Comercial", info: "9,8% contra meta de 12%", deadline: "Hoje" },
  { id: 2, title: "Leads sem atendimento", department: "Comercial", info: "14 leads aguardando há mais de 2 horas", deadline: "Hoje" },
  { id: 3, title: "Margem abaixo do ideal", department: "Financeiro", info: "18,7% contra meta de 20%", deadline: "2 dias" },
  { id: 4, title: "Vendedores sem atividade", department: "Pessoas", info: "2 vendedores sem atividade registrada", deadline: "3 dias" },
  { id: 5, title: "Plano de ação atrasado", department: "Geral", info: "Ação vencida há 5 dias", deadline: "Hoje" },
];

export const departments = [
  {
    id: "commercial",
    name: "Comercial",
    score: 72,
    status: "attention",
    indicators: ["18 vendas de uma meta de 30", "Conversão: 9,8%", "Meta de conversão: 12%"],
    keyPoint: "Conversão abaixo da meta",
    direction: "Revisar atendimento dos leads e desempenho por vendedor.",
    impact: "Risco de não atingir a meta mensal de vendas.",
    causes: ["Tempo de resposta alto nos leads", "Pipeline não estruturado", "Vendedores sem atividade registrada"],
    ownerRole: "Aprovar metas e cobrar resultados.",
    managerRole: "Executar o acompanhamento diário dos vendedores.",
    actions: ["Ver leads", "Criar ação", "Falar com Consultor"],
  },
  {
    id: "marketing",
    name: "Marketing",
    score: 68,
    status: "attention",
    indicators: ["62 leads gerados", "25 leads qualificados", "Qualificação: 40%", "Meta: 55%"],
    keyPoint: "Leads qualificados abaixo do ideal",
    direction: "Revisar campanhas, origem e critérios de qualificação.",
    impact: "Volume de leads qualificados insuficiente para a meta comercial.",
    causes: ["Campanhas com baixa segmentação", "Critérios de qualificação pouco claros", "Origem dos leads concentrada"],
    ownerRole: "Aprovar investimento em campanhas.",
    managerRole: "Acompanhar qualidade e volume dos leads.",
    actions: ["Ver campanhas", "Criar ação", "Falar com Consultor"],
  },
  {
    id: "product_stock",
    name: "Produto e Estoque",
    score: 61,
    status: "critical",
    indicators: ["42 veículos em estoque", "11 acima de 60 dias", "R$ 980.000 em capital imobilizado"],
    keyPoint: "11 veículos estão há mais de 60 dias no estoque.",
    direction: "Revisar os cinco veículos mais críticos e aprovar uma estratégia de saída até o fim do dia.",
    impact: "R$ 980.000 em capital imobilizado.",
    causes: ["Preço acima do mercado", "Baixa exposição", "Baixa procura", "Compra inadequada", "Margem planejada incompatível"],
    ownerRole: "Aprovar margem mínima e estratégia.",
    managerRole: "Executar as mudanças e acompanhar propostas.",
    actions: ["Ver veículos", "Criar ação", "Falar com Consultor"],
  },
  {
    id: "financial",
    name: "Financeiro",
    score: 74,
    status: "attention",
    indicators: ["Margem: 18,7%", "Meta: 20%", "Despesas 7% acima do planejado"],
    keyPoint: "Margem abaixo do plano",
    direction: "Revisar descontos e despesas extraordinárias.",
    impact: "Margem da loja abaixo da meta estabelecida.",
    causes: ["Descontos acima do ideal", "Despesas extraordinárias não previstas", "Comissões desalinhadas"],
    ownerRole: "Aprovar política de descontos.",
    managerRole: "Controlar despesas e acompanhar margem por venda.",
    actions: ["Ver relatório", "Criar ação", "Falar com Consultor"],
  },
  {
    id: "operations",
    name: "Operações",
    score: 82,
    status: "good",
    indicators: ["Prazo de preparação: 4,8 dias", "Meta: até 5 dias", "Documentação no prazo: 92%"],
    keyPoint: "Operação dentro do esperado",
    direction: "Manter acompanhamento, sem intervenção direta.",
    impact: "Operação dentro do esperado, sem impacto negativo.",
    causes: ["Processo documental consistente", "Equipe alinhada"],
    ownerRole: "Manter acompanhamento periódico.",
    managerRole: "Garantir continuidade dos indicadores.",
    actions: ["Ver indicadores", "Criar ação", "Falar com Consultor"],
  },
  {
    id: "people_hr",
    name: "Pessoas — RH",
    score: 69,
    status: "attention",
    indicators: ["2 vendedores sem atividade", "PDI do gerente: 65%", "1 vaga prioritária em análise"],
    keyPoint: "Dependência excessiva do Dono",
    direction: "Cobrar a atuação do gerente antes de intervir diretamente na equipe.",
    impact: "Dependência do Dono limita a escalabilidade da operação.",
    causes: ["Gerente com baixa autonomia", "Processos não delegados", "Falta de clareza de responsabilidades"],
    ownerRole: "Cobrar atuação do gerente e definir autonomia.",
    managerRole: "Assumir a rotina da equipe e reportar resultados.",
    actions: ["Ver equipe", "Criar ação", "Falar com Consultor"],
  },
];
