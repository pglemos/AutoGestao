import { motion } from 'motion/react'
import { MessageSquare, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Avatar } from '@/components/atoms/Avatar'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import type { MetricTone, PendingCorrectionRequest } from '../data/types'

type Props = {
  pendingRequests: PendingCorrectionRequest[]
  auditorLoading: boolean
  onApprove: (req: PendingCorrectionRequest) => void
  onReject: (id: string) => void
}

/**
 * Aba "Ajustes" — auditoria de solicitações de correção retroativas (RLS / governança).
 */
export function RotinaAjustesTab({
  pendingRequests,
  auditorLoading,
  onApprove,
  onReject,
}: Props) {
  return (
    <motion.div
      key="ajustes"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-mx-lg"
    >
      <Card className="border p-mx-md bg-white relative overflow-hidden">
        <div
          className="absolute top-mx-0 right-mx-0 w-mx-sidebar-expanded h-mx-64 bg-brand-primary/5 rounded-mx-full blur-mx-xl -mr-32 -mt-32"
          aria-hidden="true"
        />
        <header className="flex items-center justify-between border-b border-border-subtle pb-8 mb-10 relative z-[var(--mx-z-sticky)]">
          <div className="flex items-center gap-mx-md">
            <div className="w-mx-2xl h-mx-2xl rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-sm transform rotate-2">
              <ShieldAlert size={32} />
            </div>
            <div>
              <Typography variant="h2" className="tracking-tighter leading-none">
                Auditoria de Ajustes
              </Typography>
              <Typography
                variant="caption"
                tone="muted"
                className="mt-1"
              >
                SOLICITAÇÕES RETROATIVAS PENDENTES
              </Typography>
            </div>
          </div>
          <Badge
            variant={pendingRequests.length > 0 ? 'warning' : 'success'}
            className="shadow-sm px-6 py-2 rounded-xl font-bold uppercase text-tiny"
          >
            {pendingRequests.length} PENDÊNCIAS
          </Badge>
        </header>

        <div className="space-y-mx-md relative z-[var(--mx-z-sticky)]">
          {pendingRequests.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-mx-md bg-surface-alt rounded-xl border border-dashed border-border-subtle">
              <ShieldCheck size={48} className="text-muted-foreground/20" />
              <Typography
                variant="p"
                tone="muted"
                className=""
              >
                Malha 100% Sincronizada
              </Typography>
            </div>
          ) : (
            pendingRequests.map((req) => (
              <Card
                key={req.id}
                className="border bg-surface-alt/30 hover:bg-white hover:shadow-sm transition-all group p-mx-md"
              >
                <div className="flex flex-col lg:flex-row gap-mx-lg">
                  <div className="flex-1 space-y-mx-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-mx-sm">
                        <Avatar
                          src={req.seller?.avatar_url || undefined}
                          alt={`Avatar de ${req.seller?.name || 'nome não informado'}`}
                          fallback={req.seller?.name || '?'}
                          className="w-mx-10 h-mx-10 rounded-xl bg-brand-primary text-white shadow-none"
                        />
                        <div>
                          <Typography variant="h3" className="text-base">
                            {req.seller?.name || 'Nome não informado'}
                          </Typography>
                          <Typography
                            variant="tiny"
                            tone="muted"
                            className=""
                          >
                            Solicitado em {new Date(req.created_at).toLocaleDateString('pt-BR')}
                          </Typography>
                        </div>
                      </div>
                      <Badge variant="outline" className="font-mono-numbers">
                        {req.id.split('-')[0]}
                      </Badge>
                    </div>

                    <div className="bg-white p-mx-md rounded-xl shadow-none border border-border-subtle space-y-mx-sm">
                      <header className="flex items-center gap-mx-xs border-b border-border-subtle pb-2 mb-2">
                        <MessageSquare size={14} className="text-status-success-text" />
                        <Typography
                          variant="tiny"
                          className=""
                        >
                          Justificativa Operacional
                        </Typography>
                      </header>
                      <Typography
                        variant="p"
                        className="text-sm font-bold italic leading-relaxed"
                      >
                        &quot;{req.reason}&quot;
                      </Typography>
                    </div>
                    <div className="rounded-xl border border-status-warning/20 bg-status-warning-surface p-mx-md">
                      <Typography
                        variant="tiny"
                        className="mb-mx-xs block text-status-warning-text"
                      >
                        Decisão crítica
                      </Typography>
                      <Typography variant="p" className="text-sm text-status-warning-text">
                        Aprovar aplica estes valores ao histórico do lançamento. Rejeitar
                        mantém o registro atual e remove a solicitação da fila.
                      </Typography>
                      <Typography
                        variant="tiny"
                        className="mt-mx-xs block text-status-warning-text"
                      >
                        Referência: {req.requested_values.reference_date || 'não informada'}
                      </Typography>
                    </div>
                  </div>

                  <div className="lg:w-mx-card-md space-y-mx-md">
                    <Typography
                      variant="tiny"
                      tone="muted"
                      className="ml-2"
                    >
                      Valores Solicitados
                    </Typography>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-mx-xs">
                      {[
                        {
                          l: 'L',
                          v: req.requested_values.leads_prev_day ?? req.requested_values.leads,
                          t: 'brand' as MetricTone,
                        },
                        {
                          l: 'V',
                          v:
                            req.requested_values.visit_prev_day ??
                            req.requested_values.visitas,
                          t: 'warning' as MetricTone,
                        },
                        {
                          l: 'VND',
                          v:
                            (req.requested_values.vnd_porta_prev_day ??
                              req.requested_values.vnd_porta ??
                              0) +
                            (req.requested_values.vnd_cart_prev_day ??
                              req.requested_values.vnd_cart ??
                              0) +
                            (req.requested_values.vnd_net_prev_day ??
                              req.requested_values.vnd_net ??
                              0),
                          t: 'success' as MetricTone,
                        },
                      ].map((val) => (
                        <div
                          key={val.l}
                          className="bg-white p-mx-sm rounded-xl border border-border-subtle shadow-sm text-center"
                        >
                          <Typography variant="tiny" tone="muted" className="block">
                            {val.l}
                          </Typography>
                          <Typography
                            variant="h3"
                            tone={val.t}
                            className="text-xl tabular-nums"
                          >
                            {val.v}
                          </Typography>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-mx-sm pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onReject(req.id)}
                        disabled={auditorLoading}
                        className="flex-1 h-mx-11 rounded-xl font-bold text-mx-micro uppercase hover:bg-status-error-surface hover:text-status-error-text transition-all border-border-subtle"
                      >
                        REJEITAR
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onApprove(req)}
                        disabled={auditorLoading}
                        className="flex-1 h-mx-11 rounded-xl font-bold text-mx-micro uppercase shadow-sm bg-brand-primary hover:bg-brand-primary-hover text-white"
                      >
                        APROVAR AJUSTE
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>
    </motion.div>
  )
}

export default RotinaAjustesTab
