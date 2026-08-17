import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, Plus, RefreshCw } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
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
import { toast } from '@/lib/toast'
import { TabNav } from '@/components/molecules/TabNav'
import { useStores } from '@/hooks/useStores'
import { useAuth } from '@/hooks/useAuth'
import { ActionPlanKanban } from './planos-acao/ActionPlanKanban'
import { ActionPlanDetailDrawer } from './planos-acao/ActionPlanDetailDrawer'
import { boardMetrics, type BoardPlan, type PlanStatus } from './planos-acao/actionPlanBoard'
import { ApplyTemplateModal } from './planos-acao/ApplyTemplateModal'
import { ClientActionPlanWizard } from './planos-acao/ClientActionPlanWizard'
import { NewActionChoiceModal } from './planos-acao/NewActionChoiceModal'
import { PromoteToTemplateModal } from './planos-acao/PromoteToTemplateModal'
import { StrategicIndicatorActionSelector } from './planos-acao/StrategicIndicatorActionSelector'
import { SuggestToClientModal } from './planos-acao/SuggestToClientModal'
import { SuggestionsTab } from './planos-acao/SuggestionsTab'
import { ApplicationsTab } from './planos-acao/ApplicationsTab'
import { TemplateFilters } from './planos-acao/TemplateFilters'
import { emptyTemplateFilters, templateMatchesFilters, type TemplateFilterState } from './planos-acao/templateFilterLogic'
import { TemplateFormModal } from './planos-acao/TemplateFormModal'
import { useActionPlanTemplatesController } from './planos-acao/useActionPlanTemplates'
import { useAdminActionPlans } from './hooks/useAdminMxLists'
import {
  fetchWizardClients,
  fetchWizardIndicators,
  fetchWizardResponsibles,
  type WizardClient,
  type WizardIndicator,
  type WizardResponsible,
} from './planos-acao/clientActionPlanWizardData'
import { fetchActionPlanSuggestions, type ActionPlanSuggestion } from './planos-acao/actionPlanSuggestions'

type PlanTab = 'planos' | 'templates' | 'sugestoes' | 'aplicacoes'

const PLAN_TABS = [
  { key: 'planos' as const, label: 'Planos da rede' },
  { key: 'templates' as const, label: 'Biblioteca de templates' },
  { key: 'sugestoes' as const, label: 'Sugestões ao Dono' },
  { key: 'aplicacoes' as const, label: 'Aplicações nos clientes' },
]

