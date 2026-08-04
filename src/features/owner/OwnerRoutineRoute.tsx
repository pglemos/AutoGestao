import RotinaGerente from '@/pages/RotinaGerente'
import { RotinaDoDia } from '@/pages/owner/Placeholders'
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
      <main className="flex min-h-[320px] items-center justify-center bg-gray-50 p-mx-lg" aria-busy="true">
        <p className="text-sm font-semibold text-gray-500">Verificando a estrutura gerencial da loja...</p>
      </main>
    )
  }

  return management.ownerAssumesManagement ? <RotinaGerente /> : <RotinaDoDia />
}
