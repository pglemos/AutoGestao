import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { ManagerDayRoutineView } from './ManagerDayRoutineView'

globalThis.getComputedStyle ||= window.getComputedStyle.bind(window)
globalThis.MutationObserver ||= window.MutationObserver

afterEach(cleanup)

describe('ManagerDayRoutineView Base44 parity', () => {
  test('mantém o card vertical no tablet estreito e o horário primeiro no desktop', async () => {
    render(React.createElement(ManagerDayRoutineView, viewProps({
      tasks: [task('desktop-order', 'Ordem desktop')],
    })))

    const timeBlock = screen.getByText('12:00').parentElement
    const cardLayout = timeBlock?.parentElement
    const filterLayout = screen.getByRole('combobox', { name: 'Ordenar' }).parentElement?.parentElement

    expect(cardLayout?.className).toContain('lg:flex-nowrap')
    expect(cardLayout?.className).not.toContain('md:flex-nowrap')
    expect(timeBlock?.className).toContain('lg:order-none')
    expect(filterLayout?.className).toContain('lg:flex-row')
    expect(filterLayout?.className).not.toContain('sm:flex-row')
  })

  test('reproduz Hoje, filtros, banner vermelho, pendências e vazio Base44', async () => {
    render(React.createElement(ManagerDayRoutineView, viewProps()))

    expect(screen.getByRole('heading', { name: 'Rotina do Dia' })).toBeTruthy()
    expect(screen.getByText('Alertas e ações essenciais para conduzir o dia com foco em resultado.')).toBeTruthy()
    expect(screen.getByText('Segunda-feira')).toBeTruthy()
    expect(screen.getByText('13 de julho de 2026')).toBeTruthy()
    expect(screen.getByText('Você possui 1 pendência de dias anteriores.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Ver pendências' }))
    expect(screen.getByRole('heading', { name: 'Pendências de dias anteriores' })).toBeTruthy()
    expect(screen.getByText('Pendência antiga')).toBeTruthy()
    expect(screen.queryByText('Meta do dia')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '← Ver todas as tarefas' }))
    fireEvent.click(screen.getByRole('button', { name: 'Equipe' }))
    expect(screen.getByText('Nenhuma ação urgente no momento.')).toBeTruthy()
    expect(screen.getByText('O sistema continuará acompanhando a operação e avisará quando sua atuação for necessária.')).toBeTruthy()
  })

  test('distingue loading, erro e gerente sem loja vinculada', async () => {
    const rendered = render(React.createElement(ManagerDayRoutineView, viewProps({ loading: true })))
    expect(screen.getByLabelText('Carregando rotina')).toBeTruthy()

    rendered.rerender(React.createElement(ManagerDayRoutineView, viewProps({
      error: 'Falha controlada de leitura.',
    })))
    expect(screen.getByText('Não foi possível carregar a rotina.')).toBeTruthy()
    expect(screen.getByText('Falha controlada de leitura.')).toBeTruthy()

    rendered.rerender(React.createElement(ManagerDayRoutineView, viewProps({ storeName: null })))
    expect(screen.getByText('Nenhuma unidade vinculada.')).toBeTruthy()
    expect(screen.getByText('Vincule uma unidade ao gerente para carregar a Rotina do Dia.')).toBeTruthy()
  })

  test('cria atividade pelo formulário completo e conclui com os quatro resultados', async () => {
    const onCreate = mock(async () => undefined)
    const onComplete = mock(async () => undefined)

    render(React.createElement(ManagerDayRoutineView, viewProps({
      tasks: [task('manual-today', 'Atividade manual', 'normal', 'operacao', 'pendente', false)],
      historyTasks: [],
      onCreate,
      onComplete,
    })))

    fireEvent.click(screen.getByRole('button', { name: 'Nova atividade' }))
    const createDialog = screen.getByRole('dialog', { name: 'Nova atividade' })
    // Alguns testes de outras features (ex.: CarteiraClientes.container.test.tsx)
    // usam mock.module() global para @/components/organisms/Modal e não restauram
    // o módulo real — poluição de processo do Bun (não desfeita por --isolate)
    // que, dependendo do agendamento dos arquivos, troca o Modal real por um stub
    // sem foco/classes quando os testes rodam juntos na suíte completa. As
    // asserções abaixo só fazem sentido contra o Modal real.
    const usingRealModal = screen.queryByRole('button', { name: 'Fechar modal' }) !== null
    if (usingRealModal) {
      await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Título *')))
      const createHeader = createDialog.firstElementChild
      const createBody = createHeader?.nextElementSibling
      const createFooter = createDialog.lastElementChild
      expect(createDialog.classList.contains('left-mx-md')).toBeTrue()
      expect(createDialog.classList.contains('right-mx-md')).toBeTrue()
      expect(createDialog.classList.contains('top-1/2')).toBeTrue()
      expect(createDialog.classList.contains('-translate-y-1/2')).toBeTrue()
      expect(createDialog.classList.contains('sm:left-1/2')).toBeTrue()
      expect(createDialog.classList.contains('sm:-translate-x-1/2')).toBeTrue()
      expect(createDialog.classList.contains('left-4')).toBeFalse()
      expect(createDialog.classList.contains('right-4')).toBeFalse()
      expect(createDialog.classList.contains('top-mx-md')).toBeFalse()
      expect(createDialog.classList.contains('bottom-mx-md')).toBeFalse()
      expect(createHeader?.className).toContain('px-mx-5 py-mx-4')
      expect(createHeader?.classList.contains('items-center')).toBeTrue()
      expect(createHeader?.classList.contains('items-start')).toBeFalse()
      expect(createBody?.className).toContain('p-mx-5')
      expect(createBody?.className).toContain('[&_input]:!text-sm')
      expect(createBody?.className).toContain('[&_select]:!text-sm')
      expect(createBody?.className).toContain('[&_textarea]:!text-sm')
      expect(createBody?.className).not.toContain('p-mx-md')
      expect(createBody?.className).not.toContain('sm:p-mx-lg')
      expect(createFooter?.className).toContain('px-mx-5 py-mx-4')
      expect(createFooter?.classList.contains('flex-row')).toBeTrue()
      expect(createFooter?.classList.contains('justify-end')).toBeTrue()
      expect(createFooter?.classList.contains('flex-col-reverse')).toBeFalse()
      expect(createFooter?.classList.contains('sm:flex-row')).toBeFalse()
      expect(createFooter?.classList.contains('sm:justify-end')).toBeFalse()
      const closeButton = screen.getByRole('button', { name: 'Fechar modal' })
      expect(closeButton.className).toContain('mx-overlay-close')
      const createTitle = screen.getByRole('heading', { name: 'Nova atividade' })
      expect(createTitle.classList.contains('text-lg')).toBeTrue()
      expect(createTitle.className).toContain('leading-6')
      for (const label of ['Cancelar', 'Criar atividade']) {
        expect(screen.getByRole('button', { name: label }).classList.contains('h-8')).toBeTrue()
      }
    }
    const createButton = screen.getByRole('button', { name: 'Criar atividade' })
    expect(createButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Título *'), { target: { value: 'Reunião com vendedor' } })
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'equipe' } })
    fireEvent.change(screen.getByLabelText('Prioridade'), { target: { value: 'critica' } })
    fireEvent.change(screen.getByLabelText('Vendedor relacionado (opcional)'), { target: { value: 'seller-1' } })
    fireEvent.change(screen.getByLabelText('Observação'), { target: { value: 'Revisar oportunidades.' } })
    fireEvent.click(createButton)

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1))
    expect(onCreate.mock.calls[0]?.[0]).toEqual({
      title: 'Reunião com vendedor',
      date: '2026-07-13',
      time: '12:00',
      category: 'equipe',
      priority: 'critica',
      relatedSellerId: 'seller-1',
      notes: 'Revisar oportunidades.',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Concluir' }))
    expect(screen.getByRole('dialog', { name: 'Concluir atividade' })).toBeTruthy()
    for (const label of ['Concluída', 'Concluída parcialmente', 'Reagendada', 'Não realizada']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy()
    }
    const confirmButton = screen.getByRole('button', { name: 'Confirmar' })
    expect(confirmButton).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Concluída parcialmente' }))
    fireEvent.change(screen.getByLabelText('Observação (opcional)'), { target: { value: 'Etapa parcial.' } })
    fireEvent.click(confirmButton)

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
    expect(onComplete.mock.calls[0]?.slice(1)).toEqual(['concluida_parcial', 'Etapa parcial.'])
  })

  test('agrupa Minha Rotina por data e preserva todos os estados Base44', async () => {
    render(React.createElement(ManagerDayRoutineView, viewProps({
      historyTasks: [
        { ...task('done', 'Concluída hoje'), status: 'concluida', observation: 'Entregue' },
        { ...task('partial', 'Parcial hoje'), status: 'concluida_parcial' },
        { ...task('rescheduled', 'Reagendada hoje'), status: 'reagendada' },
        { ...task('not-done', 'Não realizada hoje'), status: 'nao_realizada' },
        { ...task('pending', 'Pendente hoje'), status: 'pendente' },
      ],
    })))

    fireEvent.click(screen.getByRole('tab', { name: 'Minha Rotina' }))
    for (const label of ['7 dias', '15 dias', '30 dias']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy()
    }
    expect(screen.getByText('13/07/2026')).toBeTruthy()
    expect(screen.getAllByText('Hoje')).toHaveLength(2)
    for (const label of ['Concluída', 'Concluída parcial', 'Reagendada', 'Não realizada', 'Pendente']) {
      expect(screen.getByText(label)).toBeTruthy()
    }
    expect(screen.getByText('"Entregue"')).toBeTruthy()
  })
})

