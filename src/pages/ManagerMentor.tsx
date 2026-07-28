import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, BookOpen, BrainCircuit, CheckSquare, MessageSquare, Target, Users, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { calcularProjecao, getDiasInfo } from '@/lib/calculations'
import { deriveDeterministicActions } from '@/lib/deterministic-actions'
import { useDashboardLojaData } from '@/features/dashboard-loja/hooks/useDashboardLojaData'
import { useFocusTrap } from '@/hooks/useFocusTrap'

const guidance = [
  { title: 'Reunião matinal', content: 'Alinhe a prioridade do dia, os clientes críticos e o ritmo necessário da loja. Termine a conversa com responsáveis e horários claros.', icon: Users },
  { title: 'Cobrança de fechamento', content: 'Confirme a pendência, combine um horário e registre a orientação sem lançar dados pelo vendedor.', icon: CheckSquare },
  { title: 'Feedback individual', content: 'Descreva o comportamento observado, seu impacto e o compromisso acordado. Evite julgamentos genéricos.', icon: MessageSquare },
  { title: 'Recuperação de meta', content: 'Converta o gap em ritmo diário e priorize os canais com melhor conversão oficial no período.', icon: Target },
]

type Guidance = (typeof guidance)[number]

export default function ManagerMentor() {
  const { storeId, membership } = useAuth()
  const [selectedGuidance, setSelectedGuidance] = useState<Guidance | null>(null)
  const mentorDialogRef = useRef<HTMLElement | null>(null)
  const data = useDashboardLojaData({ selectedStoreId: storeId, selectedStoreName: membership?.store?.name || 'Unidade MX' })
  const days = getDiasInfo(data.referenceDate, data.operationalMetaRules?.projection_mode || 'calendar')

  useFocusTrap(mentorDialogRef, Boolean(selectedGuidance))

  useEffect(() => {
    if (!selectedGuidance) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedGuidance(null)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [selectedGuidance])

  const recommendations = useMemo(() => {
    const items: Array<{
      message: string
      level: 'critical' | 'warning' | 'info'
      actionUrl?: string | null
      resolutionKey?: string
      evidenceText?: string
    }> = []

    for (const seller of data.pendingDisciplineSellers) {
      items.push({ message: `${seller.name} ainda não realizou o fechamento diário.`, level: 'warning' })
    }
    const projection = calcularProjecao(data.metrics.totalSales, days.decorridos, days.total)
    const goal = data.metrics.goalValue || 0
    if (goal > 0 && projection < goal) {
      items.push({ message: `A projeção atual é de ${Math.round(projection)} vendas para uma meta de ${goal}. Reforce o ritmo nos canais com conversão real.`, level: 'critical' })
    }
    if (data.funilData.leads > 0 && data.funilData.agd_total === 0) {
      items.push({ message: 'Há leads no período sem agendamentos registrados. Revise a cadência comercial da equipe.', level: 'warning' })
    }

    // Engine de Ações Determinísticas
    const deterministicActions = deriveDeterministicActions({
      refDate: data.referenceDate || new Date().toISOString().slice(0, 10),
      role: 'manager',
      userId: membership?.user_id || 'gerente',
      storeId: storeId || 'store-1',
      targetPace: goal > 0 ? {
        storeId: storeId || 'store-1',
        targetSales: goal,
        realizedSales: data.metrics.totalSales,
        dayOfMonth: days.decorridos,
        daysInMonth: days.total,
      } : undefined,
    })

    deterministicActions.forEach((act) => {
      items.push({
        message: `${act.title}: ${act.explanation}`,
        level: act.priority === 'critical' ? 'critical' : act.priority === 'high' ? 'warning' : 'info',
        actionUrl: act.actionUrl,
        resolutionKey: act.resolutionKey,
      })
    })

    return items
  }, [data.funilData.agd_total, data.funilData.leads, data.metrics.goalValue, data.metrics.totalSales, data.pendingDisciplineSellers, data.referenceDate, days.decorridos, days.total, membership?.user_id, storeId])

  return (
    <main className="min-h-full bg-gray-50">
      <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 pb-24">
        <header className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><BrainCircuit size={20} /></span>
            <div><h1 className="text-xl font-bold text-gray-800">Mentor Gerencial</h1><p className="mt-0.5 text-sm text-gray-500">Área de apoio à gestão. Recomendações baseadas em regras e indicadores da operação.</p></div>
          </div>
        </header>

        <section className={`rounded-2xl border p-5 ${data.loading || recommendations.length ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`} aria-label="Ponto de atenção">
          <div className="flex items-start gap-3"><AlertTriangle className={data.loading || recommendations.length ? 'text-amber-600' : 'text-emerald-600'} size={20} /><div><h2 className={`font-semibold ${data.loading || recommendations.length ? 'text-amber-800' : 'text-emerald-800'}`}>{data.loading ? 'Avaliando a operação' : recommendations.length ? 'Ponto de Atenção' : 'Operação normalizada'}</h2><p className={`mt-1 text-sm ${data.loading || recommendations.length ? 'text-amber-700' : 'text-emerald-700'}`}>{data.loading ? 'Aguarde o carregamento dos indicadores oficiais antes de tomar uma decisão.' : recommendations.length ? 'Alguns indicadores precisam de atenção. Verifique as recomendações abaixo e tome ações corretivas.' : 'Nenhuma recomendação crítica no momento. Mantenha a cadência de acompanhamento.'}</p></div></div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" aria-labelledby="mentor-rules-title">
          <h2 id="mentor-rules-title" className="font-semibold text-gray-800">Recomendações por Regras</h2>
          <div className="mt-4 space-y-2">
            {data.loading ? <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" /></div> : recommendations.length ? recommendations.map((item, index) => <div key={`${item.message}-${index}`} className={`flex items-start gap-3 rounded-xl border p-3 ${item.level === 'critical' ? 'border-red-100 bg-red-50' : 'border-amber-100 bg-amber-50'}`}><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.level === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`} /><p className="text-sm text-gray-700">{item.message}</p></div>) : <p className="py-4 text-center text-sm text-gray-500">Nenhuma recomendação no momento. Operação normalizada.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" aria-labelledby="mentor-library-title">
          <div className="mb-4 flex items-center gap-2"><BookOpen className="text-emerald-600" size={20} /><h2 id="mentor-library-title" className="font-semibold text-gray-800">Biblioteca de Orientações</h2></div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{guidance.map(({ title, content, icon: Icon }) => <button key={title} type="button" onClick={() => setSelectedGuidance(guidance.find(item => item.title === title) || null)} className="rounded-xl border border-transparent bg-gray-50 p-4 text-left transition-all hover:border-emerald-200 hover:bg-emerald-50"><span className="mb-3 grid h-8 w-8 place-items-center rounded-lg bg-white text-emerald-600 shadow-sm"><Icon size={16} /></span><p className="text-sm font-medium text-gray-700">{title}</p><p className="mt-1 line-clamp-2 text-xs text-gray-400">{content}</p><p className="mt-2 text-xs font-medium text-emerald-600">Clique para ver a orientação →</p></button>)}</div>
        </section>

        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-center"><BrainCircuit className="mx-auto text-blue-400" size={32} /><p className="mt-2 text-sm font-medium text-blue-700">Orientações baseadas em regras oficiais</p><p className="mt-1 text-xs text-blue-500">O Mentor não inventa números nem executa ações no lugar do gerente.</p></section>
      </div>

      {selectedGuidance && <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/30 p-4" role="presentation" onMouseDown={() => setSelectedGuidance(null)}><section ref={mentorDialogRef} role="dialog" aria-modal="true" aria-labelledby="mentor-dialog-title" className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onMouseDown={(event) => event.stopPropagation()}><button type="button" aria-label="Fechar orientação" onClick={() => setSelectedGuidance(null)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"><X size={18} /></button><h2 id="mentor-dialog-title" className="pr-8 font-semibold text-gray-800">{selectedGuidance.title}</h2><p className="mt-3 text-sm leading-6 text-gray-600">{selectedGuidance.content}</p></section></div>}
    </main>
  )
}
