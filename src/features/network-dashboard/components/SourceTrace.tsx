import { Database } from 'lucide-react'

export function SourceTrace({ sources }: { sources: Record<string, string> }) {
  const entries = Object.entries(sources)
  if (!entries.length) return null
  return (
    <section className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-center gap-2"><Database className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold">Origem dos números</h3></div>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        {entries.map(([label, source]) => (
          <div key={label} className="rounded-lg border border-border bg-card px-3 py-2">
            <dt className="font-medium capitalize text-foreground">{label}</dt>
            <dd className="mt-0.5 break-words text-muted-foreground">{source}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
