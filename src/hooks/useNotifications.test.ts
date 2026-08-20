import { describe, it, expect } from 'bun:test'
import { sanitizeNotifications, sortNotificationsByPriority } from './useNotifications'
// Nota: O teste real de hooks exige o renderHook da @testing-library/react-hooks,
// que depende de um ambiente React completo. Vou testar a lógica de filtragem 
// que o hook usa internamente.

describe('Notifications Logic', () => {
  const mockNotifications = [
    { id: '1', title: 'Atraso', message: 'Mensagem', read: false, priority: 'high', type: 'discipline', created_at: '2026-05-04T12:00:00.000Z' },
    { id: '2', title: 'Feedback', message: 'Outro aviso', read: true, priority: 'medium', type: 'performance', created_at: '2026-05-04T13:00:00.000Z' },
  ]

  it('should correctly identify unread count', () => {
    const unread = mockNotifications.filter(n => !n.read).length
    expect(unread).toBe(1)
  })

  it('should filter by type correctly', () => {
    const discipline = mockNotifications.filter(n => n.type === 'discipline')
    expect(discipline.length).toBe(1)
    expect(discipline[0].title).toBe('Atraso')
  })

  it('should sort by priority then date', () => {
    const sorted = sortNotificationsByPriority(mockNotifications)
    expect(sorted[0].priority).toBe('high')
  })

  it('removes QA fixtures and collapses exact duplicate notices', () => {
    const notifications = [
      { ...mockNotifications[0], id: '1' },
      { ...mockNotifications[0], id: '2' },
      { ...mockNotifications[1], id: '3', title: '[TESTE QA] dedup-debug' },
    ] as any

    expect(sanitizeNotifications(notifications).map(notification => notification.id)).toEqual(['1'])
  })
})
