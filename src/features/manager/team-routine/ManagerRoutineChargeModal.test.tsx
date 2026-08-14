import { afterEach, describe, expect, mock, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { DEFAULT_MESSAGE, ManagerRoutineChargeModal } from './ManagerRoutineChargeModal'

globalThis.getComputedStyle ||= (() => ({ animationName: 'none' })) as typeof getComputedStyle
globalThis.MutationObserver ||= class { observe() {}; disconnect() {}; takeRecords() { return [] } } as unknown as typeof MutationObserver

describe('ManagerRoutineChargeModal', () => {
  afterEach(() => cleanup())

  test('abre o formulário Base44 e envia a mensagem editada somente após confirmação', async () => {
    const onSave = mock(async () => undefined)
    render(<ManagerRoutineChargeModal open sellerName="Ana" date="11/07/2026" onClose={() => undefined} onSave={onSave} />)

    expect(screen.getByText('Cobrar rotina do vendedor')).toBeTruthy()
    expect(screen.getByRole('dialog')).toHaveAttribute('data-mx-overlay', 'modal')
    const message = screen.getByLabelText('Mensagem') as HTMLTextAreaElement
    expect(message.value).toBe(DEFAULT_MESSAGE)
    fireEvent.change(message, { target: { value: 'Atualize suas pendências hoje.' } })
    expect(onSave).not.toHaveBeenCalled()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enviar cobrança' }))
      await Promise.resolve()
    })

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith('Atualize suas pendências hoje.')
  })
})
