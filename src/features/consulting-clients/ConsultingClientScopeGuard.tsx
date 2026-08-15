import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import { useLocation, useParams } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import {
  MxEmptyState,
  MxErrorState,
  MxLoadingState,
  MxModuleHeader,
  MxModulePage,
} from '@/components/module/MxModuleVisualPrimitives'

type Props = { children: ReactNode }

export function ConsultingClientScopeGuard({ children }: Props) {
  const { clientSlug } = useParams<{ clientSlug: string }>()
  const { role } = useAuth()
  const location = useLocation()
  // Rotas wide (consultoria/clientes*): largura e clearance vêm da metadata.
  const { width: pageWidth, bottomClearance: pageBottomClearance } = resolveRouteLayout(location.pathname)
  const internal = isPerfilInternoMx(role)
  const [allowed, setAllowed] = useState(internal)
  const [loading, setLoading] = useState(!internal)
  const [error, setError] = useState<string | null>(null)

  const validateScope = useCallback(async () => {
    if (internal) {
      setAllowed(true)
      setLoading(false)
      setError(null)
      return
    }
    if (!clientSlug) {
      setAllowed(false)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    setAllowed(false)
    setLoading(false)
  }, [clientSlug, internal])

  useEffect(() => {
    void validateScope()
  }, [validateScope])

  if (loading) {
    return <MxModulePage width={pageWidth} bottomClearance={pageBottomClearance} id="consulting-client-scope-loading"><MxLoadingState label="Validando vínculo da consultoria" /></MxModulePage>
  }

  if (error) {
    return (
      <MxModulePage width={pageWidth} bottomClearance={pageBottomClearance} id="consulting-client-scope-error">
        <MxModuleHeader eyebrow="Consultoria" title="Validação de acesso" description="Não foi possível confirmar seu vínculo com este cliente." />
        <MxErrorState description={error} retry={() => void validateScope()} />
      </MxModulePage>
    )
  }

  if (!allowed) {
    return (
      <MxModulePage width={pageWidth} bottomClearance={pageBottomClearance} id="consulting-client-scope-forbidden">
        <MxModuleHeader eyebrow="Consultoria" title="Cliente indisponível" description="O acesso é limitado aos clientes vinculados ao seu perfil." />
        <MxEmptyState icon={ShieldAlert} title="Fora do seu escopo" description="Solicite ao Administrador MX a atribuição ativa deste cliente antes de continuar." />
      </MxModulePage>
    )
  }

  return <>{children}</>
}

export default ConsultingClientScopeGuard
