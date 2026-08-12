import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode; sectionName?: string }
type State = { hasError: boolean; error: Error | null }

/**
 * ErrorBoundary local do RotinaGerente — usado por seção, para que falha
 * em uma section não derrube a página inteira (Story 3.6, ADR-0050).
 * Espelha o pattern do FeedbackErrorBoundary (Story 2.4) e AgendaErrorBoundary (Story 2.6).
 */
export class RotinaErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error(
        `[RotinaErrorBoundary:${this.props.sectionName ?? 'unknown'}]`,
        error,
        info,
      )
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="my-mx-xs rounded-xl border border-border bg-gray-50 p-mx-md text-mx-tiny font-bold uppercase tracking-widest text-status-warning-text"
        >
          <strong>
            // Bloco indisponível{this.props.sectionName ? `: ${this.props.sectionName}` : ''}
          </strong>
          <span className="mt-mx-xs block normal-case tracking-normal text-muted-foreground">
            O restante da página continua disponível. Recarregue para tentar novamente.
          </span>
        </div>
      )
    }
    return this.props.children
  }
}

export default RotinaErrorBoundary
