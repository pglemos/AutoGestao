import { getInternalMxAccessMode } from '@/features/internal-mx-access/internalMxActionPolicy'
export function canCompleteCorrectiveAction(input: { role: string | null; ownsScope: boolean }): boolean {
  return getInternalMxAccessMode({ role: input.role, resource: 'diagnostic', action: 'update', ownsScope: input.ownsScope }) === 'manage'
}
