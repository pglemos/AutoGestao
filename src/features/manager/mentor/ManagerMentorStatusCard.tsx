import { AlertCircle, AlertOctagon, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react'
import { countMentorLevels, type MentorRecommendation, type MentorSituation } from './manager-mentor-rules'

const SITUATION = {
  controlada: {
    surface: 'border-status-success/30 from-status-success-surface',
    icon: ShieldCheck,
    iconColor: 'text-status-success-text',
    iconSurface: 'bg-status-success-surface',
    title: 'Operação Controlada',
    titleColor: 'text-status-success-text',
    message: 'Sua equipe está performando bem. Continue acompanhando de perto e reforce os comportamentos positivos.',
  },
  atencao: {
    surface: 'border-status-warning/30 from-amber-50',
    icon: AlertTriangle,
    iconColor: 'text-status-warning-text',
    iconSurface: 'bg-status-warning-surface',
    title: 'Ponto de Atenção',
    titleColor: 'text-status-warning-text',
    message: 'Alguns indicadores precisam de atenção. Verifique as recomendações e tome ações corretivas.',
  },
  critica: {
    surface: 'border-status-error/30 from-status-error-surface',
    icon: AlertOctagon,
    iconColor: 'text-status-error-text',
    iconSurface: 'bg-status-error-surface',
    title: 'Situação Crítica',
    titleColor: 'text-status-error-text',
    message: 'A operação exige intervenção imediata. Priorize as ações críticas e atue agora com a equipe.',
  },
} as const satisfies Record<MentorSituation, unknown>

export function ManagerMentorStatusCard({
  situation,
  recommendations,
}: {
  situation: MentorSituation
  recommendations: MentorRecommendation[]
}) {
  const config = SITUATION[situation]
  const Icon = config.icon
  const { critical, attention, total } = countMentorLevels(recommendations)

  return (
    <section
      className={`rounded-2xl border bg-gradient-to-br to-white p-5 shadow-sm ${config.surface}`}
      aria-label="Situação da operação"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${config.iconSurface}`}>
            <Icon className={config.iconColor} size={24} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className={`font-semibold ${config.titleColor}`}>{config.title}</p>
              {total === 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-status-success-surface px-2 py-0.5 text-caption font-semibold text-status-success-text">
                  <Sparkles size={10} /> Sem alertas
                </span>
              )}
            </div>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">{config.message}</p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <div className="min-w-[84px] rounded-xl border border-white/60 bg-white/70 px-4 py-2.5 text-center backdrop-blur">
            <p className="text-2xl font-bold leading-none text-status-error-text">{critical}</p>
            <p className="mt-1 text-caption uppercase tracking-wide text-muted-foreground">Críticos</p>
          </div>
          <div className="min-w-[84px] rounded-xl border border-white/60 bg-white/70 px-4 py-2.5 text-center backdrop-blur">
            <p className="text-2xl font-bold leading-none text-status-warning-text">{attention}</p>
            <p className="mt-1 text-caption uppercase tracking-wide text-muted-foreground">Atenção</p>
          </div>
        </div>
      </div>
      {total === 0 && (
        <p className="mt-4 flex items-center gap-2 border-t border-white/50 pt-4 text-sm text-muted-foreground">
          <AlertCircle size={15} /> Nenhum sinal de alerta ativo no momento.
        </p>
      )}
    </section>
  )
}

export default ManagerMentorStatusCard
