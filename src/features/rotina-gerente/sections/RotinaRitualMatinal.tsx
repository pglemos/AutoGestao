import { CheckCircle2, Mail, RefreshCw, Zap } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { cn } from '@/lib/utils'
import type { RoutineNotice } from '../data/types'

type Props = {
  reuniaoDone: boolean
  setReuniaoDone: (v: boolean) => void
  agendaValidated: boolean
  setAgendaDone: (v: boolean) => void
  totalAgendamentosHoje: number
  canTriggerMatinal: boolean
  executing: boolean
  matinalAudit: RoutineNotice | null
  onTriggerMatinal: () => void
}

/**
 * Card "Ritual Matinal" — checklist mandatário (Reunião, Agenda) + disparo do Matinal.
 */
export function RotinaRitualMatinal({
  reuniaoDone,
  setReuniaoDone,
  agendaValidated,
  setAgendaDone,
  totalAgendamentosHoje,
  canTriggerMatinal,
  executing,
  matinalAudit,
  onTriggerMatinal,
}: Props) {
  const steps = [
    {
      done: reuniaoDone,
      set: setReuniaoDone,
      label: 'Reunião Individual (D-0)',
      desc: 'Alinhamento tático e motivação do corpo de vendas',
      idx: '01',
    },
    {
      done: agendaValidated,
      set: setAgendaDone,
      label: 'Validação de Agenda',
      desc: `${totalAgendamentosHoje} compromissos firmados para hoje`,
      idx: '02',
    },
  ]

  return (
    <Card className="border p-mx-md space-y-mx-md bg-white relative overflow-hidden">
      <div
        className="absolute top-mx-0 right-mx-0 w-mx-sidebar-expanded h-mx-64 bg-brand-primary/5 rounded-mx-full blur-mx-xl -mr-32 -mt-32"
        aria-hidden="true"
      />
      <header className="flex items-center justify-between border-b border-border-subtle pb-8 relative z-[var(--mx-z-sticky)]">
        <div className="flex items-center gap-mx-md">
          <div className="w-mx-2xl h-mx-2xl rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-sm transform -rotate-2">
            <Zap size={32} />
          </div>
          <div>
            <Typography variant="h2" className="tracking-tighter leading-none">
              Ritual Matinal
            </Typography>
            <Typography
              variant="caption"
              tone="muted"
              className="mt-1"
            >
              SEQUÊNCIA MANDATÁRIA • LIMITE 10:30
            </Typography>
          </div>
        </div>
        <Badge
          variant="danger"
          className="animate-pulse px-6 py-2 text-tiny"
        >
          Prioridade 01
        </Badge>
      </header>

      <div className="space-y-mx-md relative z-[var(--mx-z-sticky)]">
        {steps.map((step) => (
          <Card
            key={step.idx}
            onClick={() => step.set(!step.done)}
            className={cn(
              'rounded-xl border p-mx-md cursor-pointer group transition-all',
              step.done
                ? 'bg-status-success-surface/30 border-status-success/20 text-status-success-text'
                : 'bg-surface-alt border-border-subtle hover:bg-white hover:border-brand-primary/20 hover:shadow-sm',
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-mx-md">
              <div className="flex items-start sm:items-center gap-mx-md min-w-0">
                <div
                  className={cn(
                    'w-mx-xl h-mx-xl rounded-xl flex items-center justify-center border shadow-mx-inner transition-all',
                    step.done
                      ? 'bg-white text-status-success-text border-status-success/30'
                      : 'bg-white text-muted-foreground border-border-subtle group-hover:scale-110',
                  )}
                >
                  {step.done ? (
                    <CheckCircle2 size={24} strokeWidth={2} />
                  ) : (
                    <Typography variant="h3" className="text-base leading-none">
                      {step.idx}
                    </Typography>
                  )}
                </div>
                <div className="min-w-0">
                  <Typography
                    variant="h3"
                    className={cn(
                      'text-base uppercase tracking-tight',
                      step.done && 'text-status-success-text',
                    )}
                  >
                    {step.label}
                  </Typography>
                  <Typography
                    variant="tiny"
                    tone="muted"
                    className="italic mt-1 opacity-60"
                  >
                    &quot;{step.desc}&quot;
                  </Typography>
                </div>
              </div>
              {!step.done && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto px-6 h-mx-10 text-tiny bg-white shadow-sm hover:bg-surface-alt"
                >
                  Concluir
                </Button>
              )}
            </div>
          </Card>
        ))}

        <Card
          className={cn(
            'rounded-xl border border-border-subtle p-mx-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-mx-lg',
            canTriggerMatinal
              ? 'bg-gray-900 text-white shadow-sm border-none'
              : 'bg-surface-alt opacity-40',
          )}
        >
          <div className="flex items-center gap-mx-md">
            <div
              className={cn(
                'w-mx-14 h-mx-14 rounded-xl flex items-center justify-center border transition-all',
                canTriggerMatinal
                  ? 'bg-white/10 text-white border-white/10 shadow-mx-inner'
                  : 'bg-white text-muted-foreground',
              )}
            >
              <Mail size={28} strokeWidth={2} />
            </div>
            <div>
              <Typography
                variant="h3"
                tone={canTriggerMatinal ? 'white' : 'default'}
                className="text-lg tracking-tight leading-none"
              >
                Disparar Matinal
              </Typography>
              <Typography
                variant="caption"
                tone={canTriggerMatinal ? 'white' : 'muted'}
                className="mt-1"
              >
                DIREÇÃO &amp; GOVERNANÇA REDE
              </Typography>
            </div>
          </div>
          <Button
            disabled={!canTriggerMatinal || executing}
            onClick={onTriggerMatinal}
            className={cn(
              'h-mx-14 px-10 rounded-xl font-bold uppercase tracking-widest text-tiny',
              canTriggerMatinal
                ? 'bg-brand-primary shadow-sm text-white'
                : 'bg-white border-border-subtle text-muted-foreground',
            )}
          >
            {executing ? (
              <RefreshCw className="animate-spin mr-2" />
            ) : (
              <Zap size={18} className="mr-2" />
            )}{' '}
            DISPARAR AGORA
          </Button>
          {matinalAudit && (
            <div
              className={cn(
                'w-full rounded-xl border px-mx-md py-mx-sm text-sm font-bold md:basis-full',
                matinalAudit.tone === 'success'
                  ? 'border-status-success/20 bg-status-success-surface text-status-success-text'
                  : 'border-status-error/20 bg-status-error-surface text-status-error-text',
              )}
            >
              <div className="flex flex-col gap-mx-tiny sm:flex-row sm:items-center sm:justify-between">
                <span>{matinalAudit.message}</span>
                <span className="text-mx-tiny font-bold uppercase opacity-70">
                  {matinalAudit.at.toLocaleString('pt-BR')}
                </span>
              </div>
              {matinalAudit.detail && (
                <p className="mt-mx-tiny text-xs opacity-80">{matinalAudit.detail}</p>
              )}
            </div>
          )}
        </Card>
      </div>
    </Card>
  )
}

export default RotinaRitualMatinal
