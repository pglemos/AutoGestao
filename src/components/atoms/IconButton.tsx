import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/atoms/Spinner'
import { VisuallyHidden } from '@/components/atoms/VisuallyHidden'

const iconButtonVariants = cva(
  cn(
    'inline-flex shrink-0 items-center justify-center rounded-[var(--mx-button-radius)]',
    'transition-colors duration-[var(--mx-duration-fast)] ease-standard',
    'focus-visible:outline-none focus-visible:ring-[length:var(--mx-input-focus-ring-width)] focus-visible:ring-[hsl(var(--mx-color-focus-ring))] focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ),
  {
    variants: {
      variant: {
        primary:
          'bg-[hsl(var(--mx-color-primary))] text-[hsl(var(--mx-color-primary-foreground))] hover:bg-[hsl(var(--mx-color-primary-hover))] active:bg-[hsl(var(--mx-color-primary-active))]',
        outline:
          'border border-[hsl(var(--mx-color-border))] bg-[hsl(var(--mx-color-surface))] text-[hsl(var(--mx-color-text-primary))] hover:bg-[hsl(var(--mx-color-surface-muted))]',
        ghost:
          'text-[hsl(var(--mx-color-text-secondary))] hover:bg-[hsl(var(--mx-color-surface-muted))] hover:text-[hsl(var(--mx-color-text-primary))]',
        danger:
          'bg-[hsl(var(--mx-color-danger))] text-[hsl(var(--mx-neutral-0))] hover:opacity-90',
      },
      size: {
        // Alvos de toque: `sm` só é aceitável em barras densas de desktop.
        sm: 'h-8 w-8 [&_svg]:h-4 [&_svg]:w-4',
        md: 'h-10 w-10 [&_svg]:h-[16px] [&_svg]:w-[16px]',
        lg: 'h-12 w-12 [&_svg]:h-6 [&_svg]:w-6',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  },
)

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>,
    VariantProps<typeof iconButtonVariants> {
  /** Ícone Lucide. Recebe `aria-hidden` automaticamente. */
  icon: React.ReactNode
  /** Nome acessível — obrigatório, botão de ícone não tem texto visível (§14). */
  label: string
  loading?: boolean
}

/**
 * Botão que mostra apenas um ícone.
 *
 * Bloqueia clique durante `loading`, prevenindo submissão duplicada (§13.1).
 * O tooltip não substitui o nome acessível — `label` é sempre renderizado
 * para leitores de tela.
 */
const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, icon, label, loading = false, disabled, type, ...props }, ref) => (
    <button
      ref={ref}
      type={type ?? 'button'}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? (
        <Spinner size={size === 'lg' ? 'md' : 'sm'} label="" />
      ) : (
        <span aria-hidden className="contents">
          {icon}
        </span>
      )}
      <VisuallyHidden>{label}</VisuallyHidden>
    </button>
  ),
)
IconButton.displayName = 'IconButton'

export { IconButton, iconButtonVariants }
