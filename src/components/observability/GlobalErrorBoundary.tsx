/**
 * Error Boundary global.
 *
 * Captura o que escapa dos boundaries de feature, registra no Sentry e mostra
 * um fallback profissional com o Event ID — o usuário nunca vê stack trace.
 *
 * Proteção contra loop: após 2 falhas seguidas o botão de recarregar some e
 * resta apenas voltar ao início, evitando ciclo de reload infinito.
 */

import React from 'react'
import { Sentry } from '@/lib/observability/sentry'
import { logger } from '@/lib/observability/logger'
import { getShortRelease } from '@/lib/observability/release'

const RELOAD_MARKER = 'mx-error-boundary-reloads'
const MAX_RELOADS = 2

/**
 * Paleta literal, propositalmente fora do design system.
 *
 * Este é o último fallback da aplicação: ele precisa renderizar mesmo quando o
 * CSS de tokens falhou em carregar, quando o provider de tema quebrou ou quando
 * o próprio bundle do design system é a causa do erro. Importar chartTokens
 * aqui criaria a possibilidade de a tela de erro também falhar.
 */
const FALLBACK_PALETTE = {
    background: '#0b0f19', // lint-tokens-ignore
    text: '#e6e9ef', // lint-tokens-ignore
    surface: '#151c2c', // lint-tokens-ignore
    border: '#2b3550', // lint-tokens-ignore
    accent: '#3b82f6', // lint-tokens-ignore
    accentText: '#ffffff', // lint-tokens-ignore
} as const

interface Props {
    children: React.ReactNode
}

interface State {
    hasError: boolean
    eventId?: string
    reloadCount: number
}

function readReloadCount(): number {
    try {
        return Number(sessionStorage.getItem(RELOAD_MARKER) ?? '0') || 0
    } catch {
        return 0
    }
}

export class GlobalErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false, reloadCount: readReloadCount() }

    static getDerivedStateFromError(): Partial<State> {
        return { hasError: true }
    }

    componentDidCatch(error: Error, info: React.ErrorInfo): void {
        let eventId: string | undefined
        try {
            eventId = Sentry.captureException(error, {
                contexts: { react: { componentStack: info.componentStack } },
                tags: { 'mx.boundary': 'global' },
            })
        } catch {
            // Sentry indisponível não pode impedir o fallback de renderizar.
        }
        logger.error('react.render_failure', {
            module: 'app',
            status: 'failure',
            error_code: error.name,
            metadata: { event_id: eventId },
        })
        this.setState({ eventId })
    }

    private handleReload = (): void => {
        try {
            sessionStorage.setItem(RELOAD_MARKER, String(this.state.reloadCount + 1))
        } catch {
            // storage indisponível — segue com o reload mesmo assim
        }
        window.location.reload()
    }

    private handleGoHome = (): void => {
        try {
            sessionStorage.removeItem(RELOAD_MARKER)
        } catch {
            // no-op
        }
        window.location.assign('/')
    }

    render(): React.ReactNode {
        if (!this.state.hasError) return this.props.children

        const canReload = this.state.reloadCount < MAX_RELOADS

        return (
            <div
                role="alert"
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                    background: FALLBACK_PALETTE.background,
                    color: FALLBACK_PALETTE.text,
                    fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
                }}
            >
                <div style={{ maxWidth: 480, textAlign: 'center' }}>
                    <h1 style={{ fontSize: '1.375rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                        Algo deu errado nesta tela
                    </h1>
                    <p style={{ fontSize: '0.9375rem', lineHeight: 1.6, opacity: 0.8, marginBottom: '1.5rem' }}>
                        A equipe técnica já foi notificada automaticamente. Você pode tentar
                        novamente ou voltar para o início.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {canReload && (
                            <button
                                type="button"
                                onClick={this.handleReload}
                                style={{
                                    padding: '0.625rem 1.25rem',
                                    borderRadius: 8,
                                    border: `1px solid ${FALLBACK_PALETTE.border}`,
                                    background: FALLBACK_PALETTE.surface,
                                    color: FALLBACK_PALETTE.text,
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                }}
                            >
                                Tentar novamente
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={this.handleGoHome}
                            style={{
                                padding: '0.625rem 1.25rem',
                                borderRadius: 8,
                                border: 'none',
                                background: FALLBACK_PALETTE.accent,
                                color: FALLBACK_PALETTE.accentText,
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                            }}
                        >
                            Voltar ao início
                        </button>
                    </div>
                    <p style={{ marginTop: '1.75rem', fontSize: '0.75rem', opacity: 0.55, fontFamily: 'monospace' }}>
                        {this.state.eventId ? `ID do evento: ${this.state.eventId}` : 'ID do evento indisponível'}
                        {' · '}
                        versão {getShortRelease()}
                    </p>
                </div>
            </div>
        )
    }
}

export default GlobalErrorBoundary
