import { useCallback, useMemo, useState } from 'react'
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns'
import { useRanking } from '@/hooks/useRanking'
import { useAuth } from '@/hooks/useAuth'
import { useStoreMetaRules } from '@/hooks/useGoals'

export type RankingPeriodo = 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual'
export const RANKING_PERIODOS: RankingPeriodo[] = ['Mensal', 'Trimestral', 'Semestral', 'Anual']

const MESES_POR_PERIODO: Record<RankingPeriodo, number> = {
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

export type RankedVendedor = {
  id: string
  nome: string
  foto?: string | null
  unidade?: string
  vendas: number
  meta: number
  leads: number
  agendamentos: number
  visitas: number
  atingimento: number
  conversao: number
  rotina: number | null
  posicao: number
  pontuacao: number | null
  planoRemuneracao?: string | null
}

export function calculateManagerScore(input: { attainment: number; conversion: number; routine: number | null }): number | null {
  if (input.routine === null) return null
  return Math.round((input.attainment * 0.5) + (input.conversion * 0.25) + (input.routine * 0.25))
}

/**
 * Aggregator hook do Ranking por Loja — replica a estrutura de dados
 * do protótipo Base44 (Pódio, Sua posição, Corrida do período, Tabela),
 * com abas de período reais (Mensal/Trimestral/Semestral/Anual) usando
 * o mesmo pipeline de dados (useRanking + useStoreMetaRules).
 */
export function useStoreRankingPageData(options: { referenceMonth?: string } = {}) {
  const { profile } = useAuth()
  const [periodo, setPeriodo] = useState<RankingPeriodo>('Mensal')
  const [unidade, setUnidade] = useState('todas')
  const [isRefetching, setIsRefetching] = useState(false)

  const { startDate, endDate } = useMemo(
    () => getPeriodoRange(periodo, options.referenceMonth),
    [periodo, options.referenceMonth]
  )
  const { ranking, loading, error, refetch } = useRanking(undefined, { startDate, endDate })
  const { metaRules, fetchMetaRules } = useStoreMetaRules()

  const handleRefresh = useCallback(async () => {
    setIsRefetching(true)
    try {
      await Promise.all([refetch(), fetchMetaRules()])
    } finally {
      setIsRefetching(false)
    }
  }, [refetch, fetchMetaRules])

  const metaPeriodo = (metaRules?.monthly_goal ?? 0) * MESES_POR_PERIODO[periodo]

  const todosVendedores = useMemo<RankedVendedor[]>(() => {
    // Todo integrante da loja aparece no ranking. `is_venda_loja` é marcação de
    // cadastro, não critério de exclusão — ver comentário em useRanking.
    return ranking
      .map(r => {
        const conversao = r.visitas > 0 ? Math.round((r.vnd_total / r.visitas) * 100) : 0
        const rotina = r.routine_execution ?? null
        return {
          id: r.user_id,
          nome: r.user_name,
          foto: r.avatar_url,
          unidade: r.store_name,
          vendas: r.vnd_total,
          // `0` may be an explicit individual target; only an absent value
          // may use the period-level fallback.
          meta: r.meta ?? metaPeriodo,
          leads: r.leads,
          agendamentos: r.agd_total,
          visitas: r.visitas,
          atingimento: r.atingimento,
          conversao,
          rotina,
          posicao: r.position,
          pontuacao: calculateManagerScore({ attainment: r.atingimento, conversion: conversao, routine: rotina }),
          planoRemuneracao: r.remuneracao_plano_cargo,
        }
      })
      .sort((a, b) => (b.vendas !== a.vendas ? b.vendas - a.vendas : a.nome.localeCompare(b.nome)))
  }, [ranking, metaPeriodo])

  const unidades = useMemo(() => {
    const set = new Set(todosVendedores.map(v => v.unidade).filter((u): u is string => Boolean(u)))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [todosVendedores])

  const vendedores = useMemo<RankedVendedor[]>(() => {
    if (unidade === 'todas') return todosVendedores
    return todosVendedores.filter(v => v.unidade === unidade)
  }, [todosVendedores, unidade])

  const top3 = vendedores.slice(0, 3)
  const meuIndex = vendedores.findIndex(v => v.id === profile?.id)
  const posicao = meuIndex + 1
  const euVendedor = meuIndex >= 0 ? vendedores[meuIndex] : null
  const atingimento = euVendedor && euVendedor.meta > 0 ? Math.round((euVendedor.vendas / euVendedor.meta) * 100) : 0

  let faltamValor: number | null = null
  if (posicao > 1 && euVendedor) {
    const acima = vendedores[posicao - 2]
    faltamValor = Math.max(0, acima.vendas - euVendedor.vendas)
  }

  return {
    loading,
    error,
    periodo,
    setPeriodo,
    unidade,
    setUnidade,
    unidades,
    isRefetching,
    handleRefresh,
    vendedores,
    top3,
    posicao,
    totalVendedores: vendedores.length,
    atingimento,
    faltamValor,
    euVendedor,
    metaPeriodo,
    meuId: profile?.id,
    profile,
  }
}

export type StoreRankingPageData = ReturnType<typeof useStoreRankingPageData>
