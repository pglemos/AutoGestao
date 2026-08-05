import { describe, expect, it } from 'bun:test'
import { canAccessPath } from '@/lib/auth/routeAccess'
import { selectBranches, selectLinkableStores } from './storeBranchesScope'
import type { Store } from '@/types/database'

const store = (overrides: Partial<Store> & Pick<Store, 'id' | 'name'>): Store => ({
  manager_email: null,
  legal_name: null,
  cnpj: null,
  address: null,
  administrative_phone: null,
  partners: [],
  parent_loja_id: null,
  active: true,
  source_mode: 'native_app',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

const matriz = store({ id: 'matriz', name: 'AG AUTOMÓVEIS' })
const filialA = store({ id: 'filial-a', name: 'AG SUL', parent_loja_id: 'matriz' })
const filialB = store({ id: 'filial-b', name: 'AG NORTE', parent_loja_id: 'matriz' })
const outraMatriz = store({ id: 'outra-matriz', name: 'DAKAR' })
const filialDeOutra = store({ id: 'filial-outra', name: 'DAKAR II', parent_loja_id: 'outra-matriz' })
const solta = store({ id: 'solta', name: 'ACERTT' })

const rede = [matriz, filialA, filialB, outraMatriz, filialDeOutra, solta]

describe('escopo da tela de filiais', () => {
  it('lista só as filiais da matriz da URL, em ordem alfabética', () => {
    expect(selectBranches(rede, matriz).map((s) => s.name)).toEqual(['AG NORTE', 'AG SUL'])
    expect(selectBranches(rede, outraMatriz).map((s) => s.id)).toEqual(['filial-outra'])
  })

  it('não oferece para vincular quem já é filial ou já é matriz de outro grupo', () => {
    // `outraMatriz` tem filial própria e viraria hierarquia de dois níveis — o
    // banco recusaria (trigger lojas_valida_hierarquia), então nem aparece.
    expect(selectLinkableStores(rede, matriz).map((s) => s.id)).toEqual(['solta'])
  })

  it('não oferece a própria matriz como candidata a filial de si mesma', () => {
    expect(selectLinkableStores(rede, matriz).some((s) => s.id === matriz.id)).toBe(false)
  })

  it('devolve lista vazia quando a matriz ainda não foi resolvida', () => {
    expect(selectBranches(rede, null)).toEqual([])
    expect(selectLinkableStores(rede, null)).toEqual([])
  })
})

describe('acesso à rota /lojas/:slug/filiais', () => {
  it('é da área interna MX — cadastro de rede, como /lojas', () => {
    const route = '/lojas/ag-automoveis/filiais'
    expect(canAccessPath(route, 'administrador_geral')).toBe(true)
    expect(canAccessPath(route, 'administrador_mx')).toBe(true)
    expect(canAccessPath(route, 'consultor_mx')).toBe(true)
    expect(canAccessPath(route, 'dono')).toBe(false)
    expect(canAccessPath(route, 'gerente')).toBe(false)
    expect(canAccessPath(route, 'vendedor')).toBe(false)
  })

  it('não afeta o dashboard da loja, que segue aberto a gerente e dono', () => {
    expect(canAccessPath('/lojas/ag-automoveis', 'gerente')).toBe(true)
    expect(canAccessPath('/lojas/ag-automoveis', 'dono')).toBe(true)
  })
})
