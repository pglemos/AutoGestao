import type { PlanningActor } from '@/features/planning-workspace/planningWorkspace.types'

export function resolveOwnerPlanningStoreId(
  unitId: string | null | undefined,
  units: Array<{ id: string }> | null | undefined,
): string | null {
  return unitId || units?.[0]?.id || null
}

export function toOwnerPlanningActor(user: {
  id: string
  email?: string | null
  name?: string | null
  full_name?: string | null
}): PlanningActor {
  const email = user.email?.trim() || null
  const name = user.name?.trim() || user.full_name?.trim() || email || user.id
  return { id: user.id, name, email, role: 'dono' }
}
