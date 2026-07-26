import Consultoria from '@/pages/owner/Consultoria'
import { InternalMxOwnerBridge } from './InternalMxOwnerBridge'

export default function InternalConsultingPage() {
  return (
    <InternalMxOwnerBridge title="Consultoria">
      <Consultoria />
    </InternalMxOwnerBridge>
  )
}
