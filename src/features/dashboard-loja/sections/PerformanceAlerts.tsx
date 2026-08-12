import { useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle2, CircleAlert, Lightbulb } from 'lucide-react'
import type { UserRole } from '@/types/database'

export type OwnerPerformanceAlert = {
  title: string
  description: string
  recommendation: string
  action: string
  variant: 'success' | 'warning' | 'danger' | 'outline'
  impact: 'Alto' | 'Médio' | 'Baixo'
  ctaLabel: string
  ctaTo: string
  department?: string
}

type ChannelTone = 'success' | 'info' | 'brand'

type Checkin = {
  vnd_porta_prev_day?: number | null
  vnd_cart_prev_day?: number | null
  vnd_net_prev_day?: number | null
}

type FunnelData = {
  tx_lead_agd: number
  tx_agd_visita: number
  tx_visita_vnd: number
}

type FunnelBenchmarks = {
  leadAgd: number
  agdVisita: number
  visitaVnd: number
}

type Metrics = {
  totalSales: number
  goalValue: number
  attainment: number
  checkedInCount: number
}

type Seller = { id?: string; name?: string; checkin_today?: boolean }

export function usePerformanceAlerts({
  role,
  isOwner,
  metrics,
  sellers,
  checkins,
  funilData,
  funnelBenchmarks,
  selectedStoreId,
}: {
  role: UserRole | null
  isOwner: boolean
  metrics: Metrics
  sellers: Seller[] | null | undefined
  checkins: Checkin[] | null | undefined
  funilData: FunnelData
  funnelBenchmarks: FunnelBenchmarks
  selectedStoreId: string | null
}) {
  const location = useLocation()
  const alerts = useMemo<OwnerPerformanceAlert[]>(() => {
    const sellerCount = (sellers || []).length
    const out: OwnerPerformanceAlert[] = []

    if (metrics.goalValue > 0 && metrics.attainment < 80) {
      out.push({
        title: 'Meta abaixo do ritmo',
        description: `${metrics.attainment}% da meta realizada no período selecionado.`,
        recommendation: isOwner
          ? 'Concentrar cobrança em meta, ritmo diário e gargalos que impedem volume.'
          : 'Reorganizar cadência da equipe e priorizar vendedores abaixo do ritmo.',
        action: isOwner
          ? 'Decidir cobrança de plano de recuperação com o gerente.'
          : 'Validar plano de ataque com gerente e vendedores de menor ritmo.',
        variant: metrics.attainment < 60 ? 'danger' : 'warning',
        impact: metrics.attainment < 60 ? 'Alto' : 'Médio',
        ctaLabel: 'Abrir metas',
        ctaTo: role === 'gerente' ? '/meta-loja' : `${location.pathname}?id=${selectedStoreId || ''}&tab=metas`,
        department: 'Comercial',
      })
    }

    if (sellerCount > 0 && metrics.checkedInCount < sellerCount) {
      out.push({
        title: 'Rotina diária incompleta',
        description: `${metrics.checkedInCount}/${sellerCount} vendedores com registro sincronizado.`,
        recommendation: isOwner
          ? 'Cobrar disciplina pelo gerente sem assumir a execução operacional.'
          : 'Resolver pendências de lançamento antes da reunião de acompanhamento.',
        action: isOwner
          ? 'Acompanhar a cobrança do gerente; não executar a rotina operacional.'
          : 'Cobrar fechamento da puxada diária antes da próxima reunião de gestão.',
        variant: 'warning',
        impact: 'Médio',
        ctaLabel: role === 'gerente' ? 'Abrir rotina' : 'Ver equipe',
        ctaTo: role === 'gerente' ? '/rotina-equipe' : `${location.pathname}?id=${selectedStoreId || ''}&tab=equipe`,
        department: 'Pessoas',
      })
    }

    if (funilData.tx_lead_agd < funnelBenchmarks.leadAgd) {
      out.push({
        title: 'Baixa conversão de lead',
        description: `${funilData.tx_lead_agd}% contra benchmark de ${funnelBenchmarks.leadAgd}%.`,
        recommendation: isOwner
          ? 'Revisar origem, qualidade e tratamento dos leads com decisão comercial.'
          : 'Auditar tempo de resposta, abordagem inicial e qualidade dos agendamentos.',
        action: isOwner
          ? 'Priorizar decisão comercial sobre origem e tratamento dos leads.'
          : 'Revisar abordagem inicial, tempo de resposta e qualidade dos agendamentos.',
        variant: 'danger',
        impact: 'Alto',
        ctaLabel: role === 'gerente' ? 'Criar devolutiva' : 'Ver ranking',
        ctaTo: role === 'gerente' ? '/feedbacks-pdis?tab=feedbacks' : '/classificacao',
        department: 'Comercial',
      })
    }

    if (funilData.tx_visita_vnd < funnelBenchmarks.visitaVnd) {
      out.push({
        title: 'Visita não vira venda',
        description: `${funilData.tx_visita_vnd}% contra benchmark de ${funnelBenchmarks.visitaVnd}%.`,
        recommendation: isOwner
          ? 'Investigar barreiras de preço, troca, financiamento e fechamento.'
          : 'Escutar propostas perdidas e treinar fechamento com casos reais.',
        action: isOwner
          ? 'Decidir intervenção em preço, troca, financiamento ou fechamento.'
          : 'Checar proposta, avaliação de troca, financiamento e fechamento.',
        variant: 'danger',
        impact: 'Alto',
        ctaLabel: 'Ver ranking',
        ctaTo: role === 'gerente' ? '/ranking' : '/classificacao',
        department: 'Comercial',
      })
    }

    if ((checkins || []).length === 0) {
      out.push({
        title: 'Sem dados no período',
        description: 'Ainda não há check-ins para sustentar um diagnóstico operacional.',
        recommendation: isOwner
          ? 'Validar se a rotina foi executada antes de analisar performance.'
          : 'Confirmar adesão da equipe ao fechamento diário antes da leitura gerencial.',
        action: isOwner
          ? 'Solicitar ao gerente confirmação da rotina antes de decidir.'
          : 'Validar se a equipe lançou a rotina antes de concluir a leitura.',
        variant: 'outline',
        impact: 'Médio',
        ctaLabel: role === 'gerente' ? 'Abrir rotina' : 'Ver equipe',
        ctaTo: role === 'gerente' ? '/rotina-equipe' : `${location.pathname}?id=${selectedStoreId || ''}&tab=equipe`,
        department: 'Operações',
      })
    } else if (out.length === 0) {
      out.push({
        title: 'Operação dentro do esperado',
        description: 'Meta, disciplina e funil sem alerta crítico no período.',
        recommendation: isOwner
          ? 'Manter cadência e observar oportunidades de escala.'
          : 'Preservar rotina e reconhecer vendedores com melhor evolução.',
        action: isOwner
          ? 'Acompanhar execução e cobrar manutenção da cadência.'
          : 'Manter cadência e observar oportunidades individuais no ranking.',
        variant: 'success',
        impact: 'Baixo',
        ctaLabel: 'Ver ranking',
        ctaTo: role === 'gerente' ? '/ranking' : '/classificacao',
        department: 'Operações',
      })
    }

    const weight = { danger: 0, warning: 1, outline: 2, success: 3 } as const
    return out.sort((a, b) => weight[a.variant] - weight[b.variant]).slice(0, 4)
  }, [checkins, funnelBenchmarks, funilData, isOwner, location.pathname, metrics, role, selectedStoreId, sellers])

  const mixCanais = useMemo(() => {
    const porta = (checkins || []).reduce((acc, c) => acc + (c.vnd_porta_prev_day || 0), 0)
    const carteira = (checkins || []).reduce((acc, c) => acc + (c.vnd_cart_prev_day || 0), 0)
    const digital = (checkins || []).reduce((acc, c) => acc + (c.vnd_net_prev_day || 0), 0)
    const total = metrics.totalSales

    return [
      { label: 'Porta (Showroom)', color: 'bg-status-success', pct: total > 0 ? Math.round((porta / total) * 100) : 0, tone: 'success' as ChannelTone },
      { label: 'Carteira (Ativo)', color: 'bg-status-info', pct: total > 0 ? Math.round((carteira / total) * 100) : 0, tone: 'info' as ChannelTone },
      { label: 'Digital (Leads)', color: 'bg-status-info', pct: total > 0 ? Math.round((digital / total) * 100) : 0, tone: 'brand' as ChannelTone },
    ]
  }, [checkins, metrics.totalSales])

  return { alerts, mixCanais }
}

