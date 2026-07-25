import { describe, expect, test } from 'bun:test'
import {
  canManageInternalMxArea,
  canViewInternalMxArea,
  getInternalMxAccessMode,
  getInternalMxReadOnlyMessage,
  type InternalMxManagedArea,
} from './internalMxAccessPolicy'

const managedAreas: InternalMxManagedArea[] = ['operational-settings', 'pmr-parameters']

describe('política de acesso das áreas internas MX', () => {
  for (const area of managedAreas) {
    test(`${area}: administradores podem editar`, () => {
      expect(getInternalMxAccessMode(area, 'administrador_geral')).toBe('manage')
      expect(getInternalMxAccessMode(area, 'administrador_mx')).toBe('manage')
      expect(canManageInternalMxArea(area, 'administrador_geral')).toBe(true)
      expect(canManageInternalMxArea(area, 'administrador_mx')).toBe(true)
    })

    test(`${area}: consultor MX recebe somente leitura`, () => {
      expect(getInternalMxAccessMode(area, 'consultor_mx')).toBe('read-only')
      expect(canViewInternalMxArea(area, 'consultor_mx')).toBe(true)
      expect(canManageInternalMxArea(area, 'consultor_mx')).toBe(false)
      expect(getInternalMxReadOnlyMessage(area)).toContain('Consultor MX')
    })

    test(`${area}: perfis externos ao módulo não recebem acesso`, () => {
      expect(getInternalMxAccessMode(area, 'dono')).toBe('hidden')
      expect(getInternalMxAccessMode(area, 'gerente')).toBe('hidden')
      expect(getInternalMxAccessMode(area, 'vendedor')).toBe('hidden')
      expect(canViewInternalMxArea(area, null)).toBe(false)
    })
  }
})
