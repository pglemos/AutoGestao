// Competência fechada (M-1) no fuso America/São_Paulo.
//
// Só se lança em mês já fechado. O mês corrente ainda está acontecendo: aceitar
// realizado nele mistura dado parcial com dado consolidado, e ninguém vê isso
// acontecer depois — o número simplesmente fica menor do que deveria.
//
// A origem no Base44 lia `new Date()` por dentro e convertia o fuso com
// `toLocaleString('en-US')`, cujo formato depende do ambiente. Aqui o instante é
// injetável e a conversão usa Intl, que devolve as partes já resolvidas.

const TIMEZONE = 'America/Sao_Paulo'

export const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

/** ACTUAL = realizado do ano do plano; PREVIOUS_YEAR = mesma competência no ano anterior. */
export type CompetenceViewType = 'ACTUAL' | 'PREVIOUS_YEAR'

export type Competence = {
  currentMonth: number
  currentYear: number
  /** Último mês fechado em calendário, independente do ano do plano. */
  lastClosedMonth: number
  lastClosedYear: number
  /** Mês de realizado a considerar no ano do plano; null quando não há nenhum. */
  targetActualMonth: number | null
  targetActualYear: number
  /** Plano do ano corrente em janeiro: nenhum mês do ano fechou ainda. */
  actualHasNoClosedMonth: boolean
  previousYearMonth: number | null
  previousYearYear: number
  isPlanPastYear: boolean
  isPlanCurrentYear: boolean
}

function nowInSaoPaulo(now: Date): { month: number; year: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const get = (type: string) => Number(parts.find(part => part.type === type)?.value)
  return { month: get('month'), year: get('year') }
}

/**
 * Resolve a competência de referência para um ano de plano.
 *
 * `now` existe para teste e para telas que precisem simular uma data; em uso
 * normal fica omitido.
 */
export function resolveLastClosedCompetence(referenceYear: number, now: Date = new Date()): Competence {
  const { month: currentMonth, year: currentYear } = nowInSaoPaulo(now)

  const planYear = Number(referenceYear)
  const isPlanCurrentYear = currentYear === planYear
  const isPlanPastYear = currentYear > planYear

  const lastClosedMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const lastClosedYear = currentMonth === 1 ? currentYear - 1 : currentYear

  let targetActualMonth: number | null = null
  let actualHasNoClosedMonth = false
  if (isPlanPastYear) {
    targetActualMonth = 12
  } else if (isPlanCurrentYear) {
    if (currentMonth === 1) actualHasNoClosedMonth = true
    else targetActualMonth = currentMonth - 1
  }

  let previousYearMonth: number | null = null
  if (isPlanPastYear) {
    previousYearMonth = 12
  } else if (isPlanCurrentYear) {
    previousYearMonth = currentMonth === 1 ? 12 : currentMonth - 1
  }

  return {
    currentMonth,
    currentYear,
    lastClosedMonth,
    lastClosedYear,
    targetActualMonth,
    targetActualYear: planYear,
    actualHasNoClosedMonth,
    previousYearMonth,
    previousYearYear: planYear - 1,
    isPlanPastYear,
    isPlanCurrentYear,
  }
}

/**
 * Meses que podem receber ou exibir valor.
 *
 * Ano passado: o ano inteiro fechou. Ano corrente: até o mês anterior.
 * Ano futuro: nenhum — não há competência fechada num ano que não começou.
 */
export function getValidMonthsForView(
  referenceYear: number,
  viewType: CompetenceViewType,
  competence: Competence,
): number[] {
  const { currentMonth, isPlanPastYear, isPlanCurrentYear } = competence

  if (isPlanPastYear) return [...ALL_MONTHS]

  if (isPlanCurrentYear) {
    if (currentMonth === 1) {
      // Em janeiro nada do ano corrente fechou. Para o comparativo com o ano
      // anterior, dezembro é a última competência disponível.
      return viewType === 'ACTUAL' ? [] : [12]
    }
    return Array.from({ length: currentMonth - 1 }, (_, index) => index + 1)
  }

  return []
}

/** Mês bloqueado é mês que ainda não fechou — lançamento nele deve ser recusado. */
export function isMonthBlocked(
  month: number,
  referenceYear: number,
  viewType: CompetenceViewType,
  competence: Competence,
): boolean {
  return !getValidMonthsForView(referenceYear, viewType, competence).includes(month)
}

/** Meses bloqueados de uma lista de valores mensais, para recusar um lote inteiro. */
export function blockedMonthsIn(
  months: number[],
  referenceYear: number,
  viewType: CompetenceViewType,
  competence: Competence,
): number[] {
  const valid = new Set(getValidMonthsForView(referenceYear, viewType, competence))
  return months.filter(month => !valid.has(month))
}