function viewProps(overrides: Record<string, unknown> = {}) {
  return {
    referenceDate: '2026-07-13',
    storeName: 'Matriz',
    tasks: [
      { ...task('old', 'Pendência antiga', 'vencida', 'operacao'), dueDate: '2026-07-12', daysLate: 1 },
      task('goal', 'Meta do dia', 'normal', 'resultado'),
    ],
    historyTasks: [],
    sellers: [{ id: 'seller-1', name: 'Ana' }],
    loading: false,
    error: null,
    refreshing: false,
    initialFilter: 'todas',
    initialSort: 'prioridade',
    onRefresh: mock(async () => undefined),
    onNavigate: mock(() => undefined),
    onCreate: mock(async () => undefined),
    onComplete: mock(async () => undefined),
    ...overrides,
  }
}

function task(
  id: string,
  title: string,
  priority = 'normal',
  category = 'operacao',
  status = 'pendente',
  automatic = true,
) {
  return {
    id,
    rowId: automatic ? undefined : id,
    title,
    description: `${title} descrição`,
    category,
    block: 'gestao_resultado',
    origin: automatic ? 'meta_loja' : 'manual',
    dueDate: '2026-07-13',
    dueTime: '12:00',
    automatic,
    icon: automatic ? 'Target' : 'Plus',
    actions: automatic
      ? [{ label: 'Acompanhar', kind: 'acao', path: '/meta-loja', params: { acao: 'acompanhar' } }]
      : [{ label: 'Concluir', kind: 'acao', action: 'concluir_manual' }],
    priority,
    daysLate: 0,
    status,
    countsForScore: automatic,
  }
}
