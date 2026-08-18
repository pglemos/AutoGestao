export type ProgramSummaryInput = {
  product_name: string | null
  program_template_key: string | null
  modality: string | null
  contract_start_date: string | null
  contract_end_date: string | null
  visits: Array<{
    visit_number: number | null
    status: string | null
    is_onboarding?: boolean | null
    consultant_name?: string | null
  }>
  responsible_consultant?: string | null
}

export type ProgramSummary = {
  configured: boolean
  product_name: string | null
  program_template_key: string | null
  modality: string | null
  contract_start_date: string | null
  contract_end_date: string | null
  visits: number
  completed_visits: number
  onboarding_visits: number
  progress: number
  responsible_consultant: string | null
}

/**
 * Resumo do programa contratado do cliente (Base44 ProgramCard): produto,
 * modalidade, vigência, jornada vinculada, progresso e consultor responsável.
 */
export function buildProgramSummary(input: ProgramSummaryInput): ProgramSummary {
  const visits = input.visits ?? []
  const completed = visits.filter(visit =>
    ['concluida', 'concluído', 'concluido', 'realizada'].includes(String(visit.status ?? '').toLowerCase()),
  ).length
  const onboarding = visits.filter(visit => visit.is_onboarding === true).length
  const consultant = visits.find(visit => visit.consultant_name)?.consultant_name ?? input.responsible_consultant ?? null
  const configured = Boolean(
    (input.product_name ?? '').trim() || (input.program_template_key ?? '').trim(),
  )

  return {
    configured,
    product_name: input.product_name ?? null,
    program_template_key: input.program_template_key ?? null,
    modality: input.modality ?? null,
    contract_start_date: input.contract_start_date ?? null,
    contract_end_date: input.contract_end_date ?? null,
    visits: visits.length,
    completed_visits: completed,
    onboarding_visits: onboarding,
    progress: visits.length > 0 ? Math.min(100, Math.round((completed / visits.length) * 100)) : 0,
    responsible_consultant: consultant,
  }
}

