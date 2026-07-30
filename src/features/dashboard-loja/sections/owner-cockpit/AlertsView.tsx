import { useMemo, useState } from 'react'
import { AlertTriangle, Bell, CheckCircle2, Clock3, MoreVertical, Search, TrendingUp } from 'lucide-react'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { cn } from '@/lib/utils'
import type { OwnerPerformanceAlert } from '../PerformanceAlerts'
import { toneClasses, type KpiTone } from './types'
import { SectionTitle, SideList, SummaryCard } from './primitives'

export function filterOwnerAlerts(
  alerts: OwnerPerformanceAlert[],
  statusFilter = 'todos',
  departmentFilter = 'todos',
  search = '',
) {
  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')
  return alerts.filter(alert => {
    const statusOk = statusFilter === 'todos' || alert.variant === statusFilter
    const departmentOk = departmentFilter === 'todos' || alert.department === departmentFilter
    const searchOk = !normalizedSearch || `${alert.title} ${alert.description} ${alert.recommendation}`.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
    return statusOk && departmentOk && searchOk
  })
}

export function AlertsView({ alerts }: { alerts: OwnerPerformanceAlert[] }) {
  const [statusFilter, setStatusFilter] = useState('todos')
  const [departmentFilter, setDepartmentFilter] = useState('todos')
  const [search, setSearch] = useState('')
  const critical = alerts.filter(alert => alert.variant === 'danger').length
  const warning = alerts.filter(alert => alert.variant === 'warning').length
  const positive = alerts.filter(alert => alert.variant === 'success').length
  const departments = useMemo(() => [...new Set(alerts.map(alert => alert.department).filter(Boolean))] as string[], [alerts])
  const filteredAlerts = filterOwnerAlerts(alerts, statusFilter, departmentFilter, search)
  return (
    <div className="space-y-mx-md">
      <SectionTitle title="Alertas Inteligentes" subtitle="Monitore riscos, desvios e oportunidades em tempo real." />
      <div className="grid grid-cols-1 gap-mx-md md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title="Críticos" value={critical} detail="exigem ação imediata" icon={<AlertTriangle size={22} />} tone="danger" />
        <SummaryCard title="Atenção" value={warning} detail="precisam de atenção" icon={<Clock3 size={22} />} tone="warning" />
        <SummaryCard title="Informativos" value={Math.max(alerts.length - critical - warning - positive, 0)} detail="para acompanhamento" icon={<Bell size={22} />} tone="info" />
        <SummaryCard title="Positivos" value={positive} detail="pontos positivos" icon={<CheckCircle2 size={22} />} tone="success" />
        <SummaryCard title="Tendência de Risco" value={critical + warning > 0 ? 'Alta' : 'Baixa'} detail="atenção redobrada" icon={<TrendingUp size={22} />} tone={critical + warning > 0 ? 'danger' : 'success'} />
      </div>
      <div className="grid grid-cols-1 gap-mx-md xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-mx-lg">
          <div className="flex flex-col gap-mx-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="grid grid-cols-1 gap-mx-sm sm:grid-cols-3">
              <select aria-label="Filtrar status dos alertas" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="h-mx-10 rounded-mx-lg border border-border-subtle bg-white px-mx-sm text-xs font-black text-text-secondary">
                <option value="todos">Todos os status</option>
                <option value="danger">Críticos</option>
                <option value="warning">Atenção</option>
                <option value="success">Positivos</option>
                <option value="outline">Informativos</option>
              </select>
              <select aria-label="Filtrar departamento dos alertas" value={departmentFilter} onChange={event => setDepartmentFilter(event.target.value)} className="h-mx-10 rounded-mx-lg border border-border-subtle bg-white px-mx-sm text-xs font-black text-text-secondary">
                <option value="todos">Todos os departamentos</option>
                {departments.map(department => <option key={department} value={department}>{department}</option>)}
              </select>
              <label className="relative min-w-0 lg:w-[280px]">
                <span className="sr-only">Buscar alerta</span>
                <Search size={16} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input value={search} onChange={event => setSearch(event.target.value)} className="h-mx-10 w-full rounded-mx-lg border border-border-subtle bg-white pl-mx-xl pr-mx-sm text-sm font-bold outline-none focus:border-brand-primary" placeholder="Buscar alerta..." />
              </label>
            </div>
          </div>
          <div className="mt-mx-md divide-y divide-border-subtle">
            {filteredAlerts.map((alert, index) => {
              const tone: KpiTone = alert.variant === 'danger' ? 'danger' : alert.variant === 'warning' ? 'warning' : alert.variant === 'success' ? 'success' : 'info'
              const classes = toneClasses[tone]
              return (
                <div key={`${alert.title}-${index}`} className="grid grid-cols-1 gap-mx-sm py-mx-md lg:grid-cols-[120px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_90px_80px_40px] lg:items-center">
                  <span className={cn('w-fit rounded-mx-md border px-mx-sm py-mx-xs text-mx-tiny font-black', classes.soft)}>{tone === 'danger' ? 'Crítico' : tone === 'warning' ? 'Atenção' : tone === 'success' ? 'Positivo' : 'Informativo'}</span>
                  <div>
                    <Typography variant="p" className="">{alert.title}</Typography>
                    <Typography variant="tiny" tone="muted" className="block">{alert.description}</Typography>
                  </div>
                  <Typography variant="p" tone="brand" className="">{alert.recommendation}</Typography>
                  <Typography variant="p" className="font-bold">{alert.action}</Typography>
                  <Typography variant="tiny" className={cn('font-black', classes.text)}>Impacto {alert.impact}</Typography>
                  <Typography variant="tiny" className={cn('font-black', classes.text)}>Sistema</Typography>
                  <MoreVertical size={18} className="text-text-tertiary" />
                </div>
              )
            })}
            {filteredAlerts.length === 0 && <div className="rounded-mx-lg border border-dashed border-border-subtle p-mx-lg text-center text-sm font-bold text-text-tertiary">Nenhum alerta corresponde aos filtros.</div>}
          </div>
        </Card>
        <div className="space-y-mx-md">
          <SideList title="Indicadores mais críticos" items={alerts.slice(0, 5).map(alert => alert.title)} />
          <Card className="bg-mx-indigo-50 p-mx-lg">
            <Typography variant="h3" className="">Dica do Consultor MX</Typography>
            <Typography variant="p" tone="muted" className="mt-mx-sm font-bold">Foque nas ações críticas para evitar impacto no resultado do mês.</Typography>
          </Card>
        </div>
      </div>
    </div>
  )
}
