import type { RankingEntry } from '@/types/database'

export type ManagerTeamView = 'all' | 'result' | 'consistency'
export type ManagerTeamStatus = 'critical' | 'attention' | 'on_track' | 'not_applicable'

export type ManagerTeamCard = {
  row: RankingEntry
  result: number | null
  routine: number | null
  discipline: number | null
  consistency: number | null
  overallStatus: ManagerTeamStatus
  resultStatus: ManagerTeamStatus
  consistencyStatus: ManagerTeamStatus
  reason: string
  managementIndex: number | null
}

export type ManagerTeamGroups = Record<ManagerTeamStatus, ManagerTeamCard[]>

type ResultBand = 'strong' | 'close' | 'below' | 'far_below'
type ConsistencyBand = 'high' | 'medium' | 'low'

const STATUS_MATRIX: Record<ResultBand, Record<ConsistencyBand, Exclude<ManagerTeamStatus, 'not_applicable'>>> = {
  strong: { high: 'on_track', medium: 'attention', low: 'attention' },
  close: { high: 'on_track', medium: 'attention', low: 'attention' },
  below: { high: 'attention', medium: 'attention', low: 'critical' },
  far_below: { high: 'attention', medium: 'critical', low: 'critical' },
}

export const MANAGER_TEAM_COLUMN_GUIDANCE: Record<ManagerTeamView, Record<Exclude<ManagerTeamStatus, 'not_applicable'>, { title: string; detail: string }>> = {
  all: {
    critical: { title: 'Como avançar para Atenção', detail: 'Melhore a combinação entre Resultado e Consistência. Consulte o próximo passo de cada vendedor.' },
    attention: { title: 'Como avançar para Em dia', detail: 'O vendedor precisa atingir Resultado ≥ 80% e Consistência ≥ 75%.' },
    on_track: { title: 'Como permanecer Em dia', detail: 'Mantenha Resultado e Consistência dentro do esperado.' },
  },
  result: {
    critical: { title: 'Como avançar para Atenção', detail: 'Atingir pelo menos 80% da meta do período.' },
    attention: { title: 'Como avançar para Em dia', detail: 'Atingir 100% da meta do período.' },
    on_track: { title: 'Como permanecer Em dia', detail: 'Manter o Resultado igual ou superior à meta do período.' },
  },
  consistency: {
    critical: { title: 'Como avançar para Atenção', detail: 'Elevar a Consistência para pelo menos 50%, priorizando o componente com menor desempenho.' },
    attention: { title: 'Como avançar para Em dia', detail: 'Elevar a Consistência para pelo menos 75%.' },
    on_track: { title: 'Como permanecer Em dia', detail: 'Manter Rotina e Disciplina em níveis sustentáveis.' },
  },
}

function resultBand(result: number): ResultBand {
  if (result >= 100) return 'strong'
  if (result >= 80) return 'close'
  if (result >= 50) return 'below'
  return 'far_below'
}

function consistencyBand(consistency: number | null): ConsistencyBand {
  if (consistency !== null && consistency >= 75) return 'high'
  if (consistency !== null && consistency >= 50) return 'medium'
  return 'low'
}

function resultStatus(result: number | null): ManagerTeamStatus {
  if (result === null) return 'not_applicable'
  if (result >= 100) return 'on_track'
  if (result >= 80) return 'attention'
  return 'critical'
}

function consistencyStatus(consistency: number | null): ManagerTeamStatus {
  if (consistency === null) return 'not_applicable'
  if (consistency >= 75) return 'on_track'
  if (consistency >= 50) return 'attention'
  return 'critical'
}

function overallStatus(result: number | null, consistency: number | null): ManagerTeamStatus {
  if (result === null && consistency === null) return 'not_applicable'
  if (result === null) return 'attention'
  if (consistency === null) return 'not_applicable'
  return STATUS_MATRIX[resultBand(result)][consistencyBand(consistency)]
}

function statusReason(status: ManagerTeamStatus, result: number | null, consistency: number | null): string {
  if (status === 'not_applicable') return 'Sem Resultado, Rotina ou Disciplina verificáveis no período.'
  if (result === null) return 'Meta individual não cadastrada; acompanhamento baseado apenas na Consistência disponível.'
  if (consistency === null) return 'Resultado disponível, mas ainda não há Rotina e Disciplina suficientes para calcular a Consistência.'
  if (status === 'on_track') return 'Resultado e Consistência dentro do esperado.'
  if (status === 'attention') return 'Há um pilar próximo do esperado e outro que ainda requer acompanhamento gerencial.'
  return 'Resultado e Consistência abaixo do esperado para o período.'
}

