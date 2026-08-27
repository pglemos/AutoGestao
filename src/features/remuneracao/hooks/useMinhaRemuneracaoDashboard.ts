import { useMemo } from 'react'
import { useVendedorHomePage } from '@/features/vendedor-home/hooks/useVendedorHomePage'
import { calcularResumoRemuneracaoVendedor, type RemuneracaoVenda } from '../lib/comparativo'

const ETAPAS_QUENTES = ['negociacao', 'fechamento'] as const

function varPay(calculo: { comissao: number; bonus: number }) {
  return calculo.comissao + calculo.bonus
}

/**
 * Aggregator hook do dashboard financeiro do vendedor (rota /minha-remuneracao) —
 * reproduz a estrutura do protótipo Base44 (VendedorDashboard.jsx: hero de comissão,
 * marco/milestone, oportunidades quentes, desempenho, potencial e histórico 6 meses),
 * mas usa o motor de cálculo real do MX (`calcularResumoRemuneracaoVendedor`) em vez
 * de inventar dados — ver docs/auditorias/auditoria-comparativa-base44-vs-mx-2026-07-03.md.
 */
export function useMinhaRemuneracaoDashboard() {
  const home = useVendedorHomePage()
  const oportunidades = home.oportunidades ?? []
  const calculo = home.remuneracaoResumo?.projetado ?? null
  const plano = home.remuneracaoPlano
  const regras = home.remuneracaoRegras ?? []

  const oportunidadesQuentes = useMemo(
    () => oportunidades.filter(o => (ETAPAS_QUENTES as readonly string[]).includes(o.etapa)),
    [oportunidades],
  )

  const comissaoPotencialOportunidades = useMemo(() => {
    if (!calculo || !plano || oportunidadesQuentes.length === 0) return 0
    const vendasExtra: RemuneracaoVenda[] = oportunidadesQuentes.map(o => ({
      valor: Number(o.valor_negociado || 0),
      tipo_veiculo: o.tipo_veiculo,
    }))
    const comQuentes = calcularResumoRemuneracaoVendedor({
      plano,
      regras,
      vendasRealizadas: calculo.vendasConsideradas + oportunidadesQuentes.length,
      vendasProjetadas: calculo.vendasConsideradas + oportunidadesQuentes.length,
      meta: calculo.meta,
      vendasDetalhadasRealizadas: vendasExtra,
    }).projetado
    return Math.max(0, varPay(comQuentes) - varPay(calculo))
  }, [calculo, plano, regras, oportunidadesQuentes])

  const historico6Meses = useMemo(() => {
    if (!plano) return []
    const meses: { label: string; mes: string; comissao: number; isAtual: boolean }[] = []
    const ganhas = oportunidades.filter(o => o.etapa === 'ganho')
    for (let i = 5; i >= 0; i -= 1) {
      const ref = new Date()
      ref.setDate(1)
      ref.setMonth(ref.getMonth() - i)
      const monthStart = new Date(ref.getFullYear(), ref.getMonth(), 1).getTime()
      const monthEnd = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59).getTime()
      const vendasDoMes = ganhas.filter(o => {
        const t = new Date(o.closed_at || o.updated_at).getTime()
        return t >= monthStart && t <= monthEnd
      })
      const vendasDetalhadas: RemuneracaoVenda[] = vendasDoMes.map(o => ({
        valor: Number(o.valor_negociado || 0),
        tipo_veiculo: o.tipo_veiculo,
      }))
      const resultado = calcularResumoRemuneracaoVendedor({
        plano,
        regras,
        vendasRealizadas: vendasDoMes.length,
        vendasProjetadas: vendasDoMes.length,
        meta: calculo?.meta ?? 0,
        vendasDetalhadasRealizadas: vendasDetalhadas,
      }).realizado
      meses.push({
        label: ref.toLocaleDateString('pt-BR', { month: 'long' }),
        mes: `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`,
        comissao: varPay(resultado),
        isAtual: i === 0,
      })
    }
    return meses
  }, [oportunidades, plano, regras, calculo?.meta])

  const melhorMes = historico6Meses.length > 0 ? Math.max(...historico6Meses.map(h => h.comissao)) : 0

  const proximoPatamar = calculo?.bonusPatamares.find(p => !p.atingido) ?? null
  const milestone = proximoPatamar
    ? {
        veiculosFaltam: Math.max(0, Math.ceil((proximoPatamar.percentualMetaMin / 100) * calculo!.meta) - calculo!.vendasConsideradas),
        valorProjetado: proximoPatamar.valor,
        percentual: calculo && proximoPatamar.percentualMetaMin > 0
          ? Math.min(100, Math.round((calculo.atingimentoPercentual / proximoPatamar.percentualMetaMin) * 100))
          : 0,
        semDados: false,
      }
    : {
        veiculosFaltam: 0,
        valorProjetado: 0,
        percentual: 0,
        semDados: true,
      }

  const comissaoEstimada = calculo ? varPay(calculo) : 0

  return {
    isLoading: home.isLoading || !home.metrics,
    error: home.remunerationError,
    disponivel: calculo?.disponivel ?? false,
    profile: home.profile,
    qtdVendas: calculo?.vendasConsideradas ?? 0,
    comissaoEstimada,
    milestone,
    oportunidadesQuentesCount: oportunidadesQuentes.length,
    comissaoPotencialOportunidades,
    melhorMes,
    historico6Meses,
    calculo,
    detalhesVisiveis: home.remuneracaoDetalhesVisiveis ?? true,
    // Exposto para o estado de erro: sem isto o botão "Tentar novamente" da
    // tela ficava sem ação e o vendedor só saía do erro recarregando a página.
    recarregar: home.handleRefresh,
  }
}

export type MinhaRemuneracaoDashboardData = ReturnType<typeof useMinhaRemuneracaoDashboard>
