import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Plus, RefreshCw } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import {
  MxEmptyState,
  MxErrorState,
  MxInput,
  MxLoadingState,
  MxMetricCard,
  MxMetricGrid,
  MxModuleHeader,
  MxModulePage,
  MxProgress,
  MxSectionCard,
  MxSectionHeader,
  MxSelect,
  MxTableSurface,
  MxToolbar,
} from '@/components/module/MxModuleVisualPrimitives'
import { TabNav } from '@/components/molecules/TabNav'
import { ActionPlanKanban } from './planos-acao/ActionPlanKanban'
import { ActionPlanDetailDrawer } from './planos-acao/ActionPlanDetailDrawer'
import { boardMetrics, fetchBoardPlanById, normalizeBoardChecklist, STATUS_LABEL, type BoardPlan, type PlanStatus } from './planos-acao/actionPlanBoard'
import { ApplyTemplateWizard } from './planos-acao/ApplyTemplateWizard'
import { ClientActionPlanWizard } from './planos-acao/ClientActionPlanWizard'
import { NewActionChoiceModal } from './planos-acao/NewActionChoiceModal'
import { PromoteToTemplateModal } from './planos-acao/PromoteToTemplateModal'
import { SuggestToClientModal } from './planos-acao/SuggestToClientModal'
import { SuggestionsTab } from './planos-acao/SuggestionsTab'
import { ApplicationsTab } from './planos-acao/ApplicationsTab'
import { TemplateFilters } from './planos-acao/TemplateFilters'
import { emptyTemplateFilters, templateMatchesFilters, type TemplateFilterState } from './planos-acao/templateFilterLogic'
import { TemplateWizard } from './planos-acao/TemplateWizard'
import { TemplateActionsMenu, type TemplateLifecycleAction } from './planos-acao/TemplateActionsMenu'
import { DepartmentCards } from './planos-acao/DepartmentCards'
import { TemplateDetailDrawer } from './planos-acao/TemplateDetailDrawer'
import { HistoryTab } from './planos-acao/HistoryTab'
import { fetchIndicatorCatalog, type ActionPlanTemplate, type IndicatorCatalogEntry } from './planos-acao/actionPlanTemplates'
import { useActionPlanTemplatesController } from './planos-acao/useActionPlanTemplates'
import { summarizeTemplate, TEMPLATE_STATUS_LABEL } from './planos-acao/templateTableMetrics'
import { departmentLabel } from './planos-acao/departmentTaxonomy'
import { useAdminActionPlans } from './hooks/useAdminMxLists'
import { toast } from '@/lib/toast'
import {
  fetchWizardClients,
  fetchWizardIndicators,
  fetchWizardResponsibles,
  type WizardClient,
  type WizardIndicator,
  type WizardResponsible,
} from './planos-acao/clientActionPlanWizardData'

type PlanTab = 'planos' | 'templates' | 'sugestoes' | 'aplicacoes' | 'historico'

const PLAN_TABS = [
  { key: 'planos' as const, label: 'Planos da rede' },
  { key: 'templates' as const, label: 'Biblioteca de templates' },
  { key: 'sugestoes' as const, label: 'Sugestões ao Dono' },
  { key: 'aplicacoes' as const, label: 'Aplicações nos clientes' },
  { key: 'historico' as const, label: 'Histórico' },
]

const PLAN_PRIORITY_OPTIONS = [
  { value: 'critica', label: 'Crítica' },
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Média' },
  { value: 'baixa', label: 'Baixa' },
]

const TEMPLATE_STATUS_VARIANT = {
  publicada: 'success',
  rascunho: 'warning',
  inativo: 'outline',
  arquivado: 'danger',
} as const

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR')
}

