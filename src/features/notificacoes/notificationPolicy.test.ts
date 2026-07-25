import { describe, expect, test } from 'bun:test'
import { getNotificationAccess } from './lib/notificationPolicy'

describe('notification policy', () => {
  test('admins broadcast and consultants do not', () => {
    expect(getNotificationAccess({ role: 'administrador_geral', action: 'broadcast' })).toBe('manage')
    expect(getNotificationAccess({ role: 'administrador_mx', action: 'broadcast' })).toBe('manage')
    expect(getNotificationAccess({ role: 'consultor_mx', action: 'broadcast' })).toBe('hidden')
    expect(getNotificationAccess({ role: 'consultor_mx', action: 'mark-read' })).toBe('manage')
  })
})
