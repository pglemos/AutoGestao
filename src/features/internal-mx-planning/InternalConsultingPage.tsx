import { ConsultingJourneyWorkspace } from '@/features/consulting-journey/ConsultingJourneyWorkspace'
import { ConsultingClientsPage } from '@/features/consulting-clients/ConsultingClientsPage'
import { InternalMxPlanningShell, useInternalPlanningStore } from './InternalMxPlanningShell'

export default function InternalConsultingPage() {
  const store = useInternalPlanningStore()

  return (
    <InternalMxPlanningShell
      title="Consultoria"
      description="Acompanhe a jornada da loja selecionada e administre a carteira global de clientes consultivos."
      store={store}
    >
      <ConsultingJourneyWorkspace />
      <section className="mt-8 border-t border-border pt-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Carteira global de Consultoria</h2>
          <p className="text-sm text-muted-foreground">Clientes, atribuições, módulos, visitas, evidências e dados financeiros.</p>
        </div>
        <div className="-mx-4 lg:-mx-6"><ConsultingClientsPage /></div>
      </section>
    </InternalMxPlanningShell>
  )
}
