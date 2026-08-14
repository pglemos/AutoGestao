import { useState, type ComponentType, type ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// `ui/tooltip.jsx` é JavaScript: sem as props declaradas, o TS não enxerga
// `children`/`side` no forwardRef. O cast documenta o contrato usado aqui.
const Content = TooltipContent as unknown as ComponentType<{
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  sideOffset?: number
  className?: string
}>

/**
 * Ícone de ajuda contextual ao lado de títulos e métricas (porte do
 * `HelpTooltip` do Base44). Suporta hover em desktop, foco por teclado
 * e toque/clique direto no ícone (sempre no topo da escala, `--mx-z-tooltip`).
 */
export function HelpTooltip({
  text,
  side = 'top',
  className = '',
}: {
  text?: string | null
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  if (!text) return null

  return (
    <TooltipProvider delayDuration={50}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Ajuda"
            onPointerDown={event => event.stopPropagation()}
            onMouseDown={event => {
              event.preventDefault()
              event.stopPropagation()
            }}
            onClick={event => {
              event.preventDefault()
              event.stopPropagation()
              setOpen(prev => !prev)
            }}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            className={`inline-flex cursor-help items-center justify-center border-0 bg-transparent p-0 align-middle text-muted-foreground transition-colors hover:text-status-success-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-success/30 ${className}`}
          >
            <HelpCircle size={14} strokeWidth={2} />
          </button>
        </TooltipTrigger>
        <Content
          side={side}
          sideOffset={6}
          className="z-[var(--mx-z-tooltip)] max-w-[280px] rounded-lg border border-border-strong/50 bg-slate-800 px-3 py-2 text-xs font-normal leading-relaxed text-slate-50 shadow-xl pointer-events-none"
        >
          {text}
        </Content>
      </Tooltip>
    </TooltipProvider>
  )
}

export default HelpTooltip
