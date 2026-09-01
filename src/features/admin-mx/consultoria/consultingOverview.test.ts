import { describe, expect, test } from 'bun:test'
import {
  filterConsultingOverviewRows,
  getConsultingOverviewRowState,
  groupConsultingOverviewRows,
  hasEffectiveDateConflict,
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

  test('resume estados operacionais sem misturar status, modalidade e prioridade', () => {
    const referenceDate = new Date('2026-08-31T12:00:00')
    expect(summarizeConsultingOverview([
      row({ id: 'late', scheduledAt: '2026-08-30T12:00:00', status: 'agendado' }),
      row({ id: 'review', scheduledAt: '2026-08-20T12:00:00', effectiveVisitDate: '2026-08-21', status: 'agendado' }),
      row({ id: 'today', scheduledAt: '2026-08-31T14:00:00', status: 'reagendado' }),
      row({ id: 'next', scheduledAt: '2026-09-02T14:00:00', status: 'agendado' }),
      row({ id: 'done', scheduledAt: '2026-08-01T12:00:00', status: 'concluido', modality: 'presencial' }),
      row({ id: 'cancelled', scheduledAt: '2026-08-01T12:00:00', status: 'cancelado' }),
    ], referenceDate)).toEqual({
      total: 6,
      filaRevisao: 2,
      atrasados: 1,
      revisarStatus: 1,
      agendaAtiva: 2,
      hoje: 1,
      proximos7Dias: 1,
      agendados: 3,
      concluidos: 1,
      cancelados: 1,
      presenciais: 1,
      naoIniciados: 0,
    })
  })

  test('prioriza a revisão de status quando há data efetiva', () => {
    const referenceDate = new Date('2026-08-31T12:00:00.000Z')
    expect(isConsultingOverviewRowOverdue(row({ scheduledAt: '2026-08-30T12:00:00.000Z' }), referenceDate)).toBe(true)
    expect(isConsultingOverviewRowOverdue(row({ status: 'concluido', scheduledAt: '2026-08-30T12:00:00.000Z' }), referenceDate)).toBe(false)
    expect(isConsultingOverviewRowOverdue(row({ scheduledAt: '2026-09-01T12:00:00.000Z' }), referenceDate)).toBe(false)
    const conflicting = row({ scheduledAt: '2026-08-30T12:00:00.000Z', effectiveVisitDate: '2026-08-31', status: 'agendado' })
    expect(hasEffectiveDateConflict(conflicting)).toBe(true)
    expect(isConsultingOverviewRowOverdue(conflicting, referenceDate)).toBe(false)
    expect(getConsultingOverviewRowState(conflicting, referenceDate)).toBe('revisar_status')
  })

  test('filtra por período e ordena pela prioridade operacional', () => {
    const now = new Date('2026-08-31T12:00:00')
    const past = '2026-08-30T12:00:00'
    const nextWeek = '2026-09-03T12:00:00'
    const rows = [
      row({ id: 'future', clientName: 'Beta Cars', scheduledAt: nextWeek }),
      row({ id: 'past', clientName: 'Alpha Motors', scheduledAt: past }),
    ]

    expect(filterConsultingOverviewRows(rows, { search: '', status: 'todos', modality: 'todas', period: 'atrasados', referenceDate: now }).map(item => item.id)).toEqual(['past'])
    expect(filterConsultingOverviewRows(rows, { search: '', status: 'todos', modality: 'todas', period: 'proximos_7_dias', referenceDate: now }).map(item => item.id)).toEqual(['future'])
    expect(filterConsultingOverviewRows(rows, { search: '', status: 'todos', modality: 'todas', sort: 'prioridade', referenceDate: now }).map(item => item.id)).toEqual(['past', 'future'])
  })

  test('agrupa a fila por decisão operacional', () => {
    const referenceDate = new Date('2026-08-31T12:00:00')
    const groups = groupConsultingOverviewRows([
      row({ id: 'review', scheduledAt: '2026-08-20T12:00:00', effectiveVisitDate: '2026-08-21', status: 'agendado' }),
      row({ id: 'late', scheduledAt: '2026-08-30T12:00:00' }),
      row({ id: 'today', scheduledAt: '2026-08-31T14:00:00' }),
      row({ id: 'next', scheduledAt: '2026-09-03T12:00:00' }),
      row({ id: 'future', scheduledAt: '2026-09-20T12:00:00' }),
      row({ id: 'none', scheduledAt: null, status: 'nao_iniciado' }),
      row({ id: 'done', status: 'concluido' }),
      row({ id: 'cancelled', status: 'cancelado' }),
    ], referenceDate)

    expect(groups.map(group => group.key)).toEqual([
      'revisar_status',
      'atrasados',
      'hoje',
      'proximos_7_dias',
      'agenda_futura',
      'sem_agenda',
      'concluidos',
      'cancelados',
    ])
    expect(groups.map(group => group.rows[0].id)).toEqual([
      'review',
      'late',
      'today',
      'next',
      'future',
      'none',
      'done',
      'cancelled',
    ])
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
