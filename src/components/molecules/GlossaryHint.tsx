import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface GlossaryHintProps {
  term: string
  definition: string
  className?: string
}

export function GlossaryHint({ term, definition, className }: GlossaryHintProps) {
  return (
    <abbr
      title={definition}
      aria-label={`${term}: ${definition}`}
      className={cn('inline-flex cursor-help items-center gap-mx-tiny rounded-mx-full border border-gray-200 bg-white/80 px-mx-xs py-mx-tiny text-current no-underline', className)}
    >
      <span>{term}</span>
      <HelpCircle size={12} aria-hidden="true" className="shrink-0 opacity-60" />
    </abbr>
  )
}
