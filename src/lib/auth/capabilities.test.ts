import { describe, expect, it } from 'bun:test'
import {
  canCreateAdjustment,
  canManageFeedback,
  canManagePDI,
  canManageStore,
  canManageTeam,
  canSimulateRole,
  hasCapability,
} from './capabilities'

const internalRoles = ['administrador_geral', 'administrador_mx', 'consultor_mx'] as const

describe('role capabilities', () => {
  it('gives all internal MX roles equal global administration capabilities', () => {
    for (const role of internalRoles) {
      expect(canSimulateRole(role)).toBe(true)
      expect(canManageStore(role)).toBe(true)
      expect(canManageTeam(role)).toBe(true)
      expect(hasCapability(role, 'manageStore')).toBe(true)
      expect(hasCapability(role, 'manageTeam')).toBe(true)
    }

    expect(canManageStore('dono')).toBe(false)
    expect(canManageTeam('dono')).toBe(true)
    expect(canManageTeam('gerente')).toBe(true)
    expect(canManageTeam('vendedor')).toBe(false)
  })

  it('allows leadership and internal MX roles to manage feedback and PDI', () => {
    expect(canManageFeedback('dono')).toBe(true)
    expect(canManageFeedback('gerente')).toBe(true)
    expect(canManageFeedback('vendedor')).toBe(false)
    expect(canManagePDI('dono')).toBe(true)
    expect(canManagePDI('gerente')).toBe(true)
    expect(canManagePDI('vendedor')).toBe(false)
    expect(canManagePDI('administrador_mx')).toBe(true)
  })

  it('allows technical check-in adjustments from the seller terminal and leadership roles', () => {
    expect(canCreateAdjustment('vendedor')).toBe(true)
    expect(canCreateAdjustment('gerente')).toBe(true)
    expect(canCreateAdjustment('administrador_geral')).toBe(true)
  })

  it('supports public camelCase capability aliases without widening access', () => {
    expect(hasCapability('administrador_mx', 'simulateRole')).toBe(true)
    expect(hasCapability('vendedor', 'simulateRole')).toBe(false)
    expect(hasCapability('gerente', 'viewProducts')).toBe(true)
    expect(hasCapability('vendedor', 'viewProducts')).toBe(true)
    expect(hasCapability('dono', 'viewConfigurations')).toBe(true)
    expect(hasCapability('gerente', 'viewConfigurations')).toBe(true)
    expect(hasCapability('vendedor', 'viewConfigurations')).toBe(false)
  })
})
