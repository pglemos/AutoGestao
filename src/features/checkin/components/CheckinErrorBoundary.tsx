import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Typography } from '@/components/atoms/Typography'

interface Props {
    section: string
    children: React.ReactNode
}

interface State {
    hasError: boolean
    error?: Error
}

/**
 * CheckinErrorBoundary — isola falhas por seção da página de Check-in,
 * exibindo fallback inline sem derrubar a tela inteira.
 */
export class CheckinErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error(`[Checkin/${this.props.section}]`, error, info)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div role="alert" className="rounded-2xl border border-status-error/20 bg-status-error-surface px-mx-md py-mx-sm flex items-start gap-mx-sm">
                    <AlertTriangle size={20} className="text-status-error mt-1 shrink-0" />
                    <div>
                        <Typography variant="caption" tone="error" className="font-semibold tracking-tight">
                            Falha em {this.props.section}
                        </Typography>
                        <Typography variant="tiny" tone="muted" className="font-bold">
                            Recarregue a página. Os demais blocos do lançamento continuam disponíveis.
                        </Typography>
                    </div>
                </div>
            )
        }
        return this.props.children
    }
}