export function AdminPlanosAcaoGlobalPage() {
  const { rows, loading, error, refetch } = useAdminActionPlans()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('todos')
  const [tab, setTab] = useState<PlanTab>('planos')
  const templates = useActionPlanTemplatesController()
  const [suggestionsRefreshKey, setSuggestionsRefreshKey] = useState(0)
  const [applicationsRefreshKey, setApplicationsRefreshKey] = useState(0)
  const [view, setView] = useState<'lista' | 'kanban'>('kanban')
  const [openPlan, setOpenPlan] = useState<BoardPlan | null>(null)
  const [choiceOpen, setChoiceOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [suggestTemplate, setSuggestTemplate] = useState<Awaited<ReturnType<typeof useActionPlanTemplatesController>>['rows'][number] | null>(null)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [promoteTarget, setPromoteTarget] = useState<BoardPlan | null>(null)
  const [templateFilters, setTemplateFilters] = useState<TemplateFilterState>(emptyTemplateFilters())
  const [detailTemplate, setDetailTemplate] = useState<ActionPlanTemplate | null>(null)
  const [indicatorCatalog, setIndicatorCatalog] = useState<IndicatorCatalogEntry[]>([])
  const [wizardClients, setWizardClients] = useState<WizardClient[]>([])
  const [wizardIndicators, setWizardIndicators] = useState<WizardIndicator[]>([])
  const [wizardResponsibles, setWizardResponsibles] = useState<WizardResponsible[]>([])

  const indicatorLabels = useMemo(() => new Map([
    ...indicatorCatalog.map(indicator => [indicator.code, indicator.label] as const),
    ...wizardIndicators.map(indicator => [indicator.metric_key, indicator.label] as const),
  ]), [indicatorCatalog, wizardIndicators])

  useEffect(() => {
    void Promise.all([fetchWizardClients(), fetchWizardIndicators(), fetchWizardResponsibles()]).then(([c, i, r]) => {
      setWizardClients(c.rows)
      setWizardIndicators(i.rows)
      setWizardResponsibles(r.rows)
    })
  }, [])

  useEffect(() => {
    void fetchIndicatorCatalog().then(result => setIndicatorCatalog(result.rows))
  }, [])

  const location = useLocation()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)

  const statuses = useMemo(() => [...new Set(rows.map(plan => plan.status).filter((value): value is string => Boolean(value)))].sort(), [rows])
  const departments = useMemo(() => [...new Set(rows.map(plan => plan.departamento).filter((value): value is string => Boolean(value)))].sort(), [rows])
  const indicators = useMemo(() => [...new Set(rows.map(plan => plan.indicador).filter((value): value is string => Boolean(value)))].sort(), [rows])
  const responsibleOptions = useMemo(() => wizardResponsibles.filter(responsible => rows.some(plan => plan.responsavel_id === responsible.id)), [rows, wizardResponsibles])
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [indicatorFilter, setIndicatorFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [responsibleFilter, setResponsibleFilter] = useState('')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter(plan => {
      if (status !== 'todos' && plan.status !== status) return false
      if (departmentFilter && plan.departamento !== departmentFilter) return false
      if (indicatorFilter && plan.indicador !== indicatorFilter) return false
      if (priorityFilter && (plan.prioridade ?? '').toLowerCase() !== priorityFilter) return false
      if (responsibleFilter && plan.responsavel_id !== responsibleFilter) return false
      if (!term) return true
      return [plan.codigo, plan.problema, plan.acao, plan.departamento, plan.indicador].some(value => (value ?? '').toLowerCase().includes(term))
    })
  }, [departmentFilter, indicatorFilter, priorityFilter, responsibleFilter, rows, search, status])

  const boardPlans = useMemo<BoardPlan[]>(() => filtered.map(plan => ({
    id: plan.id,
    codigo: plan.codigo,
    problema: plan.problema,
    acao: plan.acao,
    status: (plan.status ?? 'pendente') as PlanStatus,
    prioridade: plan.prioridade,
    prazo: plan.prazo,
    progresso: plan.progresso,
    departamento: plan.departamento,
    indicador: plan.indicador,
    responsavel_id: plan.responsavel_id,
    concluido_at: plan.concluido_at,
    scope_id: plan.scope_id,
    checklist: normalizeBoardChecklist(plan.checklist),
  })), [filtered])

  const filteredTemplates = useMemo(
    () => templates.rows.filter(template => templateMatchesFilters(template, templateFilters)),
    [templates.rows, templateFilters],
  )

  const metrics = useMemo(() => {
    const board = boardMetrics(boardPlans)
    return {
      total: rows.length,
      concluidos: board.concluidas,
      atrasados: board.atrasadas,
      criticos: rows.filter(plan => ['alta', 'critica'].includes((plan.prioridade ?? '').toLowerCase())).length,
    }
  }, [rows, boardPlans])

  const openPlanById = async (planId: string) => {
    const inBoard = boardPlans.find(item => item.id === planId)
    if (inBoard) {
      setOpenPlan(inBoard)
      return
    }
    const result = await fetchBoardPlanById(planId)
    if (result.error || !result.plan) {
      toast.error(result.error ?? 'Não foi possível abrir o plano de ação.')
      return
    }
    setOpenPlan(result.plan)
  }

  const handleNewAction = () => setChoiceOpen(true)

  const handleTemplateLifecycleAction = (
    template: (typeof templates.rows)[number],
    action: TemplateLifecycleAction,
  ) => {
    if (action === 'nova-versao') return void templates.createVersion(template)
    if (action === 'desativar' || action === 'reativar') return void templates.toggleActive(template)
    if (action === 'arquivar') {
      const confirmed = window.confirm(
        `Arquivar "${template.nome}"? O template sairá da operação, mas aplicações já criadas e o histórico serão preservados.`,
      )
      if (confirmed) void templates.archive(template)
    }
  }

  return (
    <MxModulePage id="admin-mx-planos-acao" width={width} bottomClearance={bottomClearance}>
      <div className="w-full space-y-5">
        <MxModuleHeader
          icon={ClipboardList}
          eyebrow="Administração MX"
          title="Planos de ação"
          description="Visão global dos planos de ação da rede: status, prazos e prioridade."
          actions={tab === 'planos' ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => void refetch()}><RefreshCw size={16} />Atualizar</Button>
          <Button onClick={handleNewAction}><Plus size={16} />Nova ação</Button>
          </div>
          ) : tab === 'templates' ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectorOpen(true)}><Plus size={16} />Aplicar a cliente</Button>
              <Button variant="outline" onClick={() => setTab('historico')}>Abrir histórico</Button>
              <Button variant="outline" onClick={() => void templates.refetch()}><RefreshCw size={16} />Atualizar</Button>
              <Button onClick={templates.openNew}><Plus size={16} />Criar plano padrão</Button>
            </div>
          ) : tab === 'aplicacoes' ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setApplicationsRefreshKey(current => current + 1)}><RefreshCw size={16} />Atualizar</Button>
              <Button onClick={handleNewAction}><Plus size={16} />Nova ação</Button>
            </div>
          ) : tab === 'historico' ? null
          : <Button variant="outline" onClick={() => setSuggestionsRefreshKey(current => current + 1)}><RefreshCw size={16} />Atualizar</Button>}
        />

        <TabNav tabs={PLAN_TABS} activeTab={tab} onTabChange={setTab} />

        <div id={`${tab}-panel`} role="tabpanel" aria-labelledby={`${tab}-tab`}>
          {tab === 'sugestoes' ? (
          <SuggestionsTab refreshKey={suggestionsRefreshKey} onChanged={() => { setSuggestionsRefreshKey(current => current + 1); void refetch() }} />
        ) : tab === 'aplicacoes' ? (
          <ApplicationsTab onOpenPlan={openPlanById} refreshKey={applicationsRefreshKey} />
        ) : tab === 'historico' ? (
          <HistoryTab />
        ) : tab === 'templates' ? (
          templates.loading ? <MxLoadingState label="Carregando templates" /> : templates.error ? <MxErrorState description={templates.error} retry={() => void templates.refetch()} /> : (
            <MxSectionCard>
              <MxSectionHeader
                title="Planos padrão de ação"
                description={`${filteredTemplates.length} template(s) na biblioteca.`}
                actions={<Button variant="outline" size="sm" onClick={templates.openNew}><Plus size={16} />Criar plano padrão</Button>}
              />
              <div className="p-5">
                <div className="mb-4">
                  <DepartmentCards
                    templates={templates.rows}
                    indicators={indicatorCatalog}
                    selectedDept={templateFilters.departamento}
                    onSelect={departamento => setTemplateFilters(current => ({ ...current, departamento, indicador: '' }))}
                  />
                </div>
                <div className="mb-4">
                  <TemplateFilters
                    templates={templates.rows}
                    indicators={wizardIndicators}
                    filters={templateFilters}
                    onFilterChange={(field: keyof TemplateFilterState, value: string | boolean) => setTemplateFilters(current => field === 'departamento'
                      ? { ...current, departamento: String(value), indicador: '' }
                      : { ...current, [field]: value })}
                    onClear={() => setTemplateFilters(emptyTemplateFilters())}
                  />
                </div>
                {filteredTemplates.length ? (
                  <MxTableSurface>
                    <Table className="min-w-[1240px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Plano padrão</TableHead>
                          <TableHead>Departamento</TableHead>
                          <TableHead>Indicador</TableHead>
                          <TableHead>Ações</TableHead>
                          <TableHead>Prioridade</TableHead>
                          <TableHead>Resp.</TableHead>
                          <TableHead>Sug.</TableHead>
                          <TableHead>Apl.</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Versão</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTemplates.map(template => {
                          const summary = summarizeTemplate(template)
                          const published = template.versions.find(version => version.status === 'publicada')
                          const openDraft = template.versions.find(version => version.status === 'rascunho')
                          return (
                            <TableRow key={template.id}>
                              <TableCell>
                                <div className="font-semibold text-foreground">{template.nome}</div>
                                <div className="text-xs text-muted-foreground">{template.template_key}</div>
                              </TableCell>
                              <TableCell>{departmentLabel(template.departamento)}</TableCell>
                              <TableCell>{indicatorLabels.get(template.indicador ?? '') ?? (template.indicador || '—')}</TableCell>
                              <TableCell>{summary.actions}</TableCell>
                              <TableCell>{summary.priority}</TableCell>
                              <TableCell>{summary.responsibleRole}</TableCell>
                              <TableCell>{summary.suggestion}</TableCell>
                              <TableCell>{summary.applications}</TableCell>
                              <TableCell><Badge variant={TEMPLATE_STATUS_VARIANT[summary.status]}>{TEMPLATE_STATUS_LABEL[summary.status]}</Badge></TableCell>
                              <TableCell>{summary.version ? `v${summary.version}` : '—'}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" size="sm" onClick={() => setDetailTemplate(template)}>Abrir</Button>
                                  <Button variant="outline" size="sm" onClick={() => void templates.openEdit(template)}>Editar</Button>
                                  {openDraft ? <Button variant="outline" size="sm" onClick={() => void templates.publish(template)}>Publicar</Button> : null}
                                  {published && template.active && template.manual_application_enabled ? <Button size="sm" onClick={() => templates.setApplying(template)}>Aplicar a cliente</Button> : null}
                                  {published && template.active ? <Button variant="outline" size="sm" onClick={() => { setSuggestTemplate(template); setSuggestOpen(true) }}>Sugerir ao Dono</Button> : null}
                                  <TemplateActionsMenu
                                    template={template}
                                    disabled={templates.submitting}
                                    onAction={action => handleTemplateLifecycleAction(template, action)}
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </MxTableSurface>
                ) : (
                  <MxEmptyState
                    title="Nenhum template encontrado"
                    description="Crie um template ou ajuste os filtros para padronizar planos entre clientes."
                    action={<Button onClick={templates.openNew}><Plus size={16} />Novo template</Button>}
                  />
                )}
              </div>
            </MxSectionCard>
          )
          ) : loading ? <MxLoadingState label="Carregando planos de ação" /> : error ? <MxErrorState description={error} retry={() => void refetch()} /> : (
          <>
            <MxMetricGrid>
              <MxMetricCard title="Planos" value={metrics.total} detail="Últimos 500 registros" icon={ClipboardList} />
              <MxMetricCard title="Concluídos" value={metrics.concluidos} detail="Ciclo encerrado" icon={ClipboardList} tone="success" />
              <MxMetricCard title="Atrasados" value={metrics.atrasados} detail="Prazo vencido em aberto" icon={ClipboardList} tone="danger" />
              <MxMetricCard title="Prioridade alta ou crítica" value={metrics.criticos} detail="Exigem acompanhamento" icon={ClipboardList} tone="warning" />
            </MxMetricGrid>
            <MxToolbar>
              <MxInput value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por código, problema ou ação" aria-label="Buscar plano de ação" />
              <MxSelect value={status} onChange={event => setStatus(event.target.value)} aria-label="Filtrar por status">
                <option value="todos">Todos os status</option>
                {statuses.map(item => <option key={item} value={item}>{STATUS_LABEL[item as PlanStatus] ?? item}</option>)}
              </MxSelect>
              <MxSelect value={departmentFilter} onChange={event => setDepartmentFilter(event.target.value)} aria-label="Filtrar por departamento">
                <option value="">Todos os departamentos</option>
                {departments.map(item => <option key={item} value={item}>{item}</option>)}
              </MxSelect>
              <MxSelect value={indicatorFilter} onChange={event => setIndicatorFilter(event.target.value)} aria-label="Filtrar por indicador">
                <option value="">Todos os indicadores</option>
                {indicators.map(item => <option key={item} value={item}>{item}</option>)}
              </MxSelect>
              <MxSelect value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)} aria-label="Filtrar por prioridade">
                <option value="">Todas as prioridades</option>
                {PLAN_PRIORITY_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
              </MxSelect>
              <MxSelect value={responsibleFilter} onChange={event => setResponsibleFilter(event.target.value)} aria-label="Filtrar por responsável">
                <option value="">Todos os responsáveis</option>
                {responsibleOptions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </MxSelect>
              <MxSelect value={view} onChange={event => setView(event.target.value as 'lista' | 'kanban')} aria-label="Modo de visualização">
                <option value="kanban">Kanban</option>
                <option value="lista">Lista</option>
              </MxSelect>
            </MxToolbar>
            {view === 'kanban' ? (
              <MxSectionCard>
                <MxSectionHeader title="Board da rede" description={`${filtered.length} plano(s) no board. Clique num card para abrir o detalhe.`} />
                <div className="p-5"><ActionPlanKanban plans={boardPlans} onOpen={setOpenPlan} /></div>
              </MxSectionCard>
            ) : (
            <MxSectionCard>
              <MxSectionHeader title="Planos de ação da rede" description={`${filtered.length} plano(s) visível(is).`} />
              <div className="p-5">
                {filtered.length ? (
                  <MxTableSurface>
                    <Table className="min-w-[900px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Plano</TableHead>
                          <TableHead>Departamento</TableHead>
                          <TableHead>Indicador</TableHead>
                          <TableHead>Prazo</TableHead>
                          <TableHead>Prioridade</TableHead>
                          <TableHead>Progresso</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map(plan => (
                          <TableRow key={plan.id}>
                            <TableCell>
                              <div className="font-semibold text-foreground">{plan.codigo || 'Sem código'}</div>
                              <div className="text-xs text-muted-foreground">{plan.acao || plan.problema || 'Sem descrição'}</div>
                            </TableCell>
                            <TableCell>{plan.departamento || '—'}</TableCell>
                            <TableCell>{plan.indicador || '—'}</TableCell>
                            <TableCell>{formatDate(plan.prazo)}</TableCell>
                            <TableCell>{plan.prioridade || '—'}</TableCell>
                            <TableCell className="w-40"><MxProgress value={plan.progresso ?? 0} label={`${plan.progresso ?? 0}%`} /></TableCell>
                            <TableCell>{STATUS_LABEL[plan.status as PlanStatus] ?? plan.status ?? '—'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => void openPlanById(plan.id)}>Abrir</Button>
                                <Button variant="outline" size="sm" onClick={() => setPromoteTarget(boardPlans.find(item => item.id === plan.id) ?? null)}>Virar template</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </MxTableSurface>
                ) : <MxEmptyState variant="filter" title="Nenhum plano encontrado" description="Ajuste a busca ou o filtro de status." />}
              </div>
            </MxSectionCard>
            )}
          </>
          )}
        </div>

        <TemplateWizard
          open={templates.formOpen}
          editing={templates.editing}
          draft={templates.draft}
          submitting={templates.submitting}
          onDraft={templates.setDraft}
          onSubmit={() => void templates.submit()}
          onPublish={() => void templates.submitAndPublish()}
          onClose={() => templates.setFormOpen(false)}
        />
        <TemplateDetailDrawer
          template={detailTemplate}
          submitting={templates.submitting}
          onClose={() => setDetailTemplate(null)}
          onEdit={template => { setDetailTemplate(null); void templates.openEdit(template) }}
          onPublish={template => { setDetailTemplate(null); void templates.publish(template) }}
          onCreateVersion={template => { setDetailTemplate(null); void templates.createVersion(template) }}
          onToggleActive={template => { setDetailTemplate(null); void templates.toggleActive(template) }}
          onArchive={template => { setDetailTemplate(null); void templates.archive(template) }}
          onApply={template => { setDetailTemplate(null); templates.setApplying(template) }}
          onSuggest={template => { setDetailTemplate(null); setSuggestTemplate(template); setSuggestOpen(true) }}
        />
        <ActionPlanDetailDrawer plan={openPlan} onClose={() => setOpenPlan(null)} onChanged={() => void refetch()} />
        <ApplyTemplateWizard
          open={Boolean(templates.applying) || selectorOpen}
          template={templates.applying}
          templates={templates.rows}
          clients={wizardClients}
          indicators={wizardIndicators}
          responsibles={wizardResponsibles}
          onClose={() => { templates.setApplying(null); setSelectorOpen(false) }}
          onCreated={() => { templates.setApplying(null); setSelectorOpen(false); setApplicationsRefreshKey(current => current + 1); void Promise.all([refetch(), templates.refetch()]) }}
        />
        <NewActionChoiceModal
          open={choiceOpen}
          onClose={() => setChoiceOpen(false)}
          onUseTemplate={() => { setChoiceOpen(false); setSelectorOpen(true); }}
          onCreateCustom={() => { setChoiceOpen(false); setWizardOpen(true); }}
        />
        <ClientActionPlanWizard
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          onSaved={() => void refetch()}
        />
        <SuggestToClientModal
          open={suggestOpen}
          template={suggestTemplate}
          clients={wizardClients}
          indicators={wizardIndicators}
          onClose={() => setSuggestOpen(false)}
          onSuggested={() => { setSuggestOpen(false); setSuggestionsRefreshKey(current => current + 1) }}
        />
        <PromoteToTemplateModal
          open={Boolean(promoteTarget)}
          planId={promoteTarget?.id ?? null}
          planTitle={promoteTarget?.acao ?? null}
          onClose={() => setPromoteTarget(null)}
          onPromoted={() => void templates.refetch()}
        />
      </div>
    </MxModulePage>
  )
}

export default AdminPlanosAcaoGlobalPage
