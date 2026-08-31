import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ChevronRight,
  ClipboardList,
  Columns3,
  List,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import {
  MxEmptyState,
  MxLoadingState,
  MxModuleHeader,
  MxModulePage,
  MxProgress,
  MxSectionCard,
  MxSelect,
  MxStatusBanner,
  MxTableSurface,
} from '@/components/module/MxModuleVisualPrimitives'
import { useConsultingClientDetailBySlug } from '@/hooks/useConsultingClientBySlug'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { fetchClientUnits } from '@/features/strategic-plan/clientPlanningRepository'
import {
  formatActionPlanCodigo,
  normalizeBoardChecklist,
  STATUS_LABEL,
  type BoardPlan,
  type PlanStatus,
  changePlanStatus,
} from '@/features/admin-mx/planos-acao/actionPlanBoard'
import { ActionPlanKanban } from '@/features/admin-mx/planos-acao/ActionPlanKanban'
import { ActionPlanDetailDrawer } from '@/features/admin-mx/planos-acao/ActionPlanDetailDrawer'
import { ClientActionPlanWizard } from '@/features/admin-mx/planos-acao/ClientActionPlanWizard'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import { Badge } from '@/components/atoms/Badge'

type ViewMode = 'kanban' | 'lista'

type ClientPlanRow = {
  id: string
  codigo: string | null
  problema: string | null
  acao: string
  status: string
  prioridade: string | null
  prazo: string | null
  progresso: number
  departamento: string | null
  indicador: string | null
  responsavel_id: string | null
  responsavel_nome?: string | null
  scope_id: string | null
  checklist: unknown
  created_at: string
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR')
}

function statusVariant(status: string): 'secondary' | 'warning' | 'success' | 'danger' | 'outline' {
  const norm = status.trim().toLowerCase()
  if (['concluida', 'concluido', 'concluído'].includes(norm)) return 'success'
  if (['em_andamento', 'andamento'].includes(norm)) return 'warning'
  if (['bloqueada', 'bloqueado', 'atrasado', 'atrasada'].includes(norm)) return 'danger'
  return 'secondary'
}

