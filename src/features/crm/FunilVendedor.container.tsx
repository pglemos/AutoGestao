import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BarChart3, Filter, Gauge, Globe2, Info, Target, Users, Warehouse } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { PageHeading } from '@/components/molecules/PageHeading'
import { PageCanvas } from '@/design-system/page'
import { useAgendamentos } from '@/features/crm/hooks/useAgendamentos'
import { useClientes } from '@/features/crm/hooks/useClientes'
import { useOportunidades } from '@/features/crm/hooks/useOportunidades'
import { derivarOportunidadesFunilCarteira, normalizarCanalEstrategia, type FunilCanalEstrategia } from '@/features/crm/lib/funil'
import { useVendedorHomePage } from '@/features/vendedor-home/hooks/useVendedorHomePage'
import { useStoreMetaRules } from '@/hooks/useGoals'
import type { CrmCanal, CrmEtapaFunil } from '@/lib/schemas/crm.schema'

type PeriodKey = 'month' | 'lastMonth' | 'last3'
type Confidence = 'Alta' | 'Média' | 'Baixa'
type ChannelTone = 'green' | 'blue' | 'orange'

type OportunidadeLike = {
  cliente_id?: string | null
  etapa: CrmEtapaFunil | string
  canal: CrmCanal | string | null
  created_at: string | null
  updated_at?: string | null
  closed_at: string | null
}

type AgendamentoLike = {
  canal: CrmCanal | string | null
  data_hora: string
  status?: string | null
}

type PeriodInfo = {
  key: PeriodKey
  label: string
  start: Date
  end: Date
}

type ChannelMetrics = {
  canal: FunilCanalEstrategia
  oportunidades: number
  qualificados: number
  agendamentos: number
  atendimentos: number
  vendas: number
  conversaoGeral: number
  stepConversions: Array<{ label: string; value: number | null }>
}

type ChannelEffort = {
  canal: FunilCanalEstrategia
  ok: boolean
  message: string
  rows: Array<{ label: string; value: number }>
  conversionLabel: string
}

const PERIOD_OPTIONS: Array<{ key: PeriodKey; label: string }> = [
  { key: 'month', label: 'Este mês' },
  { key: 'lastMonth', label: 'Mês passado' },
  { key: 'last3', label: 'Últimos 3 meses' },
]

const CHANNELS: FunilCanalEstrategia[] = ['porta', 'internet', 'carteira']

const CHANNEL_UI: Record<FunilCanalEstrategia, { title: string; flow: string; icon: ReactNode; tone: ChannelTone }> = {
  porta: { title: 'Showroom', flow: 'Atendimento Comercial -> Venda', icon: <Warehouse size={22} />, tone: 'green' },
  internet: { title: 'Internet', flow: 'Oportunidades -> Qualificados -> Agendamento -> Atendimento Comercial -> Venda', icon: <Globe2 size={22} />, tone: 'blue' },
  carteira: { title: 'Carteira', flow: 'Qualificados -> Agendamento -> Atendimento Comercial -> Venda', icon: <Users size={22} />, tone: 'orange' },
}

const TONE_CLASS: Record<ChannelTone, { text: string; soft: string; border: string; badge: string }> = {
  blue: { text: 'text-status-info', soft: 'bg-status-info-surface', border: 'border-status-info/20', badge: 'bg-status-info/10 text-status-info' },
  orange: { text: 'text-status-warning', soft: 'bg-status-warning-surface', border: 'border-status-warning/20', badge: 'bg-status-warning/10 text-status-warning' },
  green: { text: 'text-status-success', soft: 'bg-status-success-surface', border: 'border-status-success/20', badge: 'bg-status-success/10 text-status-success' },
}

const STAGE_ORDER: Record<string, number> = {
  prospeccao: 0,
  qualificacao: 1,
  apresentacao: 2,
  negociacao: 3,
  fechamento: 4,
  perdido: 5,
  ganho: 6,
}

