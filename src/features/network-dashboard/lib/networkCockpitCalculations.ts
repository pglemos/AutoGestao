import type { NetworkDataAvailability, NetworkGoalAvailability } from '../types'

export function calculateTraceableProgress({ completed, total }: { completed: number; total: number }) {
  const safeCompleted = Math.max(0, Number(completed) || 0)
  const safeTotal = Math.max(0, Number(total) || 0)
  return {
    completed: safeCompleted,
    total: safeTotal,
    percentage: safeTotal > 0 ? Math.round((safeCompleted / safeTotal) * 100) : null,
  }
}

const quantity = (value: number, singular: string, plural: string) => `${value} ${value === 1 ? singular : plural}`

export function buildStoreRiskReasons(input: {
  disciplinePct: number
  projectionPct: number
  overdueActions: number
  blockedActions: number
  pendingClosures: number
  consultingEvidencePending: number
  consultingParticipantsPending: number
  awaitingValidationActions?: number
  goalConfigured?: boolean
  goalDataState?: NetworkGoalAvailability
  operationalDataState?: NetworkDataAvailability
  disciplineDataState?: NetworkDataAvailability
}): string[] {
  const reasons: string[] = []
  const goalDataState = input.goalDataState ?? (input.goalConfigured === false ? 'not_configured' : 'configured')
  const operationalDataState = input.operationalDataState ?? 'available'
  const disciplineDataState = input.disciplineDataState ?? 'available'

  if (goalDataState === 'not_configured') reasons.push('Meta mensal não configurada')
  if (goalDataState === 'unknown') reasons.push('Configuração da meta não confirmada')
  if (operationalDataState === 'no_data') reasons.push('Sem dados operacionais no período')
  if (operationalDataState === 'unknown') reasons.push('Disponibilidade operacional não confirmada')
  if (disciplineDataState === 'no_data') reasons.push('Sem dados de disciplina no período')
  if (disciplineDataState === 'unknown') reasons.push('Disponibilidade da disciplina não confirmada')
  if (disciplineDataState === 'available' && input.disciplinePct < 50) reasons.push('Disciplina diária abaixo de 50%')
  if (operationalDataState === 'available' && goalDataState === 'configured' && input.projectionPct < 80) reasons.push('Projeção abaixo de 80% da meta')
  if (input.overdueActions > 0) reasons.push(quantity(input.overdueActions, 'ação atrasada', 'ações atrasadas'))
  if (input.blockedActions > 0) reasons.push(quantity(input.blockedActions, 'ação bloqueada', 'ações bloqueadas'))
  if ((input.awaitingValidationActions ?? 0) > 0) reasons.push(quantity(input.awaitingValidationActions ?? 0, 'ação aguardando validação', 'ações aguardando validação'))
  if (input.pendingClosures > 0) reasons.push(quantity(input.pendingClosures, 'fechamento pendente', 'fechamentos pendentes'))
  if (input.consultingEvidencePending > 0) reasons.push(quantity(input.consultingEvidencePending, 'evidência de consultoria pendente', 'evidências de consultoria pendentes'))
  if (input.consultingParticipantsPending > 0) reasons.push(quantity(input.consultingParticipantsPending, 'participante obrigatório sem confirmação', 'participantes obrigatórios sem confirmação'))
  return reasons
}
