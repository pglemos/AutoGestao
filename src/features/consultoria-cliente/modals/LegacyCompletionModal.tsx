import { Button } from '@/components/atoms/Button'
import { DatePicker } from '@/components/atoms/DatePicker'
import { Textarea } from '@/components/atoms/Textarea'
import { Typography } from '@/components/atoms/Typography'
import { Modal } from '@/components/organisms/Modal'
import {
  getRecommendedLegacyVisitSelection,
  LEGACY_PMR_VISITS,
} from '@/lib/consultoria/legacy-visit-completion'
import { isPmrMainCycleVisitNumber } from '@/lib/consultoria/pmr-visit-rules'
import { ConsultingDriveFilesView } from '@/features/consultoria/components/ConsultingDriveFilesView'
import type { ConsultingClientDetail } from '@/features/consultoria/types'
import type { ConsultingMethodologyStep } from '@/lib/schemas/consulting-client.schema'

type Props = {
  open: boolean
  onClose: () => void
  client: ConsultingClientDetail
  clientId?: string
  methodologySteps: ConsultingMethodologyStep[]
  legacyVisitNumbers: number[]
  setLegacyVisitNumbers: (numbers: number[]) => void
  legacySummary: string
  setLegacySummary: (summary: string) => void
  legacyEffectiveDate: string
  setLegacyEffectiveDate: (date: string) => void
  legacyCompletionSubmitting: boolean
  toggleLegacyVisit: (visitNumber: number) => void
  handleSubmit: (event: React.FormEvent) => void | Promise<void>
}

export function LegacyCompletionModal({
  open,
  onClose,
  client,
  clientId,
  methodologySteps,
  legacyVisitNumbers,
  setLegacyVisitNumbers,
  legacySummary,
  setLegacySummary,
  legacyEffectiveDate,
  setLegacyEffectiveDate,
  legacyCompletionSubmitting,
  toggleLegacyVisit,
  handleSubmit,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Concluir visitas já realizadas"
      description="Migração administrativa para lojas que já avançaram na metodologia PMR"
      size="xl"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>CANCELAR</Button>
          <Button
            type="submit"
            form="legacy-visit-completion-form"
            loading={legacyCompletionSubmitting}
            className=""
          >
            CONCLUIR SELECIONADAS
          </Button>
        </>
      }
    >
      <form id="legacy-visit-completion-form" onSubmit={handleSubmit} className="space-y-mx-lg">
        <div className="space-y-mx-sm">
          <div className="flex flex-wrap items-center justify-between gap-mx-sm">
            <Typography variant="caption" className="">Visitas concluídas fora do sistema</Typography>
            <div className="flex flex-wrap gap-mx-xs">
              <Button type="button" variant="outline" size="xs" onClick={() => setLegacyVisitNumbers([...LEGACY_PMR_VISITS])}>
                V1,V2,V3,V5,V6,V7
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => setLegacyVisitNumbers(getRecommendedLegacyVisitSelection(client?.visits || []))}
              >
                PENDENTES
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-mx-sm">
            {methodologySteps.filter((step) => isPmrMainCycleVisitNumber(step.visit_number)).map((step) => {
              const visit = client?.visits?.find((item) => item.visit_number === step.visit_number)
              const selected = legacyVisitNumbers.includes(step.visit_number)
              return (
                <label
                  key={step.id}
                  className={`flex cursor-pointer items-center gap-mx-xs rounded-mx-xl border p-mx-sm transition-colors ${selected ? 'border-brand-primary bg-brand-primary/10' : 'border-border-default bg-white'}`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleLegacyVisit(step.visit_number)}
                    className="h-mx-sm w-mx-sm accent-brand-primary"
                  />
                  <span className="min-w-0">
                    <Typography variant="p" className="text-sm">V{step.visit_number}</Typography>
                    <Typography variant="tiny" tone={visit?.status === 'concluida' ? 'success' : 'muted'} className="font-bold">
                      {visit?.status === 'concluida' ? 'Concluída' : 'Pendente'}
                    </Typography>
                  </span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
          <div className="space-y-mx-xs">
            <Typography as="label" htmlFor="legacy-effective-date" variant="caption" className="">Data de referência *</Typography>
            <DatePicker
              id="legacy-effective-date"
              value={legacyEffectiveDate}
              onChange={(event) => setLegacyEffectiveDate(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-mx-xs">
          <Typography as="label" htmlFor="legacy-summary" variant="caption" className="">Resumo geral da migração *</Typography>
          <Textarea
            id="legacy-summary"
            value={legacySummary}
            onChange={(event) => setLegacySummary(event.target.value)}
            placeholder="Registre o que já foi realizado nas visitas concluídas e onde os documentos gerais foram anexados."
            className="min-h-mx-40"
          />
        </div>
      </form>

      {clientId && (
        <div className="space-y-mx-xs mt-mx-lg">
          <Typography variant="caption" className="">Anexos gerais do cliente</Typography>
          <ConsultingDriveFilesView clientId={clientId} />
        </div>
      )}
    </Modal>
  )
}

export default LegacyCompletionModal
