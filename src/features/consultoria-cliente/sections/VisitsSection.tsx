import { Link } from 'react-router-dom'
import { Plus, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/Card'
import { Badge } from '@/components/atoms/Badge'
import { Typography } from '@/components/atoms/Typography'
import type { ConsultingClientDetail } from '@/features/consultoria/types'
import type { ConsultingMethodologyStep } from '@/lib/schemas/consulting-client.schema'

type Props = {
  client: ConsultingClientDetail
  clientSlug?: string
  canManage: boolean
  methodologySteps: ConsultingMethodologyStep[]
  onOpenLegacyCompletion: () => void
  onOpenVisitModal: (visitNumber?: number) => void
}

export function VisitsSection({
  client,
  clientSlug,
  canManage,
  methodologySteps,
  onOpenLegacyCompletion,
  onOpenVisitModal,
}: Props) {
  return (
    <div className="space-y-mx-lg">
      {canManage && (
        <div className="flex flex-col gap-mx-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Typography variant="h3" className="">Agenda manual do cliente</Typography>
            <Typography variant="tiny" tone="muted">Crie ou ajuste qualquer etapa da jornada contratada.</Typography>
          </div>
          <div className="flex flex-wrap gap-mx-xs">
            <Button
              type="button"
              variant="outline"
              onClick={onOpenLegacyCompletion}
              icon={<ShieldCheck className="w-mx-4 h-mx-4" />}
            >
              CONCLUIR VISITAS JÁ REALIZADAS
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => onOpenVisitModal()}
              icon={<Plus className="w-mx-4 h-mx-4" />}
            >
              CRIAR VISITA MANUAL
            </Button>
          </div>
        </div>
      )}
      {methodologySteps.map((step) => {
        const v = client.visits?.find((x) => x.visit_number === step.visit_number)
        return (
          <Card key={step.id} className="p-mx-lg bg-white border hover:border-brand-primary transition-all">
            <div className="flex flex-col gap-mx-md lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-mx-md">
                <div className="w-mx-12 h-mx-12 rounded-mx-full bg-surface-alt flex items-center justify-center font-bold">V{step.visit_number}</div>
                <div>
                  <Typography variant="h3" className="text-sm">{step.objective}</Typography>
                  <Typography variant="tiny" tone="muted" className="font-bold">{step.target} • {step.duration}</Typography>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-mx-sm lg:justify-end">
                <Badge variant={v?.status === 'concluida' ? 'success' : 'outline'}>{v?.status?.toUpperCase() || 'PENDENTE'}</Badge>
                {canManage && (
                  <Button type="button" variant="outline" size="sm" onClick={() => onOpenVisitModal(step.visit_number)}>
                    {v ? 'EDITAR' : 'CRIAR'}
                  </Button>
                )}
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/consultoria/clientes/${clientSlug}/visitas/${step.visit_number}`}>ABRIR</Link>
                </Button>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

export default VisitsSection
