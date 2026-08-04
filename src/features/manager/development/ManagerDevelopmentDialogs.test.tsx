import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { FeedbackListItem } from '@/features/gerente-feedback/lib/helpers'
import { Modal } from '@/components/organisms/Modal'
import { DevelopmentTeamCompetencyMap } from './DevelopmentTeamCompetencyMap'

const resetDom = () => {
  cleanup()
  document.body.replaceChildren()
}

beforeEach(resetDom)
afterEach(resetDom)

const feedback: FeedbackListItem = {
  id: '00000000-0000-0000-0000-000000000001',
  store_id: 'store-1',
  manager_id: 'manager-1',
  seller_id: 'seller-1',
  seller_name: 'Álvaro Souza',
  week_reference: '2026-07-06',
  leads_week: 1,
  agd_week: 2,
  visit_week: 1,
  vnd_week: 0,
  tx_lead_agd: 0,
  tx_agd_visita: 0,
  tx_visita_vnd: 0,
  meta_compromisso: 1,
  positives: 'Boa escuta',
  attention_points: 'Atualizar a carteira',
  action: 'Revisar a carteira às 16h',
  caso_motivo: null,
  notes: 'Acompanhar na próxima conversa',
  team_avg_json: {},
  diagnostic_json: { competencia: 'Carteira de Clientes' },
  commitment_suggested: 1,
  acknowledged: false,
  acknowledged_at: null,
  seller_comment: null,
  seller_comment_at: null,
  created_at: '2026-07-14T10:00:00.000Z',
}

describe('Desenvolvimento manager dialogs', () => {
  test('prende foco, fecha por Escape e devolve foco no detalhe do feedback', async () => {
    const onClose = mock()
    const trigger = document.createElement('button')
    trigger.textContent = 'Abrir detalhe'
    document.body.appendChild(trigger)
    trigger.focus()

    const { rerender } = render(
      <Modal open onClose={onClose} title="Detalhes do feedback" description={feedback.seller_name} referenceStyle>
        <p>{feedback.positives}</p>
        <p>{feedback.attention_points}</p>
        <p>{feedback.action}</p>
      </Modal>,
    )
    const close = screen.getByRole('button', { name: 'Fechar modal' })
    await waitFor(() => expect(document.activeElement).toBe(close))

    fireEvent.keyDown(close, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    rerender(
      <Modal open={false} onClose={onClose} title="Detalhes do feedback" description={feedback.seller_name} referenceStyle>
        <p>{feedback.positives}</p>
        <p>{feedback.attention_points}</p>
        <p>{feedback.action}</p>
      </Modal>,
    )
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  test('prende foco, fecha por Escape e devolve foco no mapa da equipe', async () => {
    const onClose = mock()
    const trigger = document.createElement('button')
    trigger.textContent = 'Abrir mapa'
    document.body.appendChild(trigger)
    trigger.focus()

    const { rerender } = render(<DevelopmentTeamCompetencyMap open pdis={[]} onClose={onClose} />)
    const close = screen.getByRole('button', { name: 'Fechar modal' })
    await waitFor(() => expect(document.activeElement).toBe(close))

    fireEvent.keyDown(close, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    rerender(<DevelopmentTeamCompetencyMap open={false} pdis={[]} onClose={onClose} />)
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})
