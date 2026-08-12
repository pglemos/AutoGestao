import { Calendar, CheckCircle2, Phone, Target, Users, XCircle, Zap, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'
import { cn } from '@/lib/utils'

type Tone = 'brand' | 'info' | 'warning' | 'success' | 'danger'

type Props = {
  totalVendas: number
  totalLeads: number
  totalAgd: number
  totalVis: number
  totalVendedores: number
  checkinRate: number
}

/**
 * 6 cards de stats do GlobalRanking (Vendas Rede, Leads, Agendamentos,
 * Visitas, Lançamento Hoje, Vendedores). Visual preservado.
 */
export function GlobalStatsCards({
  totalVendas, totalLeads, totalAgd, totalVis, totalVendedores, checkinRate,
}: Props) {
  const stats: Array<{ label: string; value: number | string; icon: LucideIcon; tone: Tone }> = [
    { label: 'Vendas Rede', value: totalVendas, icon: Zap, tone: 'brand' },
    { label: 'Leads', value: totalLeads, icon: Phone, tone: 'info' },
    { label: 'Agendamentos', value: totalAgd, icon: Calendar, tone: 'warning' },
    { label: 'Visitas', value: totalVis, icon: Users, tone: 'success' },
    { label: 'Lançamento Hoje', value: `${checkinRate}%`, icon: checkinRate >= 80 ? CheckCircle2 : XCircle, tone: checkinRate >= 80 ? 'success' : 'danger' },
    { label: 'Vendedores', value: totalVendedores, icon: Target, tone: 'info' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-mx-md shrink-0 mb-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-mx-md border-none bg-white flex items-center gap-mx-sm">
          <div className={cn(
            "w-mx-14 h-mx-14 rounded-2xl flex items-center justify-center border shrink-0",
            stat.tone === 'brand' ? 'bg-mx-green-50 border-mx-green-200 text-mx-green-700' :
              stat.tone === 'info' ? 'bg-status-info-surface border-status-info/20 text-status-info-text' :
                stat.tone === 'warning' ? 'bg-status-warning-surface border-mx-amber-100 text-status-warning-text' :
                  stat.tone === 'success' ? 'bg-status-success-surface border-mx-emerald-100 text-status-success-text' :
                    'bg-status-error-surface border-mx-red-100 text-status-error-text'
          )}>
            <stat.icon size={20} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <Typography variant="tiny" tone="muted" className="block truncate">{stat.label}</Typography>
            <Typography variant="h2" className="text-xl tabular-nums leading-none">{stat.value}</Typography>
          </div>
        </Card>
      ))}
    </div>
  )
}

export default GlobalStatsCards
