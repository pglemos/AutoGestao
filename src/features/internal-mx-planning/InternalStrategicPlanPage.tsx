import PlanoEstrategico from '@/pages/owner/PlanoEstrategico'
import { InternalMxOwnerBridge } from './InternalMxOwnerBridge'

export default function InternalStrategicPlanPage() {
  return (
    <InternalMxOwnerBridge title="Plano Estratégico">
      <PlanoEstrategico />
    </InternalMxOwnerBridge>
  )
}
