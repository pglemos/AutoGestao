import * as React from 'react'
import { Link as RouterLink, type LinkProps as RouterLinkProps } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VisuallyHidden } from '@/components/atoms/VisuallyHidden'

const baseClasses = cn(
  'inline-flex items-center gap-1 rounded-[var(--mx-radius-sm)] font-medium text-[hsl(var(--mx-color-primary))] underline-offset-4',
  'transition-colors duration-[var(--mx-duration-fast)] ease-standard',
  'hover:text-[hsl(var(--mx-color-primary-hover))] hover:underline',
  'focus-visible:outline-none focus-visible:ring-[length:var(--mx-input-focus-ring-width)] focus-visible:ring-[hsl(var(--mx-color-focus-ring))] focus-visible:ring-offset-2',
)

export interface LinkProps extends Omit<RouterLinkProps, 'to'> {
  /** Destino. URL absoluta (http/mailto/tel) renderiza `<a>` nativo. */
  to: string
  external?: boolean
}

function isAbsolute(to: string) {
  return /^(https?:|mailto:|tel:)/i.test(to)
}

/**
 * Navegação real. Sempre renderiza `<a>` com `href`, para que o usuário possa
 * abrir em nova aba. Botão que navega é bug — e botão não finge ser link (§13.3).
 */
const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, to, external, children, ...props }, ref) => {
    const treatAsExternal = external ?? isAbsolute(to)

    if (treatAsExternal) {
      return (
        <a
          ref={ref}
          href={to}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(baseClasses, className)}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {children}
          <ExternalLink aria-hidden className="h-3.5 w-3.5" />
          <VisuallyHidden>(abre em nova aba)</VisuallyHidden>
        </a>
      )
    }

    return (
      <RouterLink ref={ref} to={to} className={cn(baseClasses, className)} {...props}>
        {children}
      </RouterLink>
    )
  },
)
Link.displayName = 'Link'

export { Link }
