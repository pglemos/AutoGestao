import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'
import { Calendar, CheckCircle2, Link as LinkIcon, AlertCircle, RefreshCw, Building2 } from 'lucide-react'
import { Card } from '@/components/molecules/Card'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Badge } from '@/components/atoms/Badge'
import { useAuth } from '@/hooks/useAuth'
import { isAdminMasterMxProfile } from '@/lib/agenda/admin-master'
import { motion } from 'motion/react'

interface Props {
  clientId?: string
  compact?: boolean
}

export function GoogleCalendarStatus({ clientId, compact = false }: Props) {
  const { profile } = useAuth()
  const canViewCentralAgenda = isAdminMasterMxProfile(profile, import.meta.env.VITE_MX_ADMIN_MASTER_EMAILS)
  const {
    personalConnected,
    centralConnected,
    centralMeetCohostsAuthorized,
    personalGoogleEmail,
    centralGoogleEmail,
    loading,
    error,
    refetch,
    connectPersonal,
    connectCentral,
    events,
  } = useGoogleCalendar({ autoFetch: true, includeCentral: true })

  const upcoming = events.slice(0, compact ? 3 : 6)

  if (compact) {
    return (
      <div className="flex min-w-0 items-center gap-mx-sm text-mx-tiny">
        <Calendar size={14} className="shrink-0 text-emerald-600" />
        <span className="flex items-center gap-1 font-bold text-muted-foreground">
          {personalConnected
            ? <CheckCircle2 size={12} className="text-status-success" />
            : <AlertCircle size={12} className="text-muted-foreground" />}
          Sua agenda
        </span>
        {canViewCentralAgenda && (
          <span className="flex items-center gap-1 font-bold text-muted-foreground">
            {centralConnected && centralMeetCohostsAuthorized
              ? <CheckCircle2 size={12} className="text-status-success" />
              : <AlertCircle size={12} className="text-status-warning" />}
            Central MX
          </span>
        )}
        {error && <span className="font-bold text-status-error">{error}</span>}
      </div>
    )
  }

  return (
    <Card className="space-y-mx-md border bg-white p-mx-lg shadow-none">
      <header className="flex min-w-0 items-center justify-between gap-mx-sm">
        <div className="flex min-w-0 items-center gap-mx-sm">
          <div className="flex h-mx-12 w-mx-12 shrink-0 items-center justify-center rounded-xl border border-mx-indigo-100 bg-mx-indigo-50 text-emerald-600">
            <Calendar size={20} />
          </div>
          <div className="min-w-0">
            <Typography variant="h3" className="text-base">Google Calendar</Typography>
            <Typography variant="caption" tone="muted" className="text-mx-tiny">
              Sincronização híbrida
            </Typography>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={refetch} aria-label="Atualizar agenda" disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </Button>
      </header>

      <div className={`grid grid-cols-1 gap-mx-sm ${canViewCentralAgenda ? 'sm:grid-cols-2' : ''}`}>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`min-w-0 rounded-xl border p-mx-sm ${personalConnected ? 'bg-status-success-surface border-status-success/20' : 'bg-gray-50 border-gray-200'}`}
        >
          <div className="mb-1 flex min-w-0 items-center justify-between gap-mx-xs">
            <span className="min-w-0 truncate text-mx-tiny font-bold uppercase tracking-widest text-muted-foreground">Sua agenda</span>
            {personalConnected
              ? <CheckCircle2 size={16} className="shrink-0 text-status-success" />
              : <AlertCircle size={16} className="shrink-0 text-muted-foreground" />}
          </div>
          {personalConnected ? (
            <div className="flex min-w-0 flex-col gap-mx-tiny">
              <Badge variant="success" className="w-fit text-mx-nano">Conectada</Badge>
              {personalGoogleEmail && (
                <Typography variant="tiny" tone="muted" className="truncate text-mx-tiny">
                  {personalGoogleEmail}
                </Typography>
              )}
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => connectPersonal(clientId)} className="w-full mt-2 min-h-mx-11 gap-mx-xs px-2 text-center tracking-tight [white-space:normal]">
              <LinkIcon size={14} />
              <span className="sm:hidden">Conectar conta</span>
              <span className="hidden sm:inline">Conectar minha conta</span>
            </Button>
          )}
        </motion.div>

        {canViewCentralAgenda && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`min-w-0 rounded-xl border p-mx-sm ${centralConnected && centralMeetCohostsAuthorized ? 'bg-mx-green-50 border-mx-green-200' : 'bg-gray-50 border-gray-200'}`}
          >
            <div className="mb-1 flex min-w-0 items-center justify-between gap-mx-xs">
              <span className="flex min-w-0 items-center gap-mx-xs text-mx-tiny font-bold uppercase tracking-widest text-muted-foreground">
                <Building2 size={12} className="shrink-0" />
                <span className="truncate">Agenda Central MX</span>
              </span>
              {centralConnected && centralMeetCohostsAuthorized
                ? <CheckCircle2 size={16} className="shrink-0 text-status-success" />
                : <AlertCircle size={16} className="shrink-0 text-status-warning" />}
            </div>
            {centralConnected && centralMeetCohostsAuthorized ? (
              <div className="min-w-0">
                <Typography variant="tiny" className="block truncate px-2 py-1 text-white">
                  {centralGoogleEmail || 'gestao@mxconsultoria.com.br'}
                </Typography>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={connectCentral} className="w-full mt-2 min-h-mx-11 gap-mx-xs px-2 text-center tracking-tight [white-space:normal]">
                <LinkIcon size={14} />
                <span className="sm:hidden">{centralConnected ? 'Autorizar Meet' : 'Conectar central'}</span>
                <span className="hidden sm:inline">{centralConnected ? 'Autorizar co-hosts do Meet' : 'Conectar Agenda Central'}</span>
              </Button>
            )}
          </motion.div>
        )}
      </div>

      {error && (
        <div className="p-mx-sm rounded-xl bg-status-error-surface border border-status-error/20 text-status-error text-mx-tiny font-bold">
          {error}
        </div>
      )}

      {!compact && canViewCentralAgenda && centralConnected && !personalConnected && (
        <div className="p-mx-sm rounded-xl bg-mx-indigo-50 border border-mx-indigo-100 text-muted-foreground text-mx-tiny font-bold leading-relaxed">
          A Agenda Central MX está conectada. Para receber os compromissos na própria conta Google, cada admin MX precisa entrar no sistema com seu usuário e conectar a agenda pessoal.
        </div>
      )}

      {!compact && canViewCentralAgenda && centralConnected && !centralMeetCohostsAuthorized && (
        <div className="p-mx-sm rounded-xl bg-status-warning-surface border border-status-warning/20 text-muted-foreground text-mx-tiny font-bold leading-relaxed">
          Reconecte a Agenda Central MX para autorizar Daniel, Jose, Mariane e Joao como co-hosts das reunioes Google Meet.
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-mx-xs">
          <Typography variant="caption" tone="muted" className="text-mx-tiny">
            Próximos eventos
          </Typography>
          <ul className="space-y-mx-tiny">
            {upcoming.map((ev) => {
              const start = ev.start?.dateTime || ev.start?.date || ''
              const dt = start ? new Date(start) : null
              return (
                <li key={`${ev._source}-${ev.id}`} className="flex min-w-0 items-center gap-mx-sm rounded-xl p-mx-xs transition-colors hover:bg-gray-50">
                  <span className={`h-mx-md w-mx-tiny shrink-0 rounded-full ${ev._source === 'central' ? 'bg-emerald-600' : 'bg-status-info'}`} />
                  <div className="min-w-0 flex-1">
                    <Typography variant="caption" className="font-bold truncate block">
                      {ev.summary || '(sem título)'}
                    </Typography>
                    {dt && (
                      <Typography variant="tiny" tone="muted" className="block truncate text-mx-tiny">
                        {dt.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        {ev._source === 'central' ? ' • Central' : ' • Pessoal'}
                      </Typography>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </Card>
  )
}
