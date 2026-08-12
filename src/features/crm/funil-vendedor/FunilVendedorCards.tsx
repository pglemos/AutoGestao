import { useState, type ReactNode } from 'react'
import { CheckCircle, ChevronDown, ChevronUp, Target } from 'lucide-react'
import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Link } from 'react-router-dom'
import { Progress } from '@/components/atoms/Progress'
import { chartTokens } from '@/lib/charts/tokens'
import type {
  ChannelFunnel,
  FunnelChannel,
  FunnelKpis,
  FunnelStepKey,
  MonthlyEvolutionPoint,
} from '@/features/crm/lib/funil-vendas-diagnostico'
import type { Confidence, PeriodKey } from './types'

const VOLUME_LABEL: Record<FunnelChannel, string> = {
  Showroom: 'Atendimentos',
  Internet: 'Oportunidades',
  Carteira: 'Qualificados',
}

const EFFORT_PRINCIPAL_BG: Record<FunnelChannel, string> = {
  Carteira: 'bg-green-50 border-green-200',
  Internet: 'bg-status-info-surface border-status-info/30',
  Showroom: 'bg-status-warning-surface border-status-warning/30',
}

const EFICIENCIA_COR: Record<FunnelChannel, { header: string; badge: string; btn: string }> = {
  Showroom: { header: 'bg-status-warning-surface border-status-warning/30', badge: 'bg-status-warning-surface text-status-warning-text', btn: 'text-status-warning-text hover:text-status-warning-text' },
  Internet: { header: 'bg-status-info-surface border-status-info/30', badge: 'bg-status-info-surface text-status-info-text', btn: 'text-status-info-text hover:text-status-info-text' },
  Carteira: { header: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700', btn: 'text-green-600 hover:text-green-800' },
}

const EFICIENCIA_ORDER: FunnelChannel[] = ['Showroom', 'Carteira', 'Internet']

const BASE_CONFIANCA_COR: Record<Confidence, string> = {
  Alta: 'text-status-success-text bg-green-50 border-green-200',
  Média: 'text-status-warning-text bg-status-warning-surface border-status-warning/30',
  Baixa: 'text-muted-foreground bg-slate-50 border-border',
}

export function StatusMetaCard({ kpis, periodKey }: { kpis: FunnelKpis; periodKey: PeriodKey }) {
  const { meta, realizado, faltam, diasUteisRestantes, necessarioPorDia, probabilidade, metaBatida } = kpis
  const pct = meta !== null && meta > 0 ? Math.min(100, Math.round((realizado / meta) * 100)) : 0
  const probPct = probabilidade === null ? null : Math.round(probabilidade)
  const probCor = probPct === null ? 'text-muted-foreground' : probPct >= 80 ? 'text-status-success-text' : probPct >= 50 ? 'text-status-warning-text' : 'text-status-error-text'
  const isCurrentMonth = periodKey === 'current_month'

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <p className="mb-4 text-caption font-bold uppercase tracking-wider text-muted-foreground">Status da Meta</p>

      {!meta ? (
        <div className="flex items-center gap-3">
          <Target className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-body-sm text-muted-foreground">Meta mensal não configurada.</p>
            <Link to="/perfil" className="text-[12px] font-bold text-status-info-text hover:underline">Definir meta no perfil →</Link>
          </div>
        </div>
      ) : metaBatida ? (
        <div className="flex items-center gap-3">
          <CheckCircle className="h-6 w-6 shrink-0 text-green-500" />
          <div>
            <p className="text-[20px] font-bold text-green-600">Meta batida!</p>
            <p className="text-body-sm text-muted-foreground">{realizado} de {meta} vendas realizadas</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex-1 space-y-3">
            <div>
              <p className="mb-0.5 text-[12px] text-muted-foreground">Realizado</p>
              <p className="text-h2 font-bold leading-none tabular-nums text-foreground">
                {realizado}
                <span className="ml-1 text-[16px] font-semibold text-muted-foreground">/ {meta}</span>
              </p>
              <p className="mt-0.5 text-caption text-muted-foreground">vendas realizadas</p>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-caption text-muted-foreground">
                <span>{pct}% da meta</span>
                <span>{realizado} / {meta}</span>
              </div>
              <Progress value={pct} size="md" tone="primary" aria-label={`${pct}% da meta`} className="h-2.5 bg-slate-100" />
            </div>
          </div>

          <div className="hidden w-px self-stretch bg-slate-100 sm:block" />

          <div className="grid flex-1 grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="mb-0.5 text-caption uppercase tracking-wide text-muted-foreground">Faltam</p>
              <p className="text-h3 font-bold leading-none tabular-nums text-status-error-text">{faltam}</p>
              <p className="text-caption text-muted-foreground">vendas</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="mb-0.5 text-caption uppercase tracking-wide text-muted-foreground">Dias úteis restantes</p>
              <p className="text-h3 font-bold leading-none tabular-nums text-foreground">{isCurrentMonth ? diasUteisRestantes : '—'}</p>
              <p className="text-caption text-muted-foreground">seg–sáb</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="mb-0.5 text-caption uppercase tracking-wide text-muted-foreground">Ritmo necessário</p>
              {!isCurrentMonth || necessarioPorDia === null ? (
                <>
                  <p className="text-h3 font-bold leading-none tabular-nums text-status-warning-text">—</p>
                  <p className="text-caption text-muted-foreground">sem dados</p>
                </>
              ) : faltam !== null && faltam <= 0 ? (
                <>
                  <p className="text-[18px] font-bold leading-tight text-status-success-text">Meta batida</p>
                  <p className="text-caption text-muted-foreground">Continue o ritmo.</p>
                </>
              ) : diasUteisRestantes <= 0 ? (
                <>
                  <p className="text-[18px] font-bold leading-tight text-status-error-text">Prazo encerrado</p>
                  <p className="text-caption text-muted-foreground">Revise o fechamento.</p>
                </>
              ) : necessarioPorDia >= 1 ? (
                <>
                  <p className="text-h3 font-bold leading-none tabular-nums text-status-warning-text">
                    {necessarioPorDia % 1 === 0 ? necessarioPorDia : necessarioPorDia.toFixed(2)}
                  </p>
                  <p className="text-caption text-muted-foreground">vendas por dia útil</p>
                  <p className="mt-1 text-caption text-muted-foreground">≈ {Math.floor(necessarioPorDia * 6)}–{Math.ceil(necessarioPorDia * 6)} por semana</p>
                </>
              ) : (
                <>
                  <p className="text-[14px] font-bold leading-tight text-status-warning-text">1 venda a cada</p>
                  <p className="text-h3 font-bold leading-none tabular-nums text-status-warning-text">
                    {faltam && faltam > 0 ? (diasUteisRestantes / faltam).toFixed(1) : '—'} dias
                  </p>
                  <p className="mt-1 text-caption text-muted-foreground">≈ {Math.floor(necessarioPorDia * 6)}–{Math.ceil(necessarioPorDia * 6)} por semana</p>
                </>
              )}
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="mb-0.5 text-caption uppercase tracking-wide text-muted-foreground">Probabilidade</p>
              <p className={`text-h3 font-bold leading-none tabular-nums ${probCor}`}>{probPct !== null ? `${probPct}%` : '—'}</p>
              <p className="text-caption text-muted-foreground">com ritmo atual</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AlavancaItem({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex items-center justify-between border-b border-border-subtle py-2 last:border-0">
      <span className="text-body-sm text-muted-foreground">{label}</span>
      <span className="text-[18px] font-bold tabular-nums text-foreground">{valor}</span>
    </div>
  )
}

function CanalSecundario({ titulo, semBase, children }: { titulo: string; semBase: boolean; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border-subtle p-3">
      <p className="mb-2 text-caption font-bold uppercase tracking-wide text-muted-foreground">{titulo}</p>
      {semBase ? <p className="text-[12px] italic text-muted-foreground">Sem base suficiente para projeção.</p> : children}
    </div>
  )
}

type EsforcoValues = { atendimentos?: number; agendamentos?: number; qualificados?: number; oportunidades?: number }

export function hasPositiveEffortLever(values: EsforcoValues | null | undefined): values is EsforcoValues {
  return Boolean(values && Object.values(values).some(value => typeof value === 'number' && Number.isFinite(value) && value > 0))
}

export function EsforcoNecessarioCard({ channels, faltam }: { channels: ChannelFunnel[]; faltam: number }) {
  if (faltam <= 0) {
    return (
      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <p className="mb-2 text-caption font-bold uppercase tracking-wider text-muted-foreground">O que preciso produzir para bater a meta?</p>
        <p className="text-[14px] font-bold text-status-success-text">Meta batida. Continue mantendo o ritmo! 🎯</p>
      </div>
    )
  }

  const byName = (name: FunnelChannel) => channels.find(c => c.channel === name)
  const showroom = byName('Showroom')
  const internet = byName('Internet')
  const carteira = byName('Carteira')

  const showCalc = showroom ? calcEsforcoShowroom(showroom, faltam) : null
  const inetCalc = internet ? calcEsforcoInternet(internet, faltam) : null
  const cartCalc = carteira ? calcEsforcoCarteira(carteira, faltam) : null
  const showEffort = hasPositiveEffortLever(showCalc) ? showCalc : null
  const inetEffort = hasPositiveEffortLever(inetCalc) ? inetCalc : null
  const cartEffort = hasPositiveEffortLever(cartCalc) ? cartCalc : null
  const canalPrincipal = escolherCanalPrincipal({ Showroom: showEffort, Internet: inetEffort, Carteira: cartEffort })
  const calcPrincipal = canalPrincipal === 'Carteira' ? cartCalc : canalPrincipal === 'Internet' ? inetCalc : showCalc
  const principalEffort = hasPositiveEffortLever(calcPrincipal) ? calcPrincipal : null

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <p className="mb-1 text-caption font-bold uppercase tracking-wider text-muted-foreground">O que preciso produzir para bater a meta?</p>
      <p className="mb-4 text-[12px] text-muted-foreground">
        Com base na sua conversão registrada, esta é a produção estimada para buscar as {faltam} venda{faltam !== 1 ? 's' : ''} que faltam.
      </p>

      {!canalPrincipal ? (
        <div className="rounded-xl border border-border bg-slate-50 p-4 text-center">
          <p className="text-body-sm text-muted-foreground">Sem base suficiente para projeção confiável.</p>
          <p className="mt-1 text-[12px] text-muted-foreground">Registre atendimentos e vendas para habilitar esta análise.</p>
        </div>
      ) : (
        <>
          <div className={`mb-4 rounded-xl border p-4 ${EFFORT_PRINCIPAL_BG[canalPrincipal]}`}>
            <p className="mb-1 text-caption font-bold uppercase tracking-wide text-muted-foreground">
              Sua melhor base hoje é <span className="font-bold text-foreground">{canalPrincipal}</span>
            </p>
            <p className="mb-3 text-[12px] text-muted-foreground">
              Esses números mostram o esforço estimado em cada ponto do funil. Você pode acompanhar sua evolução por qualquer uma dessas alavancas.
            </p>
            {canalPrincipal === 'Showroom' && principalEffort?.atendimentos != null && principalEffort.atendimentos > 0 && (
              <AlavancaItem label="Atendimentos Comerciais" valor={principalEffort.atendimentos} />
            )}
            {canalPrincipal === 'Internet' && principalEffort && (
              <>
                {principalEffort.atendimentos != null && principalEffort.atendimentos > 0 && <AlavancaItem label="Atendimentos Comerciais" valor={principalEffort.atendimentos} />}
                {principalEffort.agendamentos != null && principalEffort.agendamentos > 0 && <AlavancaItem label="Agendamentos" valor={principalEffort.agendamentos} />}
                {principalEffort.qualificados != null && principalEffort.qualificados > 0 && <AlavancaItem label="Qualificados" valor={principalEffort.qualificados} />}
                {principalEffort.oportunidades != null && principalEffort.oportunidades > 0 && <AlavancaItem label="Oportunidades" valor={principalEffort.oportunidades} />}
              </>
            )}
            {canalPrincipal === 'Carteira' && principalEffort && (
              <>
                {principalEffort.atendimentos != null && principalEffort.atendimentos > 0 && <AlavancaItem label="Atendimentos Comerciais" valor={principalEffort.atendimentos} />}
                {principalEffort.agendamentos != null && principalEffort.agendamentos > 0 && <AlavancaItem label="Agendamentos" valor={principalEffort.agendamentos} />}
                {principalEffort.qualificados != null && principalEffort.qualificados > 0 && <AlavancaItem label="Qualificados" valor={principalEffort.qualificados} />}
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {canalPrincipal !== 'Showroom' && (
              <CanalSecundario titulo="Showroom" semBase={!showEffort}>
                {showEffort?.atendimentos != null && showEffort.atendimentos > 0 && <AlavancaItem label="Atendimentos Comerciais" valor={showEffort.atendimentos} />}
              </CanalSecundario>
            )}
            {canalPrincipal !== 'Internet' && (
              <CanalSecundario titulo="Internet" semBase={!inetEffort}>
                {inetEffort && (
                  <>
                    {inetEffort.atendimentos != null && inetEffort.atendimentos > 0 && <AlavancaItem label="Atendimentos Comerciais" valor={inetEffort.atendimentos} />}
                    {inetEffort.agendamentos != null && inetEffort.agendamentos > 0 && <AlavancaItem label="Agendamentos" valor={inetEffort.agendamentos} />}
                    {inetEffort.qualificados != null && inetEffort.qualificados > 0 && <AlavancaItem label="Qualificados" valor={inetEffort.qualificados} />}
                    {inetEffort.oportunidades != null && inetEffort.oportunidades > 0 && <AlavancaItem label="Oportunidades" valor={inetEffort.oportunidades} />}
                  </>
                )}
              </CanalSecundario>
            )}
            {canalPrincipal !== 'Carteira' && (
              <CanalSecundario titulo="Carteira" semBase={!cartEffort}>
                {cartEffort && (
                  <>
                    {cartEffort.atendimentos != null && cartEffort.atendimentos > 0 && <AlavancaItem label="Atendimentos Comerciais" valor={cartEffort.atendimentos} />}
                    {cartEffort.agendamentos != null && cartEffort.agendamentos > 0 && <AlavancaItem label="Agendamentos" valor={cartEffort.agendamentos} />}
                    {cartEffort.qualificados != null && cartEffort.qualificados > 0 && <AlavancaItem label="Qualificados" valor={cartEffort.qualificados} />}
                  </>
                )}
              </CanalSecundario>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export function EficienciaCanalCard({ channels }: { channels: ChannelFunnel[] }) {
  const limitador = getLimitadorLabel(channels)
  const byName = (name: FunnelChannel) => channels.find(c => c.channel === name)

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <p className="mb-1 text-caption font-bold uppercase tracking-wider text-muted-foreground">Eficiência por canal</p>
      <p className="mb-4 text-[12px] text-muted-foreground"><span className="font-semibold">Principal limitador:</span> {limitador}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {EFICIENCIA_ORDER.map(name => {
          const channel = byName(name)
          return channel ? <CanalCard key={name} channel={channel} /> : null
        })}
      </div>
    </div>
  )
}

function CanalCard({ channel }: { channel: ChannelFunnel }) {
  const [expandido, setExpandido] = useState(false)
  const cor = EFICIENCIA_COR[channel.channel]
  const steps = channel.steps
  const volume = steps[0]?.value ?? 0
  const vendas = steps[steps.length - 1]?.value ?? 0
  const semDados = volume === 0 && vendas === 0
  const conv = channel.generalConversion === null ? null : Math.round(channel.generalConversion)
  const etapas = buildEtapaLinhas(channel)

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <div className={`flex items-center justify-between border-b px-4 py-2.5 ${cor.header}`}>
        <p className="text-[12px] font-bold uppercase tracking-wide text-foreground">{channel.channel}</p>
        {conv !== null && !semDados ? (
          <span className={`rounded-full px-2 py-0.5 text-caption font-bold ${cor.badge}`}>{conv}% conv.</span>
        ) : (
          <span className="text-caption text-muted-foreground">Sem dados</span>
        )}
      </div>

      <div className="px-4 py-3">
        {semDados ? (
          <p className="text-[12px] italic text-muted-foreground">Sem base suficiente para projeção.</p>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-caption text-muted-foreground">{VOLUME_LABEL[channel.channel]}</p>
              <p className="text-[20px] font-bold tabular-nums text-foreground">{volume}</p>
            </div>
            <div className="text-center">
              <p className="text-caption text-muted-foreground">Vendas</p>
              <p className="text-[20px] font-bold tabular-nums text-status-success-text">{vendas}</p>
            </div>
            <div className="text-center">
              <p className="text-caption text-muted-foreground">Conversão</p>
              <p className="text-[20px] font-bold tabular-nums text-foreground">{conv !== null ? `${conv}%` : '—'}</p>
            </div>
          </div>
        )}

        {!semDados && etapas.length > 0 && (
          <button
            type="button"
            onClick={() => setExpandido(v => !v)}
            className={`mt-2.5 flex items-center gap-1 text-caption font-semibold transition-colors ${cor.btn}`}
          >
            {expandido ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expandido ? 'Ocultar etapas' : 'Ver etapas'}
          </button>
        )}
      </div>

      {expandido && (
        <div className="border-t border-border-subtle px-4 pb-3 pt-2">
          {etapas.map((etapa, index) => <EtapaLinha key={index} label={etapa.label} valor={etapa.value} conv={etapa.conv} />)}
        </div>
      )}
    </div>
  )
}

function EtapaLinha({ label, valor, conv }: { label: string; valor: number; conv: string | null }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 py-1.5 last:border-0">
      <div className="flex flex-col">
        <span className="text-[12px] text-muted-foreground">{label}</span>
        {conv && <span className="text-caption text-muted-foreground">→ {conv}</span>}
      </div>
      <span className="text-[14px] font-bold tabular-nums text-foreground">{valor}</span>
    </div>
  )
}

export function BaseEstatisticaCard({ displayedPeriod, calculationPeriod, confidence }: { displayedPeriod: string; calculationPeriod: string; confidence: Confidence }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-slate-50 p-4">
      <p className="mb-3 text-caption font-bold uppercase tracking-wider text-muted-foreground">Base do cálculo</p>
      <div className="flex flex-wrap gap-x-8 gap-y-2 text-[12px]">
        <div><span className="text-muted-foreground">Período exibido:</span>{' '}<span className="font-semibold text-muted-foreground">{displayedPeriod}</span></div>
        <div><span className="text-muted-foreground">Período de cálculo:</span>{' '}<span className="font-semibold text-muted-foreground">{calculationPeriod}</span></div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Confiança:</span>
          <span className={`rounded-full border px-2 py-0.5 text-caption font-bold ${BASE_CONFIANCA_COR[confidence]}`}>{confidence}</span>
        </div>
        <div className="w-full text-caption text-muted-foreground">{confidenceReason(confidence)}</div>
      </div>
    </div>
  )
}

export function EvolucaoCollapsible({ data, chartAberto, onToggle }: { data: MonthlyEvolutionPoint[]; chartAberto: boolean; onToggle: () => void }) {
  const semRegistros = data.every(item => item.oportunidades === 0 && item.atendimentos === 0 && item.vendas === 0)
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-5 py-3.5 transition-colors hover:bg-slate-50">
        <p className="text-caption font-bold uppercase tracking-wider text-muted-foreground">Ver evolução dos últimos meses</p>
        {chartAberto ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {chartAberto && (
        <div className="border-t border-border-subtle px-5 pb-4">
          {semRegistros ? (
            <p className="py-6 text-center text-[12px] text-muted-foreground">Sem registros nos últimos 6 meses.</p>
          ) : (
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: chartTokens.axisTickMuted() }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: chartTokens.axisTickMuted() }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11, border: `1px solid ${chartTokens.gridStrong()}` }} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="oportunidades" name="Oportunidades" stroke={chartTokens.series.s5()} strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="atendimentos" name="Atend. Comercial" stroke={chartTokens.series.s4()} strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="vendas" name="Vendas" stroke={chartTokens.accent()} strokeWidth={2} dot={{ r: 2, fill: chartTokens.accent() }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  )
}

function escolherCanalPrincipal(calculations: Partial<Record<FunnelChannel, EsforcoValues | null>>): FunnelChannel | null {
  if (hasPositiveEffortLever(calculations.Carteira)) return 'Carteira'
  if (hasPositiveEffortLever(calculations.Internet)) return 'Internet'
  if (hasPositiveEffortLever(calculations.Showroom)) return 'Showroom'
  return null
}

function calcEsforcoShowroom(channel: ChannelFunnel, faltam: number): EsforcoValues | null {
  if (!temBaseParaEsforco(channel)) return null
  const venda = stepValue(channel, 'venda')
  const atendimento = stepValue(channel, 'atendimento_comercial')
  if (venda <= 0 || atendimento <= 0) return null
  return { atendimentos: ceilSafe(faltam / (venda / atendimento)) }
}

function calcEsforcoInternet(channel: ChannelFunnel, faltam: number): EsforcoValues | null {
  if (!temBaseParaEsforco(channel)) return null
  const venda = stepValue(channel, 'venda')
  const atendimento = stepValue(channel, 'atendimento_comercial')
  const agendamento = stepValue(channel, 'agendamento')
  const qualificados = stepValue(channel, 'qualificados')
  const oportunidades = stepValue(channel, 'oportunidades')
  const result: EsforcoValues = {}
  if (venda > 0 && atendimento > 0) result.atendimentos = ceilSafe(faltam / (venda / atendimento))
  if (venda > 0 && agendamento > 0) result.agendamentos = ceilSafe(faltam / (venda / agendamento))
  if (venda > 0 && qualificados > 0) result.qualificados = ceilSafe(faltam / (venda / qualificados))
  if (venda > 0 && oportunidades > 0) result.oportunidades = ceilSafe(faltam / (venda / oportunidades))
  return Object.keys(result).length ? result : null
}

function calcEsforcoCarteira(channel: ChannelFunnel, faltam: number): EsforcoValues | null {
  if (!temBaseParaEsforco(channel)) return null
  const venda = stepValue(channel, 'venda')
  const atendimento = stepValue(channel, 'atendimento_comercial')
  const agendamento = stepValue(channel, 'agendamento')
  const qualificados = stepValue(channel, 'qualificados')
  const result: EsforcoValues = {}
  if (venda > 0 && atendimento > 0) result.atendimentos = ceilSafe(faltam / (venda / atendimento))
  if (venda > 0 && agendamento > 0) result.agendamentos = ceilSafe(faltam / (venda / agendamento))
  if (venda > 0 && qualificados > 0) result.qualificados = ceilSafe(faltam / (venda / qualificados))
  return Object.keys(result).length ? result : null
}

function getLimitadorLabel(channels: ChannelFunnel[]) {
  const byName = (name: FunnelChannel) => channels.find(c => c.channel === name)
  const showroom = byName('Showroom')
  const internet = byName('Internet')
  const carteira = byName('Carteira')
  const vendaShow = showroom ? stepValue(showroom, 'venda') : 0
  const vendaInet = internet ? stepValue(internet, 'venda') : 0
  const vendaCart = carteira ? stepValue(carteira, 'venda') : 0
  const totalVendas = vendaShow + vendaInet + vendaCart
  if (totalVendas === 0) return 'Hoje ainda não há vendas suficientes para identificar o principal limitador.'

  const atendShow = showroom ? stepValue(showroom, 'atendimento_comercial') : 0
  const oppInet = internet ? stepValue(internet, 'oportunidades') : 0
  const qualCart = carteira ? stepValue(carteira, 'qualificados') : 0
  const convShow = atendShow > 0 ? vendaShow / atendShow : 0
  const convInet = oppInet > 0 ? vendaInet / oppInet : 0
  const convCart = qualCart > 0 ? vendaCart / qualCart : 0
  const melhor = Math.max(convShow, convInet, convCart)
  if (melhor === 0) return 'Ainda não há base suficiente para identificar o principal limitador.'
  if (convCart >= melhor - 0.001) return 'Carteira é o canal com melhor base para buscar a meta.'
  if (convInet >= melhor - 0.001) return 'Internet é o canal com melhor base para buscar a meta.'
  return 'Showroom é o canal com melhor base para buscar a meta.'
}

function stepValue(channel: ChannelFunnel, key: FunnelStepKey) {
  return channel.steps.find(step => step.key === key)?.value || 0
}

function ceilSafe(n: number) {
  return Math.ceil(n)
}

function temBaseParaEsforco(channel: ChannelFunnel) {
  const venda = stepValue(channel, 'venda')
  if (channel.channel === 'Showroom') return venda >= 1 && stepValue(channel, 'atendimento_comercial') >= 1
  return venda >= 1
}

function buildEtapaLinhas(channel: ChannelFunnel) {
  return channel.steps.map((step, index) => {
    const next = channel.steps[index + 1]
    if (!next) return { label: step.label, value: step.value, conv: null as string | null }
    const pct = pctLabelStr(next.value, step.value)
    return { label: step.label, value: step.value, conv: pct ? `${pct} → ${next.label}` : null }
  })
}

function pctSeguro(a: number, b: number): number | null {
  if (!b || b <= 0) return null
  const v = Math.round((a / b) * 100)
  if (v > 100) return null
  return v
}

function pctLabelStr(a: number, b: number): string | null {
  const v = pctSeguro(a, b)
  if (v === null) return b > 0 ? '—' : null
  return `${v}%`
}

function confidenceReason(confidence: Confidence) {
  if (confidence === 'Alta') return 'Cálculo baseado nos dados deste período.'
  if (confidence === 'Média') return 'O período selecionado tem poucos dados; usamos os últimos 3 meses.'
  return 'Ainda há poucos registros para projetar com precisão.'
}
