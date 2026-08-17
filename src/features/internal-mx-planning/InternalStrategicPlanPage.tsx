import AdminIndicadoresPage from '@/features/admin-mx/AdminIndicadoresPage'
import { useInternalMxDomainTabs } from '@/design-system/internal-mx/InternalMxDomainTabs'
import { StrategicPlanWorkspace } from '@/features/strategic-plan/StrategicPlanWorkspace'
import { InternalMxPlanningShell, useInternalPlanningStore } from './InternalMxPlanningShell'

type StrategicMode = 'cliente' | 'catalogo'

const STRATEGIC_TABS = [
  { key: 'cliente' as const, label: 'Plano por cliente' },
  { key: 'catalogo' as const, label: 'Catálogo e parâmetros' },
]

export default function InternalStrategicPlanPage() {
  const store = useInternalPlanningStore()
  const domain = useInternalMxDomainTabs<StrategicMode>({ tabs: STRATEGIC_TABS, fallback: 'cliente' })

  if (domain.active === 'catalogo') {
    return (
      <>
        {domain.tabs}
        <AdminIndicadoresPage />
      </>
    )
  }

  return (
    <>
      {domain.tabs}
      <InternalMxPlanningShell
        title="Plano Estratégico"
        description="Acompanhe os 45 indicadores, metas, comparativos e ações da loja selecionada."
        store={store}
      >
        <StrategicPlanWorkspace />
      </InternalMxPlanningShell>
    </>
  )
}
