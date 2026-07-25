import { ConsultingClientScopeGuard } from '@/features/consulting-clients/ConsultingClientScopeGuard'
import { ScopedConsultoriaClienteDetalhe } from '@/features/consultoria-cliente/ScopedConsultoriaClienteDetalhe'

export function ConsultoriaClienteDetalhe() {
  return <ConsultingClientScopeGuard><ScopedConsultoriaClienteDetalhe /></ConsultingClientScopeGuard>
}

export default ConsultoriaClienteDetalhe
