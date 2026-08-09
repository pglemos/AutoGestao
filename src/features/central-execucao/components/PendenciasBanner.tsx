import { AlertTriangle } from 'lucide-react'

export function PendenciasBanner({ count, onOpen }: { count: number; onOpen: () => void }) {
  if (count <= 0) return null

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
      <p className="flex-1 text-body-sm font-semibold text-amber-800">
        Você possui {count} pendência{count > 1 ? 's' : ''} de dias anteriores.
      </p>
      <button type="button" onClick={onOpen} className="shrink-0 text-[12px] font-bold text-status-info hover:underline">
        Ver pendências
      </button>
    </div>
  )
}
