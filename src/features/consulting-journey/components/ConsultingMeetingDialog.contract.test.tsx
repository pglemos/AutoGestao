import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import type { ConsultingJourneyController } from '../useConsultingJourney'

mock.module('./LessonOverviewTab', () => ({ LessonOverviewTab: () => <div data-testid="tab-lesson">Aula</div> }))
mock.module('./DeliveryTab', () => ({ DeliveryTab: () => <div data-testid="tab-delivery">Entrega</div> }))
mock.module('./EvidenceTab', () => ({ EvidenceTab: () => <div data-testid="tab-evidence">Evidências</div> }))
mock.module('./ProgressTab', () => ({ ProgressTab: () => <div data-testid="tab-progress">Progresso</div> }))
mock.module('./AnticipationPanel', () => ({ AnticipationPanel: () => <div data-testid="anticipation">Antecipação</div> }))

const closeVisitMock = mock(() => {})

const { ConsultingMeetingDialog } = await import('./ConsultingMeetingDialog')

const controller: ConsultingJourneyController = {
  snapshot: null,
  visits: [],
  selectedVisit: {
    id: 'v-1',
    visitNumber: 2,
    objective: 'Acompanhar execução',
    googleMeetLink: 'https://meet.google.com/xyz',
  } as ConsultingJourneyController['selectedVisit'],
  selectedVisitId: 'v-1',
  dialogOpen: true,
  loading: false,
  mutating: false,
  error: null,
  realtimeStatus: 'connected',
  canReviewAnticipation: false,
  canReviewEvidence: false,
  openVisit: mock(() => {}),
  closeVisit: closeVisitMock,
  reload: mock(async () => {}),
  saveLessonProgress: mock(async () => {}),
  updateDeliveryItem: mock(async () => {}),
  confirmParticipant: mock(async () => {}),
  requestAnticipation: mock(async () => {}),
  reviewAnticipation: mock(async () => {}),
  cancelAnticipation: mock(async () => {}),
} as unknown as ConsultingJourneyController

function renderDialog() {
  return render(<ConsultingMeetingDialog controller={controller} />)
}

describe('contrato ConsultingMeetingDialog — Dialog canônico (overlay tokenizado)', () => {
  beforeEach(() => {
    cleanup()
    closeVisitMock.mockClear()
  })
  afterEach(() => cleanup())

  it('usa a família Dialog canônica, sem geometria raw de overlay no fonte', () => {
    const source = readFileSync(new URL('./ConsultingMeetingDialog.tsx', import.meta.url), 'utf8')
    expect(source).toContain("from '@/components/ui/dialog'")
    expect(source).toContain('<DialogContent')
    expect(source).toContain('<DialogBody')
    expect(source).toContain('mx-overlay-close')
    expect(source).not.toMatch(/max-h-\[94vh\]/)
    expect(source).not.toMatch(/fixed inset-0/)
    expect(source).not.toContain('z-[var(--mx-z-modal')
  })

  it('expõe o overlay canônico com camada, body scroll e max-height via token', () => {
    renderDialog()
    const dialog = screen.getByRole('dialog', { name: 'Acompanhar execução' })
    expect(dialog).toHaveAttribute('data-mx-overlay', 'dialog')
    expect(dialog).toHaveAttribute('data-mx-overlay-layer', 'modal')
    expect(dialog.className).not.toContain('max-h-[94vh]')
    expect(dialog.querySelector('[data-mx-overlay-body="true"]')).not.toBeNull()
  })

  it('preserva header, link de reunião, abas e botão de fechar', () => {
    renderDialog()
    expect(screen.getByText('Encontro 2')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Entrar na reunião' })).toHaveAttribute('href', 'https://meet.google.com/xyz')
    expect(screen.getByRole('button', { name: 'Aula e Visão Geral' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrega' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Evidências' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Progresso' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fechar encontro' })).toBeInTheDocument()
  })

  it('alterna abas preservando o conteúdo por tab', () => {
    renderDialog()
    expect(screen.getByTestId('tab-lesson')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Entrega' }))
    expect(screen.getByTestId('tab-delivery')).toBeInTheDocument()
    expect(screen.queryByTestId('tab-lesson')).not.toBeInTheDocument()
  })

  it('fecha chamando closeVisit', () => {
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Fechar encontro' }))
    expect(closeVisitMock).toHaveBeenCalledTimes(1)
  })

  it('não renderiza quando fechado ou sem visita selecionada', () => {
    const closed: ConsultingJourneyController = { ...controller, dialogOpen: false } as unknown as ConsultingJourneyController
    const { rerender } = render(<ConsultingMeetingDialog controller={closed} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    rerender(<ConsultingMeetingDialog controller={{ ...controller, selectedVisit: null } as unknown as ConsultingJourneyController} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
