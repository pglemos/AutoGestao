import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, BookOpen, BrainCircuit, CheckSquare, MessageSquare, Target, Users, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getDiasInfo } from '@/lib/calculations'
import { useDashboardLojaData } from '@/features/dashboard-loja/hooks/useDashboardLojaData'
import DeterministicActionsPanel from '@/features/deterministic-actions/DeterministicActionsPanel'
import { useDeterministicActions } from '@/features/deterministic-actions/useDeterministicActions'
import { useFocusTrap } from '@/hooks/useFocusTrap'

const guidance = [
  { title: 'Reunião matinal', content: 'Alinhe a prioridade do dia, os clientes críticos e o ritmo necessário da loja. Termine a conversa com responsáveis e horários claros.', icon: Users },
  { title: 'Cobrança de fechamento', content: 'Confirme a pendência, combine um horário e registre a orientação sem lançar dados pelo vendedor.', icon: CheckSquare },
  { title: 'Feedback individual', content: 'Descreva o comportamento observado, seu impacto e o compromisso acordado. Evite julgamentos genéricos.', icon: MessageSquare },
  { title: 'Recuperação de meta', content: 'Converta o gap em ritmo diário e priorize os canais com melhor conversão oficial no período.', icon: Target },
]

type Guidance = (typeof guidance)[number]

export default function ManagerMentor() {
  const { storeId, activeStoreId, membership } = useAuth()
  const effectiveStoreId = activeStoreId || storeId || null
  const [selectedGuidance, setSelectedGuidance] = useState<Guidance | null>(null)
  const mentorDialogRef = useRef<HTMLElement | null>(null)
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

  useFocusTrap(mentorDialogRef, Boolean(selectedGuidance))

  useEffect(() => {
    if (!selectedGuidance) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedGuidance(null)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [selectedGuidance])

  const operationalWarnings = useMemo(() => {
    const items: Array<{ message: string; level: 'warning' | 'info' }> = []

    for (const seller of data.pendingDisciplineSellers) {
      items.push({
        message: `${seller.name} ainda não realizou o fechamento diário.`,
        level: 'warning',
      })
    }

    if (data.funilData.leads > 0 && data.funilData.agd_total === 0) {
      items.push({
        message: 'Há leads no período sem agendamentos registrados. Revise a cadência comercial da equipe.',
        level: 'warning',
      })
    }

    return items
  }, [data.funilData.agd_total, data.funilData.leads, data.pendingDisciplineSellers])

  const isEvaluating = data.loading || deterministic.loading
  const hasAttention = operationalWarnings.length > 0 || filteredActions.length > 0 || Boolean(deterministic.error)

  return (
    <main className="min-h-full bg-gray-50">
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

        <section
          className={`rounded-2xl border p-5 ${isEvaluating || hasAttention ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}
          aria-label="Ponto de atenção"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className={isEvaluating || hasAttention ? 'text-amber-600' : 'text-emerald-600'} size={20} />
            <div>
              <h2 className={`font-semibold ${isEvaluating || hasAttention ? 'text-amber-800' : 'text-emerald-800'}`}>
                {isEvaluating ? 'Avaliando a operação' : hasAttention ? 'Ponto de Atenção' : 'Operação normalizada'}
              </h2>
              <p className={`mt-1 text-sm ${isEvaluating || hasAttention ? 'text-amber-700' : 'text-emerald-700'}`}>
                {isEvaluating
                  ? 'Aguarde o carregamento dos indicadores oficiais antes de tomar uma decisão.'
                  : hasAttention
                    ? 'Alguns fatos operacionais precisam de tratamento. Use as ações abaixo para abrir a origem ou registrar a tratativa.'
                    : 'Nenhuma recomendação crítica no momento. Mantenha a cadência de acompanhamento.'}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" aria-labelledby="mentor-rules-title">
          <h2 id="mentor-rules-title" className="font-semibold text-gray-800">Alertas operacionais</h2>
          <div className="mt-4 space-y-2">
            {data.loading ? (
              <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" /></div>
            ) : operationalWarnings.length ? (
              operationalWarnings.map((item, index) => (
                <div key={`${item.message}-${index}`} className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                  <p className="text-sm text-gray-700">{item.message}</p>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-sm text-gray-500">Nenhum alerta operacional adicional.</p>
            )}
          </div>
        </section>

        <DeterministicActionsPanel
          actions={filteredActions}
          loading={deterministic.loading}
          error={deterministic.error}
          refresh={deterministic.refresh}
          resolveAction={deterministic.resolveAction}
          title="Ações determinísticas da operação"
        />

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" aria-labelledby="mentor-library-title">
          <div className="mb-4 flex items-center gap-2"><BookOpen className="text-emerald-600" size={20} /><h2 id="mentor-library-title" className="font-semibold text-gray-800">Biblioteca de Orientações</h2></div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {guidance.map(({ title, content, icon: Icon }) => (
              <button
                key={title}
                type="button"
                onClick={() => setSelectedGuidance(guidance.find((item) => item.title === title) || null)}
                className="rounded-xl border border-transparent bg-gray-50 p-4 text-left transition-all hover:border-emerald-200 hover:bg-emerald-50"
              >
                <span className="mb-3 grid h-8 w-8 place-items-center rounded-lg bg-white text-emerald-600 shadow-sm"><Icon size={16} /></span>
                <p className="text-sm font-medium text-gray-700">{title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-gray-400">{content}</p>
                <p className="mt-2 text-xs font-medium text-emerald-600">Clique para ver a orientação →</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-center">
          <BrainCircuit className="mx-auto text-blue-400" size={32} />
          <p className="mt-2 text-sm font-medium text-blue-700">Orientações baseadas em regras oficiais</p>
          <p className="mt-1 text-xs text-blue-500">O Mentor não inventa números nem executa ações no lugar do gerente.</p>
        </section>
      </div>

      {selectedGuidance && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/30 p-4" role="presentation" onMouseDown={() => setSelectedGuidance(null)}>
          <section ref={mentorDialogRef} role="dialog" aria-modal="true" aria-labelledby="mentor-dialog-title" className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" aria-label="Fechar orientação" onClick={() => setSelectedGuidance(null)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            <h2 id="mentor-dialog-title" className="pr-8 font-semibold text-gray-800">{selectedGuidance.title}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">{selectedGuidance.content}</p>
          </section>
        </div>
      )}
    </main>
  )
}
