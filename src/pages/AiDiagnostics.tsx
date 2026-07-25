import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import OperationalDiagnosticsPage from '@/features/operational-diagnostics/OperationalDiagnosticsPage'
import LegacyOperationalDiagnosticsPage from '@/features/operational-diagnostics/LegacyOperationalDiagnosticsPage'

export default function AiDiagnostics() {
  const { role } = useAuth()
  return isPerfilInternoMx(role) ? <OperationalDiagnosticsPage /> : <LegacyOperationalDiagnosticsPage />
}
