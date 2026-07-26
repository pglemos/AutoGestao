import { AlertTriangle, BarChart3, CheckCircle2, Clock3, Download, Target } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import type { CentralMxIndicatorValue } from '@/lib/central-mx-engine'
import { cn } from '@/lib/utils'
import type { DashboardData } from './types'
import { currentPeriodLabel, departmentLabel, formatInteger, formatPlanningValue, planningStatusTone } from './format'
import { OwnerKpiCard, SectionTitle } from './primitives'

export function StrategicPlanningView({
  data,
  planningIndicators,
}: {
  data: DashboardData
  planningIndicators: CentralMxIndicatorValue[]
}) {
  const complete = planningIndicators.filter(indicator => indicator.status === 'completo').length
  const partial = planningIndicators.filter(indicator => indicator.status === 'parcial').length
  const pending = planningIndicators.filter(indicator => indicator.status === 'pendente').length

  const handleExport = () => {
    const headers = [
      'Departamento',
      'Indicador',
      'Meta',
      'Realizado',
      'Ano Anterior',
      'Score',
      'Status',
    ]
    const rows = planningIndicators.map((indicator) => [
      departmentLabel(indicator.department),
      indicator.label,
      formatPlanningValue(indicator.meta, indicator.unit),
      formatPlanningValue(indicator.realizado, indicator.unit),
      formatPlanningValue(indicator.anoAnterior, indicator.unit),
      indicator.score ?? '--',
      indicator.status === 'completo' ? 'Completo' : indicator.status === 'parcial' ? 'Parcial' : 'Pendente',
    ])
    const escapeCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
    const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(';')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const dateStr = new Date().toISOString().slice(0, 10)
    link.href = url
    link.download = `plano-estrategico-${dateStr}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-mx-md">
      <SectionTitle title="Planejamento Estratégico" subtitle="45 indicadores com Meta, Realizado e Ano Anterior por departamento." />
      <div className="grid grid-cols-1 gap-mx-md md:grid-cols-2 xl:grid-cols-5">
        <OwnerKpiCard title="Indicadores" value={formatInteger(planningIndicators.length)} detail="matriz estratégica" icon={<BarChart3 size={22} />} tone="brand" />
        <OwnerKpiCard title="Completos" value={formatInteger(complete)} detail="meta, realizado e ano anterior" icon={<CheckCircle2 size={22} />} tone={complete > 0 ? 'success' : 'muted'} />
        <OwnerKpiCard title="Parciais" value={formatInteger(partial)} detail="faltam campos de planejamento" icon={<Clock3 size={22} />} tone={partial > 0 ? 'warning' : 'muted'} />
        <OwnerKpiCard title="Pendentes" value={formatInteger(pending)} detail="precisam de fonte ou meta" icon={<AlertTriangle size={22} />} tone={pending > 0 ? 'danger' : 'success'} />
        <OwnerKpiCard title="Loja" value={data.metrics.storeName} detail={currentPeriodLabel(data.referenceDate)} icon={<Target size={22} />} tone="info" />
      </div>
      <Card className="rounded-mx-2xl p-mx-lg">
        <div className="flex flex-col gap-mx-sm md:flex-row md:items-center md:justify-between">
          <Typography variant="h3" className="text-xl font-black">Matriz Meta / Realizado / Ano Anterior</Typography>
          <Button
            type="button"
            variant="outline"
            className="h-mx-10 rounded-mx-xl bg-white"
            onClick={handleExport}
            disabled={planningIndicators.length === 0}
          >
            <Download size={16} /> Exportar
          </Button>
        </div>
        <div className="mt-mx-md overflow-x-auto">
          <table className="min-w-[1080px] w-full border-collapse text-sm">
            <thead>
              <tr className="bg-surface-alt text-left text-mx-tiny font-black uppercase text-text-secondary">
                <th className="border border-border-subtle px-mx-sm py-mx-sm">Departamento</th>
                <th className="border border-border-subtle px-mx-sm py-mx-sm">Indicador</th>
                <th className="border border-border-subtle px-mx-sm py-mx-sm text-center">Meta</th>
                <th className="border border-border-subtle px-mx-sm py-mx-sm text-center">Realizado</th>
                <th className="border border-border-subtle px-mx-sm py-mx-sm text-center">Ano Anterior</th>
                <th className="border border-border-subtle px-mx-sm py-mx-sm text-center">Score</th>
                <th className="border border-border-subtle px-mx-sm py-mx-sm text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {planningIndicators.map((indicator) => (
                <tr key={indicator.code}>
                  <td className="border border-border-subtle px-mx-sm py-mx-sm font-black">{departmentLabel(indicator.department)}</td>
                  <td className="border border-border-subtle px-mx-sm py-mx-sm font-black">{indicator.label}</td>
                  <td className="border border-border-subtle px-mx-sm py-mx-sm text-center font-bold tabular-nums">{formatPlanningValue(indicator.meta, indicator.unit)}</td>
                  <td className="border border-border-subtle px-mx-sm py-mx-sm text-center font-bold tabular-nums">{formatPlanningValue(indicator.realizado, indicator.unit)}</td>
                  <td className="border border-border-subtle px-mx-sm py-mx-sm text-center font-bold tabular-nums">{formatPlanningValue(indicator.anoAnterior, indicator.unit)}</td>
                  <td className="border border-border-subtle px-mx-sm py-mx-sm text-center font-black tabular-nums">{indicator.score ?? '--'}</td>
                  <td className="border border-border-subtle px-mx-sm py-mx-sm text-center">
                    <span className={cn('rounded-mx-md border px-mx-sm py-mx-xs text-mx-tiny font-black', planningStatusTone(indicator.status))}>
                      {indicator.status === 'completo' ? 'Completo' : indicator.status === 'parcial' ? 'Parcial' : 'Pendente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
