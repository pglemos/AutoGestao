import { describe, expect, it } from 'bun:test'
import { resolveStoreManagementContext, type StoreLink } from './store-management-context'

const link = (over: Partial<StoreLink> = {}): StoreLink => ({
  userId: 'u1',
  role: 'gerente',
  isActive: true,
  endedAt: null,
  ...over,
})

describe('resolveStoreManagementContext', () => {
  it('dono sem gerente assume a gestão comercial', () => {
    const ctx = resolveStoreManagementContext('s1', [
      link({ userId: 'owner', role: 'dono' }),
      link({ userId: 'v1', role: 'vendedor' }),
    ])
    expect(ctx.hasActiveManager).toBe(false)
    expect(ctx.ownerAssumesManagement).toBe(true)
    expect(ctx.commercialAccessMode).toBe('gestao')
  })

  it('dono com gerente ativo fica em acompanhamento', () => {
    const ctx = resolveStoreManagementContext('s1', [
      link({ userId: 'owner', role: 'dono' }),
      link({ userId: 'm1' }),
    ])
    expect(ctx.hasActiveManager).toBe(true)
    expect(ctx.ownerAssumesManagement).toBe(false)
    expect(ctx.commercialAccessMode).toBe('acompanhamento')
    expect(ctx.activeManagerIds).toEqual(['m1'])
  })

  it('dono que vende mantém a permissão comercial independente da gestão', () => {
    const comGerente = resolveStoreManagementContext('s1', [link({ userId: 'm1' })], true)
    const semGerente = resolveStoreManagementContext('s1', [], true)
    expect(comGerente.ownerCanSell).toBe(true)
    expect(comGerente.ownerAssumesManagement).toBe(false)
    expect(semGerente.ownerCanSell).toBe(true)
    expect(semGerente.ownerAssumesManagement).toBe(true)
  })

  it('dono de várias lojas resolve cada loja isoladamente', () => {
    const lojaA = resolveStoreManagementContext('a', [link({ userId: 'm1' })])
    const lojaB = resolveStoreManagementContext('b', [])
    expect(lojaA.commercialAccessMode).toBe('acompanhamento')
    expect(lojaB.commercialAccessMode).toBe('gestao')
    expect(lojaA.storeId).toBe('a')
    expect(lojaB.storeId).toBe('b')
  })

  it('loja com mais de um gerente lista todos e segue em acompanhamento', () => {
    const ctx = resolveStoreManagementContext('s1', [
      link({ userId: 'm1' }),
      link({ userId: 'm2' }),
    ])
    expect(ctx.activeManagerCount).toBe(2)
    expect(ctx.activeManagerIds).toEqual(['m1', 'm2'])
    expect(ctx.ownerAssumesManagement).toBe(false)
  })

  it('gerente desativado devolve a gestão ao dono', () => {
    const inativo = resolveStoreManagementContext('s1', [link({ userId: 'm1', isActive: false })])
    const encerrado = resolveStoreManagementContext('s1', [
      link({ userId: 'm1', endedAt: '2026-07-01T00:00:00Z' }),
    ])
    expect(inativo.ownerAssumesManagement).toBe(true)
    expect(encerrado.ownerAssumesManagement).toBe(true)
  })

  it('troca de gerente mantém a loja em acompanhamento pelo vínculo novo', () => {
    const ctx = resolveStoreManagementContext('s1', [
      link({ userId: 'antigo', endedAt: '2026-07-01T00:00:00Z' }),
      link({ userId: 'novo' }),
    ])
    expect(ctx.hasActiveManager).toBe(true)
    expect(ctx.activeManagerIds).toEqual(['novo'])
    expect(ctx.commercialAccessMode).toBe('acompanhamento')
  })

  it('manager_email não participa da decisão — só o vínculo ativo', () => {
    // Loja com e-mail de gestor cadastrado mas nenhum vínculo: dono assume.
    const ctx = resolveStoreManagementContext('s1', [link({ userId: 'v1', role: 'vendedor' })])
    expect(ctx.ownerAssumesManagement).toBe(true)
  })
})
