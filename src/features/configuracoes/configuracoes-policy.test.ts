import { describe, expect, test } from 'bun:test'
import { getVisibleTabs } from './tabRegistry'

const keys = (role: Parameters<typeof getVisibleTabs>[0]) => getVisibleTabs(role).map((tab) => tab.key)

describe('configuration tab policy', () => {
  test('administrators see all 13 tabs', () => {
    expect(keys('administrador_geral')).toHaveLength(13)
    expect(keys('administrador_mx')).toHaveLength(13)
  })

  test('consultant does not see remuneration', () => {
    expect(keys('consultor_mx')).not.toContain('remuneracao')
    expect(keys('consultor_mx')).toHaveLength(12)
  })

  test('consultant manages the global tabs without owner-only read-only restrictions', () => {
    const readOnly = getVisibleTabs('consultor_mx')
      .filter((tab) => tab.readOnlyRoles?.includes('consultor_mx'))
      .map((tab) => tab.key)
    expect(readOnly).toEqual([])
  })
})
