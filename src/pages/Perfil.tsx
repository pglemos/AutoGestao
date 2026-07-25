import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import InternalProfilePage from '@/features/internal-profile/InternalProfilePage'
import LegacyProfilePage from '@/features/internal-profile/LegacyProfilePage'

export default function Perfil() {
  const { role } = useAuth()
  return isPerfilInternoMx(role) ? <InternalProfilePage /> : <LegacyProfilePage />
}
