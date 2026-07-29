import * as React from 'react'
import { cn } from '@/lib/utils'
import { StatusDot, type StatusTone } from '@/components/atoms/StatusDot'
import { VisuallyHidden } from '@/components/atoms/VisuallyHidden'

export interface NotificationItemProps
  extends Omit<React.HTMLAttributes<HTMLLIElement>, 'onSelect'> {
  title: string
  description?: string
  /** Já formatado em pt-BR (ex.: “há 5 min”, “29/07/2026 15:30”). */
  timestamp: string
  tone?: StatusTone
  unread?: boolean
  onSelect?: () => void
}

/**
 * Item do centro de notificações.
 *
 * “Não lida” é comunicado por texto além do ponto colorido — a bolinha sozinha
 * não é acessível (§43.15). O item inteiro é clicável quando há `onSelect`,
 * mas via `<button>`, para funcionar com teclado.
 */
const NotificationItem = React.forwardRef<HTMLLIElement, NotificationItemProps>(
  (
    { className, title, description, timestamp, tone = 'info', unread = false, onSelect, ...props },
    ref,
  ) => {
    const content = (
      <>
        <span className="mt-1 shrink-0">
          <StatusDot tone={tone} label="" pulse={unread} />
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className={cn(
              'truncate text-[length:var(--mx-font-size-base)] text-[hsl(var(--mx-color-text-primary))]',
              unread ? 'font-semibold' : 'font-normal',
            )}
          >
            {title}
            {unread ? <VisuallyHidden> (não lida)</VisuallyHidden> : null}
          </span>
          {description ? (
            <span className="line-clamp-2 text-[length:var(--mx-font-size-xs)] text-[hsl(var(--mx-color-text-secondary))]">
              {description}
            </span>
          ) : null}
          <span className="text-[length:var(--mx-font-size-micro)] text-[hsl(var(--mx-color-text-disabled))]">
            {timestamp}
          </span>
        </span>
      </>
    )

    const shared = cn(
      'flex w-full gap-[var(--mx-space-3)] px-[var(--mx-space-4)] py-[var(--mx-space-3)] text-left',
      'border-b border-[hsl(var(--mx-color-border))] last:border-b-0',
      unread && 'bg-[hsl(var(--mx-color-primary-subtle))]/40',
    )

    return (
      <li ref={ref} className={cn('list-none', className)} {...props}>
        {onSelect ? (
          <button
            type="button"
            onClick={onSelect}
            className={cn(
              shared,
              'transition-colors duration-[var(--mx-duration-fast)] hover:bg-[hsl(var(--mx-color-surface-muted))]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--mx-color-focus-ring))]',
            )}
          >
            {content}
          </button>
        ) : (
          <div className={shared}>{content}</div>
        )}
      </li>
    )
  },
)
NotificationItem.displayName = 'NotificationItem'

export { NotificationItem }
