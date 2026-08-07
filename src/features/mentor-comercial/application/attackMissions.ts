/**
 * AttackMissions Application Module (TASK 34 & 35).
 *
 * Gerencia a elegibilidade, estados, regras de engajamento e bloqueios do
 * Plano de Ataque do Mentor Comercial.
 *
 * Invariantes duras:
 *  - 10 missões oficiais do catálogo
 *  - 5 estados de missão (Preparando, Enviando mensagens, Aguardando respostas, Respondendo clientes, Concluída)
 *  - Envio individual (uma mensagem por vez) — disparo em massa é estritamente PROIBIDO
 *  - Deduplicação estrita por cliente por missão
 *  - 4 mensagens exatas de bloqueio/permissão para transição de missões
 */

export type OfficialAttackMission =
  | 'Retomar leads'
  | 'Recuperar visitas'
  | 'Recuperar propostas'
  | 'Reagendar visitas'
  | 'Converter aprovações'
  | 'Gerar visitas'
  | 'Reativar carteira'
  | 'Pedir indicações'
  | 'Campanha de troca'
  | 'Acompanhar garantias'

export const OFFICIAL_ATTACK_MISSIONS: readonly OfficialAttackMission[] = [
  'Retomar leads',
  'Recuperar visitas',
  'Recuperar propostas',
  'Reagendar visitas',
  'Converter aprovações',
  'Gerar visitas',
  'Reativar carteira',
  'Pedir indicações',
  'Campanha de troca',
  'Acompanhar garantias',
] as const

export type MissionState =
  | 'Preparando'
  | 'Enviando mensagens'
  | 'Aguardando respostas'
  | 'Respondendo clientes'
  | 'Concluída'

export const MISSION_STATES: readonly MissionState[] = [
  'Preparando',
  'Enviando mensagens',
  'Aguardando respostas',
  'Respondendo clientes',
  'Concluída',
] as const

export const ATTACK_MISSION_MESSAGES = {
  INCOMPLETE_SENDING:
    'Finalize o envio das mensagens da missão atual antes de iniciar uma nova.',
  AWAITING_CLIENT: 'Você já fez sua parte nesta missão. Pode iniciar outra.',
  CLIENT_RESPONDED_AWAITING_SELLER:
    'Você possui clientes que responderam e aguardam sua ação. Resolva esses retornos antes de iniciar uma nova missão.',
  OVERDUE_PENDING_24H:
    'Antes de iniciar uma nova missão, registre o resultado dos contatos pendentes.',
} as const

export type AttackMissionDefinition = {
  condition: string
  mission: OfficialAttackMission
  objective: string
  whenItAppears: string
  notes: string | null
}

