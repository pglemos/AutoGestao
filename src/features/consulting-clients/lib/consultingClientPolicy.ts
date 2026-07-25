import { getInternalMxAccessMode } from '@/features/internal-mx-access/internalMxActionPolicy'

export function canManageConsultingClient(input: { role: string | null; assigned: boolean }): boolean {
  return getInternalMxAccessMode({ role: input.role, resource: 'consulting-client', action: 'update', ownsScope: input.assigned }) === 'manage'
}

export function canCreateConsultingClient(role: string | null): boolean {
  return getInternalMxAccessMode({ role, resource: 'consulting-client', action: 'create' }) === 'manage'
}
