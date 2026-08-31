import { useEffect, useState } from 'react'
import { Target } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import AdminIndicadoresPage from '@/features/admin-mx/AdminIndicadoresPage'
import AdminStrategicPlanEditor from '@/features/admin-mx/indicadores/AdminStrategicPlanEditor'
import { MxErrorState, MxLoadingState, MxModulePage, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { fetchCurrentCycle, ensureCycle } from '@/features/strategic-plan/planCycleRepository'
import { fetchConsultingClientIdBySlug } from '@/features/strategic-plan/clientPlanningRepository'
import { StrategicPlanWorkspace } from '@/features/strategic-plan/StrategicPlanWorkspace'
import { AdminAsOwnerStrategicPlan } from './AdminAsOwnerStrategicPlan'
import { InternalMxPlanningShell, useInternalPlanningStore } from './InternalMxPlanningShell'

type StrategicCatalogTab = 'catalogo' | 'parametros' | 'planos' | 'historico'

function resolveStrategicCatalogTab(mode: string | null): StrategicCatalogTab {
  if (mode === 'catalogo' || mode === 'parametros' || mode === 'historico' || mode === 'planos') return mode
  return 'catalogo'
}

export default function InternalStrategicPlanPage() {
  const store = useInternalPlanningStore()
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const cycleId = params.get('cycleId')
  const clientId = params.get('clientId')
  const storeId = params.get('storeId')
  const isPreviewRoute = location.pathname.endsWith('/preview') || params.get('preview') === '1'
  const isVisualizacaoDonoRoute = location.pathname.endsWith('/visualizacao-dono') || params.get('viewAs') === 'dono' || params.get('viewAs') === 'owner'
  const preview = isPreviewRoute
  const viewAsDono = isVisualizacaoDonoRoute
  const catalogTab = resolveStrategicCatalogTab(params.get('mode'))
  const { clientSlug, year: yearSegment } = useParams<{ clientSlug?: string; year?: string }>()
  const isClientRoute = location.pathname.startsWith('/clientes/')
  const isGlobalCatalogRoute = !storeId && !isClientRoute && !clientId && !cycleId
  const requestedYear = Number(yearSegment || params.get('year'))
  const year = Number.isInteger(requestedYear) && requestedYear >= 2020 && requestedYear <= 2100 ? requestedYear : undefined
  const resolveYear = year ?? new Date().getFullYear()
  const [resolveState, setResolveState] = useState<'idle' | 'loading' | 'missing' | 'error'>(
    clientId && !cycleId ? 'loading' : 'idle',
  )
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [resolvedOwnerStoreId, setResolvedOwnerStoreId] = useState<string | null>(null)

  useEffect(() => {
    if (!isGlobalCatalogRoute) return
    const mode = new URLSearchParams(location.search).get('mode')
    if (mode) return
    const next = new URLSearchParams(location.search)
    next.set('mode', 'catalogo')
    navigate(`${location.pathname}?${next.toString()}`, { replace: true })
  }, [isGlobalCatalogRoute, location.pathname, location.search, navigate])

  useEffect(() => {
    if (clientId || !isClientRoute || !clientSlug) return
    let active = true
    void fetchConsultingClientIdBySlug(clientSlug).then(result => {
      if (!active) return
      if (result.id) {
        const next = new URLSearchParams(location.search)
        next.set('clientId', result.id)
        navigate(`${location.pathname}?${next.toString()}`, { replace: true })
      } else {
        setResolveState('error')
        setResolveError('Cliente não encontrado.')
      }
    })
    return () => { active = false }
  }, [clientId, clientSlug, isClientRoute, location.pathname, location.search, navigate])

  useEffect(() => {
    if (!viewAsDono || storeId || store.selectedStoreId) return
    if (!clientId) return
    let active = true
    void fetchConsultingClientIdBySlug(clientSlug || clientId).then(async res => {
      if (!active || !res.id) return
      const { fetchClientUnits } = await import('@/features/strategic-plan/clientPlanningRepository')
      const unitsRes = await fetchClientUnits(res.id)
      if (!active) return
      const primary = unitsRes.units.find(u => u.store_type === 'MATRIZ') ?? unitsRes.units[0]
      if (primary) setResolvedOwnerStoreId(primary.id)
    })
    return () => { active = false }
  }, [clientId, clientSlug, store.selectedStoreId, storeId, viewAsDono])

  useEffect(() => {
    if (cycleId || !clientId) {
      if (!clientId && !clientSlug) {
        setResolveState('idle')
        setResolveError(null)
      }
      return
    }
    let active = true
    setResolveState('loading')
    void fetchCurrentCycle(clientId, resolveYear).then(async result => {
      if (!active) return
      if (result.error) {
        setResolveError(result.error)
        setResolveState('error')
        return
      }
      if (result.cycle) {
        const next = new URLSearchParams(location.search)
        next.set('cycleId', result.cycle.id)
        navigate(`${location.pathname}?${next.toString()}`, { replace: true })
        return
      }
      // Se estamos na rota de cliente, garante/cria o ciclo rascunho
      const ensured = await ensureCycle({ clientId, year: resolveYear })
      if (!active) return
      if (ensured.cycle) {
        const next = new URLSearchParams(location.search)
        next.set('cycleId', ensured.cycle.id)
        navigate(`${location.pathname}?${next.toString()}`, { replace: true })
        return
      }
      if (ensured.error) {
        setResolveError(ensured.error)
        setResolveState('error')
        return
      }
      setResolveState('missing')
    })
    return () => { active = false }
  }, [clientId, clientSlug, cycleId, location.pathname, location.search, navigate, resolveYear])

  // Visualizar como Dono: workspace real do Dono (shell owner), sem chrome Admin.
  if (viewAsDono) {
    const ownerStoreId = storeId || store.selectedStoreId || resolvedOwnerStoreId || null
    if (!ownerStoreId) {
      return (
        <MxModulePage id="page-plano-estrategico" width="dashboard" bottomClearance="navigation">
          <MxLoadingState label="Carregando Visualização do Dono..." />
        </MxModulePage>
      )
    }
    return <AdminAsOwnerStrategicPlan storeId={ownerStoreId} year={year} />
  }

  if (cycleId) {
    return <AdminStrategicPlanEditor cycleId={cycleId} readOnly={preview} />
  }

  if (clientId && resolveState === 'loading') {
    return (
      <MxModulePage id="page-plano-estrategico" width="dashboard" bottomClearance="navigation">
        <MxLoadingState label="Abrindo o plano estratégico do cliente" />
      </MxModulePage>
    )
  }

  if (clientId && resolveState === 'error') {
    return (
      <MxModulePage id="page-plano-estrategico" width="dashboard" bottomClearance="navigation">
        <MxErrorState description={resolveError ?? 'Não foi possível abrir o ciclo do cliente.'} retry={() => {
          setResolveState('loading')
          void fetchCurrentCycle(clientId, resolveYear).then(result => {
            if (result.error) {
              setResolveError(result.error)
              setResolveState('error')
              return
            }
            if (result.cycle) {
              const next = new URLSearchParams(location.search)
              next.set('cycleId', result.cycle.id)
              navigate(`${location.pathname}?${next.toString()}`, { replace: true })
              return
            }
            setResolveState('missing')
          })
        }} />
      </MxModulePage>
    )
  }

  if (clientId && resolveState === 'missing') {
    return <AdminIndicadoresPage initialTab="planos" />
  }

  if (isClientRoute && !clientId && clientSlug) {
    return (
      <MxModulePage id="page-plano-estrategico" width="dashboard" bottomClearance="navigation">
        <MxLoadingState label="Abrindo o plano estratégico do cliente" />
      </MxModulePage>
    )
  }

  if (!storeId && !isClientRoute) {
    return <AdminIndicadoresPage initialTab={catalogTab} />
  }

  // `?storeId=` ou rota de cliente abre o workspace da loja (preview Dono / execução).
  return (
    <InternalMxPlanningShell
      icon={Target}
      title="Plano Estratégico"
      description="Acompanhe os indicadores, metas, comparativos e ações da loja selecionada."
      store={store}
    >
      <StrategicPlanWorkspace year={year} />
    </InternalMxPlanningShell>
  )
}
