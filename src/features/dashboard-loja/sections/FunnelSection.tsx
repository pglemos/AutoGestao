import { useCallback } from 'react'
import { ArrowRight, CheckCircle2, CircleAlert, TrendingUp } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { duration, easing } from '@/design/motion'

type FunnelData = {
  tx_lead_agd: number
  tx_agd_visita: number
  tx_visita_vnd: number
}

type FunnelBenchmarks = {
  leadAgd: number
  agdVisita: number
  visitaVnd: number
}

type FunnelSectionProps = {
  funilData: FunnelData
  funnelBenchmarks: FunnelBenchmarks
}

export function FunnelSection({ funilData, funnelBenchmarks }: FunnelSectionProps) {
  const reduceMotion = useReducedMotion()
  const funnelInterpretation = useCallback((value: number, benchmark: number) => {
    if (value >= benchmark) return 'Dentro ou acima do benchmark. Mantenha a cadência e acompanhe o volume.'
    const gap = Math.max(benchmark - value, 0)
    return `${gap} ponto${gap === 1 ? '' : 's'} percentual${gap === 1 ? '' : 'is'} abaixo do benchmark. Esta etapa precisa de ação.`
  }, [])

  const steps = [
    { from: 'Leads', to: 'Agendamentos', value: funilData.tx_lead_agd, benchmark: funnelBenchmarks.leadAgd },
    { from: 'Agendamentos', to: 'Visitas', value: funilData.tx_agd_visita, benchmark: funnelBenchmarks.agdVisita },
    { from: 'Visitas', to: 'Vendas', value: funilData.tx_visita_vnd, benchmark: funnelBenchmarks.visitaVnd },
  ]
  const healthySteps = steps.filter(step => step.value >= step.benchmark).length

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm" aria-labelledby="conversion-funnel-title">
      <header className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
            <TrendingUp size={19} />
          </span>
          <div>
            <h2 id="conversion-funnel-title" className="text-lg font-bold text-gray-800">Conversão do funil</h2>
            <p className="mt-1 text-sm text-gray-500">Compare cada passagem comercial com o benchmark definido para a unidade.</p>
          </div>
        </div>
        <span className={`inline-flex w-fit rounded-lg px-2.5 py-1 text-xs font-semibold ${healthySteps === steps.length ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {healthySteps}/{steps.length} etapas no ritmo
        </span>
      </header>

      <div className="grid gap-4 p-5 lg:grid-cols-3">
        {steps.map((step, index) => {
          const healthy = step.value >= step.benchmark
          const StatusIcon = healthy ? CheckCircle2 : CircleAlert
          return (
            <article key={`${step.from}-${step.to}`} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-xs font-bold text-gray-500 shadow-sm">{index + 1}</span>
                <StatusIcon size={18} className={healthy ? 'text-emerald-600' : 'text-amber-600'} />
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <span>{step.from}</span>
                <ArrowRight size={14} className="text-gray-400" />
                <span>{step.to}</span>
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <p className="text-3xl font-bold text-gray-800 tabular-nums">{step.value}%</p>
                <p className="pb-1 text-xs text-gray-400">Meta {step.benchmark}%</p>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
                <motion.div
                  initial={reduceMotion ? false : { width: 0 }}
                  animate={{ width: `${Math.min(Math.max(step.value, 0), 100)}%` }}
                  transition={{ duration: reduceMotion ? 0 : duration.slow, ease: easing.standard as [number, number, number, number] }}
                  className={`h-full rounded-full ${healthy ? 'bg-emerald-500' : 'bg-amber-500'}`}
                />
              </div>

              <p className="mt-4 text-xs leading-5 text-gray-500">{funnelInterpretation(step.value, step.benchmark)}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default FunnelSection
