import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  Crown,
  Link2,
  Mail,
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
import { PLAN_CYCLE_STATUS_LABEL } from '@/features/strategic-plan/planCycle'
import { getClientStrategicPlanPublicationSummary } from '@/features/strategic-plan/publicationSummary'
import { createStrategicPlanFromProduct } from '@/features/strategic-plan/productPackageOps'
import { resolveAdminEditableCycleId } from '@/features/strategic-plan/adminStrategicPlanHref'
import { ClientConfigTab } from './clientes/ClientConfigTab'
import { ClientActionPlanContextPanel } from './clientes/ClientActionPlanContextPanel'
import { fetchClientActionPlanSummary, type ClientActionPlanSummary } from './clientes/clientActionPlanContext'
import { DonoMasterCard } from './clientes/DonoMasterCard'
import { EnrollmentLinkModal } from './clientes/EnrollmentLinkModal'
import { PersonCreateModal } from './clientes/PersonCreateModal'
import { ClientIdentificationModal } from './clientes/ClientIdentificationModal'
import { ProgramCard } from './clientes/ProgramCard'
import { ProgramEditModal } from './clientes/ProgramEditModal'
import { ClientPlanningContextPanel } from './clientes/ClientPlanningContextPanel'
import { StoreFormModal } from './clientes/StoreFormModal'
import { StoreOperatingHoursEditor } from './clientes/StoreOperatingHoursEditor'
import {
  createClientPerson,
  ensurePrimaryContactFromDonoMaster,
  fetchClientPersons,
  setClientDonoMaster,
  updateClientPerson,
  type PersonAccessRow,
} from './clientes/personMutations'
import { personToAccessDraft, resolveOwnerMaster, type PersonAccessDraft, type OwnerMasterResolution } from './clientes/personAccess'
import { DonoMasterPickerModal } from './clientes/DonoMasterPickerModal'
import { createEnrollmentLink, listEnrollmentLinks, resendPersonInvite, type EnrollmentLinkRow } from './clientes/enrollmentMutations'
import { buildProgramSummary } from './clientes/programSummary'
import { buildClientJourney, clientVisitDisplayTitle, clientVisitStatusLabel, isCompletedClientVisit, isOverdueClientVisit, isClientVisitInContract } from './clientes/clientJourney'
import { saveClientProgram, ensureImplementationOwnerFromAssignments, ensureContractStartFromCreatedAt, normalizeProgramModality, programModalityLabel, type ProgramDraft } from './clientes/programMutations'
import { saveClientIdentification, ensureOnboardingCompleteWhenActive } from './clientes/clientIdentificationMutations'
import { completeOverdueConsultingVisits } from './clientes/clientVisitMutations'
import { buildClientIdentificationDraft, clientBusinessPhaseLabel, clientStructureDisplay, resolveIdentificationUnit } from './clientes/clientIdentification'
import { emptyStoreDraft, maskStoreCnpj, type StoreDraft } from './clientes/storeForm'
import { deleteOrphanTestUnits, ensureOperationalUnitRows, fetchUnitOperatingHours, saveClientStore, type UnitRow } from './clientes/storeMutations'
import { useAdminConsultingProducts, useAdminTeam } from './hooks/useAdminMxLists'
import { resolveVisitVolumeRule } from './clientes/visitVolumeRule'
import { ClientActionPlanWizard } from './planos-acao/ClientActionPlanWizard'
import { groupPeopleByStore, isOrphanTestUnit, mergeOperationalUnits } from './clientes/mergeClientPeople'
import { canonicalPortfolioStatus, isActive, parentClientOf, PORTFOLIO_STATUS_LABEL } from './clientes/clientPortfolio'

type ClientTab = 'visao' | 'lojas' | 'pessoas' | 'jornada' | 'implantacao' | 'planejamento' | 'operacao' | 'dados' | 'historico'
type PlanningTab = 'estrategico' | 'plano-acao'
type OperationTab = 'modulos' | 'configuracoes'

