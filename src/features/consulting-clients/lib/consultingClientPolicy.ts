import { getInternalMxAccessMode } from '@/features/internal-mx-access/internalMxActionPolicy'

export type ConsultingAssignmentScopeRow = {
  client_id: string
  user_id: string
  active: boolean
}

export function isConsultantAssignedToClient(input: {
  userId: string | null | undefined
  clientId: string | null | undefined
  assignments: ConsultingAssignmentScopeRow[]
}): boolean {
  if (!input.userId || !input.clientId) return false
  return input.assignments.some(
    assignment => assignment.active
      && assignment.user_id === input.userId
      && assignment.client_id === input.clientId,
  )
}

export function canViewConsultingClient(input: {
  role: string | null | undefined
  assigned: boolean
}): boolean {
  return input.role === 'administrador_geral'
    || input.role === 'administrador_mx'
    || input.role === 'consultor_mx'
}

export function canManageConsultingClient(input: { role: string | null; assigned: boolean }): boolean {
  return getInternalMxAccessMode({
    role: input.role,
    resource: 'consulting-client',
    action: 'update',
    ownsScope: true,
  }) === 'manage'
}

export function canCreateConsultingClient(role: string | null): boolean {
  return getInternalMxAccessMode({ role, resource: 'consulting-client', action: 'create' }) === 'manage'
}