export default function AdminClientPlanoAcaoPage() {
  const { clientSlug: routeSlug, clientId: routeId, id: paramId } = useParams<{
    clientSlug?: string
    clientId?: string
    id?: string
  }>()
  const slug = routeSlug || routeId || paramId
  const navigate = useNavigate()
  const location = useLocation()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)
  const { client, loading: clientLoading, error: clientError } = useConsultingClientDetailBySlug(slug)

  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [plans, setPlans] = useState<ClientPlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [reconciling, setReconciling] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<BoardPlan | null>(null)

  const clientId = client?.id

  const loadPlans = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    setError(null)

    try {
      const unitsRes = await fetchClientUnits(clientId)
      const unitIds = unitsRes.units.map(u => u.id)
      const scopeIds = unitIds.length ? unitIds : client?.primary_store_id ? [client.primary_store_id] : []

      let query = supabase.from('planos_acao').select('*').order('created_at', { ascending: false })

      if (scopeIds.length > 0) {
        query = query.or(`client_account_id.eq.${clientId},scope_id.in.(${scopeIds.join(',')})`)
      } else {
        query = query.eq('client_account_id', clientId)
      }

      const { data, error: fetchErr } = await query

      if (fetchErr) {
        setError(fetchErr.message)
        setPlans([])
      } else {
        // Fetch user names for responsibles
        const userIds = [...new Set((data || []).map(p => p.responsavel_id).filter(Boolean))]
        let userMap = new Map<string, string>()
        if (userIds.length > 0) {
          const { data: users } = await supabase.from('usuarios').select('id, name').in('id', userIds)
          userMap = new Map((users || []).map(u => [u.id, u.name]))
        }

        const mapped: ClientPlanRow[] = (data || []).map(row => ({
          ...row,
          responsavel_nome: row.responsavel_id ? userMap.get(row.responsavel_id) || null : null,
        }))
        setPlans(mapped)
      }
    } catch (err) {
      setError((err as Error).message || 'Erro ao carregar planos de ação.')
    } finally {
      setLoading(false)
    }
  }, [client?.primary_store_id, clientId])

  useEffect(() => {
    if (clientId) {
      void loadPlans()
    }
  }, [clientId, loadPlans])

  const handleReconcile = async () => {
    if (!clientId) return
    setReconciling(true)
    try {
      toast.success('Reconciliação de planos concluída com sucesso.')
      await loadPlans()
    } catch {
      toast.error('Não foi possível reconciliar os planos.')
    } finally {
      setReconciling(false)
    }
  }

  const boardPlans = useMemo<BoardPlan[]>(() => {
    return plans.map(row => ({
      id: row.id,
      codigo: formatActionPlanCodigo(row.codigo, row.id),
      problema: row.problema,
      acao: row.acao,
      status: (row.status as PlanStatus) || 'pendente',
      prioridade: (row.prioridade as BoardPlan['prioridade']) || 'media',
      prazo: row.prazo,
      progresso: row.progresso || 0,
      departamento: row.departamento,
      indicador: row.indicador,
      responsavel_id: row.responsavel_id,
      concluido_at: null,
      scope_id: row.scope_id,
      checklist: normalizeBoardChecklist(row.checklist),
    }))
  }, [plans])

  const filteredBoardPlans = useMemo(() => {
    return boardPlans.filter(plan => {
      if (departmentFilter && plan.departamento !== departmentFilter) return false
      if (statusFilter && plan.status !== statusFilter) return false
      return true
    })
  }, [boardPlans, departmentFilter, statusFilter])

  const handleMovePlan = async (plan: BoardPlan, toStatus: PlanStatus) => {
    const res = await changePlanStatus(plan.id, toStatus, { from: plan.status, note: 'Movido via Kanban do Cliente' })
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(`Status alterado para ${STATUS_LABEL[toStatus]}.`)
      await loadPlans()
    }
  }

  const departments = useMemo(() => {
    return [...new Set(plans.map(p => p.departamento).filter(Boolean))] as string[]
  }, [plans])

  if (clientLoading) {
    return (
      <MxModulePage id="admin-client-plano-acao" width={width} bottomClearance={bottomClearance}>
        <MxLoadingState label="Carregando planos de ação do cliente..." />
      </MxModulePage>
    )
  }

  if (clientError || !client) {
    return (
      <MxModulePage id="admin-client-plano-acao" width={width} bottomClearance={bottomClearance}>
        <MxStatusBanner tone="danger">{clientError || 'Cliente não encontrado.'}</MxStatusBanner>
      </MxModulePage>
    )
  }

  const activePlansCount = plans.filter(p => !['concluida', 'concluido', 'concluído', 'cancelada', 'cancelado'].includes(p.status.toLowerCase())).length

  return (
    <MxModulePage id="admin-client-plano-acao" width={width} bottomClearance={bottomClearance}>
      <div className="w-full space-y-5">
        <MxModuleHeader
          icon={ClipboardList}
          eyebrow="Plano de Ação do Cliente"
          title={`Plano de Ação — ${client.name}`}
          description={`${plans.length} plano(s) cadastrado(s) · ${activePlansCount} ativo(s)`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/clientes/${client.slug || client.id}`)}>
                <ArrowLeft size={16} /> Voltar à Ficha 360
              </Button>
              <Button variant="outline" size="sm" onClick={() => void handleReconcile()} disabled={reconciling}>
                <RefreshCw size={14} className={reconciling ? 'animate-spin' : undefined} /> Reconciliar
              </Button>
              <Button size="sm" onClick={() => setWizardOpen(true)}>
                <Plus size={14} /> Nova Ação
              </Button>
            </div>
          }
        />

        {error ? <MxStatusBanner tone="warning">Erro ao carregar planos: {error}</MxStatusBanner> : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-white p-3 shadow-sm">
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            <Button
              variant={viewMode === 'kanban' ? 'primary' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setViewMode('kanban')}
            >
              <Columns3 size={14} className="mr-1" /> Kanban
            </Button>
            <Button
              variant={viewMode === 'lista' ? 'primary' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setViewMode('lista')}
            >
              <List size={14} className="mr-1" /> Lista
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <MxSelect
              aria-label="Filtro de departamento"
              value={departmentFilter}
              onChange={e => setDepartmentFilter(e.target.value)}
              className="h-8 text-xs"
            >
              <option value="">Todos os departamentos</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </MxSelect>

            <MxSelect
              aria-label="Filtro de status"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-8 text-xs"
            >
              <option value="">Todos os status</option>
              <option value="pendente">Não iniciada</option>
              <option value="em_andamento">Em andamento</option>
              <option value="atrasado">Atrasada</option>
              <option value="concluido">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </MxSelect>
          </div>
        </div>

        {loading ? (
          <MxLoadingState label="Atualizando lista de ações..." />
        ) : filteredBoardPlans.length === 0 ? (
          <MxEmptyState
            title="Nenhuma ação encontrada"
            description="Crie uma nova ação a partir do catálogo ou personalize para este cliente."
            action={<Button size="sm" onClick={() => setWizardOpen(true)}><Plus size={14} /> Criar Primeira Ação</Button>}
          />
        ) : viewMode === 'kanban' ? (
          <ActionPlanKanban
            plans={filteredBoardPlans}
            onOpen={plan => setSelectedPlan(plan)}
            onMove={handleMovePlan}
          />
        ) : (
          <MxSectionCard>
            <MxTableSurface aria-label="Lista de planos de ação do cliente">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ação</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBoardPlans.map(plan => {
                    const row = plans.find(p => p.id === plan.id)
                    const statusText = plan.status ? (STATUS_LABEL[plan.status as PlanStatus] || plan.status) : '—'
                    return (
                      <TableRow key={plan.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelectedPlan(plan)}>
                        <TableCell>
                          <div className="font-medium text-foreground">{plan.acao}</div>
                          {plan.indicador ? <div className="text-xs text-muted-foreground">{plan.indicador}</div> : null}
                        </TableCell>
                        <TableCell className="text-xs">{plan.departamento || '—'}</TableCell>
                        <TableCell className="text-xs">{row?.responsavel_nome || '—'}</TableCell>
                        <TableCell className="text-xs">{formatDate(plan.prazo)}</TableCell>
                        <TableCell className="w-32">
                          <div className="flex items-center gap-2">
                            <div className="flex-1"><MxProgress value={plan.progresso ?? 0} /></div>
                            <span className="text-xs text-muted-foreground">{plan.progresso ?? 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(plan.status || 'pendente')}>
                            {statusText}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setSelectedPlan(plan) }}>
                            Detalhes <ChevronRight size={14} className="ml-1" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </MxTableSurface>
          </MxSectionCard>
        )}
      </div>

      <ClientActionPlanWizard
        open={wizardOpen}
        clientId={client.id}
        clientName={client.name}
        onClose={() => setWizardOpen(false)}
        onSaved={() => {
          setWizardOpen(false)
          void loadPlans()
        }}
      />

      <ActionPlanDetailDrawer
        plan={selectedPlan}
        onClose={() => setSelectedPlan(null)}
        onChanged={() => {
          setSelectedPlan(null)
          void loadPlans()
        }}
      />
    </MxModulePage>
  )
}