const PCT = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`

export function FunilVendedor() {
  const [period, setPeriod] = useState<PeriodKey>('month')
  const { metrics } = useVendedorHomePage()
  useStoreMetaRules()
  const { oportunidades, error: oportunidadesError, refetch } = useOportunidades()
  const { clientes } = useClientes()
  const { agendamentos } = useAgendamentos()

  const periodInfo = useMemo(() => getPeriodInfo(period), [period])
  const [monthInfoKey, setMonthInfoKey] = useState(() => new Date().toDateString())
  const monthInfo = useMemo(() => getMonthBusinessInfo(new Date()), [monthInfoKey])

  useEffect(() => {
    const interval = setInterval(() => {
      const today = new Date().toDateString()
      if (today !== monthInfoKey) setMonthInfoKey(today)
    }, 60000)
    return () => clearInterval(interval)
  }, [monthInfoKey])
  const oportunidadesFunil = useMemo(
    () => derivarOportunidadesFunilCarteira(oportunidades, clientes),
    [clientes, oportunidades],
  )
  const statsPeriod = useMemo(() => buildStatsPeriod(oportunidadesFunil, agendamentos, periodInfo), [agendamentos, oportunidadesFunil, periodInfo])
  const rollingPeriod = useMemo(() => getRollingPeriod(90, 'Últimos 90 dias'), [])
  const rollingStats = useMemo(() => buildStatsPeriod(oportunidadesFunil, agendamentos, rollingPeriod), [agendamentos, oportunidadesFunil, rollingPeriod])
  const selectedHasBase = hasEnoughBase(statsPeriod.channels)
  const rollingHasBase = hasEnoughBase(rollingStats.channels)
  const calculationStats = selectedHasBase ? statsPeriod : rollingStats
  const confidence = getConfidence(selectedHasBase, rollingHasBase)
  const calculationPeriodLabel = selectedHasBase ? periodInfo.label : rollingPeriod.label

  const meta = metrics?.meta ?? 0
  const realizado = period === 'month' ? metrics?.vendasMes ?? statsPeriod.totalVendas : statsPeriod.totalVendas
  const faltam = meta > 0 ? Math.max(meta - realizado, 0) : null
  const diasRestantes = period === 'month' ? monthInfo.restantes : 0
  const necessarioPorDia = meta > 0 && faltam !== null && faltam > 0 && diasRestantes > 0 ? Math.ceil(faltam / diasRestantes) : 0
  const projectedSales = period === 'month' ? projectCurrentMonth(realizado, monthInfo.decorridos, monthInfo.total) : realizado
  const probability = meta > 0 ? clamp(Math.round((projectedSales / meta) * 100), 0, 100) : null
  const projectionStatus = getProjectionStatus(meta, projectedSales, monthInfo.decorridos)
  const efforts = CHANNELS.map(canal => buildChannelEffort(canal, calculationStats.channels[canal], faltam))
  const history = useMemo(() => buildSixMonthHistory(oportunidadesFunil, agendamentos), [agendamentos, oportunidadesFunil])
  const limitador = getPrincipalLimitador(statsPeriod.channels)

  if (oportunidadesError) {
    return (
      <PageCanvas as="div" width="dashboard" bottomClearance="navigation" className="flex min-h-full flex-col items-center justify-center gap-4">
        <Typography variant="p" className="text-sm font-bold text-status-error">Erro ao carregar dados do funil.</Typography>
        <Button type="button" variant="secondary" size="sm" onClick={() => refetch()}>Tentar novamente</Button>
      </PageCanvas>
    )
  }

  return (
    <PageCanvas as="div" width="dashboard" bottomClearance="navigation" className="flex min-h-full flex-col gap-mx-lg">
        <header className="relative z-40 shrink-0 border-b border-gray-200/60 bg-gray-50 pb-3 pt-2 shadow-mx-lg md:sticky md:top-0 md:pt-3">
          <PageHeading
            title="Funil de Vendas"
            subtitle="Com sua conversão atual, veja o que precisa produzir para atingir a meta."
            actions={(
              <label className="inline-flex h-11 items-center gap-mx-sm rounded-xl border border-gray-100 bg-white px-mx-md text-sm font-semibold shadow-mx-xs">
                <Filter size={16} />
                <select className="bg-transparent font-semibold outline-none" value={period} onChange={(event) => setPeriod(event.target.value as PeriodKey)} aria-label="Período do funil">
                  {PERIOD_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                </select>
              </label>
            )}
          />
        </header>

        <section aria-label="Filtro de período">
          <div className="inline-flex flex-wrap gap-mx-xs rounded-xl border border-gray-100 bg-white p-mx-xs shadow-sm">
            {PERIOD_OPTIONS.map(option => (
              <button key={option.key} type="button" className={`h-9 rounded-xl px-mx-md text-sm font-semibold transition ${period === option.key ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`} onClick={() => setPeriod(option.key)}>
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-mx-sm sm:grid-cols-2 xl:grid-cols-6" aria-label="Indicadores da meta">
          <MetricCard label="Meta do mês" value={meta > 0 ? String(meta) : 'Meta não configurada'} />
          <MetricCard label="Realizado" value={String(realizado)} hint="vendas no período" tone="green" />
          <MetricCard label="Faltam" value={meta > 0 ? (faltam === 0 ? 'Meta batida' : String(faltam)) : '—'} tone={faltam === 0 && meta > 0 ? 'green' : 'red'} />
          <MetricCard label="Dias úteis restantes" value={period === 'month' ? String(diasRestantes) : '—'} />
          <MetricCard label="Necessário por dia" value={meta > 0 ? (faltam === 0 ? 'Meta batida' : String(necessarioPorDia)) : '—'} />
          <MetricCard label="Probabilidade de meta" value={probability === null ? '—' : PCT(probability)} tone={probability !== null && probability >= 100 ? 'green' : 'dark'} />
        </section>

        <ProjectionCard meta={meta} projectedSales={projectedSales} difference={meta > 0 ? projectedSales - meta : null} status={projectionStatus} />

        <section>
          <SectionHeader icon={<Target size={22} />} title="Esforço necessário meta" subtitle="Com base na sua conversão atual, esta é a produção necessária para buscar as vendas que faltam." />
          {faltam !== null && faltam <= 0 ? (
            <DashboardCard className="mt-mx-sm border-status-success/20 bg-status-success-surface">
              <Typography variant="p" className="font-semibold text-status-success">Meta batida. Continue mantendo o ritmo.</Typography>
            </DashboardCard>
          ) : (
            <div className="mt-mx-sm grid gap-mx-sm xl:grid-cols-3">{efforts.map(effort => <EffortCard key={effort.canal} effort={effort} />)}</div>
          )}
        </section>

        <section>
          <SectionHeader icon={<Gauge size={22} />} title="Eficiência por canal" subtitle="Leitura compacta das etapas do período selecionado." />
          <div className="mt-mx-sm grid gap-mx-sm xl:grid-cols-3">{CHANNELS.map(canal => <EfficiencyCard key={canal} metrics={statsPeriod.channels[canal]} />)}</div>
          <DashboardCard className="mt-mx-sm">
            <div className="flex items-start gap-mx-sm">
              <span className="mt-1 text-emerald-600"><Info size={20} /></span>
              <div>
                <Typography variant="h3">Principal limitador</Typography>
                <Typography variant="p" className="mt-1 text-sm font-semibold">{limitador}</Typography>
              </div>
            </div>
          </DashboardCard>
        </section>

        <StatisticalBaseCard displayedPeriod={periodInfo.label} calculationPeriod={calculationPeriodLabel} confidence={confidence} reason={getConfidenceReason(confidence)} />
        <HistoryChart rows={history} />
    </PageCanvas>
  )
}

function ProjectionCard({ meta, projectedSales, difference, status }: { meta: number; projectedSales: number; difference: number | null; status: string }) {
  return (
    <DashboardCard>
      <div className="grid gap-mx-md lg:grid-cols-[1fr_1fr_1fr_1.2fr] lg:items-center">
        <div>
          <Typography variant="caption" tone="muted" className="block font-semibold normal-case tracking-normal">Projeção mês</Typography>
          <Typography variant="h2" className="mt-1 text-2xl">Previsão no ritmo atual</Typography>
        </div>
        <ProjectionStat label="Previsão de vendas" value={`${projectedSales} vendas`} />
        <ProjectionStat label="Meta do mês" value={meta > 0 ? `${meta} vendas` : 'Meta não configurada'} />
        <ProjectionStat label="Diferença projetada" value={difference === null ? '—' : `${difference >= 0 ? '+' : ''}${difference} vendas`} hint={status} tone={difference !== null && difference >= 0 ? 'green' : 'orange'} />
      </div>
    </DashboardCard>
  )
}

function EffortCard({ effort }: { effort: ChannelEffort }) {
  const ui = CHANNEL_UI[effort.canal]
  const tone = TONE_CLASS[ui.tone]
  return (
    <Card className={`border ${tone.border} bg-white p-mx-md`}>
      <div className="flex items-start gap-mx-sm">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone.badge}`}>{ui.icon}</span>
        <div className="min-w-0">
          <Typography variant="h2" className={`text-lg ${tone.text}`}>{ui.title}</Typography>
          <Typography variant="p" className="mt-1 text-xs font-semibold">{ui.flow}</Typography>
        </div>
      </div>
      <Typography variant="p" className="mt-mx-sm text-sm font-semibold">{effort.message}</Typography>
      {effort.ok && <div className="mt-mx-sm grid gap-mx-xs">{effort.rows.map(row => <CompactRow key={row.label} label={row.label} value={String(row.value)} />)}</div>}
      <div className={`mt-mx-sm rounded-xl px-mx-sm py-mx-xs text-sm font-semibold ${tone.soft} ${tone.text}`}>{effort.conversionLabel}</div>
    </Card>
  )
}

