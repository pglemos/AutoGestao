import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ManagerSellerProfileModal } from './ManagerSellerProfileModal'
import { buildManagerTeamCard } from './manager-team-kanban'
import type { RankingEntry } from '@/types/database'

beforeEach(() => {
  cleanup()
})

afterEach(() => cleanup())

function seller(overrides: Partial<RankingEntry> = {}): RankingEntry {
  return {
    user_id: 'seller-1',
    user_name: 'Álvaro Souza',
    is_venda_loja: false,
    vnd_total: 0,
    leads: 12,
    agd_total: 3,
    visitas: 1,
    meta: 10,
    atingimento: 0,
    projecao: 0,
    ritmo: 1,
    efficiency: 0,
    status: { label: '', color: '' },
    gap: 10,
    position: 1,
    routine_execution: null,
    discipline_score: null,
    ...overrides,
  }
}

function renderProfile(overrides: Partial<RankingEntry> = {}) {
  const row = seller(overrides)
  const onClose = vi.fn()
  const onOpenFeedback = vi.fn()
  const onOpenRoutine = vi.fn()
  const onOpenTraining = vi.fn()

  render(<ManagerSellerProfileModal open seller={row} card={buildManagerTeamCard(row)} storeName="Matriz" onClose={onClose} onOpenFeedback={onOpenFeedback} onOpenRoutine={onOpenRoutine} onOpenTraining={onOpenTraining} />)
  return { onClose, onOpenFeedback, onOpenRoutine, onOpenTraining }
}

describe('ManagerSellerProfileModal Base44 parity', () => {
  test('reproduz cabeçalho, cinco abas e estado de diagnóstico sem fabricar dados', () => {
    renderProfile()

    const dialog = document.querySelector('[aria-label="Perfil de Álvaro Souza"]')
    expect(dialog).toBeTruthy()
    expect(dialog?.className).toContain('z-[120]')
    expect(screen.getAllByRole('button', { name: 'Fechar perfil do vendedor' })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
    expect(screen.getByText('Álvaro Souza')).toBeTruthy()
    expect(screen.getByText('Composição do Status')).toBeTruthy()
    expect(screen.getByText('Motivo:')).toBeTruthy()
    expect(screen.getByText('Consistência parcial — aguardando fechamentos oficiais.')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Visão Geral' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Performance' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Rotina' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Feedbacks' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Treinamentos' })).toBeTruthy()
    expect(screen.getByText('Data da última venda')).toBeTruthy()
    expect(screen.getByText('Próximo compromisso do PDI')).toBeTruthy()
    expect(screen.getByText('Último acesso à Universidade MX')).toBeTruthy()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  test('alterna abas e mantém as ações contextuais do vendedor', () => {
    const actions = renderProfile({ vnd_total: 2, routine_execution: 80, discipline_score: 70 })

    fireEvent.click(screen.getByRole('tab', { name: 'Performance' }))
    expect(screen.getByText('Resultado por canal')).toBeTruthy()
    expect(screen.getByText('Atendimento anterior / Sem canal')).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: 'Rotina' }))
    expect(screen.getByText('Execução verificada: 80%.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Rotina da Equipe' }))
    expect(actions.onOpenRoutine).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('tab', { name: 'Feedbacks' }))
    fireEvent.click(screen.getByRole('button', { name: 'Novo Feedback' }))
    expect(actions.onOpenFeedback).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getAllByRole('button', { name: 'Registrar feedback' })[0])
    expect(actions.onOpenFeedback).toHaveBeenCalledTimes(2)
  })

  test('reproduz os painéis vazios observados no Base44 nas abas Rotina, Feedbacks e Treinamentos', () => {
    renderProfile({ vnd_total: 2, meta: 5, routine_execution: null, discipline_score: null })

    fireEvent.click(screen.getByRole('tab', { name: 'Rotina' }))
    expect(screen.getByText('Não há dados de rotina para o período selecionado.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Abrir Rotina da Equipe' })).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: 'Feedbacks' }))
    expect(screen.getByRole('button', { name: 'Novo Feedback' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ver histórico completo' })).toBeTruthy()
    expect(screen.getByText('PDI ativo')).toBeTruthy()
    expect(screen.getByText('Histórico de feedbacks')).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: 'Treinamentos' }))
    expect(screen.getAllByRole('button', { name: 'Recomendar treinamento' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Ver acompanhamento completo' })).toBeTruthy()
    expect(screen.getByText('Acompanhamento de treinamentos')).toBeTruthy()
    expect(screen.getByText('Nenhum treinamento atribuído a este vendedor.')).toBeTruthy()
  })

  test('mantém os nomes completos das abas e a troca de período da Performance do Base44', () => {
    renderProfile({ vnd_total: 2, meta: 5, routine_execution: null, discipline_score: null })

    expect(screen.queryByText('Geral')).toBeNull()
    expect(screen.queryByText('Feedback')).toBeNull()
    expect(screen.queryByText('Trilha')).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: 'Performance' }))

    const monthButton = screen.getByRole('button', { name: 'Mês atual' })
    const quarterButton = screen.getByRole('button', { name: 'Últimos 3 meses' })
    expect(monthButton.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Atendimento anterior / Sem canal')).toBeTruthy()
    expect(screen.queryByText('Atendimento anterior / Sem canal confirmado')).toBeNull()

    fireEvent.click(quarterButton)
    expect(quarterButton.getAttribute('aria-pressed')).toBe('true')
    expect(monthButton.getAttribute('aria-pressed')).toBe('false')
  })
})
