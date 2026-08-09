import RotinaGerente from '@/pages/RotinaGerente'
import DashboardLoja from '@/features/dashboard-loja/DashboardLoja.container'
import { useAuth } from '@/hooks/useAuth'
import { useStoreManagementContext } from '@/hooks/useStoreManagementContext'

export default function OwnerRoutineRoute() {
  const { storeId, membership } = useAuth()
  const management = useStoreManagementContext({
    storeId,
    declaredManagerEmail: membership?.store?.manager_email,
  })

  if (management.loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center" aria-busy="true">
        <p className="text-sm font-semibold text-gray-500">Verificando a estrutura gerencial da loja...</p>
      </div>
    )
  }

  return management.ownerAssumesManagement ? <RotinaGerente /> : <DashboardLoja />
}
