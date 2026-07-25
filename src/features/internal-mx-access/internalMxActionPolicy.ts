import type {
  InternalMxAccessMode,
  InternalMxActionInput,
  InternalMxResource,
} from './types'

const ADMIN_ROLES = new Set(['administrador_geral', 'administrador_mx'])
const INTERNAL_ROLES = new Set([...ADMIN_ROLES, 'consultor_mx'])

const CONSULTANT_OWNED_RESOURCES = new Set<InternalMxResource>([
  'consulting-client',
  'consulting-visit',
  'agenda',
  'diagnostic',
])

export function getInternalMxAccessMode(input: InternalMxActionInput): InternalMxAccessMode {
  const { role, resource, action, ownsScope = false } = input
  if (!role || !INTERNAL_ROLES.has(role)) return 'hidden'
  if (ADMIN_ROLES.has(role)) return 'manage'

  if (resource === 'reprocessing' || resource === 'simulation') return 'hidden'

  if (action === 'view') return 'read'

  if (resource === 'notification') {
    if (action === 'create' || action === 'delete') return 'hidden'
    return action === 'update' ? 'manage' : 'read'
  }

  if (resource === 'profile') {
    return action === 'update' ? 'manage' : 'read'
  }

  if (resource === 'report') {
    if (action === 'export') return ownsScope ? 'manage' : 'read'
    return 'read'
  }

  if (CONSULTANT_OWNED_RESOURCES.has(resource)) {
    return ownsScope ? 'manage' : 'read'
  }

  return 'read'
}

export function assertCanPerformInternalMxAction(input: InternalMxActionInput): void {
  if (getInternalMxAccessMode(input) !== 'manage') {
    throw new Error('Ação não autorizada para o perfil atual.')
  }
}
