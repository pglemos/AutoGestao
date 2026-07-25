import { getInternalMxAccessMode } from '@/features/internal-mx-access/internalMxActionPolicy'

export function canTriggerNetworkReport(role: string | null | undefined): boolean {
  return getInternalMxAccessMode({ role, resource: 'network', action: 'execute' }) === 'manage'
}
