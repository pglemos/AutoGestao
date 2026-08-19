// Banner de ciclo do plano estratégico.
//
// Aparece acima das abas da tela de Plano Estratégico quando há um cliente
// vinculado à loja selecionada. Mostra:
//   - Status atual do ciclo (badge)
//   - Resumo de prontidão (% de indicadores completos)
//   - Botão de ação primária conforme o status do ciclo
//   - Lista de pendências antes da publicação (quando `!canPublish`)
//
// Quem tem `canManageCycle` (= canEditTargets) vê os botões de transição.
// O Dono vê o status mas não vê os botões.

import React, { useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Clock,
  Loader2,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { AlertMessage } from '@/components/molecules/AlertMessage'
import { PLAN_CYCLE_STATUS_LABEL, type PlanCycleStatus } from './planCycle'
import type { PlanCycleState } from './usePlanCycle'

// ─── Badge de status ──────────────────────────────────────────────────────────

const STATUS_STYLE: Record<PlanCycleStatus, { icon: React.ElementType; className: string }> = {
  rascunho: {
    icon: CircleDot,
    className: 'bg-surface-alt text-muted-foreground border border-border',
  },
  em_validacao: {
    icon: Clock,
    className: 'bg-status-warning-surface text-status-warning-text border border-status-warning/30',
  },
  publicado: {
    icon: CheckCircle2,
    className: 'bg-status-success-surface text-status-success-text border border-status-success/30',
  },
  revisado: {
    icon: Lock,
    className: 'bg-surface-alt text-muted-foreground border border-border',
  },
}

function CycleBadge({ status }: { status: PlanCycleStatus }) {
  const { icon: Icon, className } = STATUS_STYLE[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      <Icon className="h-3 w-3" aria-hidden />
      {PLAN_CYCLE_STATUS_LABEL[status]}
    </span>
  )
}

// ─── Lista de pendências ──────────────────────────────────────────────────────

function PendingIssues({ state }: { state: PlanCycleState }) {
  const [open, setOpen] = useState(false)
  const { readiness } = state
  if (!readiness || readiness.issues.length === 0) return null

  const criticos = readiness.issues.filter(i => i.severity === 'critico')
  const pendencias = readiness.issues.filter(i => i.severity === 'pendencia')

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        aria-expanded={open}
      >
        {open ? <ChevronUp className="h-3 w-3" aria-hidden /> : <ChevronDown className="h-3 w-3" aria-hidden />}
        {open ? 'Ocultar pendências' : `Ver ${readiness.issues.length} pendência(s)`}
      </button>

      {open && (
        <ul className="mt-2 space-y-1 text-xs" aria-label="Lista de pendências do plano">
          {criticos.map((issue, i) => (
            <li key={`crit-${i}`} className="flex items-start gap-1.5 text-status-error-text">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-status-error" aria-hidden />
              {issue.message}
            </li>
          ))}
          {pendencias.slice(0, 20).map((issue, i) => (
            <li key={`pend-${i}`} className="flex items-start gap-1.5 text-muted-foreground">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-border" aria-hidden />
              {issue.message}
            </li>
          ))}
          {pendencias.length > 20 && (
            <li className="text-muted-foreground">
              … e mais {pendencias.length - 20} pendência(s) de metas mensais.
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

// ─── Botão de ação primária ───────────────────────────────────────────────────

function CycleActionButton({ state }: { state: PlanCycleState }) {
  const { cycle, readiness, transitioning, canManageCycle, initCycle, submitForValidation, publishCycle } = state

  if (!canManageCycle) return null

  if (!cycle) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => void initCycle()}
        disabled={transitioning}
        aria-busy={transitioning}
      >
        {transitioning && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Iniciar Ciclo
      </Button>
    )
  }

  if (cycle.status === 'rascunho') {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => void submitForValidation()}
        disabled={transitioning}
        aria-busy={transitioning}
      >
        {transitioning && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Enviar para Validação
      </Button>
    )
  }

  if (cycle.status === 'em_validacao') {
    const canPublish = readiness?.canPublish ?? false
    return (
      <Button
        size="sm"
        variant={canPublish ? 'primary' : 'outline'}
        onClick={() => void publishCycle()}
        disabled={transitioning || !canPublish}
        aria-busy={transitioning}
        title={canPublish ? 'Publicar plano' : 'Há pendências — verifique a lista abaixo'}
      >
        {transitioning && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {canPublish ? 'Publicar Plano' : 'Publicar (com pendências)'}
      </Button>
    )
  }

  // publicado / revisado: sem ação primária aqui (revisão é outra operação)
  return null
}

// ─── Banner principal ─────────────────────────────────────────────────────────

export interface PlanCycleBannerProps {
  state: PlanCycleState
  year: number
}

export function PlanCycleBanner({ state, year }: PlanCycleBannerProps) {
  const { cycle, summary, loading, transitioning, error, clientId } = state

  // Sem cliente vinculado: banner não aparece.
  if (!clientId) return null

  // Carregando pela primeira vez: esqueleto minimalista.
  if (loading) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
        aria-busy="true"
        aria-label="Carregando ciclo do plano"
      >
        <div className="h-5 w-24 animate-pulse rounded-full bg-surface-alt" />
        <div className="h-4 w-48 animate-pulse rounded bg-surface-alt" />
      </div>
    )
  }

  // Erro de banco: alerta descartável (não bloqueia a tela).
  if (error) {
    return (
      <AlertMessage tone="warning" live>
        <span className="text-sm">Ciclo do plano: {error}</span>
      </AlertMessage>
    )
  }

  const bannerBg = cycle?.status === 'publicado'
    ? 'bg-status-success-surface border-status-success/30'
    : cycle?.status === 'em_validacao'
      ? 'bg-status-warning-surface border-status-warning/30'
      : 'bg-card border-border'

  return (
    <div
      className={`rounded-xl border px-4 py-3 shadow-sm ${bannerBg}`}
      role="region"
      aria-label="Ciclo do Plano Estratégico"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Esquerda: badge + resumo */}
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          {cycle
            ? <CycleBadge status={cycle.status} />
            : (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-alt px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                <CircleDot className="h-3 w-3" aria-hidden />
                Sem ciclo {year}
              </span>
            )
          }
          {summary && (
            <span className="text-sm text-muted-foreground" aria-live="polite">
              {summary}
            </span>
          )}
        </div>

        {/* Direita: botão de ação */}
        <div className="shrink-0">
          {transitioning
            ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Processando…" />
            : <CycleActionButton state={state} />
          }
        </div>
      </div>

      {/* Pendências expansíveis — só aparecem na fase de validação */}
      {cycle?.status === 'em_validacao' && <PendingIssues state={state} />}
    </div>
  )
}
