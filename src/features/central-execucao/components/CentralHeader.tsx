import { Target } from 'lucide-react'
import { PageHeading } from '@/components/molecules/PageHeading'

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
    <PageHeading
      icon={Target}
      title="Rotina do Dia"
      subtitle="Organize e execute seu dia com foco."
      actions={
        <div className="hidden text-right sm:block">
          <p className="text-body-sm font-bold text-foreground">{formatted.weekday}</p>
          <p className="text-[12px] text-muted-foreground">{formatted.fullDate}</p>
        </div>
      }
    />
  )
}

export default CentralHeader

