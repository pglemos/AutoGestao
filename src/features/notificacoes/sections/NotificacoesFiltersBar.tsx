import { ChevronRight, History, Megaphone, Search, ShieldCheck, Smartphone, TrendingUp } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { cn } from '@/lib/utils'

type Props = {
  searchTerm: string
  setSearchTerm: (v: string) => void
  filterType: string | null
  setFilterType: (v: string | null) => void
}

// Precisa bater com os tipos reais gravados em `notificacoes.type`
// ('system', 'discipline', 'routine', 'checkin') mais o filtro derivado
// 'approval' (ver isApprovalNotification em useNotificacoesPage). Os rótulos
// antigos "Feedbacks"/"PDI" (types 'performance'/'alert') nunca correspondiam
// a nenhuma notificação real gravada — o filtro sempre voltava vazio.
const FILTERS = [
  { label: 'Aprovações', type: 'approval', icon: ShieldCheck, tone: 'brand' },
  { label: 'Lançamentos', type: 'discipline', icon: Smartphone, tone: 'error' },
  { label: 'Rotina', type: 'routine', icon: TrendingUp, tone: 'success' },
  { label: 'Check-in', type: 'checkin', icon: History, tone: 'warning' },
  { label: 'Geral', type: 'system', icon: Megaphone, tone: 'brand' },
] as const

export function NotificacoesFiltersBar({ searchTerm, setSearchTerm, filterType, setFilterType }: Props) {
  return (
    <Card className="space-y-mx-lg bg-white p-mx-md sm:p-mx-lg">
      <header className="border-b border-border pb-mx-md">
        <Typography variant="h3">
          Filtrar notificações
        </Typography>
        <Typography variant="caption" tone="muted" className="mt-1 block">
          Encontre alertas por assunto ou tipo.
        </Typography>
      </header>

      <div className="relative group">
        <Search
          size={16}
          className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-status-success-text transition-colors"
        />
        <Input
          placeholder="Buscar notificações"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="h-[var(--mx-input-height)] pl-10 text-sm"
        />
      </div>

      <nav
        className="grid grid-cols-1 gap-mx-xs sm:grid-cols-2 lg:grid-cols-1"
        role="navigation"
        aria-label="Filtros de notificação"
      >
        {FILTERS.map(f => (
          <button
            key={f.label}
            onClick={() => setFilterType(filterType === f.type ? null : f.type)}
            className={cn(
              'flex w-full items-center justify-between rounded-2xl border p-mx-sm text-left transition-all group/f',
              filterType === f.type
                ? 'bg-brand-primary border-brand-primary text-white shadow-sm'
                : 'bg-surface-alt border-border hover:bg-white hover:border-brand-primary/20 shadow-none',
            )}
          >
            <div className="flex items-center gap-mx-sm">
              <f.icon size={16} className={cn(filterType === f.type ? 'text-white' : 'text-muted-foreground')} />
              <Typography
                variant="caption"
                className={cn('font-bold', filterType === f.type ? 'text-white' : 'text-foreground')}
              >
                {f.label}
              </Typography>
            </div>
            <ChevronRight
              size={14}
              className={cn(filterType === f.type ? 'text-white/40' : 'text-muted-foreground opacity-20 group-hover/f:text-status-success-text')}
            />
          </button>
        ))}
      </nav>

      <footer className="pt-8 border-t border-border hidden">
        <Button
          variant="outline"
          className="w-full h-mx-14 rounded-mx-full shadow-sm text-xs bg-white hover:border-brand-primary"
        >
          AJUSTES DE ALERTA
        </Button>
      </footer>
    </Card>
  )
}

export default NotificacoesFiltersBar
