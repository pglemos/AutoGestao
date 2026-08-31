import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, CircleAlert, CircleCheck, ClipboardList, ExternalLink, Gauge, Plus, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/atoms/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import {
  MxEmptyState,
  MxMetricCard,
  MxMetricGrid,
  MxProgress,
  MxSectionCard,
  MxSectionHeader,
  MxStatusBanner,
  MxTableSurface,
} from '@/components/module/MxModuleVisualPrimitives'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { fetchClientUnits } from '@/features/strategic-plan/clientPlanningRepository'
import {
  actionPlanStatusLabel,
  collapseClientActionPlanRows,
  summarizeClientActionPlans,
  type ClientActionPlanRow,
} from './clientActionPlanContext'
import { toast } from '@/lib/toast'
import {
  changePlanStatus,
  formatActionPlanCodigo,
  normalizeBoardChecklist,
  resolveBoardColumn,
  STATUS_LABEL,
  type BoardPlan,
  type PlanStatus,
} from '@/features/admin-mx/planos-acao/actionPlanBoard'
import { ActionPlanDetailDrawer } from '@/features/admin-mx/planos-acao/ActionPlanDetailDrawer'
import { ActionPlanKanban } from '@/features/admin-mx/planos-acao/ActionPlanKanban'
import { reconcileClientActionPlanDuplicates } from './clientActionPlanReconciliation'

type Props = {
  clientId: string
  clientSlug?: string | null
  primaryStoreId?: string | null
  refreshKey?: number
  onCreatePlan: () => void
}

type Responsible = { id: string; name: string | null }
type PanelView = 'quadro' | 'lista'

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR')
}

function statusTone(status: string): string {
  const normalized = status.trim().toLowerCase()
  if (['concluida', 'concluído', 'concluido'].includes(normalized)) return 'bg-status-success-surface text-status-success-text'
  if (['bloqueada', 'bloqueado', 'atrasado'].includes(normalized)) return 'bg-status-error-surface text-status-error-text'
  if (['cancelada', 'cancelado'].includes(normalized)) return 'bg-surface-alt text-muted-foreground'
  return 'bg-status-warning-surface text-status-warning-text'
}

function toBoardPlan(row: ClientActionPlanRow): BoardPlan {
  return {
    id: row.id,
    codigo: formatActionPlanCodigo(row.codigo, row.id),
    problema: null,
    acao: row.acao,
    status: row.status as PlanStatus,
    prioridade: null,
    prazo: row.prazo,
    progresso: row.progresso,
    departamento: row.departamento,
    indicador: row.indicador,
    responsavel_id: row.responsavel_id,
    concluido_at: null,
    scope_id: row.scope_id,
    checklist: normalizeBoardChecklist(row.checklist),
    linkedPlanIds: row.linked_plan_ids,
  }
}

