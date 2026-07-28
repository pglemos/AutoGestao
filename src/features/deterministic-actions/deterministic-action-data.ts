import type {
  DeterministicAction,
  DeterministicActionInput,
  ManualCompletionItem,
  TargetPaceInfo,
} from '@/lib/deterministic-actions'

export interface OpportunityRow {
  id: string
  cliente_id: string
  etapa: string
  valor_negociado?: number | string | null
  closed_at?: string | null
  cancelada_em?: string | null
  cancelada_por?: string | null
  motivo_cancelamento?: string | null
  motivo_perda?: string | null
  created_at?: string | null
  updated_at?: string | null
  seller_user_id?: string | null
}

export interface CustomerRow {
  id: string
  nome: string
  status?: string | null
  proxima_acao?: string | null
  proxima_acao_em?: string | null
  ultima_interacao?: string | null
  seller_user_id?: string | null
  do_not_contact?: boolean | null
}

export interface AppointmentRow {
  id: string
  cliente_id: string | null
  oportunidade_id?: string | null
  data_hora: string
  status: string
}

export interface ProposalEventRow {
  id: string
  cliente_id: string
  oportunidade_id?: string | null
  data_evento: string
}

export interface DeterministicResolutionRow {
  action_id: string
  scenario_code: string
  opportunity_id?: string | null
  customer_id?: string | null
  completed_at: string
  completed_by: string
  rule_version: string
}

export interface DeterministicActionRows {
  opportunities: OpportunityRow[]
  customers: CustomerRow[]
  appointments: AppointmentRow[]
  proposalEvents: ProposalEventRow[]
  resolutions: DeterministicResolutionRow[]
}

export interface DeterministicActionContext {
  refDate: string
  role: DeterministicActionInput['role']
  userId: string
  storeId: string
  targetPace?: TargetPaceInfo
}

const SOURCE_BOUND_SCENARIOS = new Set([
  'OVERDUE_ACTION',
  'MISSING_NEXT_STEP',
  'UNCONFIRMED_VISIT',
  'PROPOSAL_NO_RETURN',
  'PENDING_CLOSING',
])

function toNumber(value: number | string | null | undefined): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function saoPauloDateTime(value: string): { date: string; time: string } {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return { date: value.substring(0, 10), time: '' }
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Sao_Paulo',
  }).formatToParts(date)

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  }
}

function formatCompletedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(date)
}

export function toManualCompletions(
  resolutions: DeterministicResolutionRow[],
): ManualCompletionItem[] {
  return resolutions.map((resolution) => ({
    taskId: resolution.action_id,
    scenarioCode: resolution.scenario_code,
    opportunityId: resolution.opportunity_id || null,
    customerId: resolution.customer_id || null,
    completedAt: resolution.completed_at,
    completedBy: resolution.completed_by,
  }))
}

export function buildDeterministicActionInput(
  rows: DeterministicActionRows,
  context: DeterministicActionContext,
): DeterministicActionInput {
  const latestProposalByOpportunity = new Map<string, ProposalEventRow>()

  for (const proposal of [...rows.proposalEvents].sort((left, right) =>
    right.data_evento.localeCompare(left.data_evento),
  )) {
    if (!proposal.oportunidade_id || latestProposalByOpportunity.has(proposal.oportunidade_id)) continue
    latestProposalByOpportunity.set(proposal.oportunidade_id, proposal)
  }

  return {
    refDate: context.refDate,
    role: context.role,
    userId: context.userId,
    storeId: context.storeId,
    targetPace: context.targetPace,
    opportunities: rows.opportunities.map((opportunity) => ({
      id: opportunity.id,
      cliente_id: opportunity.cliente_id,
      etapa: opportunity.etapa,
      valor: toNumber(opportunity.valor_negociado),
      closed_at: opportunity.closed_at || null,
      cancelada_em: opportunity.cancelada_em || null,
      cancelada_por: opportunity.cancelada_por || null,
      motivo_cancelamento: opportunity.motivo_cancelamento || null,
      motivo_perda: opportunity.motivo_perda || null,
      created_at: opportunity.created_at || null,
      updated_at: opportunity.updated_at || null,
      vendedor_id: opportunity.seller_user_id || null,
    })),
    customers: rows.customers.map((customer) => ({
      id: customer.id,
      nome: customer.nome,
      status: customer.status || null,
      proxima_acao: customer.proxima_acao || null,
      proxima_acao_em: customer.proxima_acao_em || null,
      ultima_interacao: customer.ultima_interacao || null,
      vendedor_id: customer.seller_user_id || null,
      do_not_contact: customer.do_not_contact === true,
    })),
    appointments: rows.appointments.flatMap((appointment) => {
      if (!appointment.cliente_id) return []
      const dateTime = saoPauloDateTime(appointment.data_hora)
      return [{
        id: appointment.id,
        cliente_id: appointment.cliente_id,
        oportunidade_id: appointment.oportunidade_id || null,
        data_agendamento: dateTime.date,
        horario: dateTime.time || null,
        status: appointment.status,
      }]
    }),
    proposals: [...latestProposalByOpportunity.values()].map((proposal) => ({
      id: proposal.id,
      oportunidade_id: proposal.oportunidade_id!,
      cliente_id: proposal.cliente_id,
      created_at: proposal.data_evento,
      status: 'sent',
    })),
  }
}

export function applyDeterministicResolutions(
  actions: DeterministicAction[],
  resolutions: DeterministicResolutionRow[],
): DeterministicAction[] {
  const resolutionByAction = new Map(
    resolutions.map((resolution) => [
      `${resolution.action_id}:${resolution.rule_version}`,
      resolution,
    ]),
  )
  const output: DeterministicAction[] = []

  for (const action of actions) {
    const resolution = resolutionByAction.get(`${action.id}:${action.ruleVersion}`)
    if (!resolution) {
      output.push(action)
      continue
    }

    if (!SOURCE_BOUND_SCENARIOS.has(action.scenarioCode)) continue

    output.push({
      ...action,
      id: `act-origin-pending-${action.id}`,
      scenarioCode: 'AUTOMATIC_TASK_ORIGIN_PENDING',
      title: `Pendência de origem ainda ativa — ${action.title}`,
      explanation: `A ação foi marcada como tratada em ${formatCompletedAt(resolution.completed_at)}, mas a condição de origem continua presente nos dados oficiais.`,
      priority: 'high',
      actionType: 'REGULARIZE_ORIGIN',
      evidence: {
        originalActionId: action.id,
        originalScenarioCode: action.scenarioCode,
        completedAt: resolution.completed_at,
        completedBy: resolution.completed_by,
        sourceEvidence: action.evidence,
      },
      resolutionKey: 'ORIGIN_ENTITY_RESOLVED',
    })
  }

  return output
}

export function filterResolvedActions(
  actions: DeterministicAction[],
  resolutions: DeterministicResolutionRow[],
): DeterministicAction[] {
  return applyDeterministicResolutions(actions, resolutions)
}
