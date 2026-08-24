import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownUp, BarChart3, Filter, List, Plus, Table2, Download } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import type { CentralMxIndicatorValue } from '@/lib/central-mx-engine'
import { cn } from '@/lib/utils'
import type { DashboardData } from './types'
import { departmentLabel, formatPlanningValue, planningStatusTone } from './format'

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function statusLabel(status: CentralMxIndicatorValue['status']) {
  return status === 'completo' ? 'Completo' : status === 'parcial' ? 'Parcial' : 'Pendente'
}

function currentMonth(referenceDate: string) {
  return new Date(`${referenceDate}T12:00:00`).getMonth()
}

export function StrategicPlanningView({
  data,
  planningIndicators,
}: {
  data: DashboardData
  planningIndicators: CentralMxIndicatorValue[]
}) {
  const navigate = useNavigate()
  const [selectedCode, setSelectedCode] = useState(planningIndicators[0]?.code || '')
  const [area, setArea] = useState('all')
  const [tab, setTab] = useState<'resumo' | 'visao-geral'>('resumo')
  const month = currentMonth(data.referenceDate)
  const areas = useMemo(() => Array.from(new Set(planningIndicators.map(indicator => indicator.department))), [planningIndicators])
  const filtered = area === 'all' ? planningIndicators : planningIndicators.filter(indicator => indicator.department === area)
  const selected = filtered.find(indicator => indicator.code === selectedCode) || filtered[0] || null

  const exportCsv = () => {
    const headers = ['Departamento', 'Indicador', 'Meta', 'Realizado', 'Ano anterior', 'Score', 'Status']
    const rows = planningIndicators.map(indicator => [
      departmentLabel(indicator.department),
      indicator.label,
      formatPlanningValue(indicator.meta, indicator.unit),
      formatPlanningValue(indicator.realizado, indicator.unit),
      formatPlanningValue(indicator.anoAnterior, indicator.unit),
      indicator.score ?? '--',
      statusLabel(indicator.status),
    ])
    const csv = [headers, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    link.download = `plano-estrategico-${data.referenceDate}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="-mx-mx-sm min-h-full bg-surface-alt px-mx-sm py-mx-md md:-mx-mx-lg md:px-mx-lg">
      <div className="space-y-mx-md">
        <div>
          <Typography variant="h1" className="text-2xl font-bold">Planejamento Estratégico</Typography>
          <Typography variant="p" tone="muted" className="mt-mx-xs">Acompanhe metas, resultados e evolução dos principais indicadores da empresa.</Typography>
        </div>

        <div className="inline-flex rounded-2xl border border-border-subtle bg-white p-0.5 shadow-sm">
          <button type="button" onClick={() => setTab('resumo')} className={cn('flex h-mx-10 items-center gap-mx-xs rounded-xl px-mx-md text-sm', tab === 'resumo' ? 'bg-status-success-surface font-bold text-status-success-text' : 'text-muted-foreground')}><BarChart3 size={16} /> Resumo</button>
          <button type="button" onClick={() => setTab('visao-geral')} className={cn('flex h-mx-10 items-center gap-mx-xs rounded-xl px-mx-md text-sm', tab === 'visao-geral' ? 'bg-status-success-surface font-bold text-status-success-text' : 'text-muted-foreground')}><List size={16} /> Visão do Plano</button>
        </div>

        {tab === 'resumo' && selected && (
          <>
            <Card className="border bg-white p-mx-sm">
              <div className="flex flex-col gap-mx-sm lg:flex-row lg:items-center">
                <label className="flex min-w-0 flex-1 items-center gap-mx-xs rounded-xl border border-border-subtle bg-white px-mx-sm text-sm"><Table2 size={15} className="text-muted-foreground" /><select aria-label="Indicador estratégico" value={selected.code} onChange={event => setSelectedCode(event.target.value)} className="h-mx-10 min-w-0 flex-1 bg-transparent outline-none"><option value={selected.code}>{selected.label}</option>{filtered.filter(indicator => indicator.code !== selected.code).map(indicator => <option key={indicator.code} value={indicator.code}>{indicator.label}</option>)}</select></label>
                <label className="flex items-center gap-mx-xs rounded-xl border border-border-subtle bg-white px-mx-sm text-sm"><Filter size={15} className="text-muted-foreground" /><select aria-label="Área estratégica" value={area} onChange={event => { setArea(event.target.value); setSelectedCode('') }} className="h-mx-10 bg-transparent outline-none"><option value="all">Todas as áreas</option>{areas.map(value => <option key={value} value={value}>{departmentLabel(value)}</option>)}</select></label>
                <div className="flex items-center gap-mx-xs text-mx-tiny text-muted-foreground"><span className="rounded-mx-full bg-surface-alt px-mx-sm py-mx-xs">Dados do período atual</span><button type="button" onClick={exportCsv} className="inline-flex items-center gap-mx-xs px-mx-xs font-bold text-muted-foreground"><Download size={15} /> Exportar</button><Button type="button" size="sm" onClick={() => navigate(`/dono/plano-acao?indicator=${encodeURIComponent(selected.code)}`)}><Plus size={15} /> Criar Plano de Ação</Button></div>
              </div>
            </Card>

            <Card className="overflow-hidden border border-brand-primary/30 bg-white p-0">
              <div className="grid grid-cols-1 divide-y border-t-4 border-brand-primary md:grid-cols-[minmax(240px,1.2fr)_repeat(4,minmax(130px,1fr))] md:divide-x md:divide-y-0">
                <div className="p-mx-md"><Typography variant="h3" className="text-base font-bold">{selected.label}</Typography><div className="mt-mx-xs flex flex-wrap gap-mx-xs text-mx-tiny"><span className="rounded-mx-xs bg-brand-primary/10 px-mx-xs py-0.5 text-status-success-text">{departmentLabel(selected.department)}</span><span className="text-muted-foreground">{selected.code}</span><span className={cn('rounded-mx-xs px-mx-xs py-0.5', planningStatusTone(selected.status))}>{statusLabel(selected.status)}</span></div></div>
                <PlanningSummary label="Meta do período" value={formatPlanningValue(selected.meta, selected.unit)} />
                <PlanningSummary label="Resultado do período" value={formatPlanningValue(selected.realizado, selected.unit)} />
                <PlanningSummary label="Score" value={selected.score == null ? '--' : `${selected.score}`} />
                <PlanningSummary label="Ano anterior" value={formatPlanningValue(selected.anoAnterior, selected.unit)} />
              </div>
            </Card>

            <Card className="overflow-hidden border bg-white p-0">
              <div className="border-b border-border-subtle px-mx-md py-mx-sm"><Typography variant="h3" className="text-base font-bold">Comparativo mensal</Typography><Typography variant="tiny" tone="muted">Meta, resultado, score e ano anterior — exibindo somente valores disponíveis na fonte real.</Typography></div>
              <div className="overflow-x-auto"><table className="min-w-[1048px] w-full text-sm"><thead><tr className="bg-surface-alt text-left text-mx-tiny font-bold text-muted-foreground"><th className="px-mx-sm py-mx-sm">Comparativo</th>{MONTHS.map((label, index) => <th key={label} className={cn('px-mx-sm py-mx-sm text-center', index === month && 'bg-brand-primary/5 text-status-success-text')}>{label}</th>)}<th className="px-mx-sm py-mx-sm text-center">Período atual</th></tr></thead><tbody><PlanningRow label="Meta" value={selected.meta == null ? null : selected.meta} unit={selected.unit} month={month} /><PlanningRow label="Resultado Atual" value={selected.realizado == null ? null : selected.realizado} unit={selected.unit} month={month} /><PlanningRow label="Score" value={selected.score} unit="score" month={month} /><PlanningRow label="Ano Anterior" value={selected.anoAnterior} unit={selected.unit} month={month} /></tbody></table></div>
            </Card>

            <div className="grid gap-mx-md lg:grid-cols-2"><Card className="border bg-white p-mx-md"><Typography variant="h3" className="text-base font-bold">Leitura do indicador</Typography><Typography variant="p" className="mt-mx-sm text-sm">{selected.realizado == null ? 'O resultado ainda não foi registrado para este indicador.' : `O resultado atual é ${formatPlanningValue(selected.realizado, selected.unit)}${selected.meta == null ? '.' : ` diante de uma meta de ${formatPlanningValue(selected.meta, selected.unit)}.`}`}</Typography></Card><Card className="border border-status-warning/30 bg-status-warning-surface p-mx-md"><Typography variant="h3" className="text-base font-bold">Direcionamento MX</Typography><Typography variant="p" className="mt-mx-sm text-sm">Use o Plano de Ação para registrar a decisão, responsável, prazo e evidência deste indicador.</Typography><Button type="button" variant="outline" className="mt-mx-md" onClick={() => navigate(`/dono/plano-acao?indicator=${encodeURIComponent(selected.code)}`)}>Criar Plano de Ação <ArrowDownUp size={15} /></Button></Card></div>
          </>
        )}

        {tab === 'visao-geral' && <Card className="overflow-hidden border bg-white p-0"><div className="overflow-x-auto"><table className="min-w-[900px] w-full text-sm"><thead className="bg-surface-alt text-left text-mx-tiny font-bold text-muted-foreground"><tr><th className="px-mx-md py-mx-sm">Indicador</th><th className="px-mx-md py-mx-sm">Departamento</th><th className="px-mx-md py-mx-sm text-right">Meta</th><th className="px-mx-md py-mx-sm text-right">Realizado</th><th className="px-mx-md py-mx-sm text-right">Score</th><th className="px-mx-md py-mx-sm">Status</th></tr></thead><tbody className="divide-y divide-border-subtle">{filtered.map(indicator => <tr key={indicator.code} className="cursor-pointer hover:bg-surface-alt" tabIndex={0} onClick={() => { setSelectedCode(indicator.code); setTab('resumo') }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedCode(indicator.code); setTab('resumo') } }}><td className="px-mx-md py-mx-sm font-bold">{indicator.label}</td><td className="px-mx-md py-mx-sm text-muted-foreground">{departmentLabel(indicator.department)}</td><td className="px-mx-md py-mx-sm text-right tabular-nums">{formatPlanningValue(indicator.meta, indicator.unit)}</td><td className="px-mx-md py-mx-sm text-right tabular-nums">{formatPlanningValue(indicator.realizado, indicator.unit)}</td><td className="px-mx-md py-mx-sm text-right tabular-nums">{indicator.score ?? '--'}</td><td className="px-mx-md py-mx-sm"><span className={cn('rounded-mx-xs px-mx-xs py-0.5 text-mx-tiny', planningStatusTone(indicator.status))}>{statusLabel(indicator.status)}</span></td></tr>)}</tbody></table></div></Card>}
      </div>
    </div>
  )
}

function PlanningSummary({ label, value }: { label: string; value: string }) {
  return <div className="p-mx-md"><Typography variant="tiny" tone="muted" className="font-bold">{label}</Typography><Typography variant="h2" className="mt-mx-xs text-2xl font-bold tabular-nums">{value}</Typography></div>
}

function PlanningRow({ label, value, unit, month }: { label: string; value: number | null | undefined; unit: CentralMxIndicatorValue['unit']; month: number }) {
  return <tr className="border-t border-border-subtle"><td className="px-mx-sm py-mx-sm font-bold text-muted-foreground">{label}</td>{MONTHS.map((name, index) => <td key={name} className={cn('px-mx-sm py-mx-sm text-center tabular-nums', index === month && 'bg-brand-primary/5 font-bold text-status-success-text')}>{index === month ? formatPlanningValue(value, unit) : '—'}</td>)}<td className="px-mx-sm py-mx-sm text-center font-bold tabular-nums">{formatPlanningValue(value, unit)}</td></tr>
}
