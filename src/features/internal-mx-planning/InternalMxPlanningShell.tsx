import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Building2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Select } from '@/components/atoms/Select'
import { MxField, MxModuleHeader, MxModulePage, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { PlanningWorkspaceProvider } from '@/features/planning-workspace'
import { useAuth } from '@/hooks/useAuth'
import { useStores } from '@/hooks/useStores'
import { supabase } from '@/lib/supabase'
import { toInternalPlanningActor } from './internalPlanningAdapter'

export function useInternalPlanningStore() {
  const { activeStoreId, setActiveStoreId } = useAuth()
  const { lojas, loading, error, refetch } = useStores()
  const queryStoreId = useMemo(() => new URLSearchParams(window.location.search).get('storeId') || '', [])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const stores = useMemo(() => lojas.filter((store) => store.active), [lojas])

  useEffect(() => {
    if (loading) return
    const queryIsValid = Boolean(queryStoreId && stores.some((store) => store.id === queryStoreId))
    const activeIsValid = Boolean(activeStoreId && stores.some((store) => store.id === activeStoreId))
    const preferred = queryIsValid ? queryStoreId : activeIsValid ? activeStoreId || '' : ''
    setSelectedStoreId((current) => current === preferred ? current : preferred)

    if (queryStoreId && !queryIsValid) {
      const url = new URL(window.location.href)
      url.searchParams.delete('storeId')
      window.history.replaceState({}, '', url)
    }
  }, [activeStoreId, loading, queryStoreId, stores])

  const selectStore = (storeId: string) => {
    const validStoreId = stores.some((store) => store.id === storeId) ? storeId : ''
    setSelectedStoreId(validStoreId)
    setActiveStoreId(validStoreId || null)
    const url = new URL(window.location.href)
    if (validStoreId) url.searchParams.set('storeId', validStoreId)
    else url.searchParams.delete('storeId')
    window.history.replaceState({}, '', url)
  }

  return {
    stores,
    loading,
    error,
    refetch,
    selectedStoreId,
    selectStore,
    selectedStore: stores.find((store) => store.id === selectedStoreId) || null,
  }
}

export function InternalMxPlanningShell({
  title,
  description,
  eyebrow = 'Gestão global MX',
  store,
  onRefresh,
  refreshing = false,
  children,
}: {
  title: string
  description: string
  eyebrow?: string
  store: ReturnType<typeof useInternalPlanningStore>
  onRefresh?: () => void
  refreshing?: boolean
  children: ReactNode
}) {
  const { profile, role } = useAuth()
  const actor = useMemo(() => {
    if (!profile || !role) return null
    try {
      return toInternalPlanningActor({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role,
      })
    } catch {
      return null
    }
  }, [profile, role])

  const content = (
    <MxModulePage id={`internal-${title.toLocaleLowerCase('pt-BR').replaceAll(' ', '-')}`}>
      <MxModuleHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={(
          <>
            <Button variant="outline" size="icon" onClick={onRefresh || (() => void store.refetch())} disabled={refreshing} aria-label={`Atualizar ${title}`}>
              <RefreshCw size={17} className={refreshing ? 'animate-spin' : undefined} aria-hidden="true" />
            </Button>
            <div className="min-w-[260px]">
              <MxField label="Loja de operação" htmlFor={`internal-store-${title}`}>
                <Select id={`internal-store-${title}`} aria-label={`Selecionar loja para ${title}`} value={store.selectedStoreId} onChange={(event: { target: { value: string } }) => store.selectStore(event.target.value)} disabled={store.loading}>
                  <option value="">Selecione uma loja ativa</option>
                  {store.stores.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </Select>
              </MxField>
            </div>
          </>
        )}
      />
      {store.error ? <MxStatusBanner tone="danger">{store.error}</MxStatusBanner> : null}
      {!actor ? <MxStatusBanner tone="danger">Perfil sem acesso ao workspace interno MX.</MxStatusBanner> : null}
      {!store.selectedStoreId && !store.loading ? <MxStatusBanner tone="info"><Building2 size={16} className="mr-2 inline" aria-hidden="true" />Selecione uma loja para carregar os dados globais.</MxStatusBanner> : null}
      {actor ? children : null}
    </MxModulePage>
  )

  if (!actor) return content

  return (
    <PlanningWorkspaceProvider shell="internal" storeId={store.selectedStoreId || null} actor={actor}>
      {content}
    </PlanningWorkspaceProvider>
  )
}

// Compatibility bridge for the existing internal pages. Each page drops this
// hook when its phase moves realtime ownership into PlanningWorkspaceProvider.
export function useInternalPlanningRealtime(onReload: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel('internal-mx-planning-native')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'planos_acao' }, onReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'regras_metas_loja' }, onReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes_consultoria' }, onReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitas_consultoria' }, onReload)
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [onReload])
}
