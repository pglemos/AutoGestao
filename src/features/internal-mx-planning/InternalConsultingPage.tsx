import AdminConsultoriaMxPage from '@/features/admin-mx/AdminConsultoriaMxPage'
import AdminConsultingOverviewPage from '@/features/admin-mx/consultoria/AdminConsultingOverviewPage'
import { useInternalMxDomainTabs } from '@/design-system/internal-mx/InternalMxDomainTabs'

type ConsultingMode = 'operacao' | 'metodologia'

const CONSULTING_TABS = [
  { key: 'operacao' as const, label: 'Operação' },
  { key: 'metodologia' as const, label: 'Metodologia' },
]

export default function InternalConsultingPage() {
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
      <AdminConsultingOverviewPage />
    </>
  )
}
