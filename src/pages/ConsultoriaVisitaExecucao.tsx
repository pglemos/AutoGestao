import { ConsultingClientScopeGuard } from '@/features/consulting-clients/ConsultingClientScopeGuard'
import { ConsultoriaVisitaExecucaoPage } from '@/features/consultoria-visita/ConsultoriaVisitaExecucaoPage'

export default function ConsultoriaVisitaExecucao() {
  return <ConsultingClientScopeGuard><ConsultoriaVisitaExecucaoPage /></ConsultingClientScopeGuard>
}
