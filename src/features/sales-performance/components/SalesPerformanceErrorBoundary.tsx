import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode; sectionName?: string }
type State = { hasError: boolean; error: Error | null }

/**
 * ErrorBoundary local de Sales Performance — protege seções pesadas (charts/tabelas)
 * para que falha em um bloco não derrube a página inteira.
 * Espelha pattern de RankingErrorBoundary (Story 2.3, ADR-0050).
 */
export class SalesPerformanceErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error(
        `[SalesPerformanceErrorBoundary:${this.props.sectionName ?? 'unknown'}]`,
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
          className="my-mx-xs rounded-xl border border-border bg-gray-50 p-mx-md text-mx-tiny font-bold uppercase tracking-widest text-status-warning"
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

export default SalesPerformanceErrorBoundary
