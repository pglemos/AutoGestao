import { cn } from '@/lib/utils'

export type CentralTab = 'hoje' | 'rotina'

const TABS: Array<{ id: CentralTab; label: string }> = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'rotina', label: 'Rotina do Dia' },
]

export function CentralTabs({ value, onChange }: {
  value: CentralTab
  onChange: (tab: CentralTab) => void
}) {
  return (
    <div className="sticky top-16 z-20 border-b border-border bg-white px-5 sm:px-6">
      <div className="flex" role="tablist" aria-label="Central de Execução">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={value === tab.id}
            aria-controls={`central-panel-${tab.id}`}
            id={`central-tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={cn(
              'border-b-2 px-5 py-3.5 text-body-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-info/30',
              value === tab.id
                ? 'border-status-info bg-white text-status-info-text'
                : 'border-transparent text-muted-foreground hover:text-muted-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
