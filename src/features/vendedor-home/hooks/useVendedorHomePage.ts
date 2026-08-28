import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useCheckins } from '@/hooks/useCheckins'
import { useGoals, useStoreMetaRules } from '@/hooks/useGoals'
import { useStoreSales } from '@/hooks/useStoreSales'
import { useRanking } from '@/hooks/useRanking'
import { useFeedbacks, useTrainings } from '@/hooks/useData'
import { useTacticalPrescription } from '@/hooks/useTacticalPrescription'
import { useSellerMetrics } from '@/hooks/useSellerMetrics'
import { useOfficialSellerPerformance } from '@/hooks/useOfficialSellerPerformance'
import { formatWhatsAppMorningReport } from '@/lib/calculations'
import { calculateDailyRoutineDiscipline } from '@/lib/daily-routine'
import { resolveCanonicalIndividualGoal } from '@/lib/storeSalesRules'
import { useOportunidades } from '@/features/crm/hooks/useOportunidades'
import { useVendedorPerfil } from '@/features/crm/hooks/useVendedorPerfil'
import {
  useRemuneracaoEstimadaVendedor,
  useMeuNivelCarreira,
  type RemuneracaoVenda,
} from '@/features/remuneracao/hooks/useRemuneracao'

/**
 * Hook agregador do VendedorHome — centraliza fetching, metrics derivadas,
 * estados de loading/refetch e ações (refresh, share WhatsApp).
 *
 * Story 3.4 reconciliada — decomposição de `src/pages/VendedorHome.tsx`
 * (UX-001) seguindo ADR-0050.
 */
