import React from 'react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'

import type { StatusDefinition } from '../engine/engine'
import { GUIDED_STATUS_OPTIONS } from './guidedStatusOptions'
import { GuidedStatusUpdate } from './GuidedStatusUpdate'
import defaultStatusesCatalog from '../../../../rules/mentor-comercial/v1/statuses.json'

const mockStatuses = defaultStatusesCatalog.records as StatusDefinition[]

describe('GuidedStatusUpdate render tests (TAREFA D02)', () => {
  afterEach(() => {
    cleanup()
  })

  it('1. O primeiro nível mostra exatamente as 8 opções em linguagem natural', () => {
    render(<GuidedStatusUpdate standalone={true} catalogStatuses={mockStatuses} />)

    // Verifica se cada uma das 8 opções em linguagem natural está renderizada na tela
    for (const optionText of GUIDED_STATUS_OPTIONS) {
      expect(screen.getByText(optionText)).toBeTruthy()
    }

    expect(GUIDED_STATUS_OPTIONS).toHaveLength(8)
  })

  it('2. NUNCA existe um select/dropdown com 86 opções na tela', () => {
    const { container } = render(
      <GuidedStatusUpdate standalone={true} catalogStatuses={mockStatuses} />,
    )

    // No passo 1: nenhum elemento select ou combobox no DOM
    expect(container.querySelector('select')).toBeNull()
    expect(screen.queryAllByRole('combobox')).toHaveLength(0)

    // Avança para o passo 2 clicando em uma opção
    const optionButton = screen.getByText('Ainda não consegui falar com o cliente')
    act(() => {
      fireEvent.click(optionButton)
    })

    // No passo 2: continua sem elementos select ou option soltos
    expect(container.querySelector('select')).toBeNull()
    expect(container.querySelectorAll('option')).toHaveLength(0)
    expect(screen.queryAllByRole('combobox')).toHaveLength(0)
  })

  it('3. Escolher uma opção filtra e mostra apenas status compatíveis', () => {
    render(<GuidedStatusUpdate standalone={true} catalogStatuses={mockStatuses} />)

    // Clica na opção 'Ainda não consegui falar com o cliente' (Família: Contato)
    const optionButton = screen.getByText('Ainda não consegui falar com o cliente')
    act(() => {
      fireEvent.click(optionButton)
    })

    // Exibe o cabeçalho confirmando a opção selecionada
    expect(screen.getByText('Opção selecionada')).toBeTruthy()
    expect(screen.getByText('Ainda não consegui falar com o cliente')).toBeTruthy()

    // Status esperados da família Contato no catálogo v1 (CAR-C01, INT-C01, etc.)
    const contatoStatuses = mockStatuses.filter((s) => s.family === 'Contato')
    expect(contatoStatuses.length).toBeGreaterThan(0)

    for (const st of contatoStatuses) {
      expect(screen.getAllByText(st.statusId).length).toBeGreaterThan(0)
    }

    // Status de outra família (ex: Negociação) NÃO devem estar na tela
    const negocStatus = mockStatuses.find((s) => s.family === 'Negociação')!
    expect(screen.queryByText(negocStatus.statusId)).toBeNull()
  })

  it('4. A PRÉVIA aparece antes de confirmar, com Status, Objetivo, Próximo passo, Responsável, Cadência e Script', () => {
    render(<GuidedStatusUpdate standalone={true} catalogStatuses={mockStatuses} />)

    // Passo 1: Seleciona opção
    act(() => {
      fireEvent.click(screen.getByText('Ainda não consegui falar com o cliente'))
    })

    const targetStatus = mockStatuses.find((s) => s.family === 'Contato')!

    // Passo 2: Seleciona o status de Contato
    const radioTarget = screen.getAllByText(targetStatus.statusId)[0].closest('[role="radio"]')
    expect(radioTarget).not.toBeNull()

    act(() => {
      fireEvent.click(radioTarget!)
    })

    // A prévia determinística deve aparecer na tela
    expect(screen.getByText('Prévia da Atualização Determinística')).toBeTruthy()

    // 1. Status Resultante
    expect(screen.getByText('Status Resultante')).toBeTruthy()
    expect(screen.getAllByText(new RegExp(targetStatus.statusId)).length).toBeGreaterThan(0)
    expect(screen.getAllByText(new RegExp(targetStatus.label)).length).toBeGreaterThan(0)

    // 2. Objetivo Comercial
    expect(screen.getByText('Objetivo Comercial')).toBeTruthy()
    expect(screen.getByText(targetStatus.objective)).toBeTruthy()

    // 3. Próximo Passo
    expect(screen.getByText('Próximo Passo')).toBeTruthy()
    expect(screen.getByText(targetStatus.nextStep)).toBeTruthy()

    // 4. Responsável
    expect(screen.getByText('Responsável')).toBeTruthy()
    expect(screen.getByText(targetStatus.responsible)).toBeTruthy()

    // 5. Cadência
    expect(screen.getByText('Cadência')).toBeTruthy()
    expect(screen.getByText(targetStatus.cadenceId ?? 'Sem cadência')).toBeTruthy()

    // 6. Script
    expect(screen.getByText('Script')).toBeTruthy()
    expect(screen.getByText(targetStatus.scriptId ?? 'Sem script')).toBeTruthy()
  })

  it('5. Confirmar só habilita depois de escolher um status', async () => {
    const handleConfirm = mock(async () => {})
    render(
      <GuidedStatusUpdate
        standalone={true}
        catalogStatuses={mockStatuses}
        onConfirm={handleConfirm}
      />,
    )

    const confirmButton = screen.getByText('Confirmar atualização') as HTMLButtonElement

    // 1. No passo 1, o botão confirmar está desabilitado
    expect(confirmButton.disabled).toBe(true)

    // 2. Escolhe uma opção com múltiplos status compatíveis (Contato)
    act(() => {
      fireEvent.click(screen.getByText('Ainda não consegui falar com o cliente'))
    })

    // Antes de escolher um status específico no passo 2, confirmar continua desabilitado
    expect(confirmButton.disabled).toBe(true)

    // 3. Escolhe um status específico
    const radioElements = screen.getAllByRole('radio')
    expect(radioElements.length).toBeGreaterThan(0)

    act(() => {
      fireEvent.click(radioElements[0])
    })

    // Agora o botão de confirmar está habilitado
    expect(confirmButton.disabled).toBe(false)

    // Ao clicar em confirmar, dispara a função onConfirm
    await act(async () => {
      fireEvent.click(confirmButton)
    })
    expect(handleConfirm).toHaveBeenCalledTimes(1)
  })

  it('6. A lista de status é operável por TECLADO (role=radio, Enter e Espaço selecionam)', () => {
    render(<GuidedStatusUpdate standalone={true} catalogStatuses={mockStatuses} />)

    // Avança para a seleção de status
    act(() => {
      fireEvent.click(screen.getByText('Ainda não consegui falar com o cliente'))
    })

    const radioElements = screen.getAllByRole('radio')
    expect(radioElements.length).toBeGreaterThan(1)

    const firstRadio = radioElements[0]
    const secondRadio = radioElements[1]

    expect(firstRadio.getAttribute('role')).toBe('radio')
    expect(secondRadio.getAttribute('role')).toBe('radio')

    // 1. Tecla ' ' (Espaço) seleciona o segundo radio
    act(() => {
      fireEvent.keyDown(secondRadio, { key: ' ' })
    })
    expect(secondRadio.getAttribute('aria-checked')).toBe('true')
    expect(screen.getByText('Prévia da Atualização Determinística')).toBeTruthy()

    // 2. Tecla 'Enter' seleciona o primeiro radio
    act(() => {
      fireEvent.keyDown(firstRadio, { key: 'Enter' })
    })
    expect(firstRadio.getAttribute('aria-checked')).toBe('true')
  })
})
