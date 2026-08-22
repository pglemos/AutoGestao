import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  Crown,
  Link2,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  UserPlus,
} from 'lucide-react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import { TabNav } from '@/components/molecules/TabNav'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import {
  MxEmptyState,
  MxErrorState,
  MxLoadingState,
  MxMetricCard,
  MxMetricGrid,
  MxModuleHeader,
  MxModulePage,
  MxProgress,
  MxSectionCard,
  MxSectionHeader,
  MxStatusBanner,
  MxTableSurface,
} from '@/components/module/MxModuleVisualPrimitives'
import { useConsultingClientDetailBySlug } from '@/hooks/useConsultingClientBySlug'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { ClientActivationModal } from './clientes/ClientActivationModal'
import { ClientDadosTab, ClientHistoricoTab, ClientImplantacaoTab } from './clientes/ClientHealthTabs'
import { buildProgressBars } from './clientes/clientProgress'
import { useClientHealth } from './clientes/useClientHealth'
import { runClientRepair, type RepairKey } from './clientes/clientRepairs'
import { buildClientReadiness, readinessSummary, type ClientReadinessInput } from './clientes/clientReadiness'
import { buildPublicationCardFromRows } from '@/features/strategic-plan/planCycle'
import { fetchClientProductPackage, fetchClientUnits, fetchUnitsPlanningValues } from '@/features/strategic-plan/clientPlanningRepository'
import { fetchCurrentCycle } from '@/features/strategic-plan/planCycleRepository'
import { createStrategicPlanFromProduct } from '@/features/strategic-plan/productPackageOps'
import { ClientConfigTab } from './clientes/ClientConfigTab'
import { ClientActionPlanContextPanel } from './clientes/ClientActionPlanContextPanel'
import { fetchClientActionPlanSummary, type ClientActionPlanSummary } from './clientes/clientActionPlanContext'
import { DonoMasterCard } from './clientes/DonoMasterCard'
import { EnrollmentLinkModal } from './clientes/EnrollmentLinkModal'
import { PersonCreateModal } from './clientes/PersonCreateModal'
import { ProgramCard } from './clientes/ProgramCard'
import { ProgramEditModal } from './clientes/ProgramEditModal'
import { ClientPlanningContextPanel } from './clientes/ClientPlanningContextPanel'
import { StoreFormModal } from './clientes/StoreFormModal'
import { StoreOperatingHoursEditor } from './clientes/StoreOperatingHoursEditor'
import {
  createClientPerson,
  fetchClientPersons,
  setClientDonoMaster,
  updateClientPerson,
  type PersonAccessRow,
} from './clientes/personMutations'
import { personToAccessDraft, resolveOwnerMaster, type PersonAccessDraft, type OwnerMasterResolution } from './clientes/personAccess'
import { DonoMasterPickerModal } from './clientes/DonoMasterPickerModal'
import { createEnrollmentLink, listEnrollmentLinks, type EnrollmentLinkRow } from './clientes/enrollmentMutations'
import { buildProgramSummary } from './clientes/programSummary'
import { buildClientJourney } from './clientes/clientJourney'
import { saveClientProgram, type ProgramDraft } from './clientes/programMutations'
import { emptyStoreDraft, type StoreDraft } from './clientes/storeForm'
import { deleteOrphanTestUnits, ensureOperationalUnitRows, fetchUnitOperatingHours, saveClientStore, type UnitRow } from './clientes/storeMutations'
import { useAdminConsultingProducts, useAdminTeam } from './hooks/useAdminMxLists'
import { resolveVisitVolumeRule } from './clientes/visitVolumeRule'
import { ClientActionPlanWizard } from './planos-acao/ClientActionPlanWizard'
import { groupPeopleByStore, isOrphanTestUnit, mergeOperationalUnits } from './clientes/mergeClientPeople'
import { canonicalPortfolioStatus, parentClientOf, PORTFOLIO_STATUS_LABEL } from './clientes/clientPortfolio'

type ClientTab = 'visao' | 'lojas' | 'pessoas' | 'jornada' | 'implantacao' | 'planejamento' | 'operacao' | 'dados'
type PlanningTab = 'estrategico' | 'plano-acao'
type OperationTab = 'modulos' | 'configuracoes'
type DataTab = 'dados' | 'historico'

// Oito áreas principais. As abas legadas continuam disponíveis como subáreas,
// para preservar links existentes sem deixar a Visão 360 fragmentada.
const TABS = [
  { key: 'visao' as const, label: 'Visão geral' },
  { key: 'lojas' as const, label: 'Empresa e lojas' },
  { key: 'pessoas' as const, label: 'Pessoas e acessos' },
  { key: 'jornada' as const, label: 'Programa e jornada' },
  { key: 'implantacao' as const, label: 'Implantação e aderência' },
  { key: 'planejamento' as const, label: 'Planejamento e ações' },
  { key: 'operacao' as const, label: 'Módulos e configurações' },
  { key: 'dados' as const, label: 'Dados e histórico' },
]

const PLANNING_TABS = [
  { key: 'estrategico' as const, label: 'Plano Estratégico' },
  { key: 'plano-acao' as const, label: 'Plano de Ação' },
]

const OPERATION_TABS = [
  { key: 'modulos' as const, label: 'Módulos e acessos' },
  { key: 'configuracoes' as const, label: 'Configurações' },
]

const DATA_TABS = [
  { key: 'dados' as const, label: 'Dados e integridade' },
  { key: 'historico' as const, label: 'Histórico e auditoria' },
]

function resolveInitialDetailTab(requestedTab: string | null): {
  tab: ClientTab
  planningTab: PlanningTab
  operationTab: OperationTab
  dataTab: DataTab
} {
  if (requestedTab === 'estrategico') return { tab: 'planejamento', planningTab: 'estrategico', operationTab: 'modulos', dataTab: 'dados' }
  if (requestedTab === 'plano-acao') return { tab: 'planejamento', planningTab: 'plano-acao', operationTab: 'modulos', dataTab: 'dados' }
  if (requestedTab === 'modulos') return { tab: 'operacao', planningTab: 'estrategico', operationTab: 'modulos', dataTab: 'dados' }
  if (requestedTab === 'configuracoes') return { tab: 'operacao', planningTab: 'estrategico', operationTab: 'configuracoes', dataTab: 'dados' }
  if (requestedTab === 'historico') return { tab: 'dados', planningTab: 'estrategico', operationTab: 'modulos', dataTab: 'historico' }
  const tab = TABS.some(entry => entry.key === requestedTab) ? requestedTab as ClientTab : 'visao'
  return { tab, planningTab: 'estrategico', operationTab: 'modulos', dataTab: 'dados' }
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR')
}

