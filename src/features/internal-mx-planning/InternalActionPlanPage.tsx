import { useLocation } from 'react-router-dom'
import AdminPlanosAcaoGlobalPage from '@/features/admin-mx/AdminPlanosAcaoGlobalPage'
import ClientActionPlanPage from '@/features/admin-mx/clientes/ClientActionPlanPage'

export default function InternalActionPlanPage() {
  const location = useLocation()
  const isClientRoute = location.pathname.startsWith('/clientes/') && location.pathname.endsWith('/plano-acao')

  if (isClientRoute) {
    return <ClientActionPlanPage />
  }

  return <AdminPlanosAcaoGlobalPage />
}
