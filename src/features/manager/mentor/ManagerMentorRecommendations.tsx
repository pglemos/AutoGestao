import { useState } from 'react'
import { Activity, ArrowRight, Clock, Filter, ListChecks, Target } from 'lucide-react'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import type { MentorRecommendation, MentorType } from './manager-mentor-rules'

const TYPE_CONFIG: Record<MentorType, { icon: typeof Clock; label: string; color: string; surface: string }> = {
  fechamento: { icon: Clock, label: 'Fechamento', color: 'text-blue-600', surface: 'border-blue-100 bg-blue-50' },
  rotina: { icon: Activity, label: 'Rotina', color: 'text-purple-600', surface: 'border-purple-100 bg-purple-50' },
  meta: { icon: Target, label: 'Meta', color: 'text-emerald-600', surface: 'border-emerald-100 bg-emerald-50' },
}

const FILTERS = [
  { key: 'todos', label: 'Todos' },
  { key: 'critico', label: 'Críticos' },
  { key: 'atencao', label: 'Atenção' },
] as const

type FilterKey = (typeof FILTERS)[number]['key']

export function ManagerMentorRecommendations({ recommendations }: { recommendations: MentorRecommendation[] }) {
  const [filter, setFilter] = useState<FilterKey>('todos')
  const filtered = filter === 'todos' ? recommendations : recommendations.filter(item => item.level === filter)

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" data-tour="mentor-recomendacoes" aria-labelledby="mentor-rules-title">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="mentor-rules-title" className="flex items-center gap-1.5 font-semibold text-foreground">
          <ListChecks size={18} className="text-emerald-600" />
          Recomendações por Regras
          <HelpTooltip text="Sinais gerados automaticamente por regras objetivas (sem IA) sobre fechamentos pendentes, rotina crítica e atraso na meta proporcional da loja." />
        </h2>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground" />
          {FILTERS.map(item => (
            <button
              key={item.key}
              type="button"
              aria-pressed={filter === item.key}
              onClick={() => setFilter(item.key)}
              className={`rounded-lg border px-3 py-1 text-xs font-medium transition-all ${
                filter === item.key
                  ? 'border-gray-800 bg-gray-800 text-white'
                  : 'border-gray-100 bg-gray-50 text-muted-foreground hover:bg-gray-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-emerald-50">
            <ListChecks className="text-emerald-500" size={28} />
          </span>
          <p className="text-sm font-medium text-muted-foreground">
            {recommendations.length === 0 ? 'Nenhuma recomendação no momento.' : 'Nenhuma recomendação neste filtro.'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Operação normalizada — continue monitorando.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item, index) => {
            const config = TYPE_CONFIG[item.type]
            const TypeIcon = config.icon
            const isCritical = item.level === 'critico'
            return (
              <article
                key={`${item.type}-${item.message}-${index}`}
                className={`rounded-xl border p-3.5 ${isCritical ? 'border-red-100 bg-red-50/50' : 'border-amber-100 bg-amber-50/50'}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${config.surface}`}>
                    <TypeIcon size={15} className={config.color} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{config.label}</span>
                      <span className={`rounded-md px-1.5 py-0.5 text-caption font-semibold ${isCritical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isCritical ? 'CRÍTICO' : 'ATENÇÃO'}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground">{item.message}</p>
                    <p className={`mt-2 flex items-start gap-1.5 text-xs ${isCritical ? 'text-red-700' : 'text-amber-700'}`}>
                      <ArrowRight size={13} className="mt-0.5 shrink-0" />
                      <span><span className="font-semibold">Ação sugerida: </span>{item.action}</span>
                    </p>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default ManagerMentorRecommendations
