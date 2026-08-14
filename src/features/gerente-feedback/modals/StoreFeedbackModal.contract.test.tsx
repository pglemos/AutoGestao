import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { StoreFeedbackModal } from './StoreFeedbackModal'
import type { FeedbackFormData } from '@/types/database'

globalThis.getComputedStyle ||= (() => ({ animationName: 'none' })) as typeof getComputedStyle
globalThis.MutationObserver ||= class { observe() {}; disconnect() {}; takeRecords() { return [] } } as unknown as typeof MutationObserver

const onCloseMock = mock(() => {})
const onSubmitMock = mock(() => {})

const baseFormData: FeedbackFormData = {
  seller_id: '',
  week_reference: '2026-08-17',
  leads_week: 5,
  agd_week: 3,
  visit_week: 2,
  vnd_week: 1,
  tx_lead_agd: 0,
  tx_agd_visita: 0,
  tx_visita_vnd: 0,
  meta_compromisso: 0,
  caso_motivo: '',
  positives: '',
  attention_points: '',
  action: '',
  visible_to_seller: true,
}

const validFormData: FeedbackFormData = {
  ...baseFormData,
  seller_id: 's-1',
  caso_motivo: 'Motivo registrado',
  positives: 'Pontos fortes',
  attention_points: 'Pontos de atenção',
  action: 'Ação definida',
}

function renderModal(overrides: Record<string, unknown> = {}) {
  return render(
    <StoreFeedbackModal
      open
      onClose={onCloseMock}
      saving={false}
      formData={baseFormData}
      setFormData={mock(() => {}) as React.Dispatch<React.SetStateAction<FeedbackFormData>>}
      sellers={[{ id: 's-1', name: 'Ana' }]}
      onSellerSelect={mock(() => {})}
      onWeekReferenceChange={mock(() => {})}
      onSubmit={onSubmitMock}
      {...overrides}
    />,
  )
}

describe('contrato StoreFeedbackModal — Dialog canônico (migração bounded)', () => {
  beforeEach(() => {
    cleanup()
    onCloseMock.mockClear()
    onSubmitMock.mockClear()
  })
  afterEach(() => cleanup())

  it('usa a família Dialog canônica, sem overlay custom no fonte', () => {
    const source = readFileSync(new URL('./StoreFeedbackModal.tsx', import.meta.url), 'utf8')
    expect(source).toContain("from '@/components/ui/dialog'")
    expect(source).toContain('<DialogContent')
    expect(source).toContain('<DialogBody')
    expect(source).not.toMatch(/fixed inset-0/)
    expect(source).not.toContain('AnimatePresence')
    expect(source).not.toContain('molecules/Card')
    expect(source).not.toContain('aria-modal')
    expect(source).not.toMatch(/z-\[var\(--mx-z-modal/)
  })

  it('expõe o overlay canônico com camada, body scroll e título', () => {
    renderModal()
    const dialog = screen.getByRole('dialog', { name: 'Nova Mentoria' })
    expect(dialog).toHaveAttribute('data-mx-overlay', 'dialog')
    expect(dialog).toHaveAttribute('data-mx-overlay-layer', 'modal')
    expect(dialog.querySelector('[data-mx-overlay-body="true"]')).not.toBeNull()
    expect(screen.getByText('Ciclo de Devolutiva Semanal')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'CANCELAR' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'REGISTRAR' })).toBeInTheDocument()
  })

  it('fecha via botão X chamando onClose', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Fechar diálogo' }))
    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })

  it('fecha via ESC chamando onClose', () => {
    renderModal()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })

  it('desabilita REGISTRAR sem vendedor/campos e habilita com o formulário completo', () => {
    const { rerender } = renderModal()
    expect(screen.getByRole('button', { name: 'REGISTRAR' })).toBeDisabled()
    rerender(
      <StoreFeedbackModal
        open
        onClose={onCloseMock}
        saving={false}
        formData={validFormData}
        setFormData={mock(() => {}) as React.Dispatch<React.SetStateAction<FeedbackFormData>>}
        sellers={[{ id: 's-1', name: 'Ana' }]}
        onSellerSelect={mock(() => {})}
        onWeekReferenceChange={mock(() => {})}
        onSubmit={onSubmitMock}
      />,
    )
    expect(screen.getByRole('button', { name: 'REGISTRAR' })).toBeEnabled()
  })

  it('submete chamando onSubmit quando habilitado', () => {
    renderModal({ formData: validFormData })
    fireEvent.click(screen.getByRole('button', { name: 'REGISTRAR' }))
    expect(onSubmitMock).toHaveBeenCalledTimes(1)
  })

  it('mostra estado de loading durante o salvamento', () => {
    renderModal({ saving: true, formData: validFormData })
    expect(screen.getByRole('button', { name: 'REGISTRAR' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'REGISTRAR' })).toContainElement(document.querySelector('.animate-spin'))
  })

  it('não renderiza quando fechado', () => {
    const { rerender } = renderModal({ open: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    rerender(
      <StoreFeedbackModal
        open={false}
        onClose={onCloseMock}
        saving={false}
        formData={baseFormData}
        setFormData={mock(() => {}) as React.Dispatch<React.SetStateAction<FeedbackFormData>>}
        sellers={[]}
        onSellerSelect={mock(() => {})}
        onWeekReferenceChange={mock(() => {})}
        onSubmit={onSubmitMock}
      />,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