export const ATTACK_MISSION_CATALOG: readonly AttackMissionDefinition[] = [
  {
    condition: 'Cadência encerrada sem resposta',
    mission: 'Retomar leads',
    objective: 'Tentar nova abordagem em grupo',
    whenItAppears: 'Após tentativas concluídas sem resposta',
    notes: 'Não é perda automática',
  },
  {
    condition: 'Visitou e não comprou',
    mission: 'Recuperar visitas',
    objective: 'Retomar clientes com alta intenção',
    whenItAppears: 'Status POR-A03/POR-A04 ou visita realizada sem venda',
    notes: 'Prioridade relevante para aumento de conversão',
  },
  {
    condition: 'Proposta sem retorno',
    mission: 'Recuperar propostas',
    objective: 'Recuperar decisão',
    whenItAppears: 'Status INT-N03 ou equivalente',
    notes: 'Pode gerar vendas rápidas',
  },
  {
    condition: 'Não compareceu',
    mission: 'Reagendar visitas',
    objective: 'Transformar ausência em nova agenda',
    whenItAppears: 'Status INT-V07',
    notes: 'Usar mensagem sem julgamento',
  },
  {
    condition: 'Financiamento aprovado sem fechamento',
    mission: 'Converter aprovações',
    objective: 'Fechar clientes com barreira de crédito superada',
    whenItAppears: 'Status FIN-06',
    notes: 'Alta prioridade',
  },
  {
    condition: 'Cliente qualificado sem visita',
    mission: 'Gerar visitas',
    objective: 'Criar compromisso presencial',
    whenItAppears: 'INT-Q04/INT-Q08',
    notes: 'Principal rotina de aquecimento',
  },
  {
    condition: 'Cliente antigo',
    mission: 'Reativar carteira',
    objective: 'Retomar relacionamento',
    whenItAppears: 'CAR-C03/CAR-C04',
    notes: 'Canal de venda Carteira',
  },
  {
    condition: 'Pós-venda positivo',
    mission: 'Pedir indicações',
    objective: 'Gerar novas oportunidades',
    whenItAppears: 'REL-01/REL-02 com satisfação',
    notes: 'Não automatizar sem cuidado',
  },
  {
    condition: 'Troca futura ativada',
    mission: 'Campanha de troca',
    objective: 'Criar nova compra',
    whenItAppears: 'REL-04/REL-05/REL-06',
    notes: 'Canal Carteira',
  },
  {
    condition: 'Garantia ativa',
    mission: 'Acompanhar garantias',
    objective: 'Proteger relacionamento',
    whenItAppears: 'REL-07/REL-08',
    notes: 'Não é campanha de venda; é retenção',
  },
] as const

export type OpportunityAttackFacts = {
  opportunityId: string
  clientId: string
  statusCode: string
  condition?: string | null
  cadenceStateStatus?: string | null
  attackEligible?: boolean
  clientNeverResponded?: boolean
  visitedWithoutSale?: boolean
  positiveSatisfaction?: boolean
}

export function isOfficialAttackMission(name: string): name is OfficialAttackMission {
  return (OFFICIAL_ATTACK_MISSIONS as readonly string[]).includes(name)
}

export function mapConditionToMission(condition: string): OfficialAttackMission | null {
  const normalized = condition.trim().toLowerCase()
  const item = ATTACK_MISSION_CATALOG.find(
    (entry) => entry.condition.toLowerCase() === normalized,
  )
  return item ? item.mission : null
}

export function getEligibleAttackMission(
  facts: OpportunityAttackFacts,
): OfficialAttackMission | null {
  if (facts.condition) {
    const mapped = mapConditionToMission(facts.condition)
    if (mapped) return mapped
  }

  if (
    facts.attackEligible ||
    facts.cadenceStateStatus === 'completedWithoutResponse' ||
    facts.statusCode === 'INT-C04'
  ) {
    return 'Retomar leads'
  }

  if (
    facts.statusCode === 'POR-A03' ||
    facts.statusCode === 'POR-A04' ||
    facts.visitedWithoutSale === true
  ) {
    return 'Recuperar visitas'
  }

  if (facts.statusCode === 'INT-N03') {
    return 'Recuperar propostas'
  }

  if (facts.statusCode === 'INT-V07') {
    return 'Reagendar visitas'
  }

  if (facts.statusCode === 'FIN-06') {
    return 'Converter aprovações'
  }

  if (facts.statusCode === 'INT-Q04' || facts.statusCode === 'INT-Q08') {
    return 'Gerar visitas'
  }

  if (facts.statusCode === 'CAR-C03' || facts.statusCode === 'CAR-C04') {
    return 'Reativar carteira'
  }

  if (
    (facts.statusCode === 'REL-01' || facts.statusCode === 'REL-02') &&
    facts.positiveSatisfaction !== false
  ) {
    return 'Pedir indicações'
  }

  if (
    facts.statusCode === 'REL-04' ||
    facts.statusCode === 'REL-05' ||
    facts.statusCode === 'REL-06'
  ) {
    return 'Campanha de troca'
  }

  if (facts.statusCode === 'REL-07' || facts.statusCode === 'REL-08') {
    return 'Acompanhar garantias'
  }

  return null
}

