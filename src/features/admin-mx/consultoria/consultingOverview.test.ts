import { describe, expect, test } from 'bun:test'
import {
  filterConsultingOverviewRows,
  isConsultingOverviewRowOverdue,
  normalizeConsultingModality,
  normalizeConsultingStatus,
  sortConsultingOverviewRows,
  summarizeConsultingOverview,
  type ConsultingOverviewRow,
} from './consultingOverview'

function row(overrides: Partial<ConsultingOverviewRow> = {}): ConsultingOverviewRow {
  return {
    id: 'visit-1',
    clientId: 'client-1',
    clientName: 'ACME Motors',
    clientSlug: 'acme-motors',
    primaryStoreId: 'store-1',
    visitNumber: 1,
    title: 'Diagnóstico comercial',
    objective: 'Mapear o funil da loja',
    consultantName: 'Consultor MX',
    consultantId: 'consultant-1',
    modality: 'online',
    status: 'agendado',
    scheduledAt: '2026-08-21T14:00:00.000Z',
    effectiveVisitDate: null,
    productName: 'PMR Online',
    deliverables: 3,
    deliverablesDone: 1,
    ...overrides,
  }
}

describe('overview de consultoria', () => {
  test('normaliza status e modalidade vindos do legado/Base44', () => {
    expect(normalizeConsultingStatus('CONCLUIDA')).toBe('concluido')
    expect(normalizeConsultingStatus('Concluído')).toBe('concluido')
    expect(normalizeConsultingStatus('em-andamento')).toBe('agendado')
    expect(normalizeConsultingStatus('in_progress')).toBe('agendado')
    expect(normalizeConsultingStatus('qualquer outro valor')).toBe('nao_iniciado')
    expect(normalizeConsultingModality('PRESENCIAL')).toBe('presencial')
    expect(normalizeConsultingModality('remote')).toBe('online')
    expect(normalizeConsultingModality('A_DEFINIR')).toBe('a_definir')
  })

  test('filtra por status, modalidade e busca textual', () => {
    const rows = [
      row(),
      row({ id: 'visit-2', clientId: 'client-2', clientName: 'Beta Cars', clientSlug: 'beta-cars', modality: 'presencial', status: 'concluido', consultantName: 'Ana MX' }),
      row({ id: 'visit-3', clientId: 'client-3', clientName: 'Gamma Auto', clientSlug: 'gamma-auto', visitNumber: 3, modality: 'a_definir', status: 'nao_iniciado' }),
    ]

    expect(filterConsultingOverviewRows(rows, { search: '', status: 'concluido', modality: 'todas' })).toHaveLength(1)
    expect(filterConsultingOverviewRows(rows, { search: '', status: 'todos', modality: 'presencial' })).toHaveLength(1)
    expect(filterConsultingOverviewRows(rows, { search: 'ana mx', status: 'todos', modality: 'todas' })).toHaveLength(1)
    expect(filterConsultingOverviewRows(rows, { search: '3', status: 'todos', modality: 'todas' })).toHaveLength(1)
  })

  test('calcula os quatro indicadores operacionais do overview', () => {
    expect(summarizeConsultingOverview([
      row(),
      row({ id: 'visit-2', status: 'concluido', modality: 'presencial' }),
      row({ id: 'visit-3', status: 'nao_iniciado', modality: 'a_definir' }),
      row({ id: 'visit-4', status: 'reagendado', modality: 'presencial' }),
    ])).toEqual({ agendados: 1, concluidos: 1, presenciais: 2, naoIniciados: 1 })
  })

  test('identifica encontro atrasado sem alterar o status persistido', () => {
    const referenceDate = new Date('2026-08-31T12:00:00.000Z')
    expect(isConsultingOverviewRowOverdue(row({ scheduledAt: '2026-08-30T12:00:00.000Z' }), referenceDate)).toBe(true)
    expect(isConsultingOverviewRowOverdue(row({ status: 'concluido', scheduledAt: '2026-08-30T12:00:00.000Z' }), referenceDate)).toBe(false)
    expect(isConsultingOverviewRowOverdue(row({ scheduledAt: '2026-09-01T12:00:00.000Z' }), referenceDate)).toBe(false)
  })

  test('filtra por período e ordena pela prioridade operacional', () => {
    const now = new Date()
    const past = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const nextWeek = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
    const rows = [
      row({ id: 'future', clientName: 'Beta Cars', scheduledAt: nextWeek }),
      row({ id: 'past', clientName: 'Alpha Motors', scheduledAt: past }),
    ]

    expect(filterConsultingOverviewRows(rows, { search: '', status: 'todos', modality: 'todas', period: 'atrasados' }).map(item => item.id)).toEqual(['past'])
    expect(filterConsultingOverviewRows(rows, { search: '', status: 'todos', modality: 'todas', period: 'proximos_7_dias' }).map(item => item.id)).toEqual(['future'])
    expect(filterConsultingOverviewRows(rows, { search: '', status: 'todos', modality: 'todas', sort: 'prioridade' }).map(item => item.id)).toEqual(['past', 'future'])
  })

  test('mantém ordenação por cliente e mais recentes determinística', () => {
    const rows = [
      row({ id: 'older', clientName: 'Zeta', scheduledAt: '2026-08-01T12:00:00.000Z' }),
      row({ id: 'newer', clientName: 'Alpha', scheduledAt: '2026-08-20T12:00:00.000Z' }),
    ]
    expect(sortConsultingOverviewRows(rows, 'cliente').map(item => item.id)).toEqual(['newer', 'older'])
    expect(sortConsultingOverviewRows(rows, 'recentes').map(item => item.id)).toEqual(['newer', 'older'])
  })
})