function formatClientStatus(value: string | null | undefined) {
  const normalized = String(value ?? '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')
  const labels: Record<string, string> = {
    ativo: 'Ativo',
    active: 'Ativo',
    inativo: 'Inativo',
    inactive: 'Inativo',
    em_implantacao: 'Em implantação',
    ativo_em_implantacao: 'Ativo em Implantação',
    ativacao_programada: 'Ativação Programada',
    bloqueado: 'Bloqueado',
    suspenso: 'Suspenso',
    suspended: 'Suspenso',
    encerrado: 'Encerrado',
    closed: 'Encerrado',
    arquivado: 'Arquivado',
  }
  if (Object.prototype.hasOwnProperty.call(labels, normalized)) return labels[normalized]
  return value?.trim() || 'Indefinido'
}

export function AdminClienteDetalhePage() {
  const { clientSlug } = useParams<{ clientSlug: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)
  const { client, loading, error, refetch } = useConsultingClientDetailBySlug(clientSlug)
  const { supabaseUser } = useAuth()
  const products = useAdminConsultingProducts()
  const team = useAdminTeam()
  const [searchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const initialTabState = resolveInitialDetailTab(requestedTab)
  const [tab, setTabState] = useState<ClientTab>(initialTabState.tab)
  const [planningTab, setPlanningTab] = useState<PlanningTab>(initialTabState.planningTab)
  const [operationTab, setOperationTab] = useState<OperationTab>(initialTabState.operationTab)
  const [dataTab, setDataTab] = useState<DataTab>(initialTabState.dataTab)

  const setTab = (next: ClientTab) => setTabState(next)

  useEffect(() => {
    const next = resolveInitialDetailTab(requestedTab)
    setTabState(next.tab)
    setPlanningTab(next.planningTab)
    setOperationTab(next.operationTab)
    setDataTab(next.dataTab)
  }, [requestedTab])
  const [storeTaken, setStoreTaken] = useState(false)
  const [activationOpen, setActivationOpen] = useState(false)
  const [activating, setActivating] = useState(false)

  // Programa contratado
  const [programModalOpen, setProgramModalOpen] = useState(false)
  const [savingProgram, setSavingProgram] = useState(false)
  const [actionPlanWizardOpen, setActionPlanWizardOpen] = useState(false)
  const [actionPlanRefreshKey, setActionPlanRefreshKey] = useState(0)
  const [actionPlanSummary, setActionPlanSummary] = useState<ClientActionPlanSummary | null>(null)

  // Lojas: CRUD + horários
  const [units, setUnits] = useState<UnitRow[]>([])
  const [storeModal, setStoreModal] = useState<{ open: boolean; initial: StoreDraft | null }>({ open: false, initial: null })
  const [hoursUnitId, setHoursUnitId] = useState<string | null>(null)
  const [savingStore, setSavingStore] = useState(false)

  // Pessoas e acessos
  const [persons, setPersons] = useState<PersonAccessRow[]>([])
  const [personStores, setPersonStores] = useState<Array<{ id: string; name: string; parent_loja_id?: string | null }>>([])
  const [personModal, setPersonModal] = useState(false)
  const [personPrefill, setPersonPrefill] = useState<Partial<PersonAccessDraft> | null>(null)
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null)
  const [masterPickerOpen, setMasterPickerOpen] = useState(false)
  const [savingPerson, setSavingPerson] = useState(false)
  const [linkModal, setLinkModal] = useState(false)
  const [links, setLinks] = useState<EnrollmentLinkRow[]>([])
  const [strategicPlanReadiness, setStrategicPlanReadiness] = useState<ClientReadinessInput['strategic_plan_ready']>(null)
  const [creatingStrategicPlan, setCreatingStrategicPlan] = useState(false)
  const [savingLink, setSavingLink] = useState(false)

  const checkStore = useCallback(async () => {
    if (!client?.primary_store_id || !client.id) {
      setStoreTaken(false)
      return
    }
    const { data } = await supabase
      .from('clientes_consultoria')
      .select('id, status')
      .eq('primary_store_id', client.primary_store_id)
      .neq('id', client.id)
    setStoreTaken((data ?? []).some(row => ['ativo', 'ativa', 'active'].includes(String(row.status ?? '').toLowerCase())))
  }, [client?.primary_store_id, client?.id])

  useEffect(() => { void checkStore() }, [checkStore])

  useEffect(() => {
    if (!client?.id || !client.primary_store_id) return
    let cancelled = false
    void (async () => {
      const [peers, lojas] = await Promise.all([
        supabase.from('clientes_consultoria').select('id, slug, primary_store_id').neq('status', 'arquivado'),
        supabase.from('lojas').select('id, parent_loja_id'),
      ])
      if (cancelled || peers.error || lojas.error) return
      const parent = parentClientOf(
        { id: client.id, primary_store_id: client.primary_store_id },
        peers.data ?? [],
        lojas.data ?? [],
      )
      if (parent?.slug && parent.slug !== client.slug) {
        navigate(`/clientes/${parent.slug}`, { replace: true })
      }
    })()
    return () => { cancelled = true }
  }, [client?.id, client?.primary_store_id, client?.slug, navigate])

  const loadUnits = useCallback(async () => {
    if (!client?.id) return
    const [unitsResult, lojasResult] = await Promise.all([
      supabase
        .from('unidades_cliente_consultoria')
        .select('*')
        .eq('client_id', client.id)
        .order('is_primary', { ascending: false })
        .order('name', { ascending: true }),
      supabase.from('lojas').select('id, name, parent_loja_id, active'),
    ])
    if (unitsResult.error) {
      toast.error(unitsResult.error.message)
      return
    }
    if (lojasResult.error) {
      toast.error(lojasResult.error.message)
      return
    }
    const fetched = (unitsResult.data ?? []) as UnitRow[]
    const junkIds = fetched.filter(isOrphanTestUnit).map(unit => unit.id)
    if (junkIds.length) {
      const removed = await deleteOrphanTestUnits(junkIds)
      if (removed.error) toast.error(removed.error)
      else if (removed.deleted) void refetch()
    }
    let cadastro = fetched.filter(unit => !isOrphanTestUnit(unit))
    const merged = mergeOperationalUnits({
      clientId: client.id,
      primaryStoreId: client.primary_store_id,
      units: cadastro,
      lojas: lojasResult.data ?? [],
    })
    const persisted = await ensureOperationalUnitRows({
      clientId: client.id,
      createdBy: supabaseUser?.id ?? null,
      units: merged,
    })
    if (persisted.error) toast.error(persisted.error)
    if (persisted.created) {
      const { data: refreshed } = await supabase
        .from('unidades_cliente_consultoria')
        .select('*')
        .eq('client_id', client.id)
      cadastro = ((refreshed ?? []) as UnitRow[]).filter(unit => !isOrphanTestUnit(unit))
      void refetch()
    }
    const visible = persisted.created
      ? mergeOperationalUnits({
        clientId: client.id,
        primaryStoreId: client.primary_store_id,
        units: cadastro,
        lojas: lojasResult.data ?? [],
      })
      : merged
    setUnits(visible.map(unit => ({
      internal_code: null,
      address_street: null,
      address_zip: null,
      timezone: null,
      working_days: null,
      opening_time: null,
      closing_time: null,
      opening_date: null,
      notes: null,
      ...cadastro.find(row => row.id === unit.id),
      ...unit,
    })))
  }, [client?.id, client?.primary_store_id, refetch, supabaseUser?.id])

  const loadPersons = useCallback(async () => {
    if (!client?.id) return
    const { rows, stores, error: personsError } = await fetchClientPersons(client.id)
    if (personsError) {
      toast.error(personsError)
      return
    }
    setPersons(rows)
    setPersonStores(stores)
  }, [client?.id])

  const personGroups = useMemo(
    () => groupPeopleByStore(persons, personStores, client?.primary_store_id),
    [persons, personStores, client?.primary_store_id],
  )

  const loadLinks = useCallback(async () => {
    if (!client?.id) return
    const { rows, error: linksError } = await listEnrollmentLinks(client.id)
    if (linksError) {
      toast.error(linksError)
      return
    }
    setLinks(rows)
  }, [client?.id])

  const loadStrategicPlan = useCallback(async () => {
    if (!client?.id) return
    const year = new Date().getFullYear()
    const { cycle, error: cycleError } = await fetchCurrentCycle(client.id, year)
    if (cycleError || !cycle) {
      setStrategicPlanReadiness(null)
      return
    }
    const [unitsResult, packageResult] = await Promise.all([
      fetchClientUnits(client.id),
      fetchClientProductPackage(client.id),
    ])
    const unitIds = unitsResult.units.filter(unit => unit.active).map(unit => unit.id)
    const { rows } = await fetchUnitsPlanningValues(unitIds, year)
    const rosterCodes = packageResult.ok ? packageResult.resolution.indicatorCodes : []
    const card = buildPublicationCardFromRows({
      cycleStatus: cycle.status,
      rosterCodes,
      rows,
    })
    setStrategicPlanReadiness({
      cycleStatus: cycle.status,
      total: rosterCodes.length || card.indicadoresComMeta,
      ready: card.metasPublicadas,
      pending: card.metasPendentes,
      indicadoresComMeta: card.indicadoresComMeta,
    })
  }, [client?.id])

  useEffect(() => { void loadUnits() }, [loadUnits])
  useEffect(() => { void loadPersons() }, [loadPersons])
  useEffect(() => { void loadLinks() }, [loadLinks])
  useEffect(() => { void loadStrategicPlan() }, [loadStrategicPlan])

  const loadActionPlanSummary = useCallback(async () => {
    if (!client?.id) {
      setActionPlanSummary(null)
      return
    }
    const result = await fetchClientActionPlanSummary(client.id, client.primary_store_id)
    setActionPlanSummary(result.summary)
  }, [client?.id, client?.primary_store_id])

  useEffect(() => { void loadActionPlanSummary() }, [loadActionPlanSummary, actionPlanRefreshKey])

  // O produto contratado é a fonte do roster. Ao abrir uma ficha legada sem
  // ciclo, a tela provisiona o ciclo idempotentemente e passa a exibir o
  // mesmo pacote no contexto do cliente.
  useEffect(() => {
    if (!client?.id || !client.program_template_key) return
    let active = true
    void createStrategicPlanFromProduct({
      clientId: client.id,
      referenceYear: new Date().getFullYear(),
      userId: supabaseUser?.id,
    }).then(result => {
      if (!active) return
      if (result.resolution.ok && result.error) toast.error(result.error)
      if (result.resolution.ok) void loadStrategicPlan()
    })
    return () => { active = false }
  }, [client?.id, client?.program_template_key, loadStrategicPlan, supabaseUser?.id])

  const ownerMasterResolution = useMemo<OwnerMasterResolution>(() => {
    if (!persons.length) return { status: 'NOT_CONFIGURED', count: 0 }
    return resolveOwnerMaster(persons)
  }, [persons])

  const checks = useMemo(() => {
    if (!client) return []
    return buildClientReadiness({
      status: client.status ?? null,
      primary_store_id: client.primary_store_id ?? null,
      product_name: client.product_name ?? null,
      program_template_key: (client as { program_template_key?: string | null }).program_template_key ?? null,
      modality: client.modality ?? null,
      cnpj: client.cnpj ?? null,
      contract_start_date: (client as { contract_start_date?: string | null }).contract_start_date ?? null,
      implementation_owner_id: (client as { implementation_owner_id?: string | null }).implementation_owner_id ?? null,
      units: client.units ?? [],
      contacts: client.contacts ?? [],
      modules: client.modules ?? [],
      assignments: client.assignments ?? [],
      storeTakenByOtherClient: storeTaken,
      owner_master: {
        status: ownerMasterResolution.status,
        id: ownerMasterResolution.person?.id ?? null,
        name: ownerMasterResolution.person?.nome ?? null,
        email: ownerMasterResolution.person?.email ?? null,
        personStatus: ownerMasterResolution.person?.status ?? null,
      },
      strategic_plan_ready: strategicPlanReadiness,
    })
  }, [client, storeTaken, ownerMasterResolution, strategicPlanReadiness])

  const correctDonoMaster = async () => {
    if (!client?.id) return
    setActivationOpen(false)
    setTab('pessoas')
    const donos = persons.filter(person => person.papeis.includes('DONO'))
    if (ownerMasterResolution.status === 'OWNER_WITHOUT_MASTER' && donos.length === 1) {
      const result = await setClientDonoMaster(client.id, donos[0])
      if (result.error) toast.error(result.error)
      else {
        toast.success(`${donos[0].nome} definido como Dono Master.`)
        await loadPersons()
      }
      return
    }
    if (ownerMasterResolution.status === 'OWNER_WITHOUT_MASTER' && donos.length > 1) {
      setMasterPickerOpen(true)
      return
    }
    if (ownerMasterResolution.status === 'DUPLICATE_MASTER') {
      setMasterPickerOpen(true)
      return
    }
    const contact = client.contacts?.find(item => item.is_primary)
    setEditingPersonId(null)
    setPersonPrefill({
      nome: contact?.name ?? '',
      email: contact?.email ?? '',
      telefone: (contact as { phone?: string | null } | undefined)?.phone ?? '',
      papeis: ['DONO'],
      is_dono_master: true,
      visao_padrao: 'DONO',
      lojas_autorizadas: units.map(unit => unit.store_id ?? unit.id),
    })
    setPersonModal(true)
  }

  const openPersonEdit = (person: PersonAccessRow) => {
    setEditingPersonId(person.id)
    setPersonPrefill(personToAccessDraft(person))
    setPersonModal(true)
  }

  const summary = useMemo(() => readinessSummary(checks), [checks])
  const health = useClientHealth(client?.id, client?.primary_store_id ?? null)
  const visits = client?.visits ?? []
  const journey = useMemo(() => buildClientJourney({
    programKey: client?.program_template_key,
    programTotal: client?.journey_total_visits,
    visits,
  }), [client?.journey_total_visits, client?.program_template_key, visits])
  const totalVisits = journey.totalVisits
  const progress = journey.progress
  const portfolioStatus = useMemo(() => {
    if (!client) return null
    return canonicalPortfolioStatus({
      status: client.status,
      primary_store_id: client.primary_store_id ?? null,
      product_name: client.product_name ?? null,
      assignments: client.assignments?.filter(assignment => assignment.active).length ?? 0,
      modulesEnabled: client.modules?.filter(module => module.enabled !== false).length ?? 0,
      visitsDone: journey.completedVisits,
      visitsTotal: totalVisits,
    })
  }, [client, journey.completedVisits, totalVisits])
  const portfolioStatusLabel = portfolioStatus ? PORTFOLIO_STATUS_LABEL[portfolioStatus] : formatClientStatus(client?.status)
  const responsibleConsultant = useMemo(() => {
    const primary = client?.assignments?.find(a => a.active && a.assignment_role === 'responsavel')?.user?.name
    if (primary) return primary
    const anyActive = client?.assignments?.find(a => a.active)?.user?.name
    if (anyActive) return anyActive
    return team.rows.find(u => u.id === (client as { implementation_owner_id?: string | null })?.implementation_owner_id)?.name ?? null
  }, [client?.assignments, team.rows, client])

  const programSummary = useMemo(() => buildProgramSummary({
    product_name: client?.product_name ?? null,
    program_template_key: (client as { program_template_key?: string | null })?.program_template_key ?? null,
    modality: client?.modality ?? null,
    contract_start_date: (client as { contract_start_date?: string | null })?.contract_start_date ?? null,
    contract_end_date: (client as { contract_end_date?: string | null })?.contract_end_date ?? null,
    program_total_visits: client?.journey_total_visits ?? null,
    responsible_consultant: responsibleConsultant,
    visits: visits.map(visit => ({
      visit_number: visit.visit_number,
      status: visit.status,
      is_onboarding: visit.visit_number <= 1,
      consultant_name: visit.consultant?.name ?? null,
    })),
  }), [client, visits, responsibleConsultant])

  const selectedProduct = useMemo(
    () => products.rows.find(product => product.program_key === client?.program_template_key) ?? null,
    [client?.program_template_key, products.rows],
  )
  const visitRule = useMemo(
    () => resolveVisitVolumeRule(selectedProduct, client?.modality),
    [client?.modality, selectedProduct],
  )

  const programInitialDraft = useMemo<ProgramDraft>(() => {
    const assignments = client?.assignments ?? []
    const responsible = assignments.find(a => a.active && a.assignment_role === 'responsavel')?.user_id ?? ''
    const auxiliaries = assignments.filter(a => a.active && a.assignment_role !== 'responsavel').map(a => a.user_id)
    return {
      product_name: client?.product_name ?? '',
      program_template_key: (client as { program_template_key?: string | null })?.program_template_key ?? '',
      modality: client?.modality ?? '',
      contract_start_date: (client as { contract_start_date?: string | null })?.contract_start_date ?? '',
      contract_end_date: (client as { contract_end_date?: string | null })?.contract_end_date ?? '',
      implementation_owner_id: (client as { implementation_owner_id?: string | null })?.implementation_owner_id ?? '',
      responsible_consultant_id: responsible,
      auxiliary_consultant_ids: auxiliaries,
    }
  }, [client])

  const onboardingStep = (client as { onboarding_step?: number | null })?.onboarding_step ?? 1
  const onboardingCompleted = (client as { onboarding_completed?: boolean | null })?.onboarding_completed ?? false

  const [repairing, setRepairing] = useState<RepairKey | null>(null)

  const repair = async (key: RepairKey) => {
    if (repairing || !client?.id || !supabaseUser) return
    setRepairing(key)
    try {
      const result = await runClientRepair({
        key,
        clientId: client.id,
        clientName: client.name,
        programKey: client.program_template_key ?? null,
        userId: supabaseUser.id,
      })
      if (result.repaired) toast.success(result.message)
      else toast.error(result.message)
      if (result.repaired) await refetch()
    } finally {
      setRepairing(null)
    }
  }

  const activate = async () => {
    if (!client || activating) return
    setActivating(true)
    try {
      const { error: updateError } = await supabase
        .from('clientes_consultoria')
        .update({ status: 'ativo', updated_at: new Date().toISOString() })
        .eq('id', client.id)
      if (updateError) {
        toast.error(updateError.code === '23505' ? 'Esta loja já tem um cliente ativo.' : updateError.message)
        return
      }
      toast.success('Cliente ativado.')
      setActivationOpen(false)
      await refetch()
    } finally {
      setActivating(false)
    }
  }

  const submitStore = async (draft: StoreDraft, hours: Parameters<typeof saveClientStore>[2]) => {
    if (!client?.id || !supabaseUser) return
    setSavingStore(true)
    try {
      const { error: saveError } = await saveClientStore(client.id, draft, hours, supabaseUser.id)
      if (saveError) {
        toast.error(saveError)
        return
      }
      toast.success(draft.id ? 'Loja atualizada.' : 'Loja criada com horário padrão MX.')
      setStoreModal({ open: false, initial: null })
      await loadUnits()
      await refetch()
    } finally {
      setSavingStore(false)
    }
  }

  const submitPerson = async (draft: PersonAccessDraft) => {
    if (!client?.id || !supabaseUser) return
    setSavingPerson(true)
    try {
      const { error: personError } = editingPersonId
        ? await updateClientPerson(client.id, editingPersonId, draft)
        : await createClientPerson(client.id, draft, supabaseUser.id)
      if (personError) {
        toast.error(personError)
        return
      }
      toast.success(editingPersonId ? 'Usuário atualizado.' : 'Usuário cadastrado.')
      setPersonModal(false)
      setPersonPrefill(null)
      setEditingPersonId(null)
      await loadPersons()
    } finally {
      setSavingPerson(false)
    }
  }

  const submitLink = async (draft: Parameters<typeof createEnrollmentLink>[3]) => {
    if (!client?.id || !client.slug || !supabaseUser) return null
    setSavingLink(true)
    try {
      const result = await createEnrollmentLink(client.id, client.slug, window.location.origin, draft, supabaseUser.id)
      if (result.error) {
        toast.error(result.error)
        return null
      }
      await loadLinks()
      return result.url
    } finally {
      setSavingLink(false)
    }
  }

  const submitProgram = async (draft: ProgramDraft) => {
    if (!client?.id) return
    setSavingProgram(true)
    try {
      const result = await saveClientProgram(client.id, draft)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Programa contratado atualizado com sucesso.')
      setProgramModalOpen(false)
      await refetch()
    } finally {
      setSavingProgram(false)
    }
  }

  const createStrategicPlan = async () => {
    if (!client?.id || creatingStrategicPlan) return
    setCreatingStrategicPlan(true)
    try {
      const result = await createStrategicPlanFromProduct({
        clientId: client.id,
        referenceYear: new Date().getFullYear(),
        userId: supabaseUser?.id,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(result.created ? 'Plano Estratégico criado a partir do produto.' : 'Plano Estratégico já existente; ciclo atual carregado.')
      await loadStrategicPlan()
    } finally {
      setCreatingStrategicPlan(false)
    }
  }

  return (
    <MxModulePage id="admin-mx-cliente-detalhe" width={width} bottomClearance={bottomClearance}>
      <div className="w-full space-y-5">
        <MxModuleHeader
          icon={Building2}
          eyebrow="Administração MX"
          title={client?.name ?? 'Cliente'}
          description={client ? `${client.legal_name || 'Sem razão social'} · ${client.product_name || 'Produto não definido'}` : 'Visão 360 do cliente na consultoria.'}
          actions={(
            <>
              <Button asChild variant="outline"><Link to="/clientes"><ArrowLeft size={16} />Clientes</Link></Button>
              <Button variant="outline" onClick={() => void refetch()}><RefreshCw size={16} />Atualizar</Button>
              {client && !onboardingCompleted ? (
                <Button asChild variant="outline"><Link to={`/clientes/novo?continue=${client.id}`}><ArrowLeft size={16} />Continuar onboarding</Link></Button>
              ) : null}
              {client && client.status !== 'ativo'
                ? <Button onClick={() => setActivationOpen(true)}><CheckCircle2 size={16} />Validar e ativar</Button>
                : null}
              {client ? <Button variant="outline" onClick={() => void createStrategicPlan()} disabled={creatingStrategicPlan}><Target size={16} />{creatingStrategicPlan ? 'Sincronizando...' : 'Sincronizar indicadores'}</Button> : null}
              {client ? <Button variant="outline" onClick={() => { setPlanningTab('plano-acao'); setTab('planejamento') }}><ClipboardList size={16} />Abrir Plano de Ação</Button> : null}
              {client ? <Button asChild variant="outline"><Link to={`/consultoria?clientId=${encodeURIComponent(client.id)}`}><Sparkles size={16} />Abrir Consultoria</Link></Button> : null}
            </>
          )}
        />

        {loading ? <MxLoadingState label="Carregando cliente" /> : error ? <MxErrorState description={error} retry={() => void refetch()} /> : !client ? (
          <MxEmptyState title="Cliente não encontrado" description="Verifique o endereço ou volte para a lista de clientes." />
        ) : (
          <>
            <MxMetricGrid>
              <MxMetricCard
                title="Status"
                value={portfolioStatusLabel}
                detail={portfolioStatus === 'em_implantacao'
                  ? `Jornada em andamento · ${journey.completedVisits}/${totalVisits}`
                  : summary.canActivate
                  ? portfolioStatus === 'ativos' ? 'Pronto para operar' : 'Pronto para ativar'
                  : `${summary.blockers.length} impeditivo(s)`}
                icon={BriefcaseBusiness}
                tone={portfolioStatus === 'ativos' ? 'success' : portfolioStatus === 'em_implantacao' ? 'info' : 'warning'}
              />
              <MxMetricCard title="Lojas" value={units.length ?? 0} detail="Matriz e filiais operacionais" icon={Building2} tone="info" />
              <MxMetricCard title="Pessoas" value={persons.length} detail="Acessos e vínculos de loja" icon={UserPlus} tone="violet" />
              <MxMetricCard title="Prontidão" value={`${summary.completed}/${summary.total}`} detail="Itens do checklist concluídos" icon={BriefcaseBusiness} />
            </MxMetricGrid>

            <TabNav tabs={TABS} activeTab={tab} onTabChange={setTab} scrollable />

            {tab === 'visao' ? (
              <MxSectionCard>
                <MxSectionHeader title="Informações gerais" description="Cadastro, contrato e situação do cliente." />
                <div className="grid gap-3 border-b border-border p-5 lg:grid-cols-3">
                  <div className="rounded-xl border border-border bg-surface-alt p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Target size={16} className="text-status-info-text" />Plano Estratégico</div>
                        <p className="mt-2 text-xs text-muted-foreground">Indicadores, metas e ciclo do produto contratado.</p>
                      </div>
                      <span className="text-xs font-semibold text-foreground">{strategicPlanReadiness ? strategicPlanReadiness.cycleStatus === 'publicado' ? 'Publicado' : 'Rascunho' : '—'}</span>
                    </div>
                    {strategicPlanReadiness ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Indicadores com meta: {strategicPlanReadiness.indicadoresComMeta ?? strategicPlanReadiness.ready}
                        {' · '}Metas publicadas: {strategicPlanReadiness.ready}
                        {' · '}Metas pendentes: {strategicPlanReadiness.pending}
                      </p>
                    ) : null}
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => { setPlanningTab('estrategico'); setTab('planejamento') }}>Abrir no cliente</Button>
                  </div>
                  <div className="rounded-xl border border-border bg-surface-alt p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><ClipboardList size={16} className="text-status-warning-text" />Plano de Ação</div>
                        <p className="mt-2 text-xs text-muted-foreground">Problemas, responsáveis, prazos e evidências da execução.</p>
                      </div>
                      <span className="text-xs font-semibold text-foreground">{actionPlanSummary ? `${actionPlanSummary.total} plano(s)` : 'Carregando…'}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{actionPlanSummary ? `${actionPlanSummary.open} em aberto · ${actionPlanSummary.averageProgress}% de progresso médio · ${actionPlanSummary.completed} concluído(s)` : 'Consultando a matriz e as filiais do cliente.'}</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => { setPlanningTab('plano-acao'); setTab('planejamento') }}>Abrir no cliente</Button>
                  </div>
                  <div className="rounded-xl border border-border bg-surface-alt p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Sparkles size={16} className="text-status-success-text" />Consultoria</div>
                        <p className="mt-2 text-xs text-muted-foreground">Jornada, encontros e entregas do programa contratado.</p>
                      </div>
                      <span className="text-xs font-semibold text-foreground">{visits.length} encontro(s)</span>
                    </div>
                    <Button asChild variant="outline" size="sm" className="mt-4"><Link to={`/consultoria?clientId=${encodeURIComponent(client.id)}`}>Abrir consultoria</Link></Button>
                  </div>
                </div>
                <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ['Razão social', client.legal_name || '—'],
                    ['CNPJ', client.cnpj || '—'],
                    ['Produto', client.product_name || '—'],
                    ['Modalidade', client.modality || '—'],
                    ['Estrutura', (client as { structure_type?: string | null }).structure_type === 'REDE' ? 'Rede' : (client as { structure_type?: string | null }).structure_type === 'LOJA_UNICA' ? 'Loja única' : '—'],
                    ['Fase empresarial', (client as { business_phase?: string | null }).business_phase || '—'],
                    ['Início do contrato', formatDate((client as { contract_start_date?: string | null }).contract_start_date)],
                    ['Fim do contrato', formatDate((client as { contract_end_date?: string | null }).contract_end_date)],
                    ['Onboarding', onboardingCompleted ? 'Concluído' : `Etapa ${onboardingStep}/7`],
                    ['Ciclo da jornada', totalVisits > 0 ? `${journey.completedVisits}/${totalVisits}` : '—'],
                    ['Visitas presenciais', visitRule.label],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-border p-3">
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="font-semibold text-foreground">{value}</dd>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border p-5">
                  <h3 className="mb-3 text-sm font-semibold text-foreground">Checklist de prontidão</h3>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {checks.map(check => (
                      <li key={check.key} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                        <div>
                          <div className="font-medium text-foreground">{check.label}</div>
                          <div className="text-xs text-muted-foreground">{check.detail}</div>
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">{check.ok ? 'OK' : check.severity === 'impeditivo' ? 'Impeditivo' : 'Pendente'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </MxSectionCard>
            ) : null}

            {tab === 'lojas' ? (
              <MxSectionCard>
                <MxSectionHeader
                  title="Empresa e lojas"
                  description={`${units.length} loja(s) operacional(is) — matriz e filiais.`}
                  actions={<Button size="sm" onClick={() => setStoreModal({ open: true, initial: null })}><Plus size={16} />Adicionar loja</Button>}
                />
                <div className="space-y-3 p-5">
                  {units.length ? (
                    units.map(unit => (
                      <div key={unit.id} className="rounded-lg border border-border p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Building2 size={16} className="text-primary" />
                            <span className="text-sm font-semibold text-foreground">{unit.name}</span>
                            {unit.store_type === 'matriz' ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-caption font-medium text-primary">Matriz</span> : null}
                            {unit.store_type === 'filial' ? <span className="rounded-full bg-status-info-bg px-2 py-0.5 text-caption font-medium text-status-info-text">Filial</span> : null}
                            {unit.is_primary ? <span className="rounded-full bg-surface-alt px-2 py-0.5 text-caption font-medium text-muted-foreground">Principal</span> : null}
                            {unit.status === 'inativa' ? <span className="rounded-full bg-status-warning-surface px-2 py-0.5 text-caption font-medium text-status-warning-text">Inativa</span> : null}
                          </div>
                          <div className="flex items-center gap-2">
                            {unit.synthetic ? (
                              <span className="text-xs text-muted-foreground">Filial operacional</span>
                            ) : (
                              <>
                            <Button variant="outline" size="sm" onClick={() => setStoreModal({ open: true, initial: { ...emptyStoreDraft(unit.store_type === 'matriz' ? 'matriz' : 'filial'), id: unit.id, store_id: unit.store_id, name: unit.name, cnpj: unit.cnpj ?? '', internal_code: unit.internal_code ?? '', address_street: unit.address_street ?? '', address_city: unit.city ?? '', address_state: unit.state ?? '', address_zip: unit.address_zip ?? '', timezone: unit.timezone ?? 'America/Sao_Paulo', status: unit.status === 'inativa' ? 'inativa' : 'ativa', opening_date: unit.opening_date ?? '', notes: unit.notes ?? '', is_primary: unit.is_primary } })}>
                              <Pencil size={14} />Editar
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setHoursUnitId(hoursUnitId === unit.id ? null : unit.id)}>
                              <Clock size={14} />Horário
                            </Button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                          {unit.city ? <div><span className="font-medium">Cidade:</span> {unit.city}{unit.state ? `, ${unit.state}` : ''}</div> : null}
                          {unit.cnpj ? <div><span className="font-medium">CNPJ:</span> {unit.cnpj}</div> : null}
                          {unit.working_days ? <div><span className="font-medium">Dias:</span> {unit.working_days}</div> : null}
                        </div>
                        {hoursUnitId === unit.id ? (
                          <div className="mt-3 border-t border-border pt-3">
                            <StoreOperatingHoursEditor unitId={unit.id} unitName={unit.name} origin="Visão 360 — Empresa e Lojas" />
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : <MxEmptyState title="Nenhuma unidade cadastrada" description="Cadastre as lojas do cliente para orientar a jornada." />}
                </div>
              </MxSectionCard>
            ) : null}

            {tab === 'pessoas' ? (
              <div className="space-y-5">
                <DonoMasterCard
                  loading={false}
                  resolution={ownerMasterResolution}
                  onDefine={() => { void correctDonoMaster() }}
                  onEdit={() => {
                    const master = ownerMasterResolution.person
                    const row = master ? persons.find(person => person.id === master.id) : null
                    if (row) openPersonEdit(row)
                    else toast.info('Cadastre ou escolha o Dono Master para editar.')
                  }}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border p-4">
                    <div className="mb-2 flex items-center gap-2"><UserPlus size={16} className="text-primary" /><h4 className="text-sm font-medium text-foreground">Cadastro Direto</h4></div>
                    <p className="mb-3 text-xs text-muted-foreground">Cadastre usuários manualmente com papel, loja e visão padrão.</p>
                    <Button size="sm" onClick={() => { setEditingPersonId(null); setPersonPrefill(null); setPersonModal(true) }}><UserPlus size={14} />Cadastrar usuário</Button>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <div className="mb-2 flex items-center gap-2"><Link2 size={16} className="text-status-info-text" /><h4 className="text-sm font-medium text-foreground">Autocadastro por Link</h4></div>
                    <p className="mb-3 text-xs text-muted-foreground">Gere um link para que a equipe do cliente se cadastre.</p>
                    <Button size="sm" variant="outline" onClick={() => setLinkModal(true)}><Link2 size={14} />Gerar link</Button>
                  </div>
                </div>
                <MxSectionCard>
                  <MxSectionHeader title={`Usuários (${persons.length})`} description="Equipe por loja: cada filial tem gerente e vendedores próprios." />
                  <div className="p-5">
                    {persons.length ? (
                      <div className="space-y-6">
                        {personGroups.map(group => (
                          <div key={group.storeId} className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold text-foreground">{group.storeName}</h3>
                              {group.kind === 'matriz' ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-caption font-medium text-primary">Matriz</span> : null}
                              {group.kind === 'filial' ? <span className="rounded-full bg-status-info-bg px-2 py-0.5 text-caption font-medium text-status-info-text">Filial</span> : null}
                              <span className="text-xs text-muted-foreground">
                                {group.gerenteNome ? `Gerente: ${group.gerenteNome}` : 'Sem gerente'}
                                {' · '}
                                {group.people.length} pessoa(s)
                              </span>
                            </div>
                            {group.people.map(person => (
                          <div key={`${group.storeId}:${person.id}`} className="flex items-center justify-between rounded-lg border border-border p-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-alt text-xs font-bold text-foreground">{person.nome.charAt(0) || '?'}</div>
                              <div>
                                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                  {person.nome}
                                  {person.is_dono_master ? <Crown size={12} className="text-status-warning" /> : null}
                                </div>
                                <div className="text-xs text-muted-foreground">{person.funcao_declarada || '—'} · {person.email}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {person.source === 'vinculo' ? (
                                <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs font-medium text-muted-foreground">Vínculo de loja</span>
                              ) : null}
                              <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                {person.is_dono_master ? 'Dono Master' : person.papeis.join(', ') || '—'} · {person.status === 'em_preparacao' ? 'Em preparação' : person.status === 'ativo' ? 'Ativo' : 'Inativo'}
                              </span>
                              <Button variant="outline" size="sm" onClick={() => openPersonEdit(person)}>
                                <Pencil size={14} />Editar
                              </Button>
                            </div>
                          </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ) : <MxEmptyState title="Nenhum usuário cadastrado" description="Adicione usuários diretamente ou gere um link de autocadastro." />}
                  </div>
                </MxSectionCard>
                {links.length ? (
                  <MxSectionCard>
                    <MxSectionHeader title={`Links de autocadastro (${links.length})`} description="Validade e usos de cada link gerado." />
                    <div className="p-5">
                      <MxTableSurface>
                        <Table className="min-w-[560px]">
                          <TableHeader><TableRow><TableHead>Perfil</TableHead><TableHead>Validade</TableHead><TableHead>Usos</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {links.map(link => (
                              <TableRow key={link.id}>
                                <TableCell className="font-semibold text-foreground">{link.nome_interno || link.perfil_acesso}</TableCell>
                                <TableCell>{link.validade_dias} dias</TableCell>
                                <TableCell>{link.usos_consumidos}/{link.limite_usos}</TableCell>
                                <TableCell>{link.status}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </MxTableSurface>
                    </div>
                  </MxSectionCard>
                ) : null}
              </div>
            ) : null}

            {tab === 'jornada' ? (
              <div className="space-y-5">
                <ProgramCard summary={programSummary} visitRule={visitRule} onEditProgram={() => setProgramModalOpen(true)} />
                <MxSectionCard>
                  <MxSectionHeader title="Jornada de encontros" description={`${visits.length} encontro(s) registrados.`} />
                  <div className="space-y-4 p-5">
                    <div className="max-w-md"><MxProgress value={progress} label={`${progress}% concluído`} /></div>
                    {health.presence ? (
                      <MxStatusBanner tone={health.presence.disponiveis === 0 ? 'warning' : 'info'}>
                        {health.presence.contratadas === null
                          ? `Encontros presenciais: ${health.presence.usadas} marcado(s) · ${visitRule.detail}`
                          : `Encontros presenciais: ${health.presence.usadas} de ${health.presence.contratadas} · ${health.presence.disponiveis} disponível(is)${health.presence.minimas != null ? ` · mínimo contratado ${health.presence.minimas}` : ''}.`}
                      </MxStatusBanner>
                    ) : null}
                    {visits.length ? (
                      <MxTableSurface>
                        <Table className="min-w-[640px]">
                          <TableHeader><TableRow><TableHead>Encontro</TableHead><TableHead>Data</TableHead><TableHead>Modalidade</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {visits.map(visit => (
                              <TableRow key={visit.id}>
                                <TableCell className="font-semibold text-foreground">{visit.visit_number === 1 ? 'Onboarding' : `Visita ${visit.visit_number}`}</TableCell>
                                <TableCell>{formatDate(visit.scheduled_at)}</TableCell>
                                <TableCell>{visit.modality || '—'}</TableCell>
                                <TableCell>{visit.status || '—'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </MxTableSurface>
                    ) : <MxEmptyState title="Jornada não iniciada" description="Nenhum encontro registrado para este cliente." />}
                  </div>
                </MxSectionCard>
              </div>
            ) : null}

            {tab === 'implantacao' ? (
              <ClientImplantacaoTab
                bars={buildProgressBars({
                  onboardingStep: client.onboarding_step ?? null,
                  onboardingCompleted: client.onboarding_completed ?? null,
                  modulesEnabled: (client.modules ?? []).filter(module => module.enabled !== false).length,
                  modulesTotal: (client.modules ?? []).length,
                  visitsDone: visits.filter(visit => visit.status === 'concluida').length,
                  visitsTotal: totalVisits,
                })}
                blockers={checks.filter(check => !check.ok).map(check => `${check.label} — ${check.detail}`)}
              />
            ) : null}

            {tab === 'planejamento' ? (
              <div className="space-y-4">
                <TabNav tabs={PLANNING_TABS} activeTab={planningTab} onTabChange={setPlanningTab} />
                {planningTab === 'estrategico' ? (
                  <ClientPlanningContextPanel
                    clientId={client.id}
                    clientSlug={client.slug}
                    primaryStoreId={client.primary_store_id}
                  />
                ) : (
                  <ClientActionPlanContextPanel
                    clientId={client.id}
                    clientSlug={client.slug}
                    primaryStoreId={client.primary_store_id}
                    refreshKey={actionPlanRefreshKey}
                    onCreatePlan={() => setActionPlanWizardOpen(true)}
                  />
                )}
              </div>
            ) : null}

            {tab === 'dados' ? (
              <div className="space-y-4">
                <TabNav tabs={DATA_TABS} activeTab={dataTab} onTabChange={setDataTab} />
                {dataTab === 'dados' ? (
                  <ClientDadosTab sources={health.sources} loading={health.loading} error={health.error} onRetry={() => void health.refetch()} />
                ) : (
                  <ClientHistoricoTab events={health.timeline} loading={health.loading} error={health.error} onRetry={() => void health.refetch()} />
                )}
              </div>
            ) : null}

            {tab === 'operacao' ? (
              <div className="space-y-4">
                <TabNav tabs={OPERATION_TABS} activeTab={operationTab} onTabChange={setOperationTab} />
                {operationTab === 'modulos' ? (
                  <MxSectionCard>
                    <MxSectionHeader title="Módulos do cliente" description={`${(client.modules ?? []).filter(item => item.enabled !== false).length} módulo(s) liberado(s).`} />
                    <div className="p-5">
                      {client.modules?.length ? (
                        <MxTableSurface>
                          <Table className="min-w-[520px]">
                            <TableHeader><TableRow><TableHead>Módulo</TableHead><TableHead>Chave</TableHead><TableHead>Liberado</TableHead><TableHead>Premium</TableHead></TableRow></TableHeader>
                            <TableBody>
                              {client.modules.map(item => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-semibold text-foreground">{item.label || item.module_key}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{item.module_key}</TableCell>
                                  <TableCell>{item.enabled === false ? 'Não' : 'Sim'}</TableCell>
                                  <TableCell>{item.premium ? 'Sim' : '—'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </MxTableSurface>
                      ) : <MxEmptyState title="Nenhum módulo configurado" description="O cliente entra sem acesso até liberar ao menos um módulo." />}
                    </div>
                  </MxSectionCard>
                ) : (
                  <ClientConfigTab clientId={client.id} units={units.map(unit => ({ id: unit.id, name: unit.name, store_type: unit.store_type }))} updatedBy={supabaseUser?.id ?? ''} />
                )}
              </div>
            ) : null}

            <ClientActivationModal
              open={activationOpen}
              clientName={client.name}
              checks={checks}
              submitting={activating}
              onSubmit={() => void activate()}
              onRepair={key => void repair(key)}
              onCorrect={check => {
                if (check.key === 'dono-master') void correctDonoMaster()
              }}
              repairing={repairing}
              onClose={() => setActivationOpen(false)}
            />

            <ProgramEditModal
              open={programModalOpen}
              initial={programInitialDraft}
              submitting={savingProgram}
              products={products.rows}
              team={team.rows}
              onSubmit={draft => void submitProgram(draft)}
              onClose={() => setProgramModalOpen(false)}
            />

            <StoreFormModal
              open={storeModal.open}
              clientId={client.id}
              defaultType={storeModal.initial?.store_type === 'matriz' ? 'matriz' : 'filial'}
              initial={storeModal.initial}
              createdBy={supabaseUser?.id ?? ''}
              submitting={savingStore}
              onSubmit={(draft, hours) => void submitStore(draft, hours)}
              onClose={() => setStoreModal({ open: false, initial: null })}
            />

            <PersonCreateModal
              open={personModal}
              submitting={savingPerson}
              stores={units.map(unit => ({ id: unit.store_id ?? unit.id, name: unit.name }))}
              initial={personPrefill ?? undefined}
              editing={Boolean(editingPersonId)}
              onSubmit={draft => void submitPerson(draft)}
              onClose={() => { setPersonModal(false); setPersonPrefill(null); setEditingPersonId(null) }}
            />

            <DonoMasterPickerModal
              open={masterPickerOpen}
              donos={persons.filter(person => person.papeis.includes('DONO')).map(person => ({
                id: person.id,
                nome: person.nome,
                email: person.email,
              }))}
              submitting={savingPerson}
              onPick={async personId => {
                if (!client?.id) return
                const picked = persons.find(person => person.id === personId)
                if (!picked) {
                  toast.error('Pessoa não encontrada na lista atual.')
                  return
                }
                setSavingPerson(true)
                const result = await setClientDonoMaster(client.id, picked)
                setSavingPerson(false)
                if (result.error) {
                  toast.error(result.error)
                  return
                }
                toast.success(`${picked.nome} definido como Dono Master.`)
                setMasterPickerOpen(false)
                await loadPersons()
              }}
              onClose={() => setMasterPickerOpen(false)}
            />

            <EnrollmentLinkModal
              open={linkModal}
              submitting={savingLink}
              onSubmit={draft => submitLink(draft)}
              onClose={() => setLinkModal(false)}
            />

            <ClientActionPlanWizard
              open={actionPlanWizardOpen}
              clientId={client.id}
              clientName={client.name}
              onSaved={() => setActionPlanRefreshKey(current => current + 1)}
              onClose={() => setActionPlanWizardOpen(false)}
            />
          </>
        )}
      </div>
    </MxModulePage>
  )
}

export default AdminClienteDetalhePage