export type AttackMissionClientTarget = {
  opportunityId: string
  clientId: string
  messageSent: boolean
  sentAt?: Date | null
  clientResponded?: boolean
  clientRespondedAt?: Date | null
  lastActionAt?: Date | null
  nextActionAt?: Date | null
  pendingSince?: Date | null
}

export type ActiveAttackMission = {
  missionId: string
  missionName: OfficialAttackMission
  state: MissionState
  targets: AttackMissionClientTarget[]
  createdAt: Date
}

export type PendingPortfolioItem = {
  opportunityId: string
  clientId?: string
  clientRespondedAt?: Date | null
  nextActionAt?: Date | null
  pendingSince?: Date | null
  isOverdue24h?: boolean
}

export type NewMissionEvaluationInput = {
  activeMission?: ActiveAttackMission | null
  portfolioPendingItems?: PendingPortfolioItem[]
  now: Date
}

export type CanStartNewMissionResult = {
  canStart: boolean
  message: string
  blockingReason?:
    | 'INCOMPLETE_SENDING'
    | 'CLIENT_RESPONDED_AWAITING_SELLER'
    | 'OVERDUE_PENDING_24H'
  allowedReason?: 'AWAITING_CLIENT' | 'NO_ACTIVE_MISSION'
}

export function canStartNewMission(
  input: NewMissionEvaluationInput,
): CanStartNewMissionResult {
  const { activeMission, portfolioPendingItems = [], now } = input
  const nowMs = now.getTime()
  const MS_24H = 24 * 60 * 60 * 1000

  // 1. Envios incompletos (active mission has unsent messages)
  if (activeMission && activeMission.state !== 'Concluída') {
    const hasUnsent = activeMission.targets.some((t) => !t.messageSent)
    if (
      activeMission.state === 'Preparando' ||
      activeMission.state === 'Enviando mensagens' ||
      hasUnsent
    ) {
      return {
        canStart: false,
        message: ATTACK_MISSION_MESSAGES.INCOMPLETE_SENDING,
        blockingReason: 'INCOMPLETE_SENDING',
      }
    }
  }

  // 2. Cliente respondeu e aguarda vendedor
  const activeMissionHasResponded =
    activeMission &&
    activeMission.state !== 'Concluída' &&
    (activeMission.state === 'Respondendo clientes' ||
      activeMission.targets.some(
        (t) => t.clientResponded === true || t.clientRespondedAt != null,
      ))

  const portfolioHasResponded = portfolioPendingItems.some(
    (item) => item.clientRespondedAt != null,
  )

  if (activeMissionHasResponded || portfolioHasResponded) {
    return {
      canStart: false,
      message: ATTACK_MISSION_MESSAGES.CLIENT_RESPONDED_AWAITING_SELLER,
      blockingReason: 'CLIENT_RESPONDED_AWAITING_SELLER',
    }
  }

  // 3. Pendência com mais de 24h
  const hasOverduePortfolio = portfolioPendingItems.some((item) => {
    if (item.isOverdue24h === true) return true
    if (item.pendingSince && nowMs - item.pendingSince.getTime() > MS_24H) {
      return true
    }
    if (item.nextActionAt && nowMs - item.nextActionAt.getTime() > MS_24H) {
      return true
    }
    return false
  })

  const hasOverdueTarget =
    activeMission &&
    activeMission.state !== 'Concluída' &&
    activeMission.targets.some((t) => {
      if (t.pendingSince && nowMs - t.pendingSince.getTime() > MS_24H) return true
      if (t.nextActionAt && nowMs - t.nextActionAt.getTime() > MS_24H) return true
      return false
    })

  if (hasOverduePortfolio || hasOverdueTarget) {
    return {
      canStart: false,
      message: ATTACK_MISSION_MESSAGES.OVERDUE_PENDING_24H,
      blockingReason: 'OVERDUE_PENDING_24H',
    }
  }

  // 4. Se havia missão ativa e todos os envios foram concluídos sem pendências > 24h e sem respostas pendentes:
  if (activeMission && activeMission.state !== 'Concluída') {
    return {
      canStart: true,
      message: ATTACK_MISSION_MESSAGES.AWAITING_CLIENT,
      allowedReason: 'AWAITING_CLIENT',
    }
  }

  return {
    canStart: true,
    message: ATTACK_MISSION_MESSAGES.AWAITING_CLIENT,
    allowedReason: 'NO_ACTIVE_MISSION',
  }
}