function EfficiencyCard({ metrics }: { metrics: ChannelMetrics }) {
  const ui = CHANNEL_UI[metrics.canal]
  const tone = TONE_CLASS[ui.tone]
  const rows = metrics.canal === 'porta'
    ? [{ label: 'Atendimento Comercial', value: metrics.atendimentos }, { label: 'Venda', value: metrics.vendas }]
    : metrics.canal === 'internet'
      ? [
          { label: 'Oportunidades', value: metrics.oportunidades },
          { label: 'Qualificados', value: metrics.qualificados },
          { label: 'Agendamento', value: metrics.agendamentos },
          { label: 'Atendimento Comercial', value: metrics.atendimentos },
          { label: 'Venda', value: metrics.vendas },
        ]
      : [
          { label: 'Qualificados', value: metrics.qualificados },
          { label: 'Agendamento', value: metrics.agendamentos },
          { label: 'Atendimento Comercial', value: metrics.atendimentos },
          { label: 'Venda', value: metrics.vendas },
        ]
  return (
    <Card className={`border ${tone.border} bg-white p-mx-md`}>
      <div className="flex items-center justify-between gap-mx-sm">
        <div className="flex items-center gap-mx-sm"><span className={tone.text}>{ui.icon}</span><Typography variant="h2" className="text-lg">{ui.title}</Typography></div>
        <span className={`rounded-xl px-mx-sm py-1 text-xs font-semibold ${tone.badge}`}>{PCT(metrics.conversaoGeral)}</span>
      </div>
      <div className="mt-mx-sm grid gap-mx-xs">{rows.map(row => <CompactRow key={row.label} label={row.label} value={String(row.value)} />)}</div>
      <Typography variant="caption" tone="muted" className="mt-mx-sm block normal-case tracking-normal">Conversão geral: {PCT(metrics.conversaoGeral)}</Typography>
    </Card>
  )
}

