import { Target } from 'lucide-react'
import { useLocation } from 'react-router-dom'
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
  const location = useLocation()
  const domain = useInternalMxDomainTabs<StrategicMode>({ tabs: STRATEGIC_TABS, fallback: 'cliente' })
  const requestedYear = Number(new URLSearchParams(location.search).get('year'))
  const year = Number.isInteger(requestedYear) && requestedYear >= 2020 && requestedYear <= 2100 ? requestedYear : undefined

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
        icon={Target}
        title="Plano Estratégico"
        description="Acompanhe os 45 indicadores, metas, comparativos e ações da loja selecionada."
        store={store}
      >
        <StrategicPlanWorkspace year={year} />
      </InternalMxPlanningShell>
    </>
  )
}
