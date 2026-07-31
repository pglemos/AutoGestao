import { useAuth } from '@/hooks/useAuth'
import { ConsultingClientsPage } from '@/features/consulting-clients/ConsultingClientsPage'
import { ConsultantAssignedClientsPage } from '@/features/consulting-clients/ConsultantAssignedClientsPage'

/** Consultor vê a carteira atribuída; admin vê a carteira inteira. */
export default function ConsultoriaClientes() {
  const { role } = useAuth()
  return role === 'consultor_mx' ? <ConsultantAssignedClientsPage /> : <ConsultingClientsPage />
}