function StatisticalBaseCard({ displayedPeriod, calculationPeriod, confidence, reason }: { displayedPeriod: string; calculationPeriod: string; confidence: Confidence; reason: string }) {
  return (
    <DashboardCard>
      <SectionHeader icon={<Info size={22} />} title="Base estatística" />
      <div className="mt-mx-sm grid gap-mx-sm md:grid-cols-4">
        <BaseStat label="Período exibido" value={displayedPeriod} />
        <BaseStat label="Período usado para cálculo" value={calculationPeriod} />
        <BaseStat label="Confiança da projeção" value={confidence} />
        <BaseStat label="Motivo da confiança" value={reason} />
      </div>
    </DashboardCard>
  )
}

function HistoryChart({ rows }: { rows: Array<{ label: string; oportunidades: number; atendimentos: number; vendas: number }> }) {
  const max = Math.max(1, ...rows.flatMap(row => [row.oportunidades, row.atendimentos, row.vendas]))
  return (
    <DashboardCard>
      <SectionHeader icon={<BarChart3 size={22} />} title="Evolução dos últimos 6 meses" subtitle="Apoio visual de oportunidades, atendimento comercial e vendas." />
      <div className="mt-mx-md grid gap-mx-sm">
        {rows.map(row => (
          <div key={row.label} className="grid grid-cols-[72px_1fr] items-center gap-mx-sm">
            <Typography variant="caption" tone="muted" className="font-semibold normal-case tracking-normal">{row.label}</Typography>
            <div className="grid gap-1">
              <MiniBar label="Oportunidades" value={row.oportunidades} max={max} className="bg-status-info" />
              <MiniBar label="Atendimento Comercial" value={row.atendimentos} max={max} className="bg-status-warning" />
              <MiniBar label="Vendas" value={row.vendas} max={max} className="bg-status-success" />
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  )
}

function MetricCard({ label, value, hint, tone = 'dark' }: { label: string; value: string; hint?: string; tone?: 'dark' | 'green' | 'red' }) {
  const color = tone === 'green' ? 'text-status-success' : tone === 'red' ? 'text-status-error' : 'text-gray-800'
  return (
    <DashboardCard className="min-h-[116px]">
      <Typography variant="caption" tone="muted" className="block font-semibold normal-case tracking-normal">{label}</Typography>
      <Typography variant="h2" className={`mt-mx-xs text-2xl ${color}`}>{value}</Typography>
      {hint && <Typography variant="p" className="mt-1 text-xs font-semibold">{hint}</Typography>}
    </DashboardCard>
  )
}

function ProjectionStat({ label, value, hint, tone = 'dark' }: { label: string; value: string; hint?: string; tone?: 'dark' | 'green' | 'orange' }) {
  const color = tone === 'green' ? 'text-status-success' : tone === 'orange' ? 'text-status-warning' : 'text-gray-800'
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-mx-sm">
      <Typography variant="caption" tone="muted" className="block font-semibold normal-case tracking-normal">{label}</Typography>
      <Typography variant="h3" className={`mt-1 ${color}`}>{value}</Typography>
      {hint && <Typography variant="p" className="mt-1 text-sm font-semibold">{hint}</Typography>}
    </div>
  )
}

function BaseStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-gray-100 bg-gray-50 p-mx-sm"><Typography variant="caption" tone="muted" className="block font-semibold normal-case tracking-normal">{label}</Typography><Typography variant="p" className="mt-1 text-sm font-semibold">{value}</Typography></div>
}

function CompactRow({ label, value }: { label: string; value: string }) {
  return <div className="flex min-h-8 items-center justify-between gap-mx-sm rounded-xl bg-gray-50 px-mx-sm py-1"><Typography variant="p" className="text-sm font-semibold">{label}</Typography><Typography variant="p" className="text-sm font-bold">{value}</Typography></div>
}

function MiniBar({ label, value, max, className }: { label: string; value: number; max: number; className: string }) {
  return <div className="grid grid-cols-[128px_1fr_34px] items-center gap-mx-xs"><Typography variant="tiny" tone="muted" className="normal-case tracking-normal">{label}</Typography><div className="h-2 rounded-full bg-gray-50"><div className={`h-2 rounded-full ${className}`} style={{ width: `${Math.max(4, (value / max) * 100)}%` }} /></div><Typography variant="tiny" className="text-right font-semibold">{value}</Typography></div>
}

function SectionHeader({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return <div className="flex items-start gap-mx-sm"><span className="mt-1 text-emerald-600">{icon}</span><div><Typography variant="h2" className="text-xl">{title}</Typography>{subtitle && <Typography variant="p" className="mt-1 text-sm font-semibold">{subtitle}</Typography>}</div></div>
}

function DashboardCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <Card className={`border bg-white p-mx-md ${className}`}>{children}</Card>
}

function buildStatsPeriod(oportunidades: OportunidadeLike[], agendamentos: AgendamentoLike[], period: PeriodInfo) {
  const oportunidadesPeriodo = oportunidades.filter(item => isInPeriod(getOpportunityDate(item), period))
  const agendamentosPeriodo = agendamentos.filter(item => isInPeriod(new Date(item.data_hora), period))
  const channels = Object.fromEntries(CHANNELS.map(canal => [canal, buildChannelMetrics(canal, oportunidadesPeriodo, agendamentosPeriodo)])) as Record<FunilCanalEstrategia, ChannelMetrics>
  return { channels, totalVendas: oportunidadesPeriodo.filter(item => item.etapa === 'ganho').length }
}

function buildChannelMetrics(canal: FunilCanalEstrategia, oportunidades: OportunidadeLike[], agendamentos: AgendamentoLike[]): ChannelMetrics {
  const opps = oportunidades.filter(item => normalizarCanalEstrategia(item.canal) === canal)
  const agds = agendamentos.filter(item => normalizarCanalEstrategia(item.canal) === canal)
  const vendas = opps.filter(item => item.etapa === 'ganho').length
  const atendimentos = canal === 'porta' ? opps.length : opps.filter(item => reachedStage(item.etapa, 'apresentacao')).length + agds.filter(item => item.status === 'compareceu').length
  const qualificados = canal === 'carteira' ? opps.length : opps.filter(item => reachedStage(item.etapa, 'qualificacao')).length
  const agendamentosCount = agds.length
  const oportunidadesCount = opps.length
  const conversaoGeral = getGeneralConversion(canal, { oportunidades: oportunidadesCount, qualificados, atendimentos, vendas })
  return {
    canal,
    oportunidades: oportunidadesCount,
    qualificados,
    agendamentos: agendamentosCount,
    atendimentos,
    vendas,
    conversaoGeral,
    stepConversions: getStepConversions(canal, { oportunidades: oportunidadesCount, qualificados, agendamentos: agendamentosCount, atendimentos, vendas }),
  }
}

function buildChannelEffort(canal: FunilCanalEstrategia, metrics: ChannelMetrics, vendasFaltantes: number | null): ChannelEffort {
  if (vendasFaltantes === null) return { canal, ok: false, message: 'Meta não configurada. Fale com seu gerente.', rows: [], conversionLabel: `Conversão geral: ${PCT(metrics.conversaoGeral)}` }
  if (vendasFaltantes <= 0) return { canal, ok: true, message: 'Meta batida. Continue mantendo o ritmo.', rows: [], conversionLabel: `Conversão geral: ${PCT(metrics.conversaoGeral)}` }

  if (canal === 'porta') {
    const convVenda = ratio(metrics.vendas, metrics.atendimentos)
    if (!hasEnoughChannelBase(metrics) || !convVenda) return insufficientEffort(canal, metrics, 'Sem base suficiente para calcular o esforço no Showroom.')
    return {
      canal,
      ok: true,
      message: 'Para buscar as vendas que faltam, você precisa de aproximadamente:',
      rows: [{ label: 'Atendimentos Comerciais', value: Math.ceil(vendasFaltantes / convVenda) }],
      conversionLabel: `Sua conversão atual: ${PCT(convVenda * 100)}`,
    }
  }

  if (canal === 'internet') {
    const convQualificacao = ratio(metrics.qualificados, metrics.oportunidades)
    const convAgendamento = ratio(metrics.agendamentos, metrics.qualificados)
    const convAtendimento = ratio(metrics.atendimentos, metrics.agendamentos)
    const convVenda = ratio(metrics.vendas, metrics.atendimentos)
    if (!hasEnoughChannelBase(metrics) || !convQualificacao || !convAgendamento || !convAtendimento || !convVenda) return insufficientEffort(canal, metrics, 'Sem base suficiente para calcular uma projeção confiável neste canal.')
    const atendimentos = Math.ceil(vendasFaltantes / convVenda)
    const agendamentos = Math.ceil(atendimentos / convAtendimento)
    const qualificados = Math.ceil(agendamentos / convAgendamento)
    return {
      canal,
      ok: true,
      message: 'Para buscar as vendas que faltam, você precisa gerar aproximadamente:',
      rows: [
        { label: 'Atendimentos Comerciais', value: atendimentos },
        { label: 'Agendamentos', value: agendamentos },
        { label: 'Qualificados', value: qualificados },
        { label: 'Oportunidades', value: Math.ceil(qualificados / convQualificacao) },
      ],
      conversionLabel: `Conversão geral: ${PCT(metrics.conversaoGeral)}`,
    }
  }

  const convAgendamento = ratio(metrics.agendamentos, metrics.qualificados)
  const convAtendimento = ratio(metrics.atendimentos, metrics.agendamentos)
  const convVenda = ratio(metrics.vendas, metrics.atendimentos)
  if (!hasEnoughChannelBase(metrics) || !convAgendamento || !convAtendimento || !convVenda) return insufficientEffort(canal, metrics, 'Sem base suficiente para calcular uma projeção confiável neste canal.')
  const atendimentos = Math.ceil(vendasFaltantes / convVenda)
  return {
    canal,
    ok: true,
    message: 'Para buscar as vendas que faltam, você precisa gerar aproximadamente:',
    rows: [
      { label: 'Atendimentos Comerciais', value: atendimentos },
      { label: 'Agendamentos', value: Math.ceil(atendimentos / convAtendimento) },
      { label: 'Qualificados', value: Math.ceil(Math.ceil(atendimentos / convAtendimento) / convAgendamento) },
    ],
    conversionLabel: `Conversão geral: ${PCT(metrics.conversaoGeral)}`,
  }
}

function insufficientEffort(canal: FunilCanalEstrategia, metrics: ChannelMetrics, message: string): ChannelEffort {
  return { canal, ok: false, message, rows: [], conversionLabel: `Conversão geral: ${metrics.conversaoGeral > 0 ? PCT(metrics.conversaoGeral) : 'sem base'}` }
}

function getStepConversions(canal: FunilCanalEstrategia, values: { oportunidades: number; qualificados: number; agendamentos: number; atendimentos: number; vendas: number }) {
  if (canal === 'porta') return [{ label: 'Atendimento Comercial -> Venda', value: percentOrNull(values.vendas, values.atendimentos) }]
  if (canal === 'internet') {
    return [
      { label: 'Oportunidades -> Qualificados', value: percentOrNull(values.qualificados, values.oportunidades) },
      { label: 'Qualificados -> Agendamento', value: percentOrNull(values.agendamentos, values.qualificados) },
      { label: 'Agendamento -> Atendimento Comercial', value: percentOrNull(values.atendimentos, values.agendamentos) },
      { label: 'Atendimento Comercial -> Venda', value: percentOrNull(values.vendas, values.atendimentos) },
    ]
  }
  return [
    { label: 'Qualificados -> Agendamento', value: percentOrNull(values.agendamentos, values.qualificados) },
    { label: 'Agendamento -> Atendimento Comercial', value: percentOrNull(values.atendimentos, values.agendamentos) },
    { label: 'Atendimento Comercial -> Venda', value: percentOrNull(values.vendas, values.atendimentos) },
  ]
}

function getPrincipalLimitador(channels: Record<FunilCanalEstrategia, ChannelMetrics>) {
  const rows = CHANNELS.flatMap(canal => channels[canal].stepConversions.map(step => ({ canal, label: step.label, value: step.value }))).filter(row => row.value !== null)
  if (rows.length === 0) return 'Ainda não há base suficiente para identificar um limitador estatístico.'
  const best = CHANNELS.map(canal => channels[canal]).filter(row => row.vendas > 0).sort((a, b) => b.conversaoGeral - a.conversaoGeral)[0]
  if (best && best.conversaoGeral >= 50) return `${CHANNEL_UI[best.canal].title} é o canal com melhor conversão no período.`
  const lowest = rows.sort((a, b) => (a.value ?? 0) - (b.value ?? 0))[0]
  return `Seu maior limitador está em ${CHANNEL_UI[lowest.canal].title}: ${lowest.label}.`
}

function buildSixMonthHistory(oportunidades: OportunidadeLike[], agendamentos: AgendamentoLike[]) {
  const now = new Date()
  return Array.from({ length: 6 }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    const start = new Date(month)
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999)
    const period = { key: 'month' as const, label: '', start, end }
    const opps = oportunidades.filter(item => isInPeriod(getOpportunityDate(item), period))
    const agds = agendamentos.filter(item => isInPeriod(new Date(item.data_hora), period))
    return {
      label: month.toLocaleDateString('pt-BR', { month: 'short' }),
      oportunidades: opps.length,
      atendimentos: opps.filter(item => reachedStage(item.etapa, 'apresentacao')).length + agds.filter(item => item.status === 'compareceu').length,
      vendas: opps.filter(item => item.etapa === 'ganho').length,
    }
  })
}

