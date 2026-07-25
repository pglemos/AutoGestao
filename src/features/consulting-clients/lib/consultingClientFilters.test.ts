import { describe, expect, test } from 'bun:test'
import { filterConsultingClients } from './consultingClientFilters'

describe('filterConsultingClients', () => {
  const clients = [{ id: '1', name: 'São José', legal_name: 'Comércio Alfa', product_name: 'PMR', cnpj: '12.345.678/0001-90' }] as never[]
  test('matches accent-insensitive fields', () => {
    expect(filterConsultingClients(clients, 'sao')).toHaveLength(1)
    expect(filterConsultingClients(clients, 'alfa')).toHaveLength(1)
    expect(filterConsultingClients(clients, '12345678')).toHaveLength(0)
    expect(filterConsultingClients(clients, '12.345')).toHaveLength(1)
  })
})
