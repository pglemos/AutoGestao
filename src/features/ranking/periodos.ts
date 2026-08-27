import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns'

/**
 * Períodos do ranking.
 *
 * Ficam fora do hook de dados de propósito: os controles da rota são
 * presentacionais, e importá-los do hook arrastava `useRanking` — e com ele o
 * cliente Supabase — para dentro de qualquer consumidor do componente.
 */
export type RankingPeriodo = 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual'

export const RANKING_PERIODOS: RankingPeriodo[] = ['Mensal', 'Trimestral', 'Semestral', 'Anual']

export const MESES_POR_PERIODO: Record<RankingPeriodo, number> = {
  Mensal: 1,
  Trimestral: 3,
  Semestral: 6,
  Anual: 12,
}

function toISODate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Janela de datas do período, ancorada num mês de referência.
 *
 * Mora aqui junto do resto da definição de período: a view do gerente precisa
 * dela só para exibir a janela que consultou, e importá-la do hook arrastava o
 * Supabase junto.
 */
export function getPeriodoRange(periodo: RankingPeriodo, referenceMonth?: string): { startDate: string; endDate: string } {
  const referenceMonthIsValid = Boolean(referenceMonth && /^\d{4}-\d{2}$/.test(referenceMonth))
  const anchor = referenceMonthIsValid ? new Date(`${referenceMonth}-01T12:00:00`) : new Date()
  if (periodo === 'Mensal') {
    return { startDate: toISODate(startOfMonth(anchor)), endDate: toISODate(endOfMonth(anchor)) }
  }
  if (periodo === 'Trimestral') {
    return { startDate: toISODate(startOfQuarter(anchor)), endDate: toISODate(endOfQuarter(anchor)) }
  }
  if (periodo === 'Semestral') {
    const semestreInicioMes = anchor.getMonth() < 6 ? 0 : 6
    const inicio = new Date(anchor.getFullYear(), semestreInicioMes, 1)
    const fim = new Date(anchor.getFullYear(), semestreInicioMes + 6, 0)
    return { startDate: toISODate(inicio), endDate: toISODate(fim) }
  }
  return { startDate: toISODate(startOfYear(anchor)), endDate: toISODate(endOfYear(anchor)) }
}
