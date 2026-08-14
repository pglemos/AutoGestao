import { Button } from '@/components/atoms/Button'
import type { PersonEvolution } from '../types'

const statusLabel = { healthy: 'Em dia', attention: 'Atenção', critical: 'Crítico', without_data: 'Sem dados' }

export function PersonEvolutionList({ title, people, onOpen }: {
  title: string
  people: PersonEvolution[]
  onOpen: (person: PersonEvolution) => void
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {!people.length ? <p className="mt-3 text-sm text-muted-foreground">Nenhum registro rastreável no período.</p> : (
        <div className="mt-3 space-y-2">
          {people.map(person => (
            <div key={`${person.role}-${person.userId}`} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{person.name}</p>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-caption font-medium text-muted-foreground">{statusLabel[person.status]}</span>
                </div>
                {person.reasons.length ? <p className="mt-1 text-xs text-muted-foreground">{person.reasons.join(' · ')}</p> : null}
              </div>
              <Button variant="outline" size="sm" onClick={() => onOpen(person)}>Abrir</Button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
