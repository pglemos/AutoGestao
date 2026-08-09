import { Target } from 'lucide-react'

function formatHeaderDate(date: Date) {
  const weekday = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    timeZone: 'America/Sao_Paulo',
  }).format(date)
  const fullDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(date)

  return {
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    fullDate,
  }
}

export function CentralHeader({ date = new Date() }: { date?: Date }) {
  const formatted = formatHeaderDate(date)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-5 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-status-info to-blue-400">
          <Target className="h-4 w-4 text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-[20px] font-bold leading-none tracking-tight text-gray-800">Rotina do Dia</h1>
          <p className="mt-0.5 truncate text-caption font-medium text-slate-400">Organize e execute seu dia com foco</p>
        </div>
      </div>

      <div className="hidden text-right sm:block">
        <p className="text-body-sm font-bold text-gray-800">{formatted.weekday}</p>
        <p className="text-[12px] text-slate-400">{formatted.fullDate}</p>
      </div>
    </header>
  )
}
