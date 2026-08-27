import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRanking } from '@/hooks/useRanking'
import { useAuth } from '@/hooks/useAuth'
import { useStoreMetaRules } from '@/hooks/useGoals'

import { getPeriodoRange, MESES_POR_PERIODO, RANKING_PERIODOS, type RankingPeriodo } from '@/features/ranking/periodos'

// Reexportados para não quebrar os consumidores históricos do hook.
export { RANKING_PERIODOS, getPeriodoRange }
export type { RankingPeriodo }

export type RankedVendedor = {
  id: string
  nome: string
  foto?: string | null
  unidade?: string
  vendas: number
  /** `null` = vendedor sem meta individual resolvível no período. Nunca 0-por-omissão. */
  meta: number | null
  leads: number
  agendamentos: number
  visitas: number
  atingimento: number | null
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
export const RANKING_PREF_KEY = 'mx.ranking.filtros'
const PREF_KEY = RANKING_PREF_KEY

type FiltrosSalvos = { periodo?: RankingPeriodo; unidade?: string }

/**
 * Período e unidade sobrevivem à sessão.
 *
 * O gerente abre esta tela várias vezes por dia e refazia as duas seleções toda
 * vez. O mês de referência NÃO é persistido de propósito: voltar dias depois e
 * encontrar a tela ancorada num mês antigo, sem ter pedido, é pior do que
 * reselecionar.
 */
export function lerFiltrosSalvos(): FiltrosSalvos {
  try {
    const bruto = window.localStorage.getItem(PREF_KEY)
    if (!bruto) return {}
    const salvo = JSON.parse(bruto) as FiltrosSalvos
    return {
      periodo: RANKING_PERIODOS.includes(salvo.periodo as RankingPeriodo) ? salvo.periodo : undefined,
      unidade: typeof salvo.unidade === 'string' ? salvo.unidade : undefined,
    }
  } catch {
    // Janela anônima, storage bloqueado ou JSON corrompido: o padrão serve.
    return {}
  }
}

export function useStoreRankingPageData(options: { referenceMonth?: string } = {}) {
  const { profile } = useAuth()
  const [periodo, setPeriodo] = useState<RankingPeriodo>(() => lerFiltrosSalvos().periodo ?? 'Mensal')
  const [unidade, setUnidade] = useState(() => lerFiltrosSalvos().unidade ?? 'todas')
  const [isRefetching, setIsRefetching] = useState(false)

  const { startDate, endDate } = useMemo(
    () => getPeriodoRange(periodo, options.referenceMonth),
    [periodo, options.referenceMonth]
  )
  const { ranking, loading, error, refetch } = useRanking(undefined, { startDate, endDate })
  const { metaRules, fetchMetaRules } = useStoreMetaRules()

  // O vendedor precisa saber se o número na tela é de agora. Antes a tela não
  // expunha nem o horário nem o refresh que este hook já calculava.
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  useEffect(() => {
    if (!loading && !error) setLastUpdatedAt(new Date())
  }, [loading, error, ranking])

  useEffect(() => {
    try {
      window.localStorage.setItem(PREF_KEY, JSON.stringify({ periodo, unidade }))
    } catch {
      // Persistir a preferência é conveniência, nunca requisito.
    }
  }, [periodo, unidade])

  const handleRefresh = useCallback(async () => {
    setIsRefetching(true)
    try {
      await Promise.all([refetch(), fetchMetaRules()])
    } finally {
      setIsRefetching(false)
    }
  }, [refetch, fetchMetaRules])

  const mesesPeriodo = MESES_POR_PERIODO[periodo]
  const metaPeriodo = (metaRules?.monthly_goal ?? 0) * mesesPeriodo

  const todosVendedores = useMemo<RankedVendedor[]>(() => {
    // Todo integrante da loja aparece no ranking. `is_venda_loja` é marcação de
    // cadastro, não critério de exclusão — ver comentário em useRanking.
    return ranking
      .map(r => {
        const conversao = r.visitas > 0 ? Math.round((r.vnd_total / r.visitas) * 100) : 0
        const rotina = r.routine_execution ?? null
        const metaResolvida = r.meta > 0 ? r.meta * mesesPeriodo : null
        const metaIndividual = metaResolvida === null ? null : Math.round((r.vnd_total / metaResolvida) * 100)
        return {
          id: r.user_id,
          nome: r.user_name,
          foto: r.avatar_url,
          unidade: r.store_name,
          vendas: r.vnd_total,
          // `useRanking` colapsa "sem meta resolvível" em `0` (resolveIndividualGoal
          // devolve null e leva `?? 0`). Aqui a distinção volta: sem meta é `null`,
          // e a UI mostra `—` em vez de fabricar 0% e um selo vermelho.
          // `r.meta` é mensal; o período (trimestre/semestre/ano) multiplica.
          meta: metaResolvida,
          leads: r.leads,
          agendamentos: r.agd_total,
          visitas: r.visitas,
          atingimento: metaIndividual,
          conversao,
          rotina,
          posicao: r.position,
          // Mesma regra do `routine === null`: sem meta individual, a pontuação
          // não é estimada.
          pontuacao: metaIndividual === null ? null : calculateManagerScore({ attainment: metaIndividual, conversion: conversao, routine: rotina }),
          planoRemuneracao: r.remuneracao_plano_cargo,
        }
      })
      .sort((a, b) => (b.vendas !== a.vendas ? b.vendas - a.vendas : a.nome.localeCompare(b.nome)))
  }, [ranking, mesesPeriodo])

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
  const atingimento = euVendedor?.atingimento ?? null
  const minhaMeta = euVendedor?.meta ?? null
  /** Linha de chegada da Corrida: a meta individual do usuário. Sem meta
   *  individual, a corrida não tem chegada — mostra só a liderança. */
  const metaCorrida = minhaMeta

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
    lastUpdatedAt,
    vendedores,
    top3,
    posicao,
    totalVendedores: vendedores.length,
    atingimento,
    faltamValor,
    euVendedor,
    metaPeriodo,
    minhaMeta,
    metaCorrida,
    rankingEntries: ranking,
    individualGoalMode: metaRules?.individual_goal_mode ?? null,
    meuId: profile?.id,
    profile,
  }
}

export type StoreRankingPageData = ReturnType<typeof useStoreRankingPageData>
