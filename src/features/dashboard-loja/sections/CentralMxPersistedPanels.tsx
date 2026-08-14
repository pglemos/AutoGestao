import { useMemo } from 'react'
import {
  Bell,
  CheckCircle2,
  ClipboardList,
  CloudOff,
  EyeOff,
  Loader2,
  RefreshCw,
  Upload,
} from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { cn } from '@/lib/utils'
import {
  useCentralMxAlerts,
  type CentralMxAlertRow,
  type CentralMxAlertStatus,
} from '../hooks/useCentralMxAlerts'
import {
  useCentralMxPlanosAcao,
  type CentralMxPlanoAcaoRow,
} from '../hooks/useCentralMxPlanosAcao'
import { useCentralMxAgenda, type CentralMxAgendaEvent } from '../hooks/useCentralMxAgenda'
import { useExecutiveAgendaGoogleSync } from '../hooks/useExecutiveAgendaGoogleSync'

/**
 * Painéis persistidos do Blitz 48h Dia 2.
 *
 * Estes painéis renderizam dados vindos diretamente do Supabase (alerts /
 * planos_acao / eventos_agenda_executiva), complementando a versão derivada
 * pela engine TS já presente no OwnerExecutiveCockpit. Quando o storeId não
 * é informado, cada bloco mostra um estado vazio honesto.
 */

const ALERT_TONE: Record<string, string> = {
  critical: 'bg-status-error-surface text-status-error-text border-status-error/30',
  warning: 'bg-status-warning-surface text-status-warning-text border-status-warning/30',
  positive: 'bg-status-success-surface text-status-success-text border-status-success/30',
  consultive: 'bg-brand-primary-subtle text-status-success-text border-brand-primary/30',
}

const ALERT_STATUS_LABEL: Record<CentralMxAlertStatus, string> = {
  open: 'Aberto',
  acknowledged: 'Visto',
  resolved: 'Resolvido',
  dismissed: 'Arquivado',
}

const PLANO_TONE: Record<string, string> = {
  pendente: 'bg-status-warning-surface text-status-warning-text border-status-warning/30',
  em_andamento: 'bg-brand-primary-subtle text-status-success-text border-brand-primary/30',
  atrasado: 'bg-status-error-surface text-status-error-text border-status-error/30',
  validando_eficacia: 'bg-surface-alt text-muted-foreground border-border',
  concluido: 'bg-status-success-surface text-status-success-text border-status-success/30',
}

type Props = {
  storeId: string | null | undefined
}

export function CentralMxPersistedAlertsPanel({ storeId }: Props) {
  const { alerts, loading, error, refresh, ack, resolve, dismiss, counts } =
    useCentralMxAlerts(storeId)
  const total = useMemo(
    () => counts.critical + counts.warning + counts.positive + counts.consultive,
    [counts],
  )

  return (
    <Card className="p-mx-lg">
      <div className="flex items-start justify-between gap-mx-sm">
        <div className="flex items-center gap-mx-sm">
          <div className="rounded-2xl bg-brand-primary-subtle p-mx-sm text-status-success-text">
            <Bell size={20} aria-hidden="true" />
          </div>
          <div>
            <Typography variant="h3" className="">
              Alertas Persistidos
            </Typography>
            <Typography variant="tiny" tone="muted" className="block">
              {storeId
                ? total > 0
                  ? `${total} alerta(s) ativo(s) — engine rules-based v1`
                  : 'Nenhum alerta persistido para esta loja.'
                : 'Selecione uma loja para carregar alertas.'}
            </Typography>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={refresh} disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          <span className="ml-1">Atualizar</span>
        </Button>
      </div>

      {error && (
        <div className="mt-mx-md rounded-xl border border-status-error/40 bg-status-error-surface p-mx-sm">
          <Typography variant="tiny" className="text-status-error-text">
            {error}
          </Typography>
        </div>
      )}

      <div className="mt-mx-md grid grid-cols-2 gap-mx-sm md:grid-cols-4">
        <CountTile label="Críticos" value={counts.critical} tone="critical" />
        <CountTile label="Atenção" value={counts.warning} tone="warning" />
        <CountTile label="Positivos" value={counts.positive} tone="positive" />
        <CountTile label="Consultivos" value={counts.consultive} tone="consultive" />
      </div>

      <ul className="mt-mx-md space-y-mx-sm">
        {alerts.map((alert) => (
          <PersistedAlertRow
            key={alert.id}
            alert={alert}
            onAck={ack}
            onResolve={resolve}
            onDismiss={dismiss}
          />
        ))}
        {!alerts.length && !loading && (
          <li className="rounded-2xl border border-dashed border-border p-mx-md text-center">
            <Typography variant="tiny" tone="muted" className="font-bold">
              Nenhum alerta aberto.
            </Typography>
          </li>
        )}
      </ul>
    </Card>
  )
}

