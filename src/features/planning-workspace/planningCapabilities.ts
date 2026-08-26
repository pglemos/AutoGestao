import type { PlanningCapabilities, PlanningRole } from './planningWorkspace.types'

const INTERNAL: PlanningCapabilities = Object.freeze({
  scope: 'global',
  canEditTargets: true,
  canManageStrategicCycle: true,
  canCreateActions: true,
  canDeleteActions: true,
  canReviewActions: true,
  canManageConsulting: true,
  canReviewAnticipation: true,
  canViewStrategicPpa: true,
})

const OWNER: PlanningCapabilities = Object.freeze({
  scope: 'store',
  // As metas são o compromisso definido pela MX no ciclo publicado, que o
  // próprio editor trata como imutável ("abra uma revisão para alterar"). O
  // Dono consome o plano; no Base44 a visão dele também é só leitura. Em
  // produção, as 248 edições de meta são todas da área interna — nenhuma de
  // Dono, então isto não tira nada que estivesse em uso.
  canEditTargets: false,
  canManageStrategicCycle: false,
  // Dono não cria plano de ação — ele executa o que a MX criou. Criar é
  // exclusivo da área interna (admin geral / administrador MX / consultor MX).
  // O bloqueio real está em `can_create_mx_action_scope`, no banco; aqui é só
  // para não oferecer um botão que o servidor vai recusar.
  canCreateActions: false,
  canDeleteActions: false,
  canReviewActions: true,
  canManageConsulting: false,
  canReviewAnticipation: false,
  canViewStrategicPpa: true,
})

const MANAGER: PlanningCapabilities = Object.freeze({
  scope: 'store',
  canEditTargets: false,
  canManageStrategicCycle: false,
  // Mesma regra do Dono: o Gerente executa, não cria.
  canCreateActions: false,
  canDeleteActions: false,
  canReviewActions: false,
  canManageConsulting: false,
  canReviewAnticipation: false,
  canViewStrategicPpa: false,
})

const SELLER: PlanningCapabilities = Object.freeze({
  scope: 'self',
  canEditTargets: false,
  canManageStrategicCycle: false,
  canCreateActions: false,
  canDeleteActions: false,
  canReviewActions: false,
  canManageConsulting: false,
  canReviewAnticipation: false,
  canViewStrategicPpa: false,
})

export function resolvePlanningCapabilities(role: PlanningRole): PlanningCapabilities {
  if (role === 'administrador_geral' || role === 'administrador_mx' || role === 'consultor_mx') return INTERNAL
  if (role === 'dono') return OWNER
  if (role === 'gerente') return MANAGER
  return SELLER
}
