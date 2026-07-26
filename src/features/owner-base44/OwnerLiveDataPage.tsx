import { useEffect } from 'react'
import { useLocation, useOutletContext } from 'react-router-dom'
import { useOwner } from '@/components/owner/OwnerContext'
import { DashboardErrorBoundary } from '@/features/dashboard-loja/components/DashboardErrorBoundary'
import { useDashboardLojaData } from '@/features/dashboard-loja/hooks/useDashboardLojaData'
import { PerformanceLoadingSkeleton } from '@/features/dashboard-loja/sections/DashboardEmptyStates'
import { OwnerExecutiveCockpit } from '@/features/dashboard-loja/sections/OwnerExecutiveCockpit'
import { usePerformanceAlerts } from '@/features/dashboard-loja/sections/PerformanceAlerts'

type OwnerOutletContext = {
  setLastUpdated?: (value: Date) => void
}

type OwnerContextValue = {
  currentUnits: Array<{ id: string; name: string }>
  unitId: string
  loading: boolean
  error: string | null
  periodRange: { start: string; end: string }
  period: 'month' | 'quarter' | 'year' | 'custom'
  openConsultantModal: (context: {
    title: string
    requestType: string
    priority: string
    contextType: string
  }) => void
}

export default function OwnerLiveDataPage() {
  const location = useLocation()
  const { setLastUpdated } = useOutletContext<OwnerOutletContext>()
  const {
    currentUnits,
    unitId,
    loading: storesLoading,
    error: storesError,
    openConsultantModal,
    periodRange,
    period,
  } = useOwner() as OwnerContextValue

  const selectedStore = currentUnits.find(unit => unit.id === unitId) ?? null
  const data = useDashboardLojaData({
    selectedStoreId: selectedStore?.id ?? null,
    selectedStoreName: selectedStore?.name ?? 'Unidade não selecionada',
    loadOwnerConsultingProgram: true,
    period,
    periodRange,
  })
  const { alerts } = usePerformanceAlerts({
    role: 'dono',
    isOwner: true,
    metrics: data.metrics,
    sellers: data.sellers,
    checkins: data.checkins,
    funilData: data.funilData,
    funnelBenchmarks: data.funnelBenchmarks,
    selectedStoreId: selectedStore?.id ?? null,
  })

  useEffect(() => {
    setLastUpdated?.(new Date())
  }, [data.lastSyncAt, setLastUpdated])

  useEffect(() => {
    if (new URLSearchParams(location.search).get('openConsultant') !== '1') return
    openConsultantModal({
      title: 'Falar com Consultor',
      requestType: 'general_support',
      priority: 'medium',
      contextType: 'general',
    })
  }, [location.search, openConsultantModal])

  if (storesLoading || (selectedStore && data.loading && !data.isRefetching)) {
    return <PerformanceLoadingSkeleton />
  }

  if (storesError) {
    return (
      <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-6" role="alert">
        <h1 className="text-lg font-semibold text-foreground">Não foi possível carregar as unidades</h1>
        <p className="mt-2 text-sm text-muted-foreground">{storesError}</p>
      </section>
    )
  }

  if (data.error) {
    return (
      <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-6" role="alert">
        <h1 className="text-lg font-semibold text-foreground">Não foi possível carregar o cockpit</h1>
        <p className="mt-2 text-sm text-muted-foreground">{data.error}</p>
        <button type="button" onClick={() => void data.handleRefresh()} className="mt-4 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Tentar novamente</button>
      </section>
    )
  }

  if (!selectedStore) {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <h1 className="text-lg font-semibold text-foreground">Nenhuma unidade vinculada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Seu perfil de Dono ainda não possui uma loja ativa disponível. Solicite a regularização do vínculo ao Admin MX.
        </p>
      </section>
    )
  }

  return (
    <DashboardErrorBoundary sectionName="OwnerLiveData">
      <OwnerExecutiveCockpit data={data} alerts={alerts} />
    </DashboardErrorBoundary>
  )
}
