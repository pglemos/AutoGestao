import { describe, expect, test } from 'bun:test'
import { filterDevelopmentFeedbacks, filterDevelopmentPdiRows } from './development-filters'
import type { FeedbackListItem } from '@/features/gerente-feedback/lib/helpers'

const now = new Date('2026-07-24T12:00:00-03:00')
const feedback = (overrides: Partial<FeedbackListItem>): FeedbackListItem => ({
  id: 'f1',
  seller_id: 's1',
  manager_id: 'm1',
  store_id: 'l1',
  week_reference: '2026-07-20',
  created_at: '2026-07-10T12:00:00-03:00',
  positives: 'Boa condução',
  attention_points: '',
  action: 'Manter rotina',
  acknowledged: false,
  visible_to_seller: true,
  leads_week: 10,
  agd_week: 4,
  visit_week: 2,
  vnd_week: 1,
  tx_lead_agd: 40,
  tx_agd_visita: 50,
  tx_visita_vnd: 50,
  meta_compromisso: 2,
  diagnostic_json: { competency: 'Prospecção' },
  ...overrides,
} as FeedbackListItem)

describe('development filters', () => {
  test('filters feedback by period, seller, type, competency and acknowledgement', () => {
    const rows = [
      feedback({ id: 'positive' }),
      feedback({ id: 'development', seller_id: 's2', positives: '', attention_points: 'Melhorar proposta', acknowledged: true, diagnostic_json: { competency: 'Negociação' } }),
      feedback({ id: 'old', created_at: '2026-05-01T12:00:00-03:00' }),
    ]
    expect(filterDevelopmentFeedbacks({ feedbacks: rows, period: 'current', sellerId: 's2', kind: 'development', competency: 'Negociação', status: 'acknowledged', now }).map((item) => item.id)).toEqual(['development'])
  })

  test('filters and orders PDI rows by rank', () => {
    const rows = [
      { seller: { id: 's1' }, status: { key: 'active' as const, rank: 2 } },
      { seller: { id: 's2' }, status: { key: 'overdue' as const, rank: 1 } },
    ]
    expect(filterDevelopmentPdiRows(rows, '', 'all').map((row) => row.seller.id)).toEqual(['s2', 's1'])
    expect(filterDevelopmentPdiRows(rows, 's1', 'active')).toHaveLength(1)
  })
})
