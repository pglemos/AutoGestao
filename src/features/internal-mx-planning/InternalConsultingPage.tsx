import AdminConsultoriaMxPage from '@/features/admin-mx/AdminConsultoriaMxPage'
import { useInternalMxDomainTabs } from '@/design-system/internal-mx/InternalMxDomainTabs'
import { ConsultingJourneyWorkspace } from '@/features/consulting-journey/ConsultingJourneyWorkspace'
import { ConsultingClientsPage } from '@/features/consulting-clients/ConsultingClientsPage'
import { InternalMxPlanningShell, useInternalPlanningStore } from './InternalMxPlanningShell'

type ConsultingMode = 'operacao' | 'clientes' | 'metodologia'

const CONSULTING_TABS = [
  { key: 'operacao' as const, label: 'Operação' },
  { key: 'clientes' as const, label: 'Clientes' },
  { key: 'metodologia' as const, label: 'Metodologia' },
]

export default function InternalConsultingPage() {
  const store = useInternalPlanningStore()
  const domain = useInternalMxDomainTabs<ConsultingMode>({ tabs: CONSULTING_TABS, fallback: 'operacao' })

  if (domain.active === 'metodologia') {
    return (
      <>
        {domain.tabs}
        <AdminConsultoriaMxPage />
      </>
    )
  }

  return (
    <>
      {domain.tabs}
      <InternalMxPlanningShell
        title="Consultoria MX"
        description={domain.active === 'clientes'
          ? 'Administre a carteira global de clientes, atribuições, módulos, visitas, evidências e dados financeiros.'
          : 'Acompanhe a jornada e a execução consultiva da loja selecionada.'}
        store={store}
      >
        {domain.active === 'clientes'
          ? <ConsultingClientsPage embedded />
          : <ConsultingJourneyWorkspace />}
      </InternalMxPlanningShell>
    </>
  )
}