const CONCLUDED = new Set(['concluido', 'concluída', 'concluida', 'finalizado'])

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
  const { supabaseUser } = useAuth()
  const [suggestions, setSuggestions] = useState<ActionPlanSuggestion[]>([])
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [view, setView] = useState<'lista' | 'kanban'>('kanban')
  const [openPlan, setOpenPlan] = useState<BoardPlan | null>(null)
  const [choiceOpen, setChoiceOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [suggestTemplate, setSuggestTemplate] = useState<Awaited<ReturnType<typeof useActionPlanTemplatesController>>['rows'][number] | null>(null)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [promoteTarget, setPromoteTarget] = useState<BoardPlan | null>(null)
  const [templateFilters, setTemplateFilters] = useState<TemplateFilterState>(emptyTemplateFilters())
  const [wizardClients, setWizardClients] = useState<WizardClient[]>([])
  const [wizardIndicators, setWizardIndicators] = useState<WizardIndicator[]>([])
  const [wizardResponsibles, setWizardResponsibles] = useState<WizardResponsible[]>([])

  const loadSuggestions = useCallback(async () => {
    setSuggestionsLoading(true)
    const result = await fetchActionPlanSuggestions()
    setSuggestions(result.rows)
    setSuggestionsError(result.error)
    setSuggestionsLoading(false)
  }, [])

  useEffect(() => {
    if (tab === 'sugestoes' && !suggestions.length && !suggestionsError) void loadSuggestions()
  }, [tab, suggestions.length, suggestionsError, loadSuggestions])

  useEffect(() => {
    void Promise.all([fetchWizardClients(), fetchWizardIndicators(), fetchWizardResponsibles()]).then(([c, i, r]) => {
      setWizardClients(c.rows)
      setWizardIndicators(i.rows)
      setWizardResponsibles(r.rows)
    })
  }, [])

  const { lojas } = useStores()
  const location = useLocation()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)

  const statuses = useMemo(() => [...new Set(rows.map(plan => plan.status).filter((value): value is string => Boolean(value)))].sort(), [rows])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter(plan => {
      if (status !== 'todos' && plan.status !== status) return false
      if (!term) return true
      return [plan.codigo, plan.problema, plan.acao, plan.departamento, plan.indicador].some(value => (value ?? '').toLowerCase().includes(term))
    })
  }, [rows, search, status])

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
    responsavel_id: null,
    concluido_at: null,
    scope_id: plan.scope_id,
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
      criticos: rows.filter(plan => (plan.prioridade ?? '').toLowerCase() === 'alta').length,
    }
  }, [rows, boardPlans])

  const openPlanById = (planId: string) => {
    const plan = boardPlans.find(item => item.id === planId) ?? null
    setOpenPlan(plan)
  }

  const handleNewAction = () => setChoiceOpen(true)

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
            <>
              <Button variant="outline" onClick={() => void templates.refetch()}><RefreshCw size={16} />Atualizar</Button>
              <Button onClick={templates.openNew}><Plus size={16} />Novo template</Button>
            </>
          ) : tab === 'aplicacoes' ? (
            <Button onClick={handleNewAction}><Plus size={16} />Nova ação</Button>
          ) : <Button variant="outline" onClick={() => void loadSuggestions()}><RefreshCw size={16} />Atualizar</Button>}
        />

        <TabNav tabs={PLAN_TABS} activeTab={tab} onTabChange={setTab} />

        {tab === 'sugestoes' ? (
          <SuggestionsTab />
        ) : tab === 'aplicacoes' ? (
          <ApplicationsTab onOpenPlan={openPlanById} />
        ) : tab === 'templates' ? (
          templates.loading ? <MxLoadingState label="Carregando templates" /> : templates.error ? <MxErrorState description={templates.error} retry={() => void templates.refetch()} /> : (
            <MxSectionCard>
              <MxSectionHeader
                title="Templates de plano de ação"
                description={`${filteredTemplates.length} template(s) na biblioteca.`}
                actions={<Button variant="outline" size="sm" onClick={templates.openNew}><Plus size={16} />Novo template</Button>}
              />
              <div className="p-5">
                <div className="mb-4">
                  <TemplateFilters
                    templates={templates.rows}
                    indicators={wizardIndicators}
                    filters={templateFilters}
                    onFilterChange={(field: keyof TemplateFilterState, value: string | boolean) => setTemplateFilters(current => ({ ...current, [field]: value }))}
                    onClear={() => setTemplateFilters(emptyTemplateFilters())}
                  />
                </div>
                {filteredTemplates.length ? (
                  <MxTableSurface>
                    <Table className="min-w-[1000px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Template</TableHead>
                          <TableHead>Departamento</TableHead>
                          <TableHead>Indicador</TableHead>
                          <TableHead>Versão publicada</TableHead>
                          <TableHead>Rascunho</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTemplates.map(template => {
                          const published = template.versions.find(version => version.status === 'publicada')
                          const openDraft = template.versions.find(version => version.status === 'rascunho')
                          return (
                            <TableRow key={template.id}>
                              <TableCell>
                                <div className="font-semibold text-foreground">{template.nome}</div>
                                <div className="text-xs text-muted-foreground">{template.template_key}</div>
                              </TableCell>
                              <TableCell>{template.departamento}</TableCell>
                              <TableCell>{template.indicador || '—'}</TableCell>
                              <TableCell>{published ? `v${published.versao}` : '—'}</TableCell>
                              <TableCell>{openDraft ? `v${openDraft.versao}` : '—'}</TableCell>
                              <TableCell>{template.active ? 'Ativo' : 'Inativo'}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" size="sm" onClick={() => void templates.openEdit(template)}>Editar</Button>
                                  {openDraft ? <Button variant="outline" size="sm" onClick={() => void templates.publish(template)}>Publicar</Button> : null}
                                  {published ? <Button size="sm" onClick={() => templates.setApplying(template)}>Aplicar</Button> : null}
                                  {published ? <Button variant="outline" size="sm" onClick={() => { setSuggestTemplate(template); setSuggestOpen(true) }}>Sugerir ao Dono</Button> : null}
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
              <MxMetricCard title="Prioridade alta" value={metrics.criticos} detail="Exigem acompanhamento" icon={ClipboardList} tone="warning" />
            </MxMetricGrid>
            <MxToolbar>
              <MxInput value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por código, problema ou ação" aria-label="Buscar plano de ação" />
              <MxSelect value={status} onChange={event => setStatus(event.target.value)} aria-label="Filtrar por status">
                <option value="todos">Todos os status</option>
                {statuses.map(item => <option key={item} value={item}>{item}</option>)}
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
                            <TableCell>{plan.status || '—'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setOpenPlan(boardPlans.find(item => item.id === plan.id) ?? null)}>Abrir</Button>
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

        <TemplateFormModal
          open={templates.formOpen}
          editing={templates.editing}
          draft={templates.draft}
          submitting={templates.submitting}
          onDraft={templates.setDraft}
          onSubmit={() => void templates.submit()}
          onClose={() => templates.setFormOpen(false)}
        />
        <ActionPlanDetailDrawer plan={openPlan} onClose={() => setOpenPlan(null)} onChanged={() => void refetch()} />
        <ApplyTemplateModal
          open={Boolean(templates.applying)}
          template={templates.applying}
          stores={lojas.map(store => ({ id: store.id, name: store.name }))}
          storeId={templates.applyStoreId}
          submitting={templates.submitting}
          onStore={templates.setApplyStoreId}
          onSubmit={() => void templates.apply()}
          onClose={() => templates.setApplying(null)}
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
        <StrategicIndicatorActionSelector
          open={selectorOpen}
          client={null}
          clients={wizardClients}
          templates={templates.rows}
          indicators={wizardIndicators}
          responsibles={wizardResponsibles}
          stores={lojas.map(store => ({ id: store.id, name: store.name }))}
          onClose={() => setSelectorOpen(false)}
          onCreated={() => { setSelectorOpen(false); void Promise.all([refetch(), templates.refetch()]) }}
        />
        <SuggestToClientModal
          open={suggestOpen}
          template={suggestTemplate}
          clients={wizardClients}
          indicators={wizardIndicators}
          onClose={() => setSuggestOpen(false)}
          onSuggested={() => { setSuggestOpen(false); void loadSuggestions() }}
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
