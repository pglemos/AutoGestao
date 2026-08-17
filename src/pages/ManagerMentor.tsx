import { useMemo } from 'react'
import { BrainCircuit, RefreshCw } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getDiasInfo } from '@/lib/calculations'
import { useDashboardLojaData } from '@/features/dashboard-loja/hooks/useDashboardLojaData'
import DeterministicActionsPanel from '@/features/deterministic-actions/DeterministicActionsPanel'
import { useDeterministicActions } from '@/features/deterministic-actions/useDeterministicActions'
import { ManagerMentorLibrary } from '@/features/manager/mentor/ManagerMentorLibrary'
import { ManagerMentorRecommendations } from '@/features/manager/mentor/ManagerMentorRecommendations'
import { ManagerMentorStatusCard } from '@/features/manager/mentor/ManagerMentorStatusCard'
import { buildMentorRecommendations, resolveMentorSituation } from '@/features/manager/mentor/manager-mentor-rules'
import { PageCanvas } from '@/design-system/page'
import { PageHeading } from '@/components/molecules/PageHeading'
import { PageFooterActions } from '@/components/molecules/PageFooterActions'

export default function ManagerMentor() {
  const { storeId, activeStoreId, membership } = useAuth()
  const effectiveStoreId = activeStoreId || storeId || null
  const data = useDashboardLojaData({
    selectedStoreId: effectiveStoreId,
    selectedStoreName: membership?.store?.name || 'Unidade MX',
  })
  const days = getDiasInfo(
    data.referenceDate,
    data.operationalMetaRules?.projection_mode || 'calendar',
  )
  const goal = data.metrics.goalValue || 0
  const targetPace = useMemo(
    () => effectiveStoreId && goal > 0
      ? {
          storeId: effectiveStoreId,
          targetSales: goal,
          realizedSales: data.metrics.totalSales,
          dayOfMonth: days.decorridos,
          daysInMonth: days.total,
        }
      : undefined,
    [data.metrics.totalSales, days.decorridos, days.total, effectiveStoreId, goal],
  )
  const deterministic = useDeterministicActions({ targetPace })
  const filteredActions = useMemo(
    () => deterministic.actions.filter(a => a.scenarioCode !== 'AUTOMATIC_TASK_ORIGIN_PENDING'),
    [deterministic.actions],
  )

  const recommendations = useMemo(
    () => buildMentorRecommendations({
      ranking: data.metrics.ranking,
      pendingDisciplineSellers: data.pendingDisciplineSellers,
      goalValue: goal,
      totalSales: data.metrics.totalSales,
      elapsedDays: days.decorridos,
      totalDays: days.total,
    }),
    [data.metrics.ranking, data.metrics.totalSales, data.pendingDisciplineSellers, days.decorridos, days.total, goal],
  )
  const situation = useMemo(() => resolveMentorSituation(recommendations), [recommendations])

  return (
    <PageCanvas as="div" width="reading" bottomClearance="actions" className="flex min-h-full flex-col gap-5">
        <PageHeading
          icon={BrainCircuit}
          title="Mentor Gerencial"
          subtitle="Área de apoio à gestão. Recomendações baseadas em regras e indicadores da operação."
        />

        {data.loading ? (
          <div className="flex justify-center py-16" aria-busy="true">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-status-success/30 border-t-emerald-600" />
          </div>
        ) : (
          <>
            <ManagerMentorStatusCard situation={situation} recommendations={recommendations} />
            <ManagerMentorRecommendations recommendations={recommendations} />
          </>
        )}

        <DeterministicActionsPanel
          actions={filteredActions}
          loading={deterministic.loading}
          error={deterministic.error}
          refresh={deterministic.refresh}
          resolveAction={deterministic.resolveAction}
          title="Ações determinísticas da operação"
        />

        <ManagerMentorLibrary />

        <section className="rounded-2xl border border-status-info/20 bg-status-info-surface p-5 text-center">
          <BrainCircuit className="mx-auto text-blue-400" size={32} />
          <p className="mt-2 text-sm font-medium text-status-info-text">Orientações baseadas em regras oficiais</p>
          <p className="mt-1 text-xs text-status-info-text">O Mentor não inventa números nem executa ações no lugar do gerente.</p>
        </section>

        <PageFooterActions>
          <button
            type="button"
            onClick={() => void deterministic.refresh?.()}
            disabled={deterministic.loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-6 py-2.5 text-body-sm font-bold text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mx-action/20 disabled:opacity-50 sm:w-auto"
          >
            <RefreshCw size={16} className={deterministic.loading ? 'animate-spin' : ''} aria-hidden="true" />
            Atualizar recomendações
          </button>
        </PageFooterActions>
    </PageCanvas>
  )
}
