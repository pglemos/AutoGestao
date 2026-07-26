import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Modal } from '@/components/organisms/Modal'
import { MxLoadingState, MxSectionCard, MxSectionHeader } from '@/components/module/MxModuleVisualPrimitives'
import { useStoreFeedback } from '@/features/gerente-feedback/hooks/useStoreFeedback'
import type { TeamMember } from '@/hooks/useTeam'
import { getFeedbackSellerName, type FeedbackListItem } from '@/features/gerente-feedback/lib/helpers'
import { ManagerFeedbackModal } from './ManagerFeedbackModal'
import { buildManagerFeedbackFormData, type ManagerFeedbackDraft } from './manager-feedback-draft'
import { DevelopmentFeedbackMetrics } from './DevelopmentFeedbackMetrics'
import { DevelopmentFeedbackFilters } from './DevelopmentFeedbackFilters'
import { DevelopmentFeedbackTable } from './DevelopmentFeedbackTable'
import { filterDevelopmentFeedbacks, getFeedbackCompetency, type DevelopmentFeedbackStatusFilter, type DevelopmentKindFilter, type DevelopmentPeriodFilter } from './development-filters'
import { ManagerDataErrorState } from './ManagerDataErrorState'

function localDateKey(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export default function ManagerFeedbackReference() {
  const vm = useStoreFeedback()
  const [params] = useSearchParams()
  const sellers = useMemo(() => vm.sellers.filter((seller: TeamMember) => seller.role === 'vendedor'), [vm.sellers])
  const [period, setPeriod] = useState<DevelopmentPeriodFilter>('current')
  const [sellerId, setSellerId] = useState('')
  const [kind, setKind] = useState<DevelopmentKindFilter>('all')
  const [competency, setCompetency] = useState('')
  const [status, setStatus] = useState<DevelopmentFeedbackStatusFilter>('all')
  const [detail, setDetail] = useState<FeedbackListItem | null>(null)

  const preselectedSeller = useMemo(() => {
    const requestedName = params.get('novoFeedback')?.trim().toLocaleLowerCase('pt-BR')
    return requestedName ? sellers.find((seller: TeamMember) => seller.name.toLocaleLowerCase('pt-BR') === requestedName)?.id || '' : ''
  }, [params, sellers])

  const competencies = useMemo<string[]>(() => Array.from(new Set(vm.filteredFeedbacks.map((item: FeedbackListItem) => getFeedbackCompetency(item)).filter(Boolean) as string[])).sort((a: string, b: string) => a.localeCompare(b, 'pt-BR')), [vm.filteredFeedbacks])
  const feedbacks = useMemo(() => filterDevelopmentFeedbacks({ feedbacks: vm.filteredFeedbacks, period, sellerId, kind, competency, status }), [competency, kind, period, sellerId, status, vm.filteredFeedbacks])
  const positive = feedbacks.filter((item: FeedbackListItem) => Boolean(item.positives?.trim())).length
  const development = feedbacks.filter((item: FeedbackListItem) => Boolean(item.attention_points?.trim())).length
  const pending = feedbacks.filter((item: FeedbackListItem) => !item.acknowledged).length

  if (vm.isLoading) return <MxSectionCard><MxLoadingState label="Carregando feedbacks" /></MxSectionCard>
  if (vm.error) return <MxSectionCard><ManagerDataErrorState title="Não foi possível carregar os feedbacks." /></MxSectionCard>

  return (
    <div className="space-y-5">
      <MxSectionCard>
        <MxSectionHeader
          title="Feedback"
          description="Reconheça boas práticas, oriente mudanças e acompanhe os compromissos da equipe."
          actions={vm.canCreateFeedback ? <Button data-mx-requires-manage="" onClick={() => vm.setShowForm(true)}><Plus size={16} className="mr-2" />Novo feedback</Button> : undefined}
        />
      </MxSectionCard>
      <DevelopmentFeedbackMetrics total={feedbacks.length} positive={positive} development={development} pending={pending} />
      <DevelopmentFeedbackFilters period={period} sellerId={sellerId} kind={kind} competency={competency} status={status} sellers={sellers} competencies={competencies} onPeriodChange={setPeriod} onSellerChange={setSellerId} onKindChange={setKind} onCompetencyChange={setCompetency} onStatusChange={setStatus} />
      <DevelopmentFeedbackTable feedbacks={feedbacks} onOpen={setDetail} onShareWhatsApp={vm.handleShareWhatsApp} />

      <ManagerFeedbackModal
        open={vm.showForm}
        onClose={() => vm.setShowForm(false)}
        saving={vm.saving}
        sellers={sellers}
        initialDate={localDateKey(new Date())}
        preselectedSeller={preselectedSeller}
        onSubmit={(draft: ManagerFeedbackDraft) => {
          void vm.handleSubmit(buildManagerFeedbackFormData(draft, vm.formData)).then((saved: boolean) => { if (saved) vm.setShowForm(false) })
        }}
      />

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title="Detalhes do feedback" description={detail ? getFeedbackSellerName(detail) : undefined} size="lg" referenceStyle>
        {detail ? (
          <div className="space-y-4">
            <div><Typography variant="caption" className="font-medium text-gray-500">Reconhecimento</Typography><Typography variant="p" className="mt-1 text-sm text-gray-700">{detail.positives || 'Não informado.'}</Typography></div>
            <div><Typography variant="caption" className="font-medium text-gray-500">Ponto de desenvolvimento</Typography><Typography variant="p" className="mt-1 text-sm text-gray-700">{detail.attention_points || 'Não informado.'}</Typography></div>
            <div><Typography variant="caption" className="font-medium text-gray-500">Compromisso</Typography><Typography variant="p" className="mt-1 text-sm text-gray-700">{detail.action || 'Não informado.'}</Typography></div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
