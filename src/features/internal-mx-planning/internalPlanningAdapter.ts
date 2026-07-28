import type { PlanningActor, PlanningRole } from '@/features/planning-workspace/planningWorkspace.types'

const INTERNAL_ROLES = new Set<PlanningRole>(['administrador_geral', 'administrador_mx', 'consultor_mx'])

export function toInternalPlanningActor(user: {
  id: string
  email?: string | null
  name?: string | null
  full_name?: string | null
  role?: string | null
}): PlanningActor {
  const role = user.role as PlanningRole
  if (!INTERNAL_ROLES.has(role)) throw new Error('Perfil sem acesso ao workspace interno MX')

  const email = user.email?.trim() || null
  const name = user.name?.trim() || user.full_name?.trim() || email || 'Usuário MX'
  return { id: user.id, email, name, role }
}
