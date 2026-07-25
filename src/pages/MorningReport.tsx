import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import AdminMorningReportPage from '@/features/morning-report/AdminMorningReportPage'
import LegacyMorningReportPage from '@/features/morning-report/LegacyMorningReportPage'

export default function MorningReport() {
  const { role } = useAuth()
  return isPerfilInternoMx(role) ? <AdminMorningReportPage /> : <LegacyMorningReportPage />
}
