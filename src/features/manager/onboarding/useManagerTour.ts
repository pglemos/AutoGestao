import { useCallback, useEffect, useState } from 'react'

/**
 * Controle de exibição do Tour do Gerente (porte de `useTourGerente` do Base44).
 *
 * Regra do Base44 preservada: o tour abre sozinho nas três primeiras visitas de
 * cada tela e para de abrir quando o usuário pula. A contagem é por rota e vive
 * no localStorage — é preferência de navegação, não dado de operação.
 */

export const TOUR_VISITS_KEY = 'mx_tour_visits'
export const TOUR_SKIPPED_KEY = 'mx_tour_skipped'
export const TOUR_AUTO_OPEN_VISITS = 3

function readMap(key: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '{}')
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function writeMap(key: string, value: Record<string, unknown>) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Sem storage o tour simplesmente não memoriza visitas; não bloqueia a tela.
  }
}

export function useManagerTour(pageKey: string | null) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!pageKey) {
      setActive(false)
      return
    }

    const visits = readMap(TOUR_VISITS_KEY)
    const count = (Number(visits[pageKey]) || 0) + 1
    visits[pageKey] = count
    writeMap(TOUR_VISITS_KEY, visits)

    const skipped = readMap(TOUR_SKIPPED_KEY)
    if (count > TOUR_AUTO_OPEN_VISITS || skipped[pageKey]) {
      setActive(false)
      return
    }

    const timer = setTimeout(() => setActive(true), 700)
    return () => clearTimeout(timer)
  }, [pageKey])

  const dismiss = useCallback(() => setActive(false), [])

  const skipPermanently = useCallback(() => {
    if (!pageKey) return
    const skipped = readMap(TOUR_SKIPPED_KEY)
    skipped[pageKey] = true
    writeMap(TOUR_SKIPPED_KEY, skipped)
    setActive(false)
  }, [pageKey])

  const restart = useCallback(() => {
    if (!pageKey) return
    const visits = readMap(TOUR_VISITS_KEY)
    visits[pageKey] = 0
    writeMap(TOUR_VISITS_KEY, visits)
    const skipped = readMap(TOUR_SKIPPED_KEY)
    delete skipped[pageKey]
    writeMap(TOUR_SKIPPED_KEY, skipped)
    setActive(true)
  }, [pageKey])

  return { active, dismiss, skipPermanently, restart }
}
