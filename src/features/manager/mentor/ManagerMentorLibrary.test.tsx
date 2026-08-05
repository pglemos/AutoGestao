import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { ManagerMentorLibrary } from './ManagerMentorLibrary'
import { MENTOR_FAVORITES_KEY, MENTOR_GUIDANCE, filterMentorGuidance } from './manager-mentor-guidance'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('filterMentorGuidance', () => {
  test('filtra por categoria, busca e favoritos', () => {
    const byCategory = filterMentorGuidance(MENTOR_GUIDANCE, { category: 'pessoas', search: '', favorites: [] })
    const bySearch = filterMentorGuidance(MENTOR_GUIDANCE, { category: 'todas', search: 'REUNIÃO MATINAL', favorites: [] })
    const byFavorites = filterMentorGuidance(MENTOR_GUIDANCE, {
      category: 'favoritos',
      search: '',
      favorites: ['Como recuperar ritmo de meta'],
    })

    expect(byCategory.every(item => item.category === 'pessoas')).toBe(true)
    expect(bySearch.map(item => item.title)).toEqual(['Como conduzir uma reunião matinal'])
    expect(byFavorites.map(item => item.title)).toEqual(['Como recuperar ritmo de meta'])
  })

  test('busca também no conteúdo da orientação', () => {
    const result = filterMentorGuidance(MENTOR_GUIDANCE, { category: 'todas', search: 'SCI', favorites: [] })

    expect(result.map(item => item.title)).toContain('Como realizar feedback individual')
  })
})

describe('ManagerMentorLibrary', () => {
  test('abre a orientação em modal com tempo estimado e conteúdo', () => {
    render(<ManagerMentorLibrary />)

    fireEvent.click(screen.getAllByRole('button', { name: /Ver orientação/ })[0])

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Como conduzir uma reunião matinal')
    expect(dialog).toHaveTextContent('Tempo estimado: 15 min')
    expect(dialog).toHaveTextContent('Destaque o top performer do dia.')
  })

  test('persiste favoritos no localStorage e alimenta o filtro', () => {
    render(<ManagerMentorLibrary />)

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Como recuperar ritmo de meta aos favoritos' }))
    expect(JSON.parse(window.localStorage.getItem(MENTOR_FAVORITES_KEY) || '[]')).toEqual(['Como recuperar ritmo de meta'])

    fireEvent.click(screen.getByRole('button', { name: '★ Favoritos' }))
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByText('Como recuperar ritmo de meta')).toBeInTheDocument()
  })

  test('mostra vazio explícito quando a busca não encontra orientação', () => {
    render(<ManagerMentorLibrary />)

    fireEvent.change(screen.getByLabelText('Buscar orientação'), { target: { value: 'inexistente' } })

    expect(screen.getByText('Nenhum resultado para a busca.')).toBeInTheDocument()
  })
})
