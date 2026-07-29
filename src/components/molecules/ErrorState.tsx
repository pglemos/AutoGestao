import * as React from 'react'
import { AlertOctagon, Lock, RefreshCw, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Natureza da falha. Erro de rede, de permissão e de servidor pedem respostas
 * diferentes do usuário — tratá-los como o mesmo erro genérico é o defeito que
 * este componente existe para evitar (§12.2).
 */
export type ErrorKind = 'network' | 'permission' | 'server' | 'unknown'

const kinds: Record<ErrorKind, { icon: typeof AlertOctagon; title: string; hint: string }> = {
  network: {
    icon: WifiOff,
    title: 'Sem conexão com o servidor',
    hint: 'Verifique sua internet e tente novamente. Nada do que você digitou foi perdido.',
  },
  permission: {
    icon: Lock,
    title: 'Você não tem acesso a este conteúdo',
    hint: 'Peça liberação ao responsável pela sua loja ou ao administrador.',
  },
  server: {
    icon: AlertOctagon,
    title: 'Não conseguimos carregar os dados',
    hint: 'A falha foi registrada pela equipe técnica. Tente novamente em instantes.',
  },
  unknown: {
    icon: AlertOctagon,
    title: 'Algo não saiu como esperado',
    hint: 'Tente novamente. Se continuar, avise o suporte.',
  },
}

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  kind?: ErrorKind
  title?: string
  description?: string
  /** Nova tentativa. Ausente apenas quando repetir não pode resolver. */
  onRetry?: () => void
  retrying?: boolean
  /** Referência técnica para o suporte. Nunca exiba stack trace ao usuário. */
  reference?: string
}

/** Estado de erro recuperável. Único no sistema — páginas não criam o seu (§9.5). */
const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  (
    { className, kind = 'unknown', title, description, onRetry, retrying = false, reference, ...props },
    ref,
  ) => {
    const config = kinds[kind]
    const Icon = config.icon

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'flex flex-col items-center justify-center gap-[var(--mx-space-3)] px-[var(--mx-space-4)] py-[var(--mx-space-10)] text-center',
          className,
        )}
        {...props}
      >
        <span
          aria-hidden
          className="flex h-12 w-12 items-center justify-center rounded-[var(--mx-radius-xl)] bg-[hsl(var(--mx-color-danger-subtle))]"
        >
          <Icon className="h-6 w-6 text-[hsl(var(--mx-color-danger))]" />
        </span>

        <h3 className="text-[length:var(--mx-font-size-h3)] font-semibold text-[hsl(var(--mx-color-text-primary))]">
          {title ?? config.title}
        </h3>
        <p className="max-w-prose text-[length:var(--mx-font-size-base)] text-[hsl(var(--mx-color-text-secondary))]">
          {description ?? config.hint}
        </p>

        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            aria-busy={retrying || undefined}
            className={cn(
              'mt-[var(--mx-space-2)] inline-flex items-center gap-2 rounded-[var(--mx-button-radius)]',
              'h-[var(--mx-button-height-md)] px-[var(--mx-button-padding-inline-md)]',
              'bg-[hsl(var(--mx-color-primary))] text-[length:var(--mx-font-size-base)] font-semibold text-[hsl(var(--mx-color-primary-foreground))]',
              'transition-colors duration-[var(--mx-duration-fast)] hover:bg-[hsl(var(--mx-color-primary-hover))]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--mx-color-focus-ring))] focus-visible:ring-offset-2',
              'disabled:pointer-events-none disabled:opacity-50',
            )}
          >
            <RefreshCw
              aria-hidden
              className={cn('h-4 w-4', retrying && 'motion-safe:animate-spin')}
            />
            {retrying ? 'Tentando…' : 'Tentar novamente'}
          </button>
        ) : null}

        {reference ? (
          <p className="text-[length:var(--mx-font-size-micro)] text-[hsl(var(--mx-color-text-disabled))]">
            Código de referência: {reference}
          </p>
        ) : null}
      </div>
    )
  },
)
ErrorState.displayName = 'ErrorState'

export { ErrorState }
