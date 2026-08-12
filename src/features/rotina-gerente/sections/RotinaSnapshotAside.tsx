import { FileCheck, History, RefreshCw, Send, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Textarea } from '@/components/atoms/Textarea'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'

type Props = {
  totalAgendamentosHoje: number
  pendingSellersCount: number
  activeRoutineStoreId: string
  onSendDailyReminders: () => void
  routineLog: unknown
  routineNotes: string
  setRoutineNotes: (v: string) => void
  savingRoutine: boolean
  onRegisterRoutine: () => void
}

/**
 * Aside (col-5) da aba Diário: Snapshot Hoje + Auditoria Diária (firma).
 */
export function RotinaSnapshotAside({
  totalAgendamentosHoje,
  pendingSellersCount,
  activeRoutineStoreId,
  onSendDailyReminders,
  routineLog,
  routineNotes,
  setRoutineNotes,
  savingRoutine,
  onRegisterRoutine,
}: Props) {
  return (
    <aside className="lg:col-span-5 flex flex-col gap-mx-lg">
      <Card className="text-white border-none p-mx-md relative overflow-hidden group">
        <div
          className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 to-transparent opacity-50"
          aria-hidden="true"
        />
        <div className="relative z-10 space-y-mx-lg">
          <header className="flex items-center justify-between mb-10 border-b border-white/10 pb-6">
            <div className="flex items-center gap-mx-sm">
              <div className="w-mx-xl h-mx-xl rounded-xl bg-white/10 flex items-center justify-center border border-white/10 shadow-mx-inner">
                <History size={24} />
              </div>
              <Typography
                variant="h3"
                tone="white"
                className="tracking-tight leading-none"
              >
                Snapshot Hoje
              </Typography>
            </div>
            <Badge
              variant="outline"
              className="text-white border-white/20 px-4 py-1 text-tiny"
            >
              Real-time
            </Badge>
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-lg">
            <div>
              <Typography variant="tiny" tone="white" className="mb-2 block">
                AGENDAMENTOS
              </Typography>
              <Typography
                variant="h1"
                tone="white"
                className="text-5xl tabular-nums leading-none tracking-tighter"
              >
                {totalAgendamentosHoje}
              </Typography>
            </div>
            <div>
              <Typography variant="tiny" tone="white" className="mb-2 block">
                PENDÊNCIAS
              </Typography>
              <Typography
                variant="h1"
                tone={pendingSellersCount > 0 ? 'brand' : 'white'}
                className="text-5xl tabular-nums leading-none tracking-tighter"
              >
                {pendingSellersCount}
              </Typography>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={onSendDailyReminders}
            disabled={pendingSellersCount === 0 || !activeRoutineStoreId}
            className="w-full h-mx-12 text-mx-tiny"
          >
            <Send size={16} className="mr-2" /> Lembrar Pendentes
          </Button>
        </div>
      </Card>

      <Card className="border bg-white p-mx-md space-y-mx-md">
        <header className="flex items-center gap-mx-sm mb-4">
          <div className="w-mx-xl h-mx-xl rounded-xl bg-status-success-surface text-status-success-text flex items-center justify-center border border-status-success/20 shadow-mx-inner">
            <ShieldCheck size={24} />
          </div>
          <div>
            <Typography variant="h3" className="tracking-tight leading-none">
              Auditoria Diária
            </Typography>
            <Typography
              variant="caption"
              tone="muted"
              className="text-tiny mt-1"
            >
              {routineLog ? 'LOG SINCRONIZADO' : 'AGUARDANDO FIRMA'}
            </Typography>
          </div>
        </header>
        <Textarea
          value={routineNotes}
          onChange={(e) => setRoutineNotes(e.target.value)}
          placeholder="Observações táticas da operação de hoje..."
          className="min-h-mx-xl"
        />
        <Button
          onClick={onRegisterRoutine}
          disabled={savingRoutine || !!routineLog}
          className="w-full h-mx-2xl text-tiny hover:bg-brand-primary-hover text-white"
        >
          {savingRoutine ? (
            <RefreshCw className="animate-spin mr-2" />
          ) : (
            <FileCheck size={20} className="mr-2" />
          )}{' '}
          FIRMAR AUDITORIA
        </Button>
      </Card>
    </aside>
  )
}

export default RotinaSnapshotAside
