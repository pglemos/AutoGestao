import { getInternalMxAccessMode } from '@/features/internal-mx-access/internalMxActionPolicy'

export function canExecuteReprocessing(role: string | null | undefined): boolean {
  return getInternalMxAccessMode({ role, resource: 'reprocessing', action: 'execute' }) === 'manage'
}
