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
}): string[] {
  const reasons: string[] = []
  if (input.disciplinePct < 50) reasons.push('Disciplina diária abaixo de 50%')
  if (input.projectionPct < 80) reasons.push('Projeção abaixo de 80% da meta')
  if (input.overdueActions > 0) reasons.push(quantity(input.overdueActions, 'ação atrasada', 'ações atrasadas'))
  if (input.blockedActions > 0) reasons.push(quantity(input.blockedActions, 'ação bloqueada', 'ações bloqueadas'))
  if (input.pendingClosures > 0) reasons.push(quantity(input.pendingClosures, 'fechamento pendente', 'fechamentos pendentes'))
  if (input.consultingEvidencePending > 0) reasons.push(quantity(input.consultingEvidencePending, 'evidência de consultoria pendente', 'evidências de consultoria pendentes'))
  if (input.consultingParticipantsPending > 0) reasons.push(quantity(input.consultingParticipantsPending, 'participante obrigatório sem confirmação', 'participantes obrigatórios sem confirmação'))
  return reasons
}
