import { getInternalMxAccessMode } from '@/features/internal-mx-access/internalMxActionPolicy'
import type { InternalMxAccessMode } from '@/features/internal-mx-access/types'

export type NotificationAction = 'read' | 'mark-read' | 'broadcast' | 'preferences'

export function getNotificationAccess(input: { role: string | null; action: NotificationAction }): InternalMxAccessMode {
  const mappedAction = input.action === 'broadcast' ? 'create' : input.action === 'read' ? 'view' : 'update'
  return getInternalMxAccessMode({ role: input.role, resource: 'notification', action: mappedAction })
}
