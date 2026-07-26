import { Navigate } from 'react-router-dom'
import { Building2, ClipboardList } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CentralMxPlanoSegmentadoPanel } from '@/features/dashboard-loja/sections/CentralMxPlanoSegmentadoPanel'
import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { useStores } from '@/hooks/useStores'

/**
 * Superfície compartilhada do contrato `public.planos_acao`.
 *
 * O Dono mantém a experiência executiva detalhada em `/dono/plano-acao`.
 * Os demais perfis chegam aqui com o mesmo dado persistido, filtrado pela RLS:
 * vendedores recebem apenas o próprio escopo individual; liderança e MX
 * recebem os escopos da unidade selecionada.
 */
export function ActionPlanWorkspace() {
  const { role, membership, activeStoreId, setActiveStoreId } = useAuth()
  const { lojas, loading: storesLoading } = useStores()
  const internal = isPerfilInternoMx(role)
  const activeStores = useMemo(() => (lojas || []).filter((store) => store.active), [lojas])
  const membershipStoreId = membership?.store_id || membership?.store?.id || null
  const initialStoreId = activeStoreId || membershipStoreId || activeStores[0]?.id || null
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(initialStoreId)

  useEffect(() => {
    if (selectedStoreId || !initialStoreId) return
    setSelectedStoreId(initialStoreId)
  }, [initialStoreId, selectedStoreId])

  if (role === 'dono') return <Navigate to="/dono/plano-acao" replace />

  const storeOptions = internal
    ? activeStores
    : membership?.store
      ? [membership.store]
      : []
  const sellerView = role === 'vendedor'

  const handleStoreChange = (storeId: string) => {
    setSelectedStoreId(storeId || null)
    setActiveStoreId(storeId || null)
  }

  return (
    <main className="min-h-full overflow-y-auto bg-surface-alt p-mx-lg">
      <header className="mb-mx-lg flex flex-col gap-mx-md rounded-mx-2xl border border-border-default bg-white p-mx-lg shadow-mx-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-mx-xs flex items-center gap-mx-sm text-brand-primary">
            <ClipboardList size={22} aria-hidden="true" />
            <span className="text-mx-tiny font-black uppercase tracking-widest">Execução compartilhada</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-text-primary">Plano de Ação</h1>
          <p className="mt-mx-xs max-w-3xl text-sm font-medium text-text-secondary">
            A mesma ação persistida pelo Dono, pela Loja, pela Gerência e pela Consultoria, com escopo e autorização do perfil atual.
          </p>
        </div>

        {internal && (
          <label className="flex min-w-64 items-center gap-mx-sm text-sm font-bold text-text-secondary">
            <Building2 size={18} aria-hidden="true" />
            <span className="sr-only">Selecionar loja</span>
            <select
              aria-label="Selecionar loja para o Plano de Ação"
              value={selectedStoreId || ''}
              onChange={(event) => handleStoreChange(event.target.value)}
              disabled={storesLoading}
              className="h-11 w-full rounded-mx-xl border border-border-default bg-white px-mx-sm text-sm font-bold text-text-primary outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10"
            >
              <option value="">Selecione uma loja</option>
              {storeOptions.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          </label>
        )}
      </header>

      <CentralMxPlanoSegmentadoPanel
        storeId={selectedStoreId}
        defaultScope={sellerView ? 'vendedor' : 'loja'}
        availableScopes={sellerView ? ['vendedor'] : ['loja', 'departamento', 'vendedor']}
        readOnly={sellerView}
      />
    </main>
  )
}

export default ActionPlanWorkspace
