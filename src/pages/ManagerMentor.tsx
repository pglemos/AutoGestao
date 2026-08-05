import { useMemo } from 'react'
import { BrainCircuit } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getDiasInfo } from '@/lib/calculations'
import { useDashboardLojaData } from '@/features/dashboard-loja/hooks/useDashboardLojaData'
import DeterministicActionsPanel from '@/features/deterministic-actions/DeterministicActionsPanel'
import { useDeterministicActions } from '@/features/deterministic-actions/useDeterministicActions'
import { ManagerMentorLibrary } from '@/features/manager/mentor/ManagerMentorLibrary'
import { ManagerMentorRecommendations } from '@/features/manager/mentor/ManagerMentorRecommendations'
import { ManagerMentorStatusCard } from '@/features/manager/mentor/ManagerMentorStatusCard'
import { buildMentorRecommendations, resolveMentorSituation } from '@/features/manager/mentor/manager-mentor-rules'

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
    <div className="min-h-full bg-gray-50">
      <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 pb-24">
        <header className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><BrainCircuit size={20} /></span>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Mentor Gerencial</h1>
              <p className="mt-0.5 text-sm text-gray-500">Área de apoio à gestão. Recomendações baseadas em regras e indicadores da operação.</p>
            </div>
          </div>
        </header>

        {data.loading ? (
          <div className="flex justify-center py-16" aria-busy="true">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
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

        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-center">
          <BrainCircuit className="mx-auto text-blue-400" size={32} />
          <p className="mt-2 text-sm font-medium text-blue-700">Orientações baseadas em regras oficiais</p>
          <p className="mt-1 text-xs text-blue-500">O Mentor não inventa números nem executa ações no lugar do gerente.</p>
        </section>
      </div>
    </div>
  )
}
