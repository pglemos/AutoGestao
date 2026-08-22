import type { PlanningActor } from '@/features/planning-workspace/planningWorkspace.types'

export const ALL_OWNER_UNITS = 'all'

export function nextOwnerUnitId(
  current: string,
  units: Array<{ id: string }>,
  activeStoreId: string | null | undefined,
): string {
  if (units.length === 0) return current === ALL_OWNER_UNITS || current ? current : ''
  if (current === ALL_OWNER_UNITS) return current
  if (units.some(unit => unit.id === current)) return current
  if (activeStoreId && units.some(unit => unit.id === activeStoreId)) return activeStoreId
  return units[0].id
}

export function resolveOwnerPlanningStoreId(
  unitId: string | null | undefined,
  units: Array<{ id: string }> | null | undefined,
): string | null {
  const list = units ?? []
  if (!unitId || unitId === ALL_OWNER_UNITS) return list[0]?.id ?? null
  return list.some(unit => unit.id === unitId) ? unitId : list[0]?.id ?? null
}

export function resolveOwnerPlanningScopeType(
  ownerUnitId: string | null | undefined,
  supportsConsolidated: boolean,
): 'CONSOLIDATED' | 'STORE' {
  if (ownerUnitId === ALL_OWNER_UNITS) return supportsConsolidated ? 'CONSOLIDATED' : 'STORE'
  if (ownerUnitId) return 'STORE'
  return supportsConsolidated ? 'CONSOLIDATED' : 'STORE'
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
