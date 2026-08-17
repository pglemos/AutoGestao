import { Sparkles } from 'lucide-react'
import AdminConsultoriaMxPage from '@/features/admin-mx/AdminConsultoriaMxPage'
import { useInternalMxDomainTabs } from '@/design-system/internal-mx/InternalMxDomainTabs'
import { ConsultingJourneyWorkspace } from '@/features/consulting-journey/ConsultingJourneyWorkspace'
import { InternalMxPlanningShell, useInternalPlanningStore } from './InternalMxPlanningShell'

type ConsultingMode = 'operacao' | 'metodologia'

const CONSULTING_TABS = [
  { key: 'operacao' as const, label: 'Operação' },
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
        icon={Sparkles}
        title="Consultoria MX"
        description="Acompanhe a jornada e a execução consultiva da loja selecionada."
        store={store}
      >
        <ConsultingJourneyWorkspace />
      </InternalMxPlanningShell>
    </>
  )
}
