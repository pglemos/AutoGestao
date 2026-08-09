import * as React from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VisuallyHidden } from '@/components/atoms/VisuallyHidden'

const tones = {
  info: {
    icon: Info,
    prefix: 'Informação',
    wrapper:
      'border-info/30 bg-info-subtle text-text-primary',
    iconColor: 'text-info',
  },
  success: {
    icon: CheckCircle2,
    prefix: 'Sucesso',
    wrapper:
      'border-success/30 bg-success-subtle text-text-primary',
    iconColor: 'text-success',
  },
  warning: {
    icon: AlertTriangle,
    prefix: 'Atenção',
    wrapper:
      'border-warning/30 bg-warning-subtle text-text-primary',
    iconColor: 'text-warning',
  },
  danger: {
    icon: XCircle,
    prefix: 'Erro',
    wrapper:
      'border-danger/30 bg-danger-subtle text-text-primary',
    iconColor: 'text-danger',
  },
} as const

export type AlertTone = keyof typeof tones

export interface AlertMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  tone: AlertTone
  title?: string
  /** Ação de recuperação (ex.: “Tentar novamente”). */
  action?: React.ReactNode
  onDismiss?: () => void
  /**
   * Anuncia a mensagem assim que ela aparece. Use para o resultado de uma ação
   * do usuário; deixe desligado para avisos presentes desde a montagem (§14).
   */
  live?: boolean
}

/** Mensagem contextual. O tom é sempre acompanhado de ícone e de prefixo textual. */
const AlertMessage = React.forwardRef<HTMLDivElement, AlertMessageProps>(
  ({ className, tone, title, action, onDismiss, live = false, children, ...props }, ref) => {
    const config = tones[tone]
    const Icon = config.icon

    return (
      <div
        ref={ref}
        role={tone === 'danger' ? 'alert' : 'status'}
        aria-live={live ? (tone === 'danger' ? 'assertive' : 'polite') : 'off'}
        className={cn(
          'flex gap-[var(--mx-space-3)] rounded-[var(--mx-radius-md)] border p-[var(--mx-space-4)]',
          'text-[length:var(--mx-font-size-base)]',
          config.wrapper,
          className,
        )}
        {...props}
      >
        <Icon aria-hidden className={cn('mt-0.5 h-[16px] w-[16px] shrink-0', config.iconColor)} />

        <div className="min-w-0 flex-1">
          <VisuallyHidden>{`${config.prefix}: `}</VisuallyHidden>
          {title ? <p className="font-semibold">{title}</p> : null}
          {children ? (
            <div className={cn('text-text-secondary', title && 'mt-1')}>
              {children}
            </div>
          ) : null}
          {action ? <div className="mt-[var(--mx-space-3)]">{action}</div> : null}
        </div>

        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className={cn(
              'shrink-0 self-start rounded-[var(--mx-radius-sm)] p-1',
              'transition-colors duration-[var(--mx-duration-fast)] hover:bg-text-primary/5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
            )}
          >
            <X aria-hidden className="h-4 w-4" />
            <VisuallyHidden>Dispensar mensagem</VisuallyHidden>
          </button>
        ) : null}
      </div>
    )
  },
)
AlertMessage.displayName = 'AlertMessage'

export { AlertMessage }