export function useVendedorHomePage() {
  const { profile, storeId } = useAuth()
  const {
    checkins,
    todayCheckin,
    loading: checkisLoading,
    fetchCheckins: refetchCheckins,
    referenceDate,
  } = useCheckins()
  const {
    storeGoal,
    sellerGoals,
    loading: goalsLoading,
    fetchGoals: refetchGoals,
  } = useGoals()
  const { ranking, loading: rankingLoading, refetch: refetchRanking } = useRanking()
  const { metaRules } = useStoreMetaRules(storeId || undefined)
  const storeSales = useStoreSales({ checkins, ranking, rules: metaRules })
  const { nivel: nivelCarreira } = useMeuNivelCarreira(profile?.id || null)
  const { treinamentos, loading: trainingsLoading, refetch: refetchTrainings } = useTrainings()
  const { devolutivas, loading: feedbacksLoading, refetch: refetchFeedbacks } = useFeedbacks()
  const { oportunidades, loading: oportunidadesLoading, refetch: refetchOportunidades } = useOportunidades()
  const { perfil: vendedorPerfil, vinculoTipo, loading: perfilVendedorLoading } = useVendedorPerfil()
  const [isRefetching, setIsRefetching] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [activeSellersCount, setActiveSellersCount] = useState<number | null>(null)
  const [customGoal, setCustomGoal] = useState<number | null>(null)

  const officialPeriod = useMemo(() => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    return { start: `${today.slice(0, 7)}-01`, end: today }
  }, [])
  const {
    performance: officialPerformance,
    loading: officialPerformanceLoading,
    refetch: refetchOfficialPerformance,
  } = useOfficialSellerPerformance(officialPeriod.start, officialPeriod.end, profile?.id, storeId)

  // Contagem de vendedores ativos na loja para rateio em modo 'even'
  useEffect(() => {
    if (!storeId) { setActiveSellersCount(null); return }
    let cancelled = false
    supabase.rpc('contar_vendedores_ativos_loja', { p_store_id: storeId }).then(({ data, error }) => {
      if (!cancelled) setActiveSellersCount(error ? null : (typeof data === 'number' ? data : null))
    })
    return () => { cancelled = true }
  }, [storeId])

  // Meta individual custom (modo 'custom' na tabela metas)
  useEffect(() => {
    const sellerId = profile?.id
    if (!storeId || !sellerId) { setCustomGoal(null); return }
    let cancelled = false
    const now = new Date()
    supabase
      .from('metas')
      .select('target')
      .eq('store_id', storeId)
      .eq('user_id', sellerId)
      .eq('month', now.getMonth() + 1)
      .eq('year', now.getFullYear())
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        const target = !error && data ? Number((data as { target?: number }).target) : null
        setCustomGoal(Number.isFinite(target) && (target as number) >= 0 ? (target as number) : null)
      })
    return () => { cancelled = true }
  }, [storeId, profile?.id])

  // Assinatura Realtime para atualizar vendas e performance em tempo real
  useEffect(() => {
    if (!storeId) return
    const channel = supabase
      .channel(`vendedor-home-realtime-${storeId}-${profile?.id || 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'eventos_comerciais', filter: `loja_id=eq.${storeId}` },
        () => {
          void refetchOfficialPerformance()
          void refetchOportunidades()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', filter: `loja_id=eq.${storeId}`, table: 'oportunidades' },
        () => {
          void refetchOfficialPerformance()
          void refetchOportunidades()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'metas', filter: `store_id=eq.${storeId}` },
        () => {
          void refetchOfficialPerformance()
          void refetchGoals()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'regras_metas_loja', filter: `store_id=eq.${storeId}` },
        () => {
          void refetchOfficialPerformance()
          void refetchGoals()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [storeId, profile?.id, refetchGoals, refetchOfficialPerformance, refetchOportunidades])

  const resolvedMeta = useMemo(() => {
    const storeTarget = storeGoal?.target ?? metaRules?.monthly_goal ?? null
    return resolveCanonicalIndividualGoal({
      // The official RPC already applies the same precedence server-side.
      // During its initial load, the direct seller target and local divisor
      // keep the card from falling back to the full store target.
      officialGoal: customGoal ?? officialPerformance?.meta,
      storeMonthlyGoal: storeTarget,
      activeSellersCount: activeSellersCount ?? (ranking.length > 0 ? ranking.filter(entry => !entry.is_venda_loja).length : null),
      isVendaLoja: profile?.is_venda_loja,
    })
  }, [storeGoal?.target, metaRules?.monthly_goal, activeSellersCount, ranking, customGoal, officialPerformance?.meta, profile?.is_venda_loja])

  const tacticalPrescription = useTacticalPrescription({
    checkins,
    treinamentos,
    userId: profile?.id,
  })
  const legacyMetrics = useSellerMetrics({
    checkins,
    todayCheckin,
    profile,
    sellerGoals,
    storeGoal,
    ranking,
    projectionMode: storeGoal?.projection_mode,
  })
  const metrics = useMemo(() => {
    if (!legacyMetrics) return null
    const vendasMes = officialPerformance?.vendas_realizadas ?? legacyMetrics.vendasMes
    const meta = resolvedMeta ?? legacyMetrics.meta
    // Sem meta não há atingimento: `null`, não `0`. Zero por cento lê-se como
    // "tem meta e não vendeu" — o painel do Admin MX já contabiliza esse engano
    // ("32 vendedor(es) veem projeção e atingimento em 0%", ligado a "7 loja(s)
    // em operação com meta mensal zerada").
    const atingimento = meta > 0 ? Math.round((vendasMes / meta) * 100 * 100) / 100 : null
    const faltaX = Math.max(meta - vendasMes, 0)
    const projecao = officialPerformance?.vendas_projetadas ?? legacyMetrics.projecao
    const vendasOntem = officialPerformance?.vendas_ultimo_dia ?? legacyMetrics.vendasOntem

    return {
      ...legacyMetrics,
      vendasMes,
      projecao,
      meta,
      atingimento,
      faltaX,
      vendasOntem,
    }
  }, [legacyMetrics, officialPerformance, resolvedMeta])
  const vendasDetalhadasRemuneracao = useMemo<RemuneracaoVenda[]>(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

    return oportunidades
      .filter(oportunidade => oportunidade.etapa === 'ganho')
      .filter((oportunidade) => {
        const reference = oportunidade.closed_at || oportunidade.updated_at || oportunidade.created_at
        return reference ? new Date(reference).getTime() >= monthStart : false
      })
      .map(oportunidade => ({
        valor: Number(oportunidade.valor_negociado || 0),
        tipo_veiculo: oportunidade.tipo_veiculo,
      }))
  }, [oportunidades])

  const {
    estimativa: remuneracaoEstimada,
    resumo: remuneracaoResumo,
    plano: remuneracaoPlano,
    regras: remuneracaoRegras,
    loading: remunerationLoading,
    error: remunerationError,
  } = useRemuneracaoEstimadaVendedor({
    lojaId: storeId,
    planoId: vendedorPerfil.remuneracao_plano_id,
    cargo: vendedorPerfil.cargo_atual || undefined,
    vendasRealizadas: metrics?.vendasMes || 0,
    vendasProjetadas: Math.max(metrics?.projecao || 0, metrics?.vendasMes || 0),
    meta: metrics?.meta || 0,
    vendasDetalhadasRealizadas: vendasDetalhadasRemuneracao,
    vinculoTipo,
    atingimentoLojaPercentual: metrics?.atingimento || 0,
    carrosVendidosLoja: storeSales.storeTotalVendas,
    nivelCarreira: nivelCarreira ?? undefined,
  })

  const referenceDateLabel = useMemo(() => {
    if (!referenceDate) return 'Referência D-1'
    return new Date(`${referenceDate}T12:00:00`).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    })
  }, [referenceDate])

  const discipline = useMemo(() => {
    if (!profile?.id || !referenceDate) return null
    const end = new Date(`${referenceDate}T12:00:00`)
    const referenceDates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(end)
      date.setDate(end.getDate() - (6 - index))
      return date.toISOString().slice(0, 10)
    })
    return calculateDailyRoutineDiscipline({ referenceDates, checkins, sellerId: profile.id })
  }, [checkins, profile?.id, referenceDate])

  const referenceCheckin = useMemo(() => {
    if (!profile?.id || !referenceDate) return null
    return (
      checkins.find(
        c => c.seller_user_id === profile.id && c.reference_date === referenceDate,
      ) || null
    )
  }, [checkins, profile?.id, referenceDate])

  const isLancamentoGateLocked = !referenceCheckin

  const weeklyProgressPct = useMemo(() => {
    if (!metrics?.meta) return 0
    const weeklyGoal = Math.max(Math.round(metrics.meta / 4), 1)
    return Math.min(100, Math.round((metrics.vendasSemana / weeklyGoal) * 100))
  }, [metrics?.meta, metrics?.vendasSemana])

  const handleRefresh = useCallback(async () => {
    setIsRefetching(true)
    try {
      await Promise.all([
        refetchCheckins(),
        refetchGoals(),
        refetchRanking?.() || Promise.resolve(),
        refetchTrainings?.() || Promise.resolve(),
        refetchFeedbacks?.() || Promise.resolve(),
        refetchOportunidades?.() || Promise.resolve(),
        refetchOfficialPerformance(),
      ])
      setLastUpdatedAt(new Date())
      toast.success('Cockpit de performance atualizado!')
    } catch {
      toast.error('Não foi possível atualizar o cockpit.')
    } finally {
      setIsRefetching(false)
    }
  }, [refetchCheckins, refetchFeedbacks, refetchGoals, refetchOfficialPerformance, refetchOportunidades, refetchRanking, refetchTrainings])

  const handleShareWhatsApp = useCallback(() => {
    if (!metrics || !profile) return
    const text = formatWhatsAppMorningReport(
      profile.name || 'Especialista',
      referenceDateLabel,
      {
        teamGoal: metrics.meta || 0,
        currentSales: metrics.vendasOntem,
        reaching: metrics.atingimento,
        projection: metrics.projecao,
        gap: Math.max((metrics.meta || 0) - metrics.vendasOntem, 0),
        vnd_total: metrics.vendasOntem,
        leads: referenceCheckin?.leads_prev_day || 0,
        visitas: referenceCheckin?.visit_prev_day || 0,
        agd_total: metrics.agendamentosHoje,
        pendingSellers: [],
      },
      [],
    )
    const opened = window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer',
    )
    if (!opened) toast.error('Não foi possível abrir o WhatsApp.')
  }, [metrics, profile, referenceCheckin, referenceDateLabel])

  const isLoading =
    checkisLoading ||
    goalsLoading ||
    rankingLoading ||
    trainingsLoading ||
    feedbacksLoading ||
    oportunidadesLoading ||
    perfilVendedorLoading ||
    remunerationLoading ||
    officialPerformanceLoading ||
    !metrics

  return {
    profile,
    checkins,
    metrics,
    ranking,
    oportunidades,
    treinamentos,
    devolutivas,
    todayCheckin,
    remuneracaoEstimada,
    remuneracaoResumo,
    remuneracaoPlano,
    remuneracaoRegras,
    remuneracaoDetalhesVisiveis: metaRules?.remuneracao_detalhes_visivel ?? true,
    remunerationError,
    isLancamentoGateLocked,
    tacticalPrescription,
    discipline,
    referenceDate,
    referenceDateLabel,
    weeklyProgressPct,
    isLoading,
    isRefetching,
    lastUpdatedAt,
    handleRefresh,
    handleShareWhatsApp,
  }
}

export type UseVendedorHomePageReturn = ReturnType<typeof useVendedorHomePage>
