/**
 * Tests First — Story 2.9
 *
 * Contract tests for the public surface of `useAuth` (AuthProvider).
 * These tests MUST PASS both before and after the split refactor.
 *
 * Strategy: since `useAuth.tsx` is a Provider tightly coupled to Supabase
 * and React runtime, we focus on:
 *  1. Module export contract (named exports stable)
 *  2. Pure helpers behavior (pickSimulationStore + re-exports from roles)
 *  3. Default context shape (default values returned outside Provider)
 *  4. Sub-hook helper modules expose stable APIs
 *
 * Cross-tab sync / refresh-token / network mocking are covered manually
 * via canary 48h per story.md Rollback Plan; we lock interface here.
 */
import { describe, expect, it } from 'bun:test'
import * as AuthModule from '../useAuth'
import type { Store } from '@/types/database'

const baseStore: Store = {
  id: 'store-1',
  name: 'Loja A',
  parent_loja_id: null,
  manager_email: null,
  legal_name: null,
  cnpj: null,
  address: null,
  administrative_phone: null,
  partners: [],
  active: true,
  source_mode: 'hybrid',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

describe('useAuth — module contract', () => {
  it('exports AuthProvider component', () => {
    expect(typeof AuthModule.AuthProvider).toBe('function')
  })

  it('exports useAuth hook', () => {
    expect(typeof AuthModule.useAuth).toBe('function')
  })

  it('re-exports role helpers from @/lib/auth/roles', () => {
    expect(typeof AuthModule.isAdministradorMx).toBe('function')
    expect(typeof AuthModule.isPerfilInternoMx).toBe('function')
    expect(typeof AuthModule.normalizeRole).toBe('function')
  })

  it('exports pickSimulationStore helper', () => {
    expect(typeof AuthModule.pickSimulationStore).toBe('function')
  })
})

describe('useAuth — role helpers (re-exports)', () => {
  it('isAdministradorMx detects admin roles', () => {
    expect(AuthModule.isAdministradorMx('administrador_mx')).toBe(true)
    expect(AuthModule.isAdministradorMx('administrador_geral')).toBe(true)
    expect(AuthModule.isAdministradorMx('vendedor')).toBe(false)
    expect(AuthModule.isAdministradorMx(null)).toBe(false)
  })

  it('isPerfilInternoMx detects MX internal roles', () => {
    expect(AuthModule.isPerfilInternoMx('administrador_mx')).toBe(true)
    expect(AuthModule.isPerfilInternoMx('consultor_mx')).toBe(true)
    expect(AuthModule.isPerfilInternoMx('dono')).toBe(false)
    expect(AuthModule.isPerfilInternoMx(undefined)).toBe(false)
  })

  it('normalizeRole maps aliases to canonical roles', () => {
    expect(AuthModule.normalizeRole('admin')).toBe('administrador_mx')
    expect(AuthModule.normalizeRole('owner')).toBe('dono')
    expect(AuthModule.normalizeRole('manager')).toBe('gerente')
    expect(AuthModule.normalizeRole('seller')).toBe('vendedor')
    expect(AuthModule.normalizeRole('unknown')).toBeNull()
  })
})

describe('useAuth — pickSimulationStore', () => {
  it('prefers the MX sandbox store over an active preferred store', () => {
    expect(
      AuthModule.pickSimulationStore(
        [
          baseStore,
          { ...baseStore, id: 'store-2', name: 'Loja B' },
          { ...baseStore, id: 'sandbox', name: 'MX CONSULTORIA' },
        ],
        'store-2',
      )?.id,
    ).toBe('sandbox')
  })

  it('falls back to sandbox store when no preferred store is given', () => {
    expect(
      AuthModule.pickSimulationStore([
        baseStore,
        { ...baseStore, id: 'sandbox', name: 'MX CONSULTORIA' },
      ])?.id,
    ).toBe('sandbox')
  })

  it('uses preferred store when no sandbox exists', () => {
    expect(
      AuthModule.pickSimulationStore(
        [baseStore, { ...baseStore, id: 'store-2', name: 'Loja B' }],
        'store-2',
      )?.id,
    ).toBe('store-2')
  })

  it('falls back to first active store when nothing matches', () => {
    expect(
      AuthModule.pickSimulationStore([
        { ...baseStore, id: 'inactive', active: false },
        { ...baseStore, id: 'active' },
      ])?.id,
    ).toBe('active')
  })

  it('returns null when no active store is available', () => {
    expect(
      AuthModule.pickSimulationStore([
        { ...baseStore, id: 'a', active: false },
        { ...baseStore, id: 'b', active: false },
      ]),
    ).toBeNull()
  })
})

describe('useAuth — sub-hooks helpers (post-split contract)', () => {
  it('exports authHelpers module with pure utilities', async () => {
    const helpers = await import('../auth/authHelpers')
    expect(typeof helpers.isTransientFetchError).toBe('function')
    expect(typeof helpers.pickSimulationStore).toBe('function')
    expect(typeof helpers.readSimulationRole).toBe('function')
  })

  it('isTransientFetchError detects network errors', async () => {
    const { isTransientFetchError } = await import('../auth/authHelpers')
    expect(isTransientFetchError({ message: 'Failed to fetch' })).toBe(true)
    expect(isTransientFetchError({ message: 'NetworkError' })).toBe(true)
    expect(isTransientFetchError({ message: 'Load failed' })).toBe(true)
    expect(isTransientFetchError({ message: 'ERR_NAME_NOT_RESOLVED' })).toBe(true)
    expect(isTransientFetchError({ message: 'Invalid credentials' })).toBe(false)
    expect(isTransientFetchError(null)).toBe(false)
    expect(isTransientFetchError(undefined)).toBe(false)
    expect(isTransientFetchError('string')).toBe(false)
  })

  it('exports useAuthSession sub-hook', async () => {
    const mod = await import('../auth/useAuthSession')
    expect(typeof mod.useAuthSession).toBe('function')
  })

  it('exports useAuthProfile sub-hook', async () => {
    const mod = await import('../auth/useAuthProfile')
    expect(typeof mod.useAuthProfile).toBe('function')
  })

  it('exports useAuthRBAC sub-hook', async () => {
    const mod = await import('../auth/useAuthRBAC')
    expect(typeof mod.useAuthRBAC).toBe('function')
  })

  it('exports useAuthActions sub-hook', async () => {
    const mod = await import('../auth/useAuthActions')
    expect(typeof mod.useAuthActions).toBe('function')
  })
})
