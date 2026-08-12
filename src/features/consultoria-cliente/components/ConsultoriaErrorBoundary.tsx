import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode; sectionName?: string }
type State = { hasError: boolean; error: Error | null }

/**
 * ErrorBoundary local do ConsultoriaClienteDetalhe — usado por seção/tab,
 * para que falha em uma section não derrube a página inteira (AC4 Story 2.2).
 * Espelha o pattern do DashboardErrorBoundary (Story 2.5) e LandingErrorBoundary
 * (Story 2.1, ADR-0050).
 */
export class ConsultoriaErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error(`[ConsultoriaErrorBoundary:${this.props.sectionName ?? 'unknown'}]`, error, info)
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
            O restante do cockpit continua disponível. Recarregue para tentar novamente.
          </span>
        </div>
      )
    }
    return this.props.children
  }
}

export default ConsultoriaErrorBoundary
