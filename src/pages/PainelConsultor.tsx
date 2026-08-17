import { useAuth } from '@/hooks/useAuth'
import { isPerfilInternoMx } from '@/lib/auth/roles'
import { AdminDashboardPage } from '@/features/admin-mx/AdminDashboardPage'
import { NetworkDashboardPage } from '@/features/network-dashboard/NetworkDashboardPage'

export function PainelConsultor() {
  const { profile } = useAuth()
  return isPerfilInternoMx(profile?.role) ? <AdminDashboardPage /> : <NetworkDashboardPage />
}

export default PainelConsultor
