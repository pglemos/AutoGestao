import { useOwner } from '@/components/owner/OwnerContext'
import { useAuth } from '@/lib/owner-b44/AuthContext'
import { PlanningWorkspaceProvider } from '@/features/planning-workspace'
import { resolveOwnerPlanningStoreId, toOwnerPlanningActor } from '@/components/owner/ownerPlanningAdapter'
import { ActionPlanWorkspace } from '@/features/action-plan/ActionPlanWorkspace'

export default function PlanoDeAcao() {
  const { currentUnits, unitId, openConsultantModal } = useOwner()
  const { user } = useAuth()
  const storeId = resolveOwnerPlanningStoreId(unitId, currentUnits)

  if (!user) {
    return <div className="rounded-xl border border-destructive/30 bg-card p-6 text-sm text-muted-foreground">Sessão do Dono indisponível.</div>
  }

  return (
    <PlanningWorkspaceProvider shell="owner" storeId={storeId} actor={toOwnerPlanningActor(user)}>
      <ActionPlanWorkspace onOpenConsultant={openConsultantModal} />
    </PlanningWorkspaceProvider>
  )
}