function CountTile({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: keyof typeof ALERT_TONE
}) {
  return (
    <div className={cn('rounded-2xl border p-mx-sm text-center', ALERT_TONE[tone])}>
      <Typography variant="caption" className="">
        {label}
      </Typography>
      <Typography as="p" variant="h3" className="mt-mx-tiny">
        {value}
      </Typography>
    </div>
  )
}

function PersistedAlertRow({
  alert,
  onAck,
  onResolve,
  onDismiss,
}: {
  alert: CentralMxAlertRow
  onAck: (id: string) => Promise<void>
  onResolve: (id: string) => Promise<void>
  onDismiss: (id: string, reason?: string) => Promise<void>
}) {
  const toneClass = ALERT_TONE[alert.type] ?? ALERT_TONE.consultive
  return (
    <li className={cn('rounded-2xl border p-mx-md', toneClass)}>
      <div className="flex flex-col gap-mx-xs md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-mx-xs">
            <Badge variant="outline" className="">
              {alert.type}
            </Badge>
            <Badge variant="outline" className="">
              {ALERT_STATUS_LABEL[alert.status]}
            </Badge>
          </div>
          <Typography variant="p" className="mt-mx-xs">
            {alert.problem}
          </Typography>
          <Typography variant="tiny" tone="muted" className="block">
            Impacto: {alert.impact}
          </Typography>
          <Typography variant="tiny" tone="muted" className="block">
            Recomendação: {alert.recommendation}
          </Typography>
        </div>
        <div className="flex flex-wrap items-center gap-mx-xs">
          {alert.status === 'open' && (
            <Button type="button" size="sm" variant="outline" onClick={() => onAck(alert.id)}>
              Marcar visto
            </Button>
          )}
          {alert.status !== 'resolved' && alert.status !== 'dismissed' && (
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={() => onResolve(alert.id)}
            >
              <CheckCircle2 size={14} className="mr-1" /> Resolver
            </Button>
          )}
          {alert.status !== 'dismissed' && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onDismiss(alert.id)}
              aria-label="Arquivar alerta"
            >
              <EyeOff size={14} />
            </Button>
          )}
        </div>
      </div>
    </li>
  )
}

export function CentralMxPersistedPlanosPanel({ storeId }: Props) {
  const { planos, loading, error, refresh, marcarConcluido, counts } =
    useCentralMxPlanosAcao(storeId)
  const total = planos.length
  return (
    <Card className="p-mx-lg">
      <div className="flex items-start justify-between gap-mx-sm">
        <div className="flex items-center gap-mx-sm">
          <div className="rounded-2xl bg-brand-primary-subtle p-mx-sm text-status-success-text">
            <ClipboardList size={20} aria-hidden="true" />
          </div>
          <div>
            <Typography variant="h3" className="">
              Plano de Ação Persistido
            </Typography>
            <Typography variant="tiny" tone="muted" className="block">
              {storeId
                ? total > 0
                  ? `${total} plano(s) em acompanhamento (não concluídos).`
                  : 'Nenhum plano ativo para esta loja.'
                : 'Selecione uma loja para carregar planos.'}
            </Typography>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={refresh} disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          <span className="ml-1">Atualizar</span>
        </Button>
      </div>

      {error && (
        <div className="mt-mx-md rounded-xl border border-status-error/40 bg-status-error-surface p-mx-sm">
          <Typography variant="tiny" className="text-status-error-text">
            {error}
          </Typography>
        </div>
      )}

      <div className="mt-mx-md grid grid-cols-2 gap-mx-sm md:grid-cols-4">
        <CountTile label="Pendentes" value={counts.pendente} tone="warning" />
        <CountTile label="Em andamento" value={counts.em_andamento} tone="consultive" />
        <CountTile label="Atrasados" value={counts.atrasado} tone="critical" />
        <CountTile label="Validando" value={counts.validando_eficacia} tone="consultive" />
      </div>

      <ul className="mt-mx-md space-y-mx-sm">
        {planos.map((plano) => (
          <PersistedPlanoRow key={plano.id} plano={plano} onConcluir={marcarConcluido} />
        ))}
        {!planos.length && !loading && (
          <li className="rounded-2xl border border-dashed border-border p-mx-md text-center">
            <Typography variant="tiny" tone="muted" className="font-bold">
              Sem planos de ação ativos para esta loja.
            </Typography>
          </li>
        )}
      </ul>
    </Card>
  )
}

