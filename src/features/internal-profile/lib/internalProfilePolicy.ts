import { getInternalMxAccessMode } from '@/features/internal-mx-access/internalMxActionPolicy'

export function canEditInternalProfile(role: string | null | undefined): boolean {
  return getInternalMxAccessMode({ role, resource: 'profile', action: 'update', ownsScope: true }) === 'manage'
}

export function maskSensitiveValue(value: string | null | undefined): string {
  if (!value) return ''
  if (value.length <= 4) return '••••'
  return `${value.slice(0, 2)}••••${value.slice(-2)}`
}