// Oito áreas principais alinhadas ao Base44. Planejamento abre via Abrir Plano.
const TABS = [
  { key: 'visao' as const, label: 'Visão Geral' },
  { key: 'lojas' as const, label: 'Empresa e Lojas' },
  { key: 'pessoas' as const, label: 'Pessoas e Acessos' },
  { key: 'jornada' as const, label: 'Programa e Jornada' },
  { key: 'operacao' as const, label: 'Configurações' },
  { key: 'implantacao' as const, label: 'Implantação' },
  { key: 'dados' as const, label: 'Dados' },
  { key: 'historico' as const, label: 'Histórico e Auditoria' },
]

const PLANNING_TABS = [
  { key: 'estrategico' as const, label: 'Plano Estratégico' },
  { key: 'plano-acao' as const, label: 'Plano de Ação' },
]

const OPERATION_TABS = [
  { key: 'modulos' as const, label: 'Módulos e acessos' },
  { key: 'configuracoes' as const, label: 'Configurações' },
]

function resolveInitialDetailTab(requestedTab: string | null): {
  tab: ClientTab
  planningTab: PlanningTab
  operationTab: OperationTab
} {
  if (requestedTab === 'estrategico') return { tab: 'planejamento', planningTab: 'estrategico', operationTab: 'modulos' }
  if (requestedTab === 'plano-acao') return { tab: 'planejamento', planningTab: 'plano-acao', operationTab: 'modulos' }
  if (requestedTab === 'modulos') return { tab: 'operacao', planningTab: 'estrategico', operationTab: 'modulos' }
  if (requestedTab === 'configuracoes') return { tab: 'operacao', planningTab: 'estrategico', operationTab: 'configuracoes' }
  if (requestedTab === 'historico') return { tab: 'historico', planningTab: 'estrategico', operationTab: 'modulos' }
  const tab = TABS.some(entry => entry.key === requestedTab) ? requestedTab as ClientTab : 'visao'
  return { tab, planningTab: 'estrategico', operationTab: 'modulos' }
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const trimmed = String(value).trim()
  const dateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`
  const date = new Date(trimmed)
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

  const setTab = (next: ClientTab) => setTabState(next)

  useEffect(() => {
    const next = resolveInitialDetailTab(requestedTab)
    setTabState(next.tab)
    setPlanningTab(next.planningTab)
    setOperationTab(next.operationTab)
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
  const [personsReady, setPersonsReady] = useState(false)
  const [personModal, setPersonModal] = useState(false)
  const [personPrefill, setPersonPrefill] = useState<Partial<PersonAccessDraft> | null>(null)
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null)
  const [masterPickerOpen, setMasterPickerOpen] = useState(false)
  const [savingPerson, setSavingPerson] = useState(false)
  const [linkModal, setLinkModal] = useState(false)
  const [links, setLinks] = useState<EnrollmentLinkRow[]>([])
  const [strategicPlanReadiness, setStrategicPlanReadiness] = useState<ClientReadinessInput['strategic_plan_ready']>(null)
  const [strategicPlanCycleId, setStrategicPlanCycleId] = useState<string | null>(null)
  const [strategicPlanYear, setStrategicPlanYear] = useState(() => new Date().getFullYear())
  const [creatingStrategicPlan, setCreatingStrategicPlan] = useState(false)
  const [savingLink, setSavingLink] = useState(false)
  const [identityOpen, setIdentityOpen] = useState(false)
  const [savingIdentity, setSavingIdentity] = useState(false)
  const [completingOverdue, setCompletingOverdue] = useState(false)

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
        { id: client.id, slug: client.slug, primary_store_id: client.primary_store_id },
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
      setPersonsReady(true)
      return
    }
    setPersons(rows)
    setPersonStores(stores)
    setPersonsReady(true)
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
    setStrategicPlanYear(year)
    const { summary, error } = await getClientStrategicPlanPublicationSummary({
      clientAccountId: client.id,
      referenceYear: year,
    })
    if (error || !summary) {
      setStrategicPlanReadiness(null)
      setStrategicPlanCycleId(null)
      return
    }
    const { card, rosterCodes } = summary
    const editableCycleId = resolveAdminEditableCycleId(summary)
    setStrategicPlanCycleId(editableCycleId)
    setStrategicPlanReadiness({
      cycleStatus: card.cycleStatus,
      total: rosterCodes.length || card.indicadoresComMeta + card.metasPendentes,
      ready: card.metasPublicadas,
      pending: card.metasPendentes,
      indicadoresComMeta: card.indicadoresComMeta,
    })
  }, [client?.id, tab])

  useEffect(() => { void loadUnits() }, [loadUnits])
  useEffect(() => {
    setPersonsReady(false)
    void loadPersons()
  }, [loadPersons])
  useEffect(() => { void loadLinks() }, [loadLinks])
  useEffect(() => { void loadStrategicPlan() }, [loadStrategicPlan])

  const handleStrategicPlanCycleChange = useCallback((cycleId: string) => {
    setStrategicPlanCycleId(cycleId)
    void loadStrategicPlan()
  }, [loadStrategicPlan])

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

  const syncingPrimaryContact = useRef(false)
  useEffect(() => {
    if (!client?.id || ownerMasterResolution.status !== 'VALID' || !ownerMasterResolution.person) return
    const hasPrimary = (client.contacts ?? []).some(contact => contact.is_primary && (contact.name ?? '').trim())
    if (hasPrimary || syncingPrimaryContact.current) return
    syncingPrimaryContact.current = true
    void ensurePrimaryContactFromDonoMaster(client.id, ownerMasterResolution.person).then(result => {
      syncingPrimaryContact.current = false
      if (result.created) void refetch()
    })
  }, [client?.id, client?.contacts, ownerMasterResolution, refetch])

  const syncingImplementationOwner = useRef(false)
  useEffect(() => {
    if (!client?.id || (client as { implementation_owner_id?: string | null }).implementation_owner_id) return
    const hasResponsible = (client.assignments ?? []).some(item => item.active !== false && item.assignment_role === 'responsavel')
    if (!hasResponsible || syncingImplementationOwner.current) return
    syncingImplementationOwner.current = true
    void ensureImplementationOwnerFromAssignments(client.id).then(result => {
      syncingImplementationOwner.current = false
      if (result.updated) void refetch()
    })
  }, [client, refetch])

  const syncingContractStart = useRef(false)
  useEffect(() => {
    if (!client?.id || (client as { contract_start_date?: string | null }).contract_start_date) return
    if (syncingContractStart.current) return
    syncingContractStart.current = true
    void ensureContractStartFromCreatedAt(client.id).then(result => {
      syncingContractStart.current = false
      if (result.updated) void refetch()
    })
  }, [client, refetch])

  const syncingOnboarding = useRef(false)
  useEffect(() => {
    if (!client?.id) return
    const ativo = String(client.status ?? '').toLowerCase() === 'ativo'
    const done = Boolean((client as { onboarding_completed?: boolean | null }).onboarding_completed)
    if (!ativo || done || syncingOnboarding.current) return
    syncingOnboarding.current = true
    void ensureOnboardingCompleteWhenActive(client.id).then(result => {
      syncingOnboarding.current = false
      if (result.updated) void refetch()
    })
  }, [client, refetch])

  const correctDonoMaster = async () => {
    if (!client?.id) return
    const returnToActivation = searchParams.get('returnTo') === 'activation'
    setActivationOpen(false)
    setTab('pessoas')
    const reopenActivation = () => {
      if (returnToActivation) setActivationOpen(true)
    }
    const donos = persons.filter(person => person.papeis.includes('DONO'))
    if (ownerMasterResolution.status === 'OWNER_WITHOUT_MASTER' && donos.length === 1) {
      const result = await setClientDonoMaster(client.id, donos[0])
      if (result.error) toast.error(result.error)
      else {
        toast.success(`${donos[0].nome} definido como Dono Master.`)
        await loadPersons()
        reopenActivation()
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
    if (ownerMasterResolution.status === 'INACTIVE' && ownerMasterResolution.person) {
      const inactive = persons.find(person => person.id === ownerMasterResolution.person?.id)
      if (inactive) {
        setEditingPersonId(inactive.id)
        setPersonPrefill(personToAccessDraft({
          ...inactive,
          papeis: inactive.papeis.includes('DONO') ? inactive.papeis : [...inactive.papeis, 'DONO'],
          is_dono_master: true,
        }))
        setPersonModal(true)
      }
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

  const correctReadiness = (key: string) => {
    if (key === 'dono-master') {
      void correctDonoMaster()
      return
    }
    if (key === 'contato') {
      if (client?.id && ownerMasterResolution.status === 'VALID' && ownerMasterResolution.person) {
        void ensurePrimaryContactFromDonoMaster(client.id, ownerMasterResolution.person).then(result => {
          if (result.error) toast.error(result.error)
          else void refetch()
        })
        return
      }
      setTab('pessoas')
      return
    }
    if (key === 'cnpj') {
      setIdentityOpen(true)
      return
    }
    if (key === 'contrato' || key === 'responsavel-mx') setProgramModalOpen(true)
  }

  const openPersonEdit = (person: PersonAccessRow) => {
    setEditingPersonId(person.id)
    setPersonPrefill(personToAccessDraft(person))
    setPersonModal(true)
  }

  // Deep-link: /clientes/:slug?tab=pessoas&corrigirMaster=1&returnTo=activation
  useEffect(() => {
    if (searchParams.get('corrigirMaster') !== '1') return
    if (!client?.id || loading || !personsReady) return
    void correctDonoMaster()
    const next = new URLSearchParams(searchParams)
    next.delete('corrigirMaster')
    navigate({ search: next.toString() ? `?${next}` : '' }, { replace: true })
  }, [client?.id, loading, personsReady, searchParams.get('corrigirMaster')])

  const summary = useMemo(() => readinessSummary(checks), [checks])
  const health = useClientHealth(client?.id, client?.primary_store_id ?? null)
  const visits = client?.visits ?? []
  const journey = useMemo(() => buildClientJourney({
    programKey: client?.program_template_key,
    programTotal: client?.journey_total_visits,
    visits,
  }), [client?.program_template_key, client?.journey_total_visits, visits])
  const totalVisits = journey.totalVisits
  const overdueVisitIds = useMemo(
    () => visits
      .filter(visit => isClientVisitInContract(visit.visit_number, totalVisits) && isOverdueClientVisit(visit))
      .map(visit => visit.id)
      .filter((id): id is string => Boolean(id)),
    [visits, totalVisits],
  )

  const completeOverdue = async () => {
    if (completingOverdue || !overdueVisitIds.length) return
    setCompletingOverdue(true)
    try {
      const result = await completeOverdueConsultingVisits(overdueVisitIds)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`${result.updated} encontro(s) marcado(s) como realizado(s).`)
      await refetch()
    } finally {
      setCompletingOverdue(false)
    }
  }
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
  const journeyProgressPct = totalVisits > 0 ? Math.round((journey.completedVisits / totalVisits) * 100) : 0
  const showValidateActivate = useMemo(() => {
    if (!client) return false
    if (!isActive(client)) return true
    if (portfolioStatus === 'em_configuracao' || portfolioStatus === 'prontos_para_ativar') return true
    return !summary.canActivate
  }, [client, portfolioStatus, summary.canActivate])
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
      scheduled_at: visit.scheduled_at,
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
  const primaryContact = client?.contacts?.find(contact => contact.is_primary) ?? client?.contacts?.[0] ?? null
  const consultingCurrentLine = useMemo(() => {
    if (totalVisits > 0 && journey.completedVisits >= totalVisits) return 'Jornada concluída'
    const open = visits.find(visit => {
      const status = String(visit.status ?? '').trim().toLowerCase()
      return !isCompletedClientVisit(visit.status) && status !== 'cancelada' && status !== 'cancelado'
    })
    const current = open ?? visits[0]
    return current ? `Encontro atual: ${clientVisitDisplayTitle(current)}` : 'Sem encontro na jornada'
  }, [journey.completedVisits, totalVisits, visits])

  const programInitialDraft = useMemo<ProgramDraft>(() => {
    const assignments = client?.assignments ?? []
    const responsible = assignments.find(a => a.active && a.assignment_role === 'responsavel')?.user_id ?? ''
    const auxiliaries = assignments.filter(a => a.active && a.assignment_role !== 'responsavel').map(a => a.user_id)
    return {
      product_name: client?.product_name ?? '',
      program_template_key: (client as { program_template_key?: string | null })?.program_template_key ?? '',
      modality: normalizeProgramModality(client?.modality) || client?.modality || '',
      contract_start_date: (client as { contract_start_date?: string | null })?.contract_start_date
        || (typeof client?.created_at === 'string' ? client.created_at.slice(0, 10) : ''),
      contract_end_date: (client as { contract_end_date?: string | null })?.contract_end_date ?? '',
      implementation_owner_id: (client as { implementation_owner_id?: string | null })?.implementation_owner_id || responsible,
      responsible_consultant_id: responsible,
      auxiliary_consultant_ids: auxiliaries,
    }
  }, [client])

  const identityUnit = useMemo(() => resolveIdentificationUnit(units), [units])
  const identityInitial = useMemo(() => {
    if (!client) return null
    return buildClientIdentificationDraft({
      name: client.name,
      legalName: client.legal_name,
      cnpj: client.cnpj,
      notes: client.notes,
      structureType: client.structure_type ?? null,
      city: identityUnit?.city ?? null,
      state: identityUnit?.state ?? null,
      businessPhase: (client as { business_phase?: string | null }).business_phase ?? null,
      contractEndDate: (client as { contract_end_date?: string | null }).contract_end_date ?? null,
    })
  }, [client, identityUnit])

  const implementationOwnerName = team.rows.find(member => member.id === (client as { implementation_owner_id?: string | null } | null)?.implementation_owner_id)?.name ?? responsibleConsultant
  const headerLocation = [identityUnit?.city, identityUnit?.state].filter(Boolean).join(', ')
  const headerMeta = useMemo(() => ({
    location: headerLocation || null,
    comercial: responsibleConsultant,
    implantacao: implementationOwnerName,
  }), [headerLocation, implementationOwnerName, responsibleConsultant])

  const onboardingStep = (client as { onboarding_step?: number | null })?.onboarding_step ?? 1
  const onboardingCompleted = (client as { onboarding_completed?: boolean | null })?.onboarding_completed ?? false
  const plannedStartDate = formatDate(
    (client as { scheduled_activation_at?: string | null }).scheduled_activation_at
      ?? (client as { contract_start_date?: string | null }).contract_start_date,
  )

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
      const { error: personError, reused } = editingPersonId
        ? { ...(await updateClientPerson(client.id, editingPersonId, draft)), reused: false }
        : await createClientPerson(client.id, draft, supabaseUser.id)
      if (personError) {
        toast.error(personError)
        return
      }
      toast.success(editingPersonId
        ? 'Usuário atualizado.'
        : reused
          ? 'Identidade existente reaberta. O convite permanece em preparação, sem duplicar o cadastro.'
          : 'Usuário cadastrado.')
      setPersonModal(false)
      setPersonPrefill(null)
      setEditingPersonId(null)
      await loadPersons()
    } finally {
      setSavingPerson(false)
    }
  }

  const submitIdentity = async (draft: Parameters<typeof saveClientIdentification>[0]['draft']) => {
    if (!client?.id || !supabaseUser) return
    setSavingIdentity(true)
    try {
      const { error: identityError } = await saveClientIdentification({
        clientId: client.id,
        unitId: identityUnit?.id ?? null,
        draft,
        actorId: supabaseUser.id,
      })
      if (identityError) {
        toast.error(identityError)
        return
      }
      toast.success('Identificação do cliente atualizada.')
      setIdentityOpen(false)
      await loadUnits()
      await refetch()
    } finally {
      setSavingIdentity(false)
    }
  }

  const resendInvite = async (person: PersonAccessRow) => {
    if (!client?.id || !client.slug || !supabaseUser) return
    setSavingPerson(true)
    try {
      const result = await resendPersonInvite({
        clientId: client.id,
        clientSlug: client.slug,
        origin: window.location.origin,
        createdBy: supabaseUser.id,
        person,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (result.url) {
        try {
          await navigator.clipboard.writeText(result.url)
        } catch {
          /* clipboard pode falhar em contexto inseguro; o toast ainda entrega o link */
        }
        toast.success(result.reusedLink
          ? `Convite reenviado com o link vigente. ${result.url}`
          : `Convite gerado. Link copiado: ${result.url}`)
      }
      await loadPersons()
      await loadLinks()
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

  const openCurrentStrategicPlan = async () => {
    if (!client?.id || creatingStrategicPlan) return
    setCreatingStrategicPlan(true)
    try {
      const year = strategicPlanYear || new Date().getFullYear()
      let cycleId = strategicPlanCycleId
      let created = false
      let indicatorCount = 0

      if (!cycleId) {
        const result = await createStrategicPlanFromProduct({
          clientId: client.id,
          referenceYear: year,
          userId: supabaseUser?.id,
        })
        if (result.error) {
          toast.error(result.error)
          return
        }
        created = result.created
        indicatorCount = result.indicatorCount
        cycleId = result.cycle?.id ?? null
        setStrategicPlanCycleId(cycleId)
        toast.success(created
          ? `Plano Estratégico criado com ${indicatorCount} indicadores padrão.`
          : 'Plano Estratégico já existente; abrindo o cadastro rápido.')
        await loadStrategicPlan()
      }

      setPlanningTab('estrategico')
      setTab('planejamento')
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
          description={client ? (
            <>
              {`${client.legal_name || 'Sem razão social'} · ${client.product_name || 'Produto não definido'}`}
              {headerMeta.location || headerMeta.comercial || headerMeta.implantacao ? (
                <span className="mt-1 block">
                  {[
                    headerMeta.location,
                    headerMeta.comercial ? `Comercial: ${headerMeta.comercial}` : null,
                    headerMeta.implantacao ? `Implantação: ${headerMeta.implantacao}` : null,
                  ].filter(Boolean).join(' · ')}
                </span>
              ) : null}
            </>
          ) : 'Visão 360 do cliente na consultoria.'}
          actions={(
            <>
              <Button asChild variant="outline"><Link to="/clientes"><ArrowLeft size={16} />Clientes</Link></Button>
              <Button variant="outline" onClick={() => void refetch()}><RefreshCw size={16} />Atualizar</Button>
              {client && !onboardingCompleted && String(client.status ?? '').toLowerCase() !== 'ativo' ? (
                <Button asChild variant="outline"><Link to={`/clientes/novo?continue=${client.id}`}><ArrowLeft size={16} />Continuar onboarding</Link></Button>
              ) : null}
              {client && showValidateActivate
                ? <Button onClick={() => setActivationOpen(true)}><CheckCircle2 size={16} />Validar e Ativar</Button>
                : null}
              {client ? (
                <Button variant="outline" size="icon" aria-label="Editar identificação do cliente" onClick={() => setIdentityOpen(true)}>
                  <Pencil size={16} />
                </Button>
              ) : null}
              {client ? <Button variant="outline" onClick={() => void openCurrentStrategicPlan()} disabled={creatingStrategicPlan}><Target size={16} />{creatingStrategicPlan ? 'Abrindo...' : strategicPlanReadiness ? 'Abrir Plano' : 'Criar Plano Estratégico'}</Button> : null}
              {client ? <Button variant="outline" onClick={() => { setPlanningTab('plano-acao'); setTab('planejamento') }}><ClipboardList size={16} />Abrir Plano de Ação</Button> : null}
              {client ? <Button asChild variant="outline"><Link to={`/clientes/${encodeURIComponent(client.slug || client.id)}/consultoria`}><Sparkles size={16} />Abrir Consultoria</Link></Button> : null}
            </>
          )}
        />

        {loading ? <MxLoadingState label="Carregando cliente" /> : error ? <MxErrorState description={error} retry={() => void refetch()} /> : !client ? (
          <MxEmptyState title="Cliente não encontrado" description="Verifique o endereço ou volte para a lista de clientes." />
        ) : (
          <>
            <MxMetricGrid>
              <MxMetricCard title="Lojas" value={units.length ?? 0} detail="Matriz e filiais operacionais" icon={Building2} tone="info" />
              <MxMetricCard title="Usuários" value={persons.length} detail="Acessos e vínculos de loja" icon={UserPlus} tone="violet" />
              <MxMetricCard title="Encontros concluídos" value={journey.completedVisits} detail={totalVisits > 0 ? `de ${totalVisits} previstos` : 'Sem jornada contratada'} icon={Clock} tone="info" />
              <MxMetricCard title="Progresso da jornada" value={`${journeyProgressPct}%`} detail={totalVisits > 0 ? `${journey.completedVisits}/${totalVisits} encontros` : '—'} icon={BriefcaseBusiness} tone={journeyProgressPct >= 100 ? 'success' : 'brand'} />
            </MxMetricGrid>

            <TabNav tabs={TABS} activeTab={tab} onTabChange={setTab} scrollable />

            {tab === 'visao' ? (
              <div className="space-y-5">
                <MxSectionCard>
                  <MxSectionHeader title="Informações Gerais" description="Fase, estrutura e progresso do onboarding." />
                  <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ['Fase empresarial', clientBusinessPhaseLabel((client as { business_phase?: string | null }).business_phase)],
                      ['Estrutura', clientStructureDisplay((client as { structure_type?: string | null }).structure_type)],
                      ['Onboarding', onboardingCompleted ? 'Concluído' : `Etapa ${onboardingStep}/7`],
                      ['Início previsto', plannedStartDate],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-border p-3">
                        <dt className="text-xs text-muted-foreground">{label}</dt>
                        <dd className="font-semibold text-foreground">{value}</dd>
                      </div>
                    ))}
                  </div>
                </MxSectionCard>

                <MxSectionCard>
                  <MxSectionHeader title="Contato Principal" description="Canal principal de comunicação com o cliente." />
                  <div className="grid gap-3 p-5 sm:grid-cols-3">
                    {[
                      ['Nome', primaryContact?.name || '—'],
                      ['Telefone', primaryContact?.phone || '—'],
                      ['E-mail', primaryContact?.email || '—'],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-border p-3">
                        <dt className="text-xs text-muted-foreground">{label}</dt>
                        <dd className="font-semibold text-foreground">{value}</dd>
                      </div>
                    ))}
                  </div>
                </MxSectionCard>

                <MxSectionCard>
                  <MxSectionHeader title="Entrega da Consultoria" description="Plano estratégico, plano de ação e consultoria do programa contratado." />
                  <div className="grid gap-3 p-5 lg:grid-cols-3">
                    <div className="rounded-xl border border-border bg-surface-alt p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plano Estratégico</div>
                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <div>Ciclo: PE {strategicPlanYear}</div>
                        <div>Indicadores com meta: {strategicPlanReadiness?.indicadoresComMeta ?? 0}</div>
                        <div>
                          Metas publicadas:{' '}
                          <span className="font-semibold text-status-success-text">{strategicPlanReadiness?.ready ?? 0}</span>
                        </div>
                        <div>
                          Metas pendentes:{' '}
                          <span className="font-semibold text-status-warning-text">{strategicPlanReadiness?.pending ?? 0}</span>
                        </div>
                        <div>
                          Status:{' '}
                          <span className="font-semibold text-foreground">
                            {strategicPlanReadiness
                              ? PLAN_CYCLE_STATUS_LABEL[strategicPlanReadiness.cycleStatus]
                              : '—'}
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => void openCurrentStrategicPlan()} disabled={creatingStrategicPlan}>Abrir Plano</Button>
                    </div>
                    <div className="rounded-xl border border-border bg-surface-alt p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plano de Ação</div>
                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <div>Ações totais: {actionPlanSummary?.total ?? '—'}</div>
                        <div>Não iniciadas: {actionPlanSummary?.naoIniciadas ?? '—'}</div>
                        <div>
                          Em andamento:{' '}
                          <span className="font-semibold text-status-info-text">{actionPlanSummary?.emAndamento ?? '—'}</span>
                        </div>
                        <div>
                          Atrasadas:{' '}
                          <span className="font-semibold text-status-danger-text">{actionPlanSummary?.atrasadas ?? '—'}</span>
                        </div>
                        <div>
                          Concluídas:{' '}
                          <span className="font-semibold text-status-success-text">{actionPlanSummary?.completed ?? '—'}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => { setPlanningTab('plano-acao'); setTab('planejamento') }}>Abrir Plano de Ação</Button>
                    </div>
                    <div className="rounded-xl border border-border bg-surface-alt p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Consultoria e Entregas</div>
                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <div>{consultingCurrentLine}</div>
                        <div>
                          Encontros: {totalVisits > 0 ? `${journey.completedVisits}/${totalVisits}` : visits.length}
                          {journey.overdueVisits ? ` · ${journey.overdueVisits} atrasada(s)` : ''}
                        </div>
                      </div>
                      <Button asChild variant="outline" size="sm" className="mt-4"><Link to={`/clientes/${encodeURIComponent(client.slug || client.id)}/consultoria`}>Abrir Consultoria</Link></Button>
                    </div>
                  </div>
                </MxSectionCard>
              </div>
            ) : null}

            {tab === 'lojas' ? (
              <MxSectionCard>
                <MxSectionHeader
                  title="Empresa e Lojas"
                  description={`${units.length} loja(s) operacional(is) — matriz e filiais.`}
                  actions={<Button size="sm" onClick={() => setStoreModal({ open: true, initial: null })}><Plus size={16} />Adicionar Loja</Button>}
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
                              <Pencil size={14} />Editar Loja
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setHoursUnitId(hoursUnitId === unit.id ? null : unit.id)}>
                              <Clock size={14} />Configurar Horário
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
                    <p className="mb-3 text-xs text-muted-foreground">Cadastre usuários manualmente com papel, Loja e visão padrão.</p>
                    <Button size="sm" onClick={() => { setEditingPersonId(null); setPersonPrefill(null); setPersonModal(true) }}><UserPlus size={14} />Cadastrar Usuário</Button>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <div className="mb-2 flex items-center gap-2"><Link2 size={16} className="text-status-info-text" /><h4 className="text-sm font-medium text-foreground">Autocadastro por Link</h4></div>
                    <p className="mb-3 text-xs text-muted-foreground">Gere um link para que a equipe do cliente se cadastre.</p>
                    <Button size="sm" variant="outline" onClick={() => setLinkModal(true)}><Link2 size={14} />Gerar Link</Button>
                  </div>
                </div>
                <MxSectionCard>
                  <MxSectionHeader title={`Usuários ( ${persons.length} )`} description="Equipe por loja: cada filial tem gerente e vendedores próprios." />
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
                              {person.status !== 'ativo' ? (
                                <Button variant="outline" size="sm" onClick={() => void resendInvite(person)} disabled={savingPerson}>
                                  <Mail size={14} />Reenviar convite
                                </Button>
                              ) : null}
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
                  <MxSectionHeader
                    title="Jornada de encontros"
                    description={`${journey.completedVisits} concluídos · ${Math.max(0, journey.totalVisits - journey.completedVisits)} restantes${journey.overdueVisits ? ` · ${journey.overdueVisits} atrasada(s)` : ''}`}
                    actions={overdueVisitIds.length ? (
                      <Button size="sm" onClick={() => void completeOverdue()} disabled={completingOverdue}>
                        {completingOverdue ? 'Registrando...' : `Marcar ${overdueVisitIds.length} atrasada(s) como realizada(s)`}
                      </Button>
                    ) : undefined}
                  />
                  <div className="space-y-4 p-5">
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
                          <TableHeader><TableRow><TableHead>Encontro</TableHead><TableHead>Consultor</TableHead><TableHead>Data</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {visits.map(visit => {
                              const consultantName = visit.consultant?.name ?? team.rows.find(member => member.id === visit.consultant_id)?.name ?? '—'
                              const modality = String(visit.modality || '').trim().toUpperCase() || '—'
                              return (
                              <TableRow key={visit.id}>
                                <TableCell>
                                  <div className="font-semibold text-foreground">{clientVisitDisplayTitle(visit)}</div>
                                  <div className="mt-0.5 text-xs text-muted-foreground">Consultor: {consultantName} · {modality}</div>
                                </TableCell>
                                <TableCell>{consultantName}</TableCell>
                                <TableCell>{formatDate(visit.scheduled_at)}</TableCell>
                                <TableCell>{clientVisitStatusLabel(visit)}</TableCell>
                              </TableRow>
                              )
                            })}
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
                  visitsDone: visits.filter(visit => isCompletedClientVisit(visit.status)).length,
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
                    cycleId={strategicPlanCycleId}
                    year={strategicPlanYear}
                    onCycleChange={handleStrategicPlanCycleChange}
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
              <ClientDadosTab sources={health.sources} loading={health.loading} error={health.error} onRetry={() => void health.refetch()} />
            ) : null}

            {tab === 'historico' ? (
              <ClientHistoricoTab events={health.timeline} loading={health.loading} error={health.error} onRetry={() => void health.refetch()} />
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
              onCorrect={check => void correctReadiness(check.key)}
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

            <ClientIdentificationModal
              open={identityOpen}
              submitting={savingIdentity}
              initial={identityInitial}
              requireAddress={false}
              onSubmit={draft => void submitIdentity(draft)}
              onClose={() => setIdentityOpen(false)}
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
              persons={persons.map(person => ({ id: person.id, is_dono_master: person.is_dono_master, status: person.status }))}
              personId={editingPersonId}
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
