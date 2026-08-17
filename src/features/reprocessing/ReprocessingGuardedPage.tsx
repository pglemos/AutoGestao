import { RefreshCw, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { MxEmptyState, MxModuleHeader, MxModulePage } from '@/components/module/MxModuleVisualPrimitives'
import LegacyReprocessamentoPage from './LegacyReprocessamentoPage'
import { canExecuteReprocessing } from './reprocessingPolicy'

export default function ReprocessingGuardedPage() {
  const { role } = useAuth()
  if (!canExecuteReprocessing(role)) {
    return (
      <MxModulePage width="form" id="reprocessing-forbidden">
        <MxModuleHeader
          icon={RefreshCw}
          eyebrow="Configurações"
          title="Reprocessamento"
          description="Execuções controladas e recuperação operacional."
        />
        <MxEmptyState
          icon={ShieldAlert}
          title="Acesso restrito"
          description="Este perfil não pode executar ou consultar lotes de reprocessamento."
        />
      </MxModulePage>
    )
  }
  return <LegacyReprocessamentoPage />
}
