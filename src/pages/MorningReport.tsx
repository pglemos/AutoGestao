import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import AdminMorningReportPage from '@/features/morning-report/AdminMorningReportPage'
import LegacyMorningReportPage from '@/features/morning-report/LegacyMorningReportPage'
import { PageCanvas } from '@/design-system/page'

export default function MorningReport() {
  const { role } = useAuth()
  if (isPerfilInternoMx(role)) return <AdminMorningReportPage />
  return (
    <PageCanvas as="div" width="dashboard" bottomClearance="navigation" className="min-h-full">
      <LegacyMorningReportPage />
    </PageCanvas>
  )
}
