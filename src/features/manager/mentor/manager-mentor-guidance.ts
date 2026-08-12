/**
 * Biblioteca de Orientações do Mentor Gerencial — porte 1:1 do conteúdo do
 * Base44 (`src/lib/mentorOrientacoes.js`). Conteúdo estático de gestão: não
 * depende de dado da operação e por isso vive no repositório, não no banco.
 */

export type MentorGuidanceCategory = 'rotina' | 'pessoas' | 'resultado' | 'desenvolvimento'

export type MentorGuidance = {
  title: string
  category: MentorGuidanceCategory
  duration: string
  highlight?: boolean
  content: string
}

export const MENTOR_GUIDANCE: MentorGuidance[] = [
  {
    title: 'Como conduzir uma reunião matinal',
    category: 'rotina',
    duration: '15 min',
    highlight: true,
    content: 'Inicie sempre com os números do dia anterior. Destaque o top performer do dia. Alinhe as metas individuais de cada vendedor. Defina o foco do dia (prospecção, carteira, showroom). Encerre com uma frase de energia positiva. Duração ideal: 15 minutos.',
  },
  {
    title: 'Como cobrar fechamento diário',
    category: 'rotina',
    duration: '5 min',
    content: 'Seja direto e objetivo. Reforce a importância do registro completo dos dados. Explique que dados incompletos prejudicam a análise da equipe e a previsibilidade da loja. Registre a cobrança no sistema para histórico.',
  },
  {
    title: 'Como realizar feedback individual',
    category: 'pessoas',
    duration: '20 min',
    highlight: true,
    content: 'Use o modelo SCI: Situação, Comportamento, Impacto. Seja específico com exemplos concretos. Ouça o vendedor antes de prescrever. Alinhe um compromisso com prazo de melhoria. Registre o feedback no sistema para acompanhamento.',
  },
  {
    title: 'Como tratar vendedor com baixa rotina',
    category: 'pessoas',
    duration: '30 min',
    content: 'Identifique a causa raiz: é falta de habilidade ou de motivação? Alinhe expectativas claras e mensuráveis. Defina um plano de ação com prazos curtos e acompanhamento diário. Conecte a melhora da rotina ao resultado de vendas.',
  },
  {
    title: 'Como recuperar ritmo de meta',
    category: 'resultado',
    duration: '25 min',
    highlight: true,
    content: 'Calcule quantas vendas são necessárias por dia restante no mês. Distribua a meta proporcional entre os vendedores. Intensifique o acompanhamento diário. Realize uma reunião de alinhamento de urgência com a equipe e redefina prioridades.',
  },
  {
    title: 'Como acompanhar negociação crítica',
    category: 'resultado',
    duration: '15 min',
    content: 'Identifique negociações paradas há mais de 3 dias. Entre em contato com o cliente junto ao vendedor para demonstrar suporte de liderança. Ofereça condições estratégicas quando válido. Registre a evolução da negociação no sistema.',
  },
  {
    title: 'Como montar um PDI de vendedor',
    category: 'desenvolvimento',
    duration: '40 min',
    content: 'Avalie as competências em escala. Identifique o gap prioritário (maior distância entre nota atual e alvo). Selecione 1-3 ações da biblioteca de desenvolvimento. Defina prazos e evidências esperadas. Agende a reunião de acompanhamento.',
  },
  {
    title: 'Como conduzir a conferência de leads',
    category: 'rotina',
    duration: '20 min',
    content: 'Compare o registrado no MX com o oficial do canal. Identifique divergências por vendedor. Corrija os valores com justificativa. Registre a conferência no sistema para auditoria e histórico da operação.',
  },
  {
    title: 'Como reter cliente de carteira parado',
    category: 'pessoas',
    duration: '20 min',
    content: 'Liste os clientes sem contato há mais de 7 dias. Ligue pessoalmente ou peça ao vendedor para ligar na sua presença. Ofereça um motivo real de retorno (novidade, condição, revisão). Registre o contato no sistema.',
  },
  {
    title: 'Como preparar a loja para o fechamento do mês',
    category: 'resultado',
    duration: '30 min',
    content: 'Na última semana, projete o resultado final com a equipe. Identifique os vendedores que podem fechar a meta individual. Redirecione esforços e leads para quem tem maior chance de conversão. Faça o balanço de pendências de fechamento diário.',
  },
  {
    title: 'Como usar o ranking como ferramenta motivacional',
    category: 'desenvolvimento',
    duration: '10 min',
    content: 'Compartilhe o ranking semanalmente em reunião. Reconheça publicamente os 3 primeiros. Use as posições intermediárias como estímulo, não como pressão. Evite expor os últimos de forma humilhante — chame individualmente para orientar.',
  },
  {
    title: 'Como conduzir 1:1 semanal com cada vendedor',
    category: 'desenvolvimento',
    duration: '30 min',
    content: 'Reserve 30 minutos por vendedor por semana. Revise metas, rotina e pendências. Ouça bloqueios. Defina 1-2 prioridades para a semana. Registre os acordos no sistema para cobrar na semana seguinte.',
  },
]

export const MENTOR_GUIDANCE_CATEGORY: Record<MentorGuidanceCategory, { label: string; className: string }> = {
  rotina: { label: 'Rotina', className: 'border-status-info/20 bg-status-info-surface text-status-info-text' },
  pessoas: { label: 'Pessoas', className: 'border-purple-100 bg-purple-50 text-purple-700' },
  resultado: { label: 'Resultado', className: 'border-status-success/20 bg-status-success-surface text-status-success-text' },
  desenvolvimento: { label: 'Desenvolvimento', className: 'border-status-warning/20 bg-status-warning-surface text-status-warning-text' },
}

export const MENTOR_FAVORITES_KEY = 'mx_mentor_favoritos'

export function filterMentorGuidance(
  items: MentorGuidance[],
  { category, search, favorites }: { category: string; search: string; favorites: string[] },
): MentorGuidance[] {
  let list = items
  if (category === 'favoritos') list = list.filter(item => favorites.includes(item.title))
  else if (category !== 'todas') list = list.filter(item => item.category === category)

  const query = search.trim().toLocaleLowerCase('pt-BR')
  if (!query) return list
  return list.filter(item =>
    item.title.toLocaleLowerCase('pt-BR').includes(query)
    || item.content.toLocaleLowerCase('pt-BR').includes(query),
  )
}
