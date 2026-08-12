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
    <section className="overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-sm" aria-labelledby="conversion-funnel-title">
      <header className="flex flex-col gap-3 border-b border-border-subtle px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-status-info-surface text-status-info-text">
            <TrendingUp size={19} />
          </span>
          <div>
            <h2 id="conversion-funnel-title" className="text-lg font-bold text-foreground">Conversão do funil</h2>
            <p className="mt-1 text-sm text-muted-foreground">Compare cada passagem comercial com o benchmark definido para a unidade.</p>
          </div>
        </div>
        <span className={`inline-flex w-fit rounded-lg px-2.5 py-1 text-xs font-semibold ${healthySteps === steps.length ? 'bg-status-success-surface text-status-success-text' : 'bg-status-warning-surface text-status-warning-text'}`}>
          {healthySteps}/{steps.length} etapas no ritmo
        </span>
      </header>

      <div className="grid gap-4 p-5 lg:grid-cols-3">
        {steps.map((step, index) => {
          const healthy = step.value >= step.benchmark
          const StatusIcon = healthy ? CheckCircle2 : CircleAlert
          return (
            <article key={`${step.from}-${step.to}`} className="rounded-2xl border border-border-subtle bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-xs font-bold text-muted-foreground shadow-sm">{index + 1}</span>
                <StatusIcon size={18} className={healthy ? 'text-status-success-text' : 'text-status-warning-text'} />
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                <span>{step.from}</span>
                <ArrowRight size={14} className="text-muted-foreground" />
                <span>{step.to}</span>
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <p className="text-3xl font-bold text-foreground tabular-nums">{step.value}%</p>
                <p className="pb-1 text-xs text-muted-foreground">Meta {step.benchmark}%</p>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={reduceMotion ? false : { width: 0 }}
                  animate={{ width: `${Math.min(Math.max(step.value, 0), 100)}%` }}
                  transition={{ duration: reduceMotion ? 0 : duration.slow, ease: easing.standard }}
                  className={`h-full rounded-full ${healthy ? 'bg-status-success' : 'bg-status-warning'}`}
                />
              </div>

              <p className="mt-4 text-xs leading-5 text-muted-foreground">{funnelInterpretation(step.value, step.benchmark)}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default FunnelSection
