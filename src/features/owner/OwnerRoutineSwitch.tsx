import { lazy, Suspense } from 'react'
import { useStoreManagementContext } from '@/hooks/useStoreManagementContext'

const RotinaGerente = lazy(() => import('@/pages/RotinaGerente'))
const OwnerRotinaDoDia = lazy(() =>
  import('@/pages/owner/Placeholders').then(m => ({ default: m.RotinaDoDia })),
)

/**
 * `/rotina` para o perfil dono.
 *
 * Sem gerente ativo na loja, o dono acumula a gestão comercial e recebe a rotina
 * gerencial funcional. Com gerente ativo, permanece na rotina executiva.
 */
export default function OwnerRoutineSwitch() {
  const { ownerAssumesManagement, loading } = useStoreManagementContext()

  if (loading) return null

  return (
    <Suspense fallback={null}>
      {ownerAssumesManagement ? <RotinaGerente /> : <OwnerRotinaDoDia />}
    </Suspense>
  )
}