export function ClientActionPlanContextPanel({ clientId, clientSlug, primaryStoreId, refreshKey = 0, onCreatePlan }: Props) {
  const { supabaseUser } = useAuth()
  const [rows, setRows] = useState<ClientActionPlanRow[]>([])
  const [responsibles, setResponsibles] = useState<Responsible[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<BoardPlan | null>(null)
  const [panelView, setPanelView] = useState<PanelView>('quadro')
  const [reconciling, setReconciling] = useState(false)
  const [scopeIds, setScopeIds] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const unitsResult = await fetchClientUnits(clientId)
    const unitIds = unitsResult.units.map(unit => unit.id)
    const scopeIds = unitIds.length ? unitIds : primaryStoreId ? [primaryStoreId] : []

    if (!scopeIds.length) {
      setRows([])
      setResponsibles([])
      setScopeIds([])
      setError(unitsResult.error)
      setLoading(false)
      return
    }

    setScopeIds(scopeIds)
    const { data, error: plansError } = await supabase
      .from('planos_acao')
      .select('id, codigo, acao, objetivo, indicador, departamento, prazo, status, progresso, scope_id, scope_type, responsavel_id, updated_at, checklist, origem_ref_id, transition_metadata')
      .eq('scope_type', 'store')
      .in('scope_id', scopeIds)
      .order('updated_at', { ascending: false })
      .limit(300)

    if (plansError) {
      setRows([])
      setResponsibles([])
      setError(plansError.message)
      setLoading(false)
      return
    }

    const unitNames = new Map(unitsResult.units.map(unit => [unit.id, unit.name]))
    if (primaryStoreId && !unitNames.has(primaryStoreId)) unitNames.set(primaryStoreId, 'Matriz operacional')
    const planRows = collapseClientActionPlanRows(
      ((data ?? []) as Array<Omit<ClientActionPlanRow, 'scope_name'> & { scope_type: string }>).map(row => ({
        ...row,
        scope_name: unitNames.get(row.scope_id) ?? 'Unidade não identificada',
      })),
    )
    const responsibleIds = [...new Set(planRows.map(row => row.responsavel_id).filter((id): id is string => Boolean(id)))]
    const peopleResult = responsibleIds.length
      ? await supabase.from('usuarios').select('id, name').in('id', responsibleIds)
      : { data: [] as Responsible[], error: null }

    setRows(planRows)
    setResponsibles((peopleResult.data ?? []) as Responsible[])
    setError(unitsResult.error ?? peopleResult.error?.message ?? null)
    setLoading(false)
  }, [clientId, primaryStoreId])

  useEffect(() => { void load() }, [load, refreshKey])

  const summary = useMemo(() => summarizeClientActionPlans(rows), [rows])
  const responsibleNames = useMemo(() => new Map(responsibles.map(person => [person.id, person.name ?? 'Sem nome'])), [responsibles])
  const boardPlans = useMemo(() => rows.map(toBoardPlan), [rows])

  const handleKanbanMove = useCallback(async (plan: BoardPlan, toStatus: PlanStatus) => {
    if (toStatus === 'atrasado') {
      toast.info('A coluna Atrasada é definida pelo prazo. Ajuste o prazo no detalhe do plano.')
      setSelectedPlan(plan)
      return
    }
    if (toStatus === 'concluido') {
      toast.info('Abra o detalhe para concluir com data efetiva e checklist.')
      setSelectedPlan(plan)
      return
    }
    const from = (plan.status ?? 'pendente') as PlanStatus
    const ids = [...new Set((plan.linkedPlanIds?.length ? plan.linkedPlanIds : [plan.id]).filter(Boolean))]
    for (const id of ids) {
      const result = await changePlanStatus(id, toStatus, {
        from,
        note: 'Movido pelo quadro Admin',
        checklist: plan.checklist,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
    }
    toast.success(`Plano movido para ${STATUS_LABEL[toStatus].toLowerCase()}.`)
    void load()
  }, [load])

  const handleReconcile = useCallback(async () => {
    if (reconciling || !supabaseUser || !scopeIds.length) return
    setReconciling(true)
    try {
      const result = await reconcileClientActionPlanDuplicates(scopeIds, supabaseUser.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (result.reconciled > 0) {
        toast.success(`${result.reconciled} duplicata(s) reconciliada(s).`)
        void load()
      } else {
        toast.info('Nenhuma duplicata para reconciliar neste cliente.')
      }
    } finally {
      setReconciling(false)
    }
  }, [load, reconciling, scopeIds, supabaseUser])


  if (loading) return <MxSectionCard><div className="p-5"><div className="text-sm text-muted-foreground">Carregando planos de ação do cliente…</div></div></MxSectionCard>

  return (
    <div className="space-y-5">
      <MxMetricGrid>
        <MxMetricCard title="Planos do cliente" value={summary.total} detail="Matriz e filiais" icon={ClipboardList} />
        <MxMetricCard title="Em aberto" value={summary.open} detail="Acompanhar na rotina" icon={Gauge} tone="info" />
        <MxMetricCard title="Bloqueados" value={summary.blocked} detail="Exigem decisão" icon={CircleAlert} tone="danger" />
        <MxMetricCard title="Progresso médio" value={`${summary.averageProgress}%`} detail={`${summary.completed} concluído(s) · ${summary.cancelled} cancelado(s)`} icon={CircleCheck} tone="success" />
      </MxMetricGrid>

      <MxSectionCard>
        <MxSectionHeader
          title="Plano de Ação do cliente"
          description="A execução fica junto do cliente, com o escopo da matriz e das filiais identificado em cada linha."
          actions={(
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex rounded-md border border-border p-0.5" role="group" aria-label="Visualização do plano de ação">
                <Button
                  type="button"
                  size="sm"
                  variant={panelView === 'quadro' ? 'primary' : 'ghost'}
                  onClick={() => setPanelView('quadro')}
                >
                  Kanban
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={panelView === 'lista' ? 'primary' : 'ghost'}
                  onClick={() => setPanelView('lista')}
                >
                  Lista
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={() => void handleReconcile()} disabled={reconciling || !scopeIds.length}>
                <Wrench size={14} />{reconciling ? 'Reconciliando...' : 'Reconciliar'}
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to={clientSlug
                  ? `/clientes/${encodeURIComponent(clientSlug)}/plano-acao?clientId=${encodeURIComponent(clientId)}${primaryStoreId ? `&storeId=${encodeURIComponent(primaryStoreId)}` : ''}`
                  : `/plano-acao?clientId=${encodeURIComponent(clientId)}${primaryStoreId ? `&storeId=${encodeURIComponent(primaryStoreId)}` : ''}`
                }><ExternalLink size={14} />Abrir plano completo</Link>
              </Button>
              <Button size="sm" onClick={onCreatePlan}><Plus size={14} />Nova Ação</Button>
            </div>
          )}
        />

        <div className="space-y-4 p-5">
          {error ? <MxStatusBanner tone="warning">Leitura parcial do Plano de Ação: {error}</MxStatusBanner> : null}
          {!rows.length ? (
            <MxEmptyState
              title="Nenhum plano de ação neste cliente"
              description="Crie uma ação a partir do indicador do cliente para acompanhar problema, responsável, prazo e execução aqui."
              action={<Button onClick={onCreatePlan}><Plus size={16} />Criar plano de ação</Button>}
            />
          ) : panelView === 'quadro' ? (
            <ActionPlanKanban plans={boardPlans} onOpen={setSelectedPlan} onMove={handleKanbanMove} />
          ) : (
            <MxTableSurface>
              <Table className="min-w-[1120px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Ação e objetivo</TableHead>
                    <TableHead>Indicador / departamento</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Atualizado</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(row => {
                    const resolvedStatus = resolveBoardColumn({ status: row.status as PlanStatus, prazo: row.prazo })
                    const statusLabel = STATUS_LABEL[resolvedStatus] ?? actionPlanStatusLabel(row.status)
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-semibold text-foreground">{formatActionPlanCodigo(row.codigo, row.id)}</TableCell>
                        <TableCell className="max-w-[280px]">
                          <button type="button" className="text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" onClick={() => setSelectedPlan(toBoardPlan(row))}>
                            <span className="block font-semibold text-foreground">{row.acao || 'Plano sem título'}</span>
                            {row.objetivo ? <span className="mt-1 block text-xs text-muted-foreground">{row.objetivo}</span> : null}
                          </button>
                        </TableCell>
                        <TableCell>
                          <span className="block text-sm text-foreground">{row.indicador || '—'}</span>
                          <span className="block text-xs text-muted-foreground">{row.departamento || 'Sem departamento'}</span>
                        </TableCell>
                        <TableCell><span className="inline-flex items-center gap-1.5 text-sm"><Building2 size={14} className="text-primary" />{row.scope_name}</span></TableCell>
                        <TableCell>{row.responsavel_id ? responsibleNames.get(row.responsavel_id) ?? 'Usuário interno' : 'Não definido'}</TableCell>
                        <TableCell>{formatDate(row.prazo)}</TableCell>
                        <TableCell>
                          <div className="space-y-1.5">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone(resolvedStatus)}`}>{statusLabel}</span>
                            <MxProgress value={row.progresso} label={`${row.progresso}%`} />
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(row.updated_at)}</TableCell>
                        <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => setSelectedPlan(toBoardPlan(row))}>Abrir</Button></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </MxTableSurface>
          )}
        </div>
      </MxSectionCard>

      <ActionPlanDetailDrawer
        plan={selectedPlan}
        onClose={() => setSelectedPlan(null)}
        onChanged={() => { void load() }}
      />
    </div>
  )
}
