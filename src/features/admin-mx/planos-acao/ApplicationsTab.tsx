import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, Clock, ExternalLink, TrendingUp, Zap } from 'lucide-react'
import {
  MxEmptyState,
  MxErrorState,
  MxInput,
  MxLoadingState,
  MxMetricCard,
  MxMetricGrid,
  MxProgress,
  MxSectionCard,
  MxSectionHeader,
  MxSelect,
  MxTableSurface,
} from '@/components/module/MxModuleVisualPrimitives'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import {
  applicationMetrics,
  applicationStatusLabel,
  efficacyLabel,
  fetchApplications,
  type ApplicationPlan,
} from './actionPlanApplications'
import { ActionPlanDiagnosticsPanel } from './ActionPlanDiagnosticsPanel'

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR')
}

/**
 * Aplicações de templates nos clientes (Base44 `ApplicationsTab`):
 * acompanhamento por cliente com progresso ponderado e eficácia.
 */
const PRIORITY_OPTIONS = [
  { value: 'critica', label: 'Crítica' },
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Média' },
  { value: 'baixa', label: 'Baixa' },
]

export function ApplicationsTab(props: { onOpenPlan: (planId: string) => void; refreshKey?: number }) {
  const [rows, setRows] = useState<ApplicationPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [responsibleFilter, setResponsibleFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const result = await fetchApplications()
    setRows(result.rows)
    setError(result.error)
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load, props.refreshKey])

  const statuses = useMemo(() => [...new Set([
    'pendente', 'em_andamento', 'atrasado', 'concluido', 'validando_eficacia', 'bloqueada', 'aguardando_decisao', 'cancelada',
    ...rows.map(plan => plan.status).filter(Boolean),
  ])].sort(), [rows])
  const responsibleOptions = useMemo(
    () => [...new Set(rows.map(plan => plan.responsavelName).filter((name): name is string => Boolean(name)))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [rows],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter(plan => {
      if (statusFilter && plan.status !== statusFilter) return false
      if (priorityFilter && plan.prioridade !== priorityFilter) return false
      if (responsibleFilter && plan.responsavelName !== responsibleFilter) return false
      if (!term) return true
      return [plan.clientName, plan.acao, plan.indicador, plan.responsavelName].some(value => (value ?? '').toLowerCase().includes(term))
    })
  }, [priorityFilter, responsibleFilter, rows, search, statusFilter])

  const metrics = useMemo(() => applicationMetrics(rows), [rows])

  return (
    <div className="space-y-5">
      <MxMetricGrid>
        <MxMetricCard title="Planos aplicados" value={metrics.total} detail="A partir de templates" icon={Zap} />
        <MxMetricCard title="Clientes utilizando" value={metrics.clients} detail="Com planos de template ativos" icon={ExternalLink} />
        <MxMetricCard title="Em andamento" value={metrics.emAndamento} detail="Execução em curso" icon={Clock} />
        <MxMetricCard title="Atrasados" value={metrics.atrasadas} detail="Prazo vencido em aberto" icon={ClipboardList} tone="danger" />
        <MxMetricCard title="Concluídos" value={metrics.concluidas} detail="Ciclo encerrado" icon={TrendingUp} tone="success" />
        <MxMetricCard title="Validando eficácia" value={metrics.validando} detail="Aguardando medição de impacto" icon={TrendingUp} tone="info" />
      </MxMetricGrid>

      <ActionPlanDiagnosticsPanel />

      <MxSectionCard>
        <MxSectionHeader title="Aplicações nos clientes" description={`${filtered.length} plano(s) aplicado(s) a partir de templates.`} />
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            <MxInput value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por cliente, plano ou indicador..." aria-label="Buscar aplicação" />
            <MxSelect aria-label="Filtrar por status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="">Todos os status</option>
              {statuses.map(status => <option key={status} value={status}>{applicationStatusLabel(status)}</option>)}
            </MxSelect>
            <MxSelect aria-label="Filtrar por prioridade" value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)}>
              <option value="">Todas as prioridades</option>
              {PRIORITY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </MxSelect>
            <MxSelect aria-label="Filtrar por responsável" value={responsibleFilter} onChange={event => setResponsibleFilter(event.target.value)}>
              <option value="">Todos os responsáveis</option>
              {responsibleOptions.map(name => <option key={name} value={name}>{name}</option>)}
            </MxSelect>
          </div>

          {loading ? <MxLoadingState label="Carregando aplicações" /> : error ? <MxErrorState description={error} retry={() => void load()} /> : filtered.length ? (
            <MxTableSurface>
              <Table className="min-w-[1000px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Plano aplicado</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Indicador</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Eficácia</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(plan => {
                    const efficacy = efficacyLabel(plan.eficacia_score)
                    return (
                      <TableRow key={plan.id}>
                        <TableCell>
                          <div className="font-semibold text-foreground">{plan.clientName || plan.storeName || '—'}</div>
                          {plan.codigo ? <div className="text-xs text-muted-foreground">{plan.codigo}</div> : null}
                        </TableCell>
                        <TableCell className="max-w-[260px]">{plan.acao || plan.problema || '—'}</TableCell>
                        <TableCell>{plan.departamento || '—'}</TableCell>
                        <TableCell className="max-w-[200px]">{plan.indicador || '—'}</TableCell>
                        <TableCell>{plan.responsavelName || '—'}</TableCell>
                        <TableCell>{formatDate(plan.prazo)}</TableCell>
                        <TableCell>{applicationStatusLabel(plan.status)}</TableCell>
                        <TableCell className="w-44">
                          <MxProgress value={plan.progresso} label={`${plan.progresso}%`} />
                        </TableCell>
                        <TableCell>{efficacy ?? <span className="text-xs text-muted-foreground">Não avaliada</span>}</TableCell>
                        <TableCell className="text-right">
                          <button type="button" onClick={() => props.onOpenPlan(plan.id)} className="text-sm font-medium text-primary hover:underline focus-visible:underline focus-visible:outline-none">
                            Abrir
                          </button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </MxTableSurface>
          ) : (
            <MxEmptyState
              title="Nenhuma aplicação encontrada"
              description="Aplique um template a um cliente para acompanhar aqui o progresso e a eficácia."
            />
          )}
        </div>
      </MxSectionCard>
    </div>
  )
}
