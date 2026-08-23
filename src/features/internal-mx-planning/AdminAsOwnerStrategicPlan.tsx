import { useEffect } from 'react'
import { Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/atoms/Button'
import { MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { useOwnerOptional } from '@/components/owner/OwnerContext'
import { toOwnerPlanningActor } from '@/components/owner/ownerPlanningAdapter'
import { PlanningWorkspaceProvider } from '@/features/planning-workspace'
import { StrategicPlanWorkspace } from '@/features/strategic-plan/StrategicPlanWorkspace'
import { useAuth } from '@/hooks/useAuth'

/**
 * Preview Base44 “Visualizar como Dono”: mesma workspace/shell do módulo Dono
 * (não recria layout no Admin). Admin mantém sessão; actor força papel dono.
 */
export function AdminAsOwnerStrategicPlan({
  storeId,
  year,
}: {
  storeId: string
  year?: number
}) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const owner = useOwnerOptional() as { setUnitId?: (id: string) => void; unitId?: string } | null

  useEffect(() => {
    owner?.setUnitId?.(storeId)
  }, [owner, profile?.id, storeId, year])

  if (!profile?.id) {
    return (
      <MxStatusBanner tone="danger">
        Sessão indisponível para Visualizar como Dono.
      </MxStatusBanner>
    )
  }

  const actor = toOwnerPlanningActor(profile)

  return (
    <PlanningWorkspaceProvider shell="owner" storeId={storeId} actor={actor}>
      <div className="space-y-4 p-4 md:p-6">
        <MxStatusBanner tone="info">
          <span className="inline-flex flex-wrap items-center gap-2">
            <Eye size={16} aria-hidden="true" />
            Visualizando como Dono — mesma tela do módulo Dono para esta loja.
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const params = new URLSearchParams(window.location.search)
                params.delete('viewAs')
                navigate(`/plano-estrategico?${params.toString()}`)
              }}
            >
              Voltar ao Admin
            </Button>
          </span>
        </MxStatusBanner>
        <StrategicPlanWorkspace year={year} />
      </div>
    </PlanningWorkspaceProvider>
  )
}
