import { describe, expect, test } from 'bun:test'
import {
  collectClientStoreIds,
  groupPeopleByStore,
  isOrphanTestUnit,
  unitsMissingFromCadastro,
  mapVinculoRoleToProfile,
  mergeAccessAndVinculos,
  mergeOperationalUnits,
  personIdentityKey,
  type UsuarioRow,
  type VinculoLojaRow,
} from './mergeClientPeople'
import type { PersonAccessRow } from './personMutations'

const CLIENT = 'client-ag'
const MATRIZ = 'store-matriz'
const PISO3 = 'store-3piso'

function usuario(overrides: Partial<UsuarioRow> & { id: string }): UsuarioRow {
  return { name: 'Pessoa', email: `${overrides.id}@ag.com`, active: true, ...overrides }
}

function vinculo(overrides: Partial<VinculoLojaRow> & { user_id: string; store_id: string }): VinculoLojaRow {
  return { role: 'vendedor', is_active: true, ended_at: null, ...overrides }
}

function acesso(overrides: Partial<PersonAccessRow> & { id: string; email: string }): PersonAccessRow {
  return {
    client_id: CLIENT,
    nome: 'Acesso',
    telefone: null,
    funcao_declarada: null,
    papeis: [],
    lojas_autorizadas: [],
    is_dono_master: false,
    visao_padrao: null,
    status: 'ativo',
    created_at: '2026-01-01',
    ...overrides,
  }
}

describe('mapVinculoRoleToProfile', () => {
  test('traduz os papéis operacionais conhecidos', () => {
    expect(mapVinculoRoleToProfile('dono')).toBe('DONO')
    expect(mapVinculoRoleToProfile('gerente')).toBe('GERENTE_COMERCIAL')
    expect(mapVinculoRoleToProfile('vendedor')).toBe('VENDEDOR')
    expect(mapVinculoRoleToProfile('Vendedor')).toBe('VENDEDOR')
  })

  test('não inventa perfil para papel desconhecido', () => {
    expect(mapVinculoRoleToProfile('estagiario')).toBeNull()
    expect(mapVinculoRoleToProfile(null)).toBeNull()
  })
})

describe('collectClientStoreIds', () => {
  test('junta loja principal, lojas das unidades e filiais', () => {
    const ids = collectClientStoreIds({
      primaryStoreId: MATRIZ,
      unidades: [{ store_id: MATRIZ }, { store_id: null }],
      lojas: [
        { id: MATRIZ },
        { id: PISO3, parent_loja_id: MATRIZ },
        { id: 'store-outro', parent_loja_id: 'store-alheia' },
      ],
    })
    expect(ids.sort()).toEqual([PISO3, MATRIZ].sort())
  })

  test('ignora unidade sem store_id em vez de inventar loja', () => {
    expect(collectClientStoreIds({ primaryStoreId: null, unidades: [{ store_id: null }] })).toEqual([])
  })
})

