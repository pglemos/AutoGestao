import { describe, expect, it } from 'bun:test'
import { isAdministradorMx, isPerfilInternoMx, normalizeRole, toCanonicalRoleCode } from './roles'

describe('role normalization', () => {
  it('maps legacy aliases to canonical roles', () => {
    expect(normalizeRole('admin_master')).toBe('administrador_geral')
    expect(normalizeRole('admin')).toBe('administrador_mx')
    expect(normalizeRole('consultor')).toBe('consultor_mx')
    expect(normalizeRole('owner')).toBe('dono')
    expect(normalizeRole('manager')).toBe('gerente')
    expect(normalizeRole('seller')).toBe('vendedor')
  })

  it('does not downgrade unknown roles to vendedor', () => {
    expect(normalizeRole('financeiro')).toBeNull()
    expect(normalizeRole('')).toBeNull()
    expect(normalizeRole(null)).toBeNull()
    expect(normalizeRole(undefined)).toBeNull()
  })

  it('classifies all internal MX roles as global administrators', () => {
    expect(isPerfilInternoMx('consultor')).toBe(true)
    expect(isPerfilInternoMx('vendedor')).toBe(false)
    expect(isAdministradorMx('admin_master')).toBe(true)
    expect(isAdministradorMx('administrador_mx')).toBe(true)
    expect(isAdministradorMx('consultor_mx')).toBe(true)
    expect(isAdministradorMx('dono')).toBe(false)
  })

  it('maps legacy roles to the canonical roles table codes without changing legacy normalization', () => {
    expect(toCanonicalRoleCode('administrador_geral')).toBe('admin_mx')
    expect(toCanonicalRoleCode('dono')).toBe('master')
    expect(toCanonicalRoleCode('gerente')).toBe('sales_manager')
    expect(toCanonicalRoleCode('vendedor')).toBe('seller')
    expect(toCanonicalRoleCode('consultor_mx')).toBe('consultant')
    expect(normalizeRole('dono')).toBe('dono')
  })
})
