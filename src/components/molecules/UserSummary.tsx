import * as React from 'react'
import { cn } from '@/lib/utils'

export interface UserSummaryProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string
  /** Cargo, loja ou perfil. */
  caption?: string
  avatarUrl?: string
  size?: 'sm' | 'md'
  /** Conteúdo à direita (badge de perfil, ação). */
  trailing?: React.ReactNode
}

const sizes = {
  sm: { box: 'h-8 w-8', name: 'text-[length:var(--mx-font-size-xs)]' },
  md: { box: 'h-10 w-10', name: 'text-[length:var(--mx-font-size-base)]' },
} as const

/** Iniciais do nome — no máximo duas, primeira e última palavra. */
export function initialsFrom(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

/**
 * Identificação compacta de pessoa.
 *
 * A falha de carregamento do avatar cai para as iniciais em vez de deixar um
 * ícone quebrado na sidebar.
 */
const UserSummary = React.forwardRef<HTMLDivElement, UserSummaryProps>(
  ({ className, name, caption, avatarUrl, size = 'md', trailing, ...props }, ref) => {
    const [failed, setFailed] = React.useState(false)
    const showImage = Boolean(avatarUrl) && !failed
    const config = sizes[size]

    return (
      <div
        ref={ref}
        className={cn('flex min-w-0 items-center gap-[var(--mx-space-3)]', className)}
        {...props}
      >
        <span
          aria-hidden
          className={cn(
            'flex shrink-0 items-center justify-center overflow-hidden rounded-full',
            'bg-brand-primary-subtle text-[length:var(--mx-font-size-xs)] font-semibold text-brand-primary-active',
            config.box,
          )}
        >
          {showImage ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              onError={() => setFailed(true)}
            />
          ) : (
            initialsFrom(name)
          )}
        </span>

        <span className="flex min-w-0 flex-col">
          <span
            className={cn(
              'truncate font-semibold text-text-primary',
              config.name,
            )}
          >
            {name}
          </span>
          {caption ? (
            <span className="truncate text-[length:var(--mx-font-size-xs)] text-text-secondary">
              {caption}
            </span>
          ) : null}
        </span>

        {trailing ? <span className="ml-auto shrink-0">{trailing}</span> : null}
      </div>
    )
  },
)
UserSummary.displayName = 'UserSummary'

export { UserSummary }
