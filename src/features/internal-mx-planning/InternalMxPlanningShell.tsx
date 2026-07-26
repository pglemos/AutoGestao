import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Building2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Select } from '@/components/atoms/Select'
import { MxField, MxModuleHeader, MxModulePage, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { useAuth } from '@/hooks/useAuth'
import { useStores } from '@/hooks/useStores'
import { supabase } from '@/lib/supabase'

export function useInternalPlanningStore() {
  const { activeStoreId, setActiveStoreId } = useAuth()
  const { lojas, loading, error, refetch } = useStores()
  const queryStoreId = useMemo(() => new URLSearchParams(window.location.search).get('storeId') || '', [])
  const [selectedStoreId, setSelectedStoreId] = useState(queryStoreId || activeStoreId || '')
  const stores = useMemo(() => lojas.filter((store) => store.active), [lojas])

  useEffect(() => {
    const preferred = queryStoreId || activeStoreId
    if (preferred && stores.some((store) => store.id === preferred)) setSelectedStoreId(preferred)
    else if (!selectedStoreId && stores[0]) setSelectedStoreId(stores[0].id)
  }, [activeStoreId, queryStoreId, selectedStoreId, stores])

  const selectStore = (storeId: string) => {
    setSelectedStoreId(storeId)
    setActiveStoreId(storeId || null)
    const url = new URL(window.location.href)
    if (storeId) url.searchParams.set('storeId', storeId)
    else url.searchParams.delete('storeId')
    window.history.replaceState({}, '', url)
  }

  return { stores, loading, error, refetch, selectedStoreId, selectStore, selectedStore: stores.find((store) => store.id === selectedStoreId) || null }
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
  return (
    <MxModulePage id={`internal-${title.toLocaleLowerCase('pt-BR').replaceAll(' ', '-')}`}>
      <MxModuleHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={(
          <>
            <Button variant="managerSecondary" size="icon" onClick={onRefresh || (() => void store.refetch())} disabled={refreshing} aria-label={`Atualizar ${title}`}>
              <RefreshCw size={17} className={refreshing ? 'animate-spin' : undefined} aria-hidden="true" />
            </Button>
            <div className="min-w-[260px]">
              <MxField label="Loja de operação" htmlFor={`internal-store-${title}`}>
                <Select id={`internal-store-${title}`} aria-label={`Selecionar loja para ${title}`} value={store.selectedStoreId} onChange={(event) => store.selectStore(event.target.value)} disabled={store.loading}>
                  <option value="">Selecione uma loja ativa</option>
                  {store.stores.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </Select>
              </MxField>
            </div>
          </>
        )}
      />
      {store.error ? <MxStatusBanner tone="danger">{store.error}</MxStatusBanner> : null}
      {!store.selectedStoreId && !store.loading ? <MxStatusBanner tone="info"><Building2 size={16} className="mr-2 inline" aria-hidden="true" />Selecione uma loja para carregar os dados globais.</MxStatusBanner> : null}
      {children}
    </MxModulePage>
  )
}

export function useInternalPlanningRealtime(onReload: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel('internal-mx-planning-native')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'planos_acao' }, onReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'regras_metas_loja' }, onReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes_consultoria' }, onReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitas_consultoria' }, onReload)
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [onReload])
}