function getPeriodInfo(key: PeriodKey): PeriodInfo {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  if (key === 'lastMonth') return { key, label: 'Mês passado', start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999) }
  if (key === 'last3') return getRollingPeriod(90, 'Últimos 3 meses')
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  start.setHours(0, 0, 0, 0)
  return { key, label: 'Este mês', start, end }
}

function getRollingPeriod(days: number, label: string): PeriodInfo {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date(end)
  start.setDate(start.getDate() - days)
  start.setHours(0, 0, 0, 0)
  return { key: 'last3', label, start, end }
}

function getMonthBusinessInfo(reference: Date) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1)
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0)
  let total = 0
  let decorridos = 0
  let restantes = 0
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const day = cursor.getDay()
    if (day === 0 || day === 6) continue // Skip weekends (Sun=0, Sat=6)
    total += 1
    if (cursor <= reference) decorridos += 1
    else restantes += 1
  }
  return { total, decorridos: Math.max(decorridos, 1), restantes }
}

function getOpportunityDate(item: OportunidadeLike) {
  const raw = item.etapa === 'ganho' ? item.closed_at || item.updated_at || item.created_at : item.updated_at || item.created_at || item.closed_at
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

function isInPeriod(date: Date | null, period: PeriodInfo) {
  return Boolean(date && date >= period.start && date <= period.end)
}

function reachedStage(etapa: string, stage: string) {
  return (STAGE_ORDER[etapa] ?? -1) >= (STAGE_ORDER[stage] ?? 0)
}

function hasEnoughBase(channels: Record<FunilCanalEstrategia, ChannelMetrics>) {
  return CHANNELS.some(canal => hasEnoughChannelBase(channels[canal]))
}

function hasEnoughChannelBase(metrics: ChannelMetrics) {
  if (metrics.canal === 'porta') return metrics.atendimentos >= 5 || metrics.vendas >= 1
  if (metrics.canal === 'internet') return metrics.oportunidades >= 5 || metrics.vendas >= 1
  return metrics.qualificados >= 5 || metrics.vendas >= 1
}

function getConfidence(selectedIsEnough: boolean, rollingIsEnough: boolean): Confidence {
  if (selectedIsEnough) return 'Alta'
  if (rollingIsEnough) return 'Média'
  return 'Baixa'
}

function getConfidenceReason(confidence: Confidence) {
  if (confidence === 'Alta') return 'Cálculo baseado nos dados deste período.'
  if (confidence === 'Média') return 'O período selecionado tem poucos dados; usamos os últimos 90 dias.'
  return 'Ainda há poucos registros para projetar com precisão.'
}

function getProjectionStatus(meta: number, projectedSales: number, elapsedDays: number) {
  if (meta <= 0 || elapsedDays <= 0) return 'Sem base suficiente'
  if (projectedSales >= meta) return 'Acima do ritmo da meta'
  if (projectedSales >= Math.ceil(meta * 0.9)) return 'No limite da meta'
  return 'Abaixo do ritmo necessário'
}

function projectCurrentMonth(realizado: number, elapsedBusinessDays: number, totalBusinessDays: number) {
  if (elapsedBusinessDays <= 0 || totalBusinessDays <= 0) return 0
  return Math.round((realizado / elapsedBusinessDays) * totalBusinessDays)
}

function getGeneralConversion(canal: FunilCanalEstrategia, values: { oportunidades: number; qualificados: number; atendimentos: number; vendas: number }) {
  if (canal === 'porta') return percent(values.vendas, values.atendimentos)
  if (canal === 'carteira') return percent(values.vendas, values.qualificados)
  return percent(values.vendas, values.oportunidades)
}

function ratio(numerator: number, denominator: number) {
  if (denominator <= 0 || numerator <= 0) return null
  return numerator / denominator
}

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) return 0
  return Math.round((numerator / denominator) * 100)
}

function percentOrNull(numerator: number, denominator: number) {
  if (denominator <= 0) return null
  return percent(numerator, denominator)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
