export type ReadinessSeverity = 'impeditivo' | 'informativo'

export type ReadinessCheck = {
  key: string
  label: string
  severity: ReadinessSeverity
  ok: boolean
  detail: string
}

export type ClientReadinessInput = {
  status: string | null
  primary_store_id: string | null
  product_name: string | null
  program_template_key: string | null
  modality: string | null
  cnpj: string | null
  contract_start_date: string | null
  implementation_owner_id: string | null
  units: Array<{ name: string | null; is_primary: boolean | null }>
  contacts: Array<{ name: string | null; is_primary: boolean | null; email: string | null }>
  modules: Array<{ enabled: boolean | null }>
  assignments: Array<{ active: boolean | null }>
  /** Outro cliente já ativo na mesma loja bloqueia a ativação (índice parcial). */
  storeTakenByOtherClient: boolean
}

/**
 * Checklist de prontidão para ativar um cliente.
 *
 * Os impeditivos são os que o banco realmente recusa
 * (`clientes_consultoria_active_requires_store_check` e o índice
 * `one_active_per_store`) mais o mínimo operacional para a jornada existir:
 * produto, consultor e ao menos um módulo. O resto é informativo — não trava
 * a ativação, mas aparece para a equipe decidir.
 */
export function buildClientReadiness(input: ClientReadinessInput): ReadinessCheck[] {
  const namedUnits = input.units.filter(unit => (unit.name ?? '').trim())
  const primaryContact = input.contacts.find(contact => contact.is_primary && (contact.name ?? '').trim())
  const enabledModules = input.modules.filter(module => module.enabled !== false)
  const activeAssignments = input.assignments.filter(assignment => assignment.active !== false)

  return [
    {
      key: 'loja-principal',
      label: 'Loja principal vinculada',
      severity: 'impeditivo',
      ok: Boolean(input.primary_store_id),
      detail: input.primary_store_id ? 'Cliente vinculado a uma loja do sistema.' : 'Sem loja principal o cliente não pode ficar ativo.',
    },
    {
      key: 'loja-livre',
      label: 'Loja sem outro cliente ativo',
      severity: 'impeditivo',
      ok: !input.storeTakenByOtherClient,
      detail: input.storeTakenByOtherClient ? 'Já existe outro cliente ativo nesta loja.' : 'A loja aceita este cliente.',
    },
    {
      key: 'produto',
      label: 'Produto contratado',
      severity: 'impeditivo',
      ok: Boolean((input.product_name ?? '').trim() || (input.program_template_key ?? '').trim()),
      detail: 'Define a jornada de encontros do cliente.',
    },
    {
      key: 'consultor',
      label: 'Consultor responsável',
      severity: 'impeditivo',
      ok: activeAssignments.length > 0,
      detail: activeAssignments.length ? `${activeAssignments.length} consultor(es) na carteira.` : 'Nenhum consultor atribuído.',
    },
    {
      key: 'modulos',
      label: 'Módulos liberados',
      severity: 'impeditivo',
      ok: enabledModules.length > 0,
      detail: enabledModules.length ? `${enabledModules.length} módulo(s) liberado(s).` : 'Sem módulo liberado o cliente entra sem acesso.',
    },
    {
      key: 'unidade',
      label: 'Estrutura de lojas cadastrada',
      severity: 'informativo',
      ok: namedUnits.length > 0,
      detail: namedUnits.length ? `${namedUnits.length} unidade(s) cadastrada(s).` : 'Nenhuma unidade cadastrada.',
    },
    {
      key: 'contato',
      label: 'Contato principal',
      severity: 'informativo',
      ok: Boolean(primaryContact),
      detail: primaryContact ? `${primaryContact.name}` : 'Nenhum contato principal definido.',
    },
    {
      key: 'cnpj',
      label: 'CNPJ informado',
      severity: 'informativo',
      ok: Boolean((input.cnpj ?? '').trim()),
      detail: 'Necessário para emissão e conciliação.',
    },
    {
      key: 'contrato',
      label: 'Início de contrato',
      severity: 'informativo',
      ok: Boolean(input.contract_start_date),
      detail: 'Base para a contagem da jornada.',
    },
    {
      key: 'responsavel-mx',
      label: 'Responsável MX pela implantação',
      severity: 'informativo',
      ok: Boolean(input.implementation_owner_id),
      detail: 'Quem responde pelo onboarding.',
    },
  ]
}

export function readinessSummary(checks: ReadinessCheck[]) {
  const blockers = checks.filter(check => check.severity === 'impeditivo' && !check.ok)
  const warnings = checks.filter(check => check.severity === 'informativo' && !check.ok)
  return {
    blockers,
    warnings,
    canActivate: blockers.length === 0,
    completed: checks.filter(check => check.ok).length,
    total: checks.length,
  }
}

/** Progresso da jornada em percentual inteiro. */
export function journeyProgress(visits: Array<{ status: string | null }>, totalVisits: number) {
  if (totalVisits <= 0) return 0
  const done = visits.filter(visit => ['concluida', 'concluído', 'concluido', 'realizada'].includes(String(visit.status ?? '').toLowerCase())).length
  return Math.min(100, Math.round((done / totalVisits) * 100))
}
