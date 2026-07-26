import PlanoDeAcao from '@/pages/owner/PlanoDeAcao'
import { InternalMxOwnerBridge } from './InternalMxOwnerBridge'

export default function InternalActionPlanPage() {
  return (
    <InternalMxOwnerBridge title="Plano de Ação">
      <PlanoDeAcao />
    </InternalMxOwnerBridge>
  )
}
