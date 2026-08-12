import { AlertTriangle, Check, CloudOff, Loader2, RefreshCw } from 'lucide-react'
import type { AutosaveState } from './checkin-autosave.types'

const TIME_FORMAT = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatAutosaveLabel(state: AutosaveState, finalizado: boolean): string {
  if (finalizado) {
    return state.lastSavedAt
      ? `Fechamento concluído às ${TIME_FORMAT.format(new Date(state.lastSavedAt))}`
      : 'Fechamento concluído'
  }
  switch (state.status) {
    case 'dirty':
      return 'Alterações não salvas'
    case 'saving':
      return 'Salvando rascunho...'
    case 'saved':
      return state.lastSavedAt
        ? `Rascunho salvo às ${TIME_FORMAT.format(new Date(state.lastSavedAt))}`
        : 'Rascunho salvo'
    case 'offline':
      return 'Sem conexão. Salvaremos ao reconectar.'
    case 'conflict':
      return 'Atualizado em outra sessão. Revise os dados.'
    case 'error':
      return 'Falha ao salvar.'
    case 'idle':
    default:
      return state.lastSavedAt
        ? `Rascunho salvo às ${TIME_FORMAT.format(new Date(state.lastSavedAt))}`
        : 'Nenhuma alteração ainda'
  }
}

interface CheckinAutosaveStatusProps {
  state: AutosaveState
  finalizado: boolean
  onSaveNow: () => void
  onRetry: () => void
  saving: boolean
  disabled?: boolean
}

/**
 * Barra de estado do rascunho.
 *
 * O status não pode depender só de cor: cada estado tem ícone e texto, e a
 * região é `aria-live="polite"` para leitores de tela anunciarem a mudança de
 * "não salvo" para "salvo" sem roubar o foco de quem está digitando.
 */
export function CheckinAutosaveStatus({
  state,
  finalizado,
  onSaveNow,
  onRetry,
  saving,
  disabled = false,
}: CheckinAutosaveStatusProps) {
  const label = formatAutosaveLabel(state, finalizado)
  const isProblem = state.status === 'error' || state.status === 'conflict'
  const isOffline = state.status === 'offline'

  const tone = finalizado
    ? 'border-status-success/30 bg-status-success-surface text-status-success-text'
    : isProblem
      ? 'border-status-error/30 bg-status-error-surface text-status-error-text'
      : isOffline
        ? 'border-status-warning/30 bg-status-warning-surface text-status-warning-text'
        : 'border-border bg-white text-foreground'

  const Icon = finalizado
    ? Check
    : state.status === 'saving'
      ? Loader2
      : isOffline
        ? CloudOff
        : isProblem
          ? AlertTriangle
          : Check

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-sm ${tone}`}
      data-testid="checkin-autosave-status"
    >
      <p className="flex min-w-0 items-center gap-2 text-body-sm font-semibold" role="status" aria-live="polite">
        <Icon
          size={16}
          aria-hidden="true"
          className={`shrink-0 ${state.status === 'saving' ? 'animate-spin' : ''}`}
        />
        <span className="min-w-0 break-words">{label}</span>
      </p>

      {!finalizado && (
        <div className="flex shrink-0 items-center gap-2">
          {state.status === 'error' && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-11 min-w-[44px] items-center gap-1.5 rounded-lg border border-status-error/40 bg-white px-3 text-body-sm font-bold text-status-error-text transition-colors hover:bg-status-error-surface"
            >
              <RefreshCw size={14} aria-hidden="true" />
              Tentar novamente
            </button>
          )}
          <button
            type="button"
            onClick={onSaveNow}
            disabled={disabled || saving}
            className="inline-flex h-11 min-w-[44px] items-center rounded-lg border border-border-strong bg-white px-3 text-body-sm font-bold text-foreground transition-colors hover:border-[#005BFF] hover:text-[#005BFF] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Salvar rascunho
          </button>
        </div>
      )}
    </div>
  )
}
