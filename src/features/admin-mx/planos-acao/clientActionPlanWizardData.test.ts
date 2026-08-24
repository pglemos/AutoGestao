import { describe, expect, test } from 'bun:test'
import { excludeBranchClients } from '../clientes/clientPortfolio'

describe('wizard clients vs filiais', () => {
  test('excludeBranchClients remove filiais que têm matriz na carteira', () => {
    const clients = [
      { id: 'c-matriz', name: 'AG AUTOMÓVEIS', primary_store_id: 's-matriz' },
      { id: 'c-piso', name: 'AG AUTOMÓVEIS - 3 PISO', primary_store_id: 's-piso' },
      { id: 'c-tito', name: 'AG AUTOMÓVEIS - TITO', primary_store_id: 's-tito' },
    ]
    const lojas = [
      { id: 's-matriz', parent_loja_id: null },
      { id: 's-piso', parent_loja_id: 's-matriz' },
      { id: 's-tito', parent_loja_id: 's-matriz' },
    ]
    const rows = excludeBranchClients(clients, lojas)
    expect(rows.map(row => row.id)).toEqual(['c-matriz'])
  })
})