describe('mergeAccessAndVinculos', () => {
  test('devolve a equipe operacional quando não há nenhum acesso cadastrado', () => {
    const usuarios = Array.from({ length: 9 }, (_, index) => usuario({ id: `u${index}`, name: `Pessoa ${index}` }))
    const vinculos = usuarios.map(user => vinculo({ user_id: user.id, store_id: MATRIZ }))
    const rows = mergeAccessAndVinculos({ clientId: CLIENT, acessos: [], vinculos, usuarios })
    expect(rows).toHaveLength(9)
    expect(rows.every(row => row.source === 'vinculo')).toBe(true)
    expect(rows.every(row => row.id.startsWith('vinculo:'))).toBe(true)
    expect(rows.every(row => row.client_id === CLIENT)).toBe(true)
  })

  test('conta uma pessoa só quando ela tem vínculo na matriz e na filial', () => {
    const user = usuario({ id: 'u1', name: 'Gleyson' })
    const rows = mergeAccessAndVinculos({
      clientId: CLIENT,
      vinculos: [
        vinculo({ user_id: 'u1', store_id: MATRIZ, role: 'dono' }),
        vinculo({ user_id: 'u1', store_id: PISO3, role: 'gerente' }),
      ],
      usuarios: [user],
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].lojas_autorizadas.sort()).toEqual([PISO3, MATRIZ].sort())
    expect(rows[0].papeis.sort()).toEqual(['DONO', 'GERENTE_COMERCIAL'])
  })

  test('não infere Dono Master a partir do papel dono no vínculo', () => {
    const rows = mergeAccessAndVinculos({
      clientId: CLIENT,
      vinculos: [vinculo({ user_id: 'u1', store_id: MATRIZ, role: 'dono' })],
      usuarios: [usuario({ id: 'u1' })],
    })
    expect(rows[0].papeis).toEqual(['DONO'])
    expect(rows[0].is_dono_master).toBe(false)
  })

  test('funde acesso e vínculo do mesmo e-mail numa pessoa só', () => {
    const rows = mergeAccessAndVinculos({
      clientId: CLIENT,
      acessos: [
        acesso({
          id: 'acesso-1',
          email: 'Gleyson@AG.com',
          nome: 'Gleyson Winster',
          papeis: ['DONO'],
          lojas_autorizadas: [MATRIZ],
          is_dono_master: true,
        }),
      ],
      vinculos: [vinculo({ user_id: 'u1', store_id: PISO3, role: 'gerente' })],
      usuarios: [usuario({ id: 'u1', email: 'gleyson@ag.com', name: 'Gleyson W.' })],
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('acesso-1')
    expect(rows[0].source).toBe('ambos')
    expect(rows[0].nome).toBe('Gleyson Winster')
    expect(rows[0].is_dono_master).toBe(true)
    expect(rows[0].papeis.sort()).toEqual(['DONO', 'GERENTE_COMERCIAL'])
    expect(rows[0].lojas_autorizadas.sort()).toEqual([PISO3, MATRIZ].sort())
  })

  test('descarta vínculo encerrado ou inativo', () => {
    const rows = mergeAccessAndVinculos({
      clientId: CLIENT,
      vinculos: [
        vinculo({ user_id: 'u1', store_id: MATRIZ, is_active: false }),
        vinculo({ user_id: 'u2', store_id: MATRIZ, ended_at: '2026-02-01' }),
      ],
      usuarios: [usuario({ id: 'u1' }), usuario({ id: 'u2' })],
    })
    expect(rows).toEqual([])
  })

  test('marca inativo quem tem vínculo ativo mas usuário desativado', () => {
    const rows = mergeAccessAndVinculos({
      clientId: CLIENT,
      vinculos: [vinculo({ user_id: 'u1', store_id: MATRIZ })],
      usuarios: [usuario({ id: 'u1', active: false })],
    })
    expect(rows[0].status).toBe('inativo')
  })

  test('coloca o Dono Master no topo e ordena o resto por nome', () => {
    const rows = mergeAccessAndVinculos({
      clientId: CLIENT,
      acessos: [acesso({ id: 'a1', email: 'zelia@ag.com', nome: 'Zélia', is_dono_master: true })],
      vinculos: [
        vinculo({ user_id: 'u1', store_id: MATRIZ }),
        vinculo({ user_id: 'u2', store_id: MATRIZ }),
      ],
      usuarios: [usuario({ id: 'u1', name: 'Bruno' }), usuario({ id: 'u2', name: 'Ana' })],
    })
    expect(rows.map(row => row.nome)).toEqual(['Zélia', 'Ana', 'Bruno'])
  })
})

describe('personIdentityKey', () => {
  test('normaliza e-mail e cai no id do usuário quando não há e-mail', () => {
    expect(personIdentityKey({ email: ' Ana@AG.com ' })).toBe('ana@ag.com')
    expect(personIdentityKey({ email: null, user_id: 'u9' })).toBe('user:u9')
    expect(personIdentityKey({ email: null })).toBe('')
  })
})

const TITO = 'store-tito'

describe('mergeOperationalUnits', () => {
  test('mostra matriz e filiais operacionais e ignora unidade sem store_id', () => {
    const rows = mergeOperationalUnits({
      clientId: CLIENT,
      primaryStoreId: MATRIZ,
      units: [
        { id: 'u-matriz', store_id: MATRIZ, name: 'Matriz', is_primary: true, store_type: 'matriz' },
        { id: 'u-qa', store_id: null, name: 'TESTE QA REMOVER' },
      ],
      lojas: [
        { id: MATRIZ, name: 'AG AUTOMÓVEIS', parent_loja_id: null },
        { id: PISO3, name: 'AG AUTOMÓVEIS - 3 PISO', parent_loja_id: MATRIZ },
        { id: TITO, name: 'AG AUTOMÓVEIS - TITO FULGÊNCIO', parent_loja_id: MATRIZ },
      ],
    })
    expect(rows.map(row => row.store_id)).toEqual([MATRIZ, PISO3, TITO])
    expect(rows.find(row => row.store_id === MATRIZ)?.store_type).toBe('matriz')
    expect(rows.find(row => row.store_id === PISO3)).toMatchObject({ store_type: 'filial', synthetic: true })
    expect(rows.find(row => row.store_id === TITO)?.synthetic).toBe(true)
    expect(rows.some(row => row.name.includes('TESTE QA'))).toBe(false)
  })
})

describe('unitsMissingFromCadastro', () => {
  test('só pede persistência das filiais sintéticas', () => {
    const missing = unitsMissingFromCadastro([
      { store_id: MATRIZ, synthetic: false },
      { store_id: PISO3, synthetic: true },
      { store_id: null, synthetic: true },
    ])
    expect(missing.map(unit => unit.store_id)).toEqual([PISO3])
  })
})

describe('isOrphanTestUnit', () => {
  test('reconhece unidade de QA sem loja e poupa unidade real', () => {
    expect(isOrphanTestUnit({ name: 'TESTE QA REMOVER', store_id: null })).toBe(true)
    expect(isOrphanTestUnit({ name: 'Teste qa filial', store_id: null })).toBe(true)
    expect(isOrphanTestUnit({ name: 'TESTE QA REMOVER', store_id: MATRIZ })).toBe(false)
    expect(isOrphanTestUnit({ name: 'AG AUTOMÓVEIS - 3 PISO', store_id: null })).toBe(false)
  })
})

describe('groupPeopleByStore', () => {
  test('separa gerente e vendedores de cada filial', () => {
    const persons = [
      acesso({ id: 'g-m', email: 'alex@ag.com', nome: 'Alexandre', papeis: ['GERENTE_COMERCIAL'], lojas_autorizadas: [MATRIZ] }),
      acesso({ id: 'v-m', email: 'vend@ag.com', nome: 'Vendedor Matriz', papeis: ['VENDEDOR'], lojas_autorizadas: [MATRIZ] }),
      acesso({ id: 'g-3', email: 'wel@ag.com', nome: 'Wellington', papeis: ['GERENTE_COMERCIAL'], lojas_autorizadas: [PISO3] }),
      acesso({ id: 'v-3', email: 'caique@ag.com', nome: 'Caique', papeis: ['VENDEDOR'], lojas_autorizadas: [PISO3] }),
      acesso({ id: 'g-t', email: 'mateus@ag.com', nome: 'Mateus', papeis: ['GERENTE_COMERCIAL'], lojas_autorizadas: [TITO] }),
      acesso({ id: 'dono', email: 'gleyson@ag.com', nome: 'Gleyson', papeis: ['DONO'], lojas_autorizadas: [MATRIZ, PISO3] }),
    ]
    const groups = groupPeopleByStore(
      persons,
      [
        { id: MATRIZ, name: 'AG AUTOMÓVEIS', parent_loja_id: null },
        { id: PISO3, name: 'AG AUTOMÓVEIS - 3 PISO', parent_loja_id: MATRIZ },
        { id: TITO, name: 'AG AUTOMÓVEIS - TITO FULGÊNCIO', parent_loja_id: MATRIZ },
      ],
      MATRIZ,
    )
    expect(groups.map(group => group.kind)).toEqual(['matriz', 'filial', 'filial'])
    expect(groups[0]).toMatchObject({ gerenteNome: 'Alexandre' })
    expect(groups[1]).toMatchObject({ storeName: 'AG AUTOMÓVEIS - 3 PISO', gerenteNome: 'Wellington' })
    expect(groups[2]).toMatchObject({ gerenteNome: 'Mateus' })
    expect(groups[1].people.map(person => person.nome).sort()).toEqual(['Caique', 'Gleyson', 'Wellington'])
    expect(groups[2].people.some(person => person.nome === 'Caique')).toBe(false)
  })
})
