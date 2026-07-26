import { useMemo, useState } from 'react'
import { CalendarDays, Download, Plus, User } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'
import { cn } from '@/lib/utils'
import { toneClasses, type ActionRow } from './types'
import { SectionTitle } from './primitives'

const KANBAN_COLUMNS: { status: string; label: string }[] = [
  { status: 'Pendente', label: 'Pendente' },
  { status: 'Em andamento', label: 'Em andamento' },
  { status: 'Validando eficácia', label: 'Validando eficácia' },
  { status: 'Atrasada', label: 'Atrasada' },
  { status: 'Concluída', label: 'Concluída' },
]

export function ActionPlanView({
  actions,
  onNewAction,
  disableNewAction,
}: {
  actions: ActionRow[]
  onNewAction: () => void
  disableNewAction: boolean
}) {
  const [departmentFilter, setDepartmentFilter] = useState('todos')
  const [ownerFilter, setOwnerFilter] = useState('todos')

  const departments = useMemo(
    () => [...new Set(actions.map(action => action.department))].sort(),
    [actions],
  )
  const owners = useMemo(
    () => [...new Set(actions.map(action => action.owner))].sort(),
    [actions],
  )

  const filteredActions = actions.filter(
    action =>
      (departmentFilter === 'todos' || action.department === departmentFilter) &&
      (ownerFilter === 'todos' || action.owner === ownerFilter),
  )

  const handleExport = () => {
    const headers = [
      'Prioridade',
      'Departamento',
      'Indicador',
      'Problema',
      'Ação',
      'Como',
      'Responsável',
      'Prazo',
      'Status',
      'Eficácia',
      'Origem',
      'Evidência',
    ]
    const rows = filteredActions.map((action) => [
      action.priority,
      action.department,
      action.indicator,
      action.problem,
      action.action,
      action.how,
      action.owner,
      action.due,
      action.status,
      action.efficacy,
      action.origin,
      action.evidence,
    ])
    const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`
    const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(';')).join('\n')
    const bom = String.fromCharCode(0xfeff)
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'plano-de-acao.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-mx-md">
      <div className="flex flex-col gap-mx-sm md:flex-row md:items-center md:justify-between">
        <SectionTitle title="Plano de Ação" subtitle="Transforme problemas em execução e acompanhe eficácia." />
        <div className="flex gap-mx-sm">
          <Button type="button" className="rounded-mx-xl" onClick={onNewAction} disabled={disableNewAction}>
            <Plus size={16} /> Nova Ação
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-mx-xl bg-white"
            onClick={handleExport}
            disabled={filteredActions.length === 0}
          >
            <Download size={16} /> Exportar
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-mx-sm">
        <label className="flex flex-col gap-1 text-mx-tiny font-black uppercase text-text-tertiary">
          Departamento
          <select
            className="h-mx-10 rounded-mx-lg border border-border-subtle bg-white px-mx-sm text-sm font-bold text-text-primary normal-case"
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
          >
            <option value="todos">Todos os departamentos</option>
            {departments.map(department => (
              <option key={department} value={department}>{department}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-mx-tiny font-black uppercase text-text-tertiary">
          Responsável
          <select
            className="h-mx-10 rounded-mx-lg border border-border-subtle bg-white px-mx-sm text-sm font-bold text-text-primary normal-case"
            value={ownerFilter}
            onChange={(event) => setOwnerFilter(event.target.value)}
          >
            <option value="todos">Todos os responsáveis</option>
            {owners.map(owner => (
              <option key={owner} value={owner}>{owner}</option>
            ))}
          </select>
        </label>
      </div>

      {filteredActions.length === 0 ? (
        <div className="owner-base44-exact__empty-state" role="status">
          <strong className="text-base font-black text-text-primary">Nenhuma ação encontrada</strong>
          <p className="text-sm text-text-secondary">Ajuste os filtros ou cadastre uma nova ação para esta unidade.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-mx-md md:grid-cols-2 xl:grid-cols-5">
          {KANBAN_COLUMNS.map((column) => {
            const columnActions = filteredActions.filter(action => action.status === column.status)
            return (
              <div key={column.status} className="flex flex-col gap-mx-sm">
                <div className="flex items-center justify-between px-mx-xs">
                  <Typography variant="tiny" className="font-black uppercase tracking-widest text-text-tertiary">
                    {column.label}
                  </Typography>
                  <span className="rounded-mx-full bg-surface-alt px-mx-sm py-mx-tiny text-mx-tiny font-black text-text-secondary">
                    {columnActions.length}
                  </span>
                </div>
                <div className="flex flex-col gap-mx-sm">
                  {columnActions.map((action, index) => {
                    const classes = toneClasses[action.tone]
                    return (
                      <Card key={`${action.id}-${index}`} className="rounded-mx-lg border border-border-subtle bg-white p-mx-sm shadow-mx-sm">
                        <span className={cn('inline-flex rounded-mx-md border px-mx-sm py-mx-tiny text-mx-tiny font-black', classes.soft)}>
                          {action.priority}
                        </span>
                        <Typography variant="p" className="mt-mx-xs text-sm font-black leading-tight">{action.problem}</Typography>
                        <Typography variant="tiny" tone="muted" className="mt-mx-tiny block font-bold">{action.department}</Typography>
                        <div className="mt-mx-sm flex items-center justify-between gap-mx-xs text-mx-tiny font-bold text-text-tertiary">
                          <span className="flex min-w-0 items-center gap-1 truncate">
                            <User size={12} /> <span className="truncate">{action.owner}</span>
                          </span>
                          <span className={cn('flex shrink-0 items-center gap-1', classes.text)}>
                            <CalendarDays size={12} /> {action.due || 'Sem prazo'}
                          </span>
                        </div>
                      </Card>
                    )
                  })}
                  {columnActions.length === 0 && (
                    <div className="rounded-mx-lg border border-dashed border-border-subtle p-mx-sm text-center text-mx-tiny font-bold text-text-tertiary">
                      Vazio
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
