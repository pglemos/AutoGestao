import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { DevelopmentFeedbackTable } from './DevelopmentFeedbackTable'
import { DevelopmentPdiTable, type DevelopmentPdiRow } from './DevelopmentPdiTable'
import type { FeedbackListItem } from '@/features/gerente-feedback/lib/helpers'

const feedback: FeedbackListItem = {
  id: '00000000-0000-0000-0000-000000000001',
  store_id: 'store-1',
  manager_id: null,
  seller_id: 'seller-1',
  seller_name: 'Ana Vendedora',
  week_reference: '2026-08-03',
  leads_week: 10,
  agd_week: 5,
  visit_week: 4,
  vnd_week: 2000,
  tx_lead_agd: 0.5,
  tx_agd_visita: 0.8,
  tx_visita_vnd: 500,
  meta_compromisso: 5,
  positives: 'Pontualidade',
  attention_points: 'Funil abaixo da meta',
  action: 'Revisar roteiro',
  caso_motivo: null,
  notes: null,
  team_avg_json: {},
  diagnostic_json: {},
  commitment_suggested: 5,
  visible_to_seller: true,
  acknowledged: false,
  acknowledged_at: null,
  seller_comment: null,
}

const rows: DevelopmentPdiRow[] = [
  {
    seller: { id: 'seller-1', name: 'Bruno Vendedor' },
    pdi: null,
    status: { key: 'none', label: 'Não iniciado', rank: 0, className: 'bg-muted text-muted-foreground' },
    progress: 0,
    overdueActions: 2,
  },
  {
    seller: { id: 'seller-2', name: 'Carla Vendedora' },
    pdi: {
      id: 'pdi-1',
      seller_id: 'seller-2',
      data_realizacao: '2026-08-05T12:00:00.000Z',
      due_date: '2026-08-20T12:00:00.000Z',
      created_at: '2026-07-01T12:00:00.000Z',
      top_5_gaps: [
        { competencia: 'Abordagem' },
        { competencia: 'Fechamento' },
      ] as Array<{ competencia: string }>,
    } as unknown as DevelopmentPdiRow['pdi'],
    status: { key: 'active', label: 'Em andamento', rank: 1, className: 'bg-status-info-surface text-status-info-text' },
    progress: 60,
    overdueActions: 0,
  },
]

describe('Development tables — fundação canônica Table', () => {
  test('DevelopmentFeedbackTable delega à família Table/TableSurface preservando conteúdo e callbacks', () => {
    const html = renderToStaticMarkup(
      <DevelopmentFeedbackTable feedbacks={[feedback]} onOpen={() => {}} onShareWhatsApp={() => {}} />,
    )

    expect(html).toContain('data-mx-table=""')
    expect(html).toContain('data-mx-table-header=""')
    expect(html).toContain('data-mx-table-head=""')
    expect(html).toContain('data-mx-table-body=""')
    expect(html).toContain('data-mx-table-row=""')
    expect(html).toContain('data-mx-table-cell=""')
    expect(html).toContain('data-mx-table-surface=""')
    expect(html).toMatch(/scope="col"/)
    expect(html).toContain('Ana Vendedora')
    expect(html).toContain('Desenvolvimento')
    expect(html).toContain('Funil abaixo da meta')
    expect(html).toContain('Revisar roteiro')
    expect(html).toContain('Ver')
    expect(html).toContain('WhatsApp')
    expect(html).not.toContain('Nenhum feedback registrado')
  })

  test('DevelopmentFeedbackTable mantém o empty state de negócio', () => {
    const html = renderToStaticMarkup(<DevelopmentFeedbackTable feedbacks={[]} onOpen={() => {}} onShareWhatsApp={() => {}} />)

    expect(html).toContain('Nenhum feedback registrado no período')
    expect(html).not.toContain('data-mx-table=""')
    expect(html).not.toContain('data-mx-scroll-region=""')
    expect(html).not.toContain('data-mx-table-surface=""')
  })

  test('DevelopmentPdiTable delega à família Table/TableSurface preservando conteúdo e callbacks', () => {
    const html = renderToStaticMarkup(<DevelopmentPdiTable rows={rows} onOpenOrStart={() => {}} />)

    expect(html).toContain('data-mx-table=""')
    expect(html).toContain('data-mx-table-header=""')
    expect(html).toContain('data-mx-table-head=""')
    expect(html).toContain('data-mx-table-body=""')
    expect(html).toContain('data-mx-table-row=""')
    expect(html).toContain('data-mx-table-cell=""')
    expect(html).toContain('data-mx-table-surface=""')
    expect(html).toMatch(/scope="col"/)
    expect(html).toContain('Bruno Vendedor')
    expect(html).toContain('Carla Vendedora')
    expect(html).toContain('Em andamento')
    expect(html).toContain('Abordagem')
    expect(html).toContain('Iniciar')
    expect(html).toContain('Abrir')
    expect(html).not.toContain('Nenhum vendedor encontrado')
  })

  test('DevelopmentPdiTable mantém o empty state de negócio', () => {
    const html = renderToStaticMarkup(<DevelopmentPdiTable rows={[]} onOpenOrStart={() => {}} />)

    expect(html).toContain('Nenhum vendedor encontrado')
    expect(html).not.toContain('data-mx-table=""')
    expect(html).not.toContain('data-mx-scroll-region=""')
    expect(html).not.toContain('data-mx-table-surface=""')
  })
})
