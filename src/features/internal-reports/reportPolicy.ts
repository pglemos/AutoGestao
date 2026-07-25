import { getInternalMxAccessMode } from '@/features/internal-mx-access/internalMxActionPolicy'

export function canExportInternalReport(role: string | null | undefined, ownsScope = false): boolean {
  return getInternalMxAccessMode({ role, resource: 'report', action: 'export', ownsScope }) === 'manage'
}