export function buildManagerTeamCard(row: RankingEntry): ManagerTeamCard {
  const result = row.meta > 0 ? (row.vnd_total / row.meta) * 100 : null
  const routine = row.routine_execution ?? null
  const discipline = row.discipline_score ?? null
  const consistency = routine !== null && discipline !== null
    ? routine * 0.7 + discipline * 0.3
    : null
  const status = overallStatus(result, consistency)
  const managementIndex = result !== null && consistency !== null
    ? Math.min(result, 100) * 0.6 + routine! * 0.3 + discipline! * 0.1
    : null

  return {
    row,
    result,
    routine,
    discipline,
    consistency,
    overallStatus: status,
    resultStatus: resultStatus(result),
    consistencyStatus: consistencyStatus(consistency),
    reason: statusReason(status, result, consistency),
    managementIndex,
  }
}

export function getManagerTeamStatus(card: ManagerTeamCard, view: ManagerTeamView): ManagerTeamStatus {
  if (view === 'result') return card.resultStatus
  if (view === 'consistency') return card.consistencyStatus
  return card.overallStatus
}

export function getManagerTeamNextStep(card: ManagerTeamCard, view: ManagerTeamView): string {
  const status = getManagerTeamStatus(card, view)
  if (status === 'not_applicable') return card.reason

  if (view === 'result') {
    if (status === 'critical') return 'Para avançar para Atenção: atingir pelo menos 80% da meta do período.'
    if (status === 'attention') return 'Para ficar Em dia: atingir 100% da meta do período.'
    return 'Para permanecer Em dia: manter o Resultado igual ou superior à meta do período.'
  }

  if (view === 'consistency') {
    const limitingComponent = (card.routine ?? 0) < (card.discipline ?? 0) ? 'Rotina' : 'Disciplina do Fechamento'
    if (status === 'critical') return `Para avançar para Atenção: elevar a Consistência para 50%. Priorize a ${limitingComponent}.`
    if (status === 'attention') return `Para ficar Em dia: elevar a Consistência para 75%. Faltam ${Math.max(0, Math.round(75 - (card.consistency ?? 0)))} pontos percentuais.`
    return 'Para permanecer Em dia: manter a Consistência em 75% ou mais.'
  }

  if (status === 'critical') return 'Para avançar para Atenção: eleve o pilar mais distante do nível esperado.'
  if (status === 'attention') {
    if ((card.result ?? 0) >= 80 && (card.consistency ?? 0) < 75) return 'Resultado já atingido. Eleve a Consistência para 75%.'
    if ((card.consistency ?? 0) >= 75 && (card.result ?? 0) < 80) return 'Consistência já atingida. Eleve o Resultado para 80% da meta.'
    return 'Eleve o Resultado para 80% e a Consistência para 75%.'
  }
  return 'Mantenha Resultado ≥ 80% e Consistência ≥ 75%.'
}

function sortColumn(cards: ManagerTeamCard[], view: ManagerTeamView, status: ManagerTeamStatus): ManagerTeamCard[] {
  const metric = (card: ManagerTeamCard) => view === 'result'
    ? card.result ?? -1
    : view === 'consistency'
      ? card.consistency ?? -1
      : card.managementIndex ?? -1
  return [...cards].sort((left, right) => status === 'on_track' ? metric(right) - metric(left) : metric(left) - metric(right))
}

export function groupManagerTeamCards(cards: ManagerTeamCard[], view: ManagerTeamView): ManagerTeamGroups {
  const groups: ManagerTeamGroups = { critical: [], attention: [], on_track: [], not_applicable: [] }
  for (const card of cards) groups[getManagerTeamStatus(card, view)].push(card)
  return {
    critical: sortColumn(groups.critical, view, 'critical'),
    attention: sortColumn(groups.attention, view, 'attention'),
    on_track: sortColumn(groups.on_track, view, 'on_track'),
    not_applicable: groups.not_applicable,
  }
}

export function summarizeManagerTeam(groups: ManagerTeamGroups) {
  const eligible = groups.critical.length + groups.attention.length + groups.on_track.length
  return {
    eligible,
    // Sem vendedor elegível não há percentual: `null`, não 0%. "0% da equipe
    // Em dia" lê-se como time inteiro atrasado quando não há time.
    onTrackPercentage: eligible > 0 ? Math.round((groups.on_track.length / eligible) * 100) : null,
  }
}
