import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/atoms/Spinner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { VisuallyHidden } from '@/components/atoms/VisuallyHidden'

// `ui/tooltip.jsx` é JavaScript: sem as props declaradas, o TS não enxerga
// `children`/`side`/`sideOffset` no forwardRef. O cast documenta o contrato
// usado aqui (mesmo padrão do `HelpTooltip`).
const Content = TooltipContent as unknown as React.ComponentType<{
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  sideOffset?: number
  className?: string
}>

const iconButtonVariants = cva(
  cn(
    'inline-flex shrink-0 items-center justify-center rounded-[var(--mx-button-radius)]',
    'transition-colors duration-[var(--mx-duration-fast)] ease-standard',
    'focus-visible:outline-none focus-visible:ring-[length:var(--mx-input-focus-ring-width)] focus-visible:ring-focus-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ),
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground hover:bg-brand-primary-hover active:bg-brand-primary-active',
        outline:
          'border border-border bg-surface-default text-text-primary hover:bg-surface-alt',
        ghost:
          'text-text-secondary hover:bg-surface-alt hover:text-text-primary',
        danger:
          'bg-danger text-[hsl(var(--mx-neutral-0))] hover:opacity-90',
      },
      size: {
        // Alvos de toque: `sm` só é aceitável em barras densas de desktop.
        sm: 'h-8 w-8 [&_svg]:h-4 [&_svg]:w-4',
        md: 'h-10 w-10 [&_svg]:h-4 [&_svg]:w-4',
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
  /** Texto do tooltip (affordance visual opcional). Não substitui `label`. */
  tooltip?: string
}

/**
 * Botão que mostra apenas um ícone.
 *
 * Bloqueia clique durante `loading`, prevenindo submissão duplicada (§13.1).
 * O tooltip não substitui o nome acessível — `label` é sempre renderizado
 * para leitores de tela. Quando `tooltip` é informado, o botão ganha
 * affordance visual no hover/focus (11.011).
 */
const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, icon, label, loading = false, disabled, type, tooltip, ...props }, ref) => {
    const [open, setOpen] = React.useState(false)
    const button = (
      <button
        ref={ref}
        type={type ?? 'button'}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-label={tooltip ? undefined : label}
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
    )

    if (tooltip) {
      // Tooltip canônico (Radix, `ui/tooltip`): suporta hover, foco por
      // teclado e clique/toque via estado controlado — mesmo contrato do
      // `HelpTooltip` (11.011). O nome acessível continua sendo `label`
      // (visually hidden), nunca o tooltip.
      return (
        <TooltipProvider delayDuration={50}>
          <Tooltip open={open} onOpenChange={setOpen}>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <Content side="top" sideOffset={6} className="max-w-[280px] pointer-events-none">
              {tooltip}
            </Content>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return button
  },
)
IconButton.displayName = 'IconButton'

export { IconButton, iconButtonVariants }
