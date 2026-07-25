import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { isAdministradorMx, useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
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
  const { role, profile } = useAuth()
  const admin = isAdministradorMx(role)
  const [allowed, setAllowed] = useState(admin)
  const [loading, setLoading] = useState(!admin)
  const [error, setError] = useState<string | null>(null)

  const validateScope = useCallback(async () => {
    if (admin) {
      setAllowed(true)
      setLoading(false)
      setError(null)
      return
    }
    if (role !== 'consultor_mx' || !profile?.id || !clientSlug) {
      setAllowed(false)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientSlug)
      let clientQuery = supabase.from('clientes_consultoria').select('id')
      clientQuery = isUuid
        ? clientQuery.or(`slug.eq.${clientSlug},id.eq.${clientSlug}`)
        : clientQuery.eq('slug', clientSlug)

      const { data: client, error: clientError } = await clientQuery.maybeSingle()
      if (clientError) throw clientError
      if (!client?.id) {
        setAllowed(false)
        return
      }

      const { data: assignment, error: assignmentError } = await supabase
        .from('atribuicoes_consultoria')
        .select('id')
        .eq('client_id', client.id)
        .eq('user_id', profile.id)
        .eq('active', true)
        .limit(1)
        .maybeSingle()

      if (assignmentError) throw assignmentError
      setAllowed(Boolean(assignment?.id))
    } catch (cause) {
      setAllowed(false)
      setError(cause instanceof Error ? cause.message : 'Falha ao validar o vínculo da consultoria.')
    } finally {
      setLoading(false)
    }
  }, [admin, clientSlug, profile?.id, role])

  useEffect(() => {
    void validateScope()
  }, [validateScope])

  if (loading) {
    return <MxModulePage id="consulting-client-scope-loading"><MxLoadingState label="Validando vínculo da consultoria" /></MxModulePage>
  }

  if (error) {
    return (
      <MxModulePage id="consulting-client-scope-error">
        <MxModuleHeader eyebrow="Consultoria" title="Validação de acesso" description="Não foi possível confirmar seu vínculo com este cliente." />
        <MxErrorState description={error} retry={() => void validateScope()} />
      </MxModulePage>
    )
  }

  if (!allowed) {
    return (
      <MxModulePage id="consulting-client-scope-forbidden">
        <MxModuleHeader eyebrow="Consultoria" title="Cliente indisponível" description="O acesso é limitado aos clientes vinculados ao seu perfil." />
        <MxEmptyState icon={ShieldAlert} title="Fora do seu escopo" description="Solicite ao Administrador MX a atribuição ativa deste cliente antes de continuar." />
      </MxModulePage>
    )
  }

  return <>{children}</>
}

export default ConsultingClientScopeGuard
