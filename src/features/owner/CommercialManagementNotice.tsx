import { BriefcaseBusiness } from 'lucide-react'
import { useStoreManagementContext } from '@/hooks/useStoreManagementContext'

/**
 * Aviso de contexto gerencial na home do dono.
 *
 * Sem gerente ativo, informa que o dono está acumulando a gestão comercial.
 * Com gerente ativo, nomeia o responsável e reforça o acesso de acompanhamento.
 */
export function CommercialManagementNotice() {
  const { hasActiveManager, activeManagers, loading } = useStoreManagementContext()

  if (loading) return null

  const managerNames = activeManagers
    .map((manager) => manager.name || manager.email)
    .filter(Boolean)
    .join(', ')

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-gray-200 bg-white/60 px-4 py-3">
      <BriefcaseBusiness size={18} className="mt-0.5 shrink-0 text-gray-500" aria-hidden="true" />
      <p className="text-sm text-gray-600">
        {hasActiveManager && managerNames
          ? `A gestão comercial está sob responsabilidade de ${managerNames}. Você possui acesso de acompanhamento como dono.`
          : 'Você está acumulando a gestão comercial desta unidade porque não há gerente ativo cadastrado.'}
      </p>
    </div>
  )
}

export default CommercialManagementNotice