function PersistedPlanoRow({
  plano,
  onConcluir,
}: {
  plano: CentralMxPlanoAcaoRow
  onConcluir: (id: string, eficaciaNota?: string) => Promise<void>
}) {
  const toneClass = PLANO_TONE[plano.status] ?? PLANO_TONE.em_andamento
  return (
    <li className={cn('rounded-2xl border p-mx-md', toneClass)}>
      <div className="flex flex-col gap-mx-xs md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-mx-xs">
            <Badge variant="outline" className="">
              {plano.departamento}
            </Badge>
            <Badge variant="outline" className="">
              {plano.status.replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className="">
              {plano.origem}
            </Badge>
          </div>
          <Typography variant="p" className="mt-mx-xs">
            <span className="mr-mx-xs text-status-success-text">{plano.codigo || `PA-${plano.id.slice(0, 8).toUpperCase()}`}</span>
            {plano.acao}
          </Typography>
          <Typography variant="tiny" tone="muted" className="block">
            Objetivo: {plano.objetivo || 'Não informado'} • Indicador: {plano.indicador}
          </Typography>
          <Typography variant="tiny" tone="muted" className="block">
            Progresso: {plano.progresso ?? 0}% • Problema: {plano.problema}
          </Typography>
          {plano.prazo && (
            <Typography variant="tiny" tone="muted" className="block">
              Prazo: {new Date(`${plano.prazo}T12:00:00`).toLocaleDateString('pt-BR')}
            </Typography>
          )}
        </div>
        <div className="flex items-center gap-mx-xs">
          {plano.status !== 'concluido' && (
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={() => onConcluir(plano.id)}
            >
              <CheckCircle2 size={14} className="mr-1" /> Concluir
            </Button>
          )}
        </div>
      </div>
    </li>
  )
}

export function CentralMxPersistedAgendaPanel({ storeId }: Props) {
  const { events, loading, error, refresh, todayCount, upcomingCount } =
    useCentralMxAgenda(storeId, { windowDays: 30 })
  const { syncing, sync } = useExecutiveAgendaGoogleSync()
  const handleSync = async (eventId: string, action: 'upsert' | 'delete') => {
    const ok = await sync(eventId, action)
    if (ok) refresh()
  }
  return (
    <Card className="p-mx-lg">
      <div className="flex items-start justify-between gap-mx-sm">
        <div className="flex items-center gap-mx-sm">
          <div className="rounded-2xl bg-brand-primary-subtle p-mx-sm text-status-success-text">
            <Bell size={20} aria-hidden="true" />
          </div>
          <div>
            <Typography variant="h3" className="">
              Agenda Executiva
            </Typography>
            <Typography variant="tiny" tone="muted" className="block">
              {storeId
                ? `Hoje ${todayCount} • Próximos ${upcomingCount}`
                : 'Selecione uma loja para carregar agenda.'}
            </Typography>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={refresh} disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          <span className="ml-1">Atualizar</span>
        </Button>
      </div>

      {error && (
        <div className="mt-mx-md rounded-xl border border-status-error/40 bg-status-error-surface p-mx-sm">
          <Typography variant="tiny" className="text-status-error-text">
            {error}
          </Typography>
        </div>
      )}

      <ul className="mt-mx-md space-y-mx-sm">
        {events.map((event) => (
          <PersistedAgendaRow
            key={event.id}
            event={event}
            syncing={syncing === event.id}
            onSync={handleSync}
          />
        ))}
        {!events.length && !loading && (
          <li className="rounded-2xl border border-dashed border-border p-mx-md text-center">
            <Typography variant="tiny" tone="muted" className="font-bold">
              Sem eventos nos próximos 30 dias.
            </Typography>
          </li>
        )}
      </ul>
    </Card>
  )
}

function PersistedAgendaRow({
  event,
  syncing,
  onSync,
}: {
  event: CentralMxAgendaEvent
  syncing: boolean
  onSync: (eventId: string, action: 'upsert' | 'delete') => void
}) {
  const startsAt = new Date(event.starts_at)
  const startLabel = startsAt.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
  return (
    <li className="rounded-2xl border border-border bg-white p-mx-md">
      <div className="flex flex-col gap-mx-xs md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-mx-xs">
            <Badge variant="outline" className="">
              {event.kind.replaceAll('_', ' ')}
            </Badge>
            <Badge variant="outline" className="">
              {event.source}
            </Badge>
            <Badge variant="outline" className="">
              {event.integration_status}
            </Badge>
          </div>
          <Typography variant="p" className="mt-mx-xs">
            {event.title}
          </Typography>
          {event.public_summary && (
            <Typography variant="tiny" tone="muted" className="block">
              {event.public_summary}
            </Typography>
          )}
        </div>
        <div className="flex flex-col items-end gap-mx-xs">
          <Typography variant="tiny" tone="muted" className="">
            {startLabel}
          </Typography>
          <div className="flex items-center gap-mx-xs">
            <Button
              type="button"
              size="sm"
              variant={event.integration_status === 'sincronizado' ? 'outline' : 'primary'}
              onClick={() => onSync(event.id, 'upsert')}
              disabled={syncing}
              aria-label="Sincronizar com Google Calendar"
            >
              {syncing ? (
                <Loader2 size={14} className="mr-1 animate-spin" />
              ) : (
                <Upload size={14} className="mr-1" />
              )}
              {event.integration_status === 'sincronizado' ? 'Atualizar' : 'Sincronizar'}
            </Button>
            {event.google_event_id && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onSync(event.id, 'delete')}
                disabled={syncing}
                aria-label="Remover do Google Calendar"
              >
                <CloudOff size={14} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}
