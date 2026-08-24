import { useEffect, useState } from 'react'
import { Target } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import AdminIndicadoresPage from '@/features/admin-mx/AdminIndicadoresPage'
import AdminStrategicPlanEditor from '@/features/admin-mx/indicadores/AdminStrategicPlanEditor'
import { MxErrorState, MxLoadingState, MxModulePage, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { fetchCurrentCycle } from '@/features/strategic-plan/planCycleRepository'
import { StrategicPlanWorkspace } from '@/features/strategic-plan/StrategicPlanWorkspace'
import { AdminAsOwnerStrategicPlan } from './AdminAsOwnerStrategicPlan'
import { InternalMxPlanningShell, useInternalPlanningStore } from './InternalMxPlanningShell'

export default function InternalStrategicPlanPage() {
  const store = useInternalPlanningStore()
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const cycleId = params.get('cycleId')
  const clientId = params.get('clientId')
  const storeId = params.get('storeId')
  const preview = params.get('preview') === '1'
  const viewAsDono = params.get('viewAs') === 'dono' || params.get('viewAs') === 'owner'
  const isClientRoute = location.pathname.startsWith('/clientes/')
  const requestedYear = Number(params.get('year'))
  const year = Number.isInteger(requestedYear) && requestedYear >= 2020 && requestedYear <= 2100 ? requestedYear : undefined
  const resolveYear = year ?? new Date().getFullYear()
  const [resolveState, setResolveState] = useState<'idle' | 'loading' | 'missing' | 'error'>(
    clientId && !cycleId ? 'loading' : 'idle',
  )
  const [resolveError, setResolveError] = useState<string | null>(null)

  useEffect(() => {
    if (cycleId || !clientId) {
      setResolveState('idle')
      setResolveError(null)
      return
    }
    let active = true
    setResolveState('loading')
    void fetchCurrentCycle(clientId, resolveYear).then(result => {
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
      setResolveState('missing')
    })
    return () => { active = false }
  }, [clientId, cycleId, location.pathname, location.search, navigate, resolveYear])

  // Visualizar como Dono: workspace real do Dono (shell owner), sem chrome Admin.
  // MxModulePage nos estados locais evita o gate adopted-route-canvas seguir
  // MxStatusBanner/MxLoadingState até MxModuleVisualPrimitives (PageCanvas interno).
  if (viewAsDono) {
    const ownerStoreId = storeId || store.selectedStoreId || null
    if (!ownerStoreId) {
      return (
        <MxModulePage id="page-plano-estrategico" width="dashboard" bottomClearance="navigation">
          <MxStatusBanner tone="warning">
            Selecione uma loja (storeId) para Visualizar como Dono.
          </MxStatusBanner>
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

  if (!storeId && !isClientRoute) {
    return <AdminIndicadoresPage initialTab="catalogo" />
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