export function createAttackMission(
  missionName: OfficialAttackMission,
  initialOpportunities: OpportunityAttackFacts[] = [],
  now: Date = new Date(),
): ActiveAttackMission {
  if (!isOfficialAttackMission(missionName)) {
    throw new Error(`Missão inválida: "${missionName}"`)
  }

  const targets: AttackMissionClientTarget[] = []
  const seenClientIds = new Set<string>()

  for (const opp of initialOpportunities) {
    const eligible = getEligibleAttackMission(opp)
    if (eligible === missionName) {
      if (!seenClientIds.has(opp.clientId)) {
        seenClientIds.add(opp.clientId)
        targets.push({
          opportunityId: opp.opportunityId,
          clientId: opp.clientId,
          messageSent: false,
        })
      }
    }
  }

  const state: MissionState = targets.length > 0 ? 'Enviando mensagens' : 'Preparando'

  return {
    missionId: `mission_${missionName.replace(/\s+/g, '_')}_${now.getTime()}`,
    missionName,
    state,
    targets,
    createdAt: now,
  }
}

export function addClientToMission(
  mission: ActiveAttackMission,
  opportunity: OpportunityAttackFacts,
): ActiveAttackMission {
  const eligible = getEligibleAttackMission(opportunity)
  if (eligible !== mission.missionName) {
    return mission
  }

  // Deduplicação estrita: "Nunca duplicar cliente numa missão"
  const alreadyInMission = mission.targets.some(
    (t) => t.clientId === opportunity.clientId || t.opportunityId === opportunity.opportunityId,
  )
  if (alreadyInMission) {
    return mission
  }

  const updatedTargets = [
    ...mission.targets,
    {
      opportunityId: opportunity.opportunityId,
      clientId: opportunity.clientId,
      messageSent: false,
    },
  ]

  return {
    ...mission,
    state: mission.state === 'Preparando' ? 'Enviando mensagens' : mission.state,
    targets: updatedTargets,
  }
}

export function dispatchSingleMessage(
  mission: ActiveAttackMission,
  opportunityId: string,
  now: Date = new Date(),
): { updatedMission: ActiveAttackMission; dispatchedTarget: AttackMissionClientTarget } {
  const targetIndex = mission.targets.findIndex((t) => t.opportunityId === opportunityId)
  if (targetIndex === -1) {
    throw new Error(`Oportunidade "${opportunityId}" não encontrada na missão.`)
  }

  const target = mission.targets[targetIndex]
  const updatedTarget: AttackMissionClientTarget = {
    ...target,
    messageSent: true,
    sentAt: now,
  }

  const updatedTargets = [...mission.targets]
  updatedTargets[targetIndex] = updatedTarget

  const allSent = updatedTargets.every((t) => t.messageSent)
  const newState: MissionState = allSent ? 'Aguardando respostas' : 'Enviando mensagens'

  const updatedMission: ActiveAttackMission = {
    ...mission,
    state: newState,
    targets: updatedTargets,
  }

  return {
    updatedMission,
    dispatchedTarget: updatedTarget,
  }
}

export function dispatchMassMessages(_mission: ActiveAttackMission): never {
  throw new Error(
    'Disparo automático em massa é proibido. O envio de mensagens no Plano de Ataque deve ser feito individualmente, uma mensagem por vez.',
  )
}
