import type { ComponentType, ReactNode } from 'react'
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
 * `HelpTooltip` do Base44). Difere do `InfoTooltip` legado: usa o tooltip do
 * Radix já presente no projeto, superfície escura e é acionado por hover/foco.
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
  if (!text) return null

  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Ajuda"
            onClick={event => event.stopPropagation()}
            onMouseDown={event => event.preventDefault()}
            className={`inline-flex cursor-help items-center justify-center align-middle text-gray-400 transition-colors hover:text-emerald-600 ${className}`}
          >
            <HelpCircle size={14} strokeWidth={2.25} />
          </button>
        </TooltipTrigger>
        <Content
          side={side}
          sideOffset={6}
          className="max-w-[280px] rounded-lg border border-slate-700/50 bg-slate-800 px-3 py-2 text-xs font-normal leading-relaxed text-slate-50 shadow-xl"
        >
          {text}
        </Content>
      </Tooltip>
    </TooltipProvider>
  )
}

export default HelpTooltip
