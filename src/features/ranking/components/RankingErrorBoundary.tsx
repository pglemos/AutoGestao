import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode; sectionName?: string }
type State = { hasError: boolean; error: Error | null }

/**
 * ErrorBoundary local do Ranking — usado pelo container e por seções críticas,
 * para que falha em um bloco não derrube a página inteira.
 * Espelha pattern do DashboardErrorBoundary (Story 2.5, ADR-0050).
 */
export class RankingErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error(`[RankingErrorBoundary:${this.props.sectionName ?? 'unknown'}]`, error, info)
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
            O restante do ranking continua disponível. Recarregue para tentar novamente.
          </span>
        </div>
      )
    }
    return this.props.children
  }
}

export default RankingErrorBoundary