type PerformanceAlertsProps = {
  role: UserRole | null
  isOwner: boolean
  alerts: OwnerPerformanceAlert[]
}

export function PerformanceAlerts({ role, isOwner, alerts }: PerformanceAlertsProps) {
  const navigate = useNavigate()
  const hasDanger = alerts.some(alert => alert.variant === 'danger')
  const hasWarning = alerts.some(alert => alert.variant === 'warning')
  const summaryLabel = hasDanger ? 'Ação necessária' : hasWarning ? 'Ponto de atenção' : 'Dentro do ritmo'
  const SummaryIcon = hasDanger ? AlertTriangle : hasWarning ? CircleAlert : CheckCircle2

  return (
    <section className="overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-sm" aria-labelledby="performance-alerts-title">
      <header className="flex flex-col gap-3 border-b border-border-subtle px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${hasDanger ? 'bg-status-error-surface text-status-error-text' : hasWarning ? 'bg-status-warning-surface text-status-warning-text' : 'bg-status-success-surface text-status-success-text'}`}>
            <SummaryIcon size={19} />
          </span>
          <div>
            <h2 id="performance-alerts-title" className="text-lg font-bold text-foreground">
              {role === 'gerente' ? 'Prioridades gerenciais' : isOwner ? 'Decisões prioritárias' : 'Pontos de atenção'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Alertas de performance, rotina e funil organizados por impacto.</p>
          </div>
        </div>
        <span className={`inline-flex w-fit rounded-lg px-2.5 py-1 text-xs font-semibold ${hasDanger ? 'bg-status-error-surface text-status-error-text' : hasWarning ? 'bg-status-warning-surface text-status-warning-text' : 'bg-status-success-surface text-status-success-text'}`}>
          {summaryLabel}
        </span>
      </header>

      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        {alerts.map(alert => (
          <AlertCard key={alert.title} alert={alert} isOwner={isOwner} onOpen={() => navigate(alert.ctaTo)} />
        ))}
      </div>
    </section>
  )
}

function AlertCard({
  alert,
  isOwner,
  onOpen,
}: {
  alert: OwnerPerformanceAlert
  isOwner: boolean
  onOpen: () => void
}) {
  const styles = {
    success: {
      surface: 'border-status-success/20 bg-status-success-surface/60',
      badge: 'bg-status-success-surface text-status-success-text',
      icon: 'text-status-success-text',
      label: 'Dentro do esperado',
      Icon: CheckCircle2,
    },
    warning: {
      surface: 'border-status-warning/20 bg-status-warning-surface/60',
      badge: 'bg-status-warning-surface text-status-warning-text',
      icon: 'text-status-warning-text',
      label: 'Atenção',
      Icon: CircleAlert,
    },
    danger: {
      surface: 'border-status-error/20 bg-status-error-surface/60',
      badge: 'bg-status-error-surface text-status-error-text',
      icon: 'text-status-error-text',
      label: 'Crítico',
      Icon: AlertTriangle,
    },
    outline: {
      surface: 'border-border bg-surface-alt',
      badge: 'bg-muted text-muted-foreground',
      icon: 'text-muted-foreground',
      label: 'Validar',
      Icon: Lightbulb,
    },
  }[alert.variant]
  const Icon = styles.Icon

  return (
    <article className={`flex min-h-64 flex-col rounded-2xl border p-4 ${styles.surface}`}>
      <div className="flex items-start justify-between gap-3">
        <Icon size={19} className={styles.icon} />
        <span className={`rounded-lg px-2 py-1 text-caption font-semibold ${styles.badge}`}>{styles.label}</span>
      </div>
      <h3 className="mt-4 text-base font-bold text-foreground">{alert.title}</h3>
      <p className="mt-2 text-sm leading-5 text-muted-foreground">{alert.description}</p>
      <div className="mt-4 rounded-xl bg-white/80 p-3">
        <p className="text-xs font-semibold text-foreground">Recomendação</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{alert.recommendation}</p>
      </div>
      {isOwner && <p className="mt-3 text-xs text-muted-foreground">Impacto {alert.impact}</p>}
      <button
        type="button"
        onClick={onOpen}
        className="mt-auto inline-flex h-9 items-center justify-between rounded-xl bg-white px-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-surface-alt"
      >
        {alert.ctaLabel}
        <ArrowRight size={15} />
      </button>
    </article>
  )
}

export default PerformanceAlerts
