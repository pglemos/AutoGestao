import { getInternalMxAccessMode } from '@/features/internal-mx-access/internalMxActionPolicy'

export function canEditConsultingVisit(input: {
  role: string | null | undefined
  assigned: boolean
  completed: boolean
}): boolean {
  if (input.completed) return false
  return getInternalMxAccessMode({
    role: input.role,
    resource: 'consulting-visit',
    action: 'update',
    ownsScope: true,
  }) === 'manage'
}
