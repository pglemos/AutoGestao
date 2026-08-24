import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { chartTokens } from '@/lib/charts/tokens'
import {
  BookOpen,
  CalendarClock,
  CheckCircle,
  CheckSquare,
  ChevronRight,
  Circle,
  ClipboardCheck,
  RefreshCw,
  Target,
  Trophy,
  TrendingUp,
  Users,
} from 'lucide-react'
import { isEtapaTerminal } from '@/lib/schemas/crm.schema'
import { useAuth } from '@/hooks/useAuth'
import { useVendedorHomePage } from '@/features/vendedor-home/hooks/useVendedorHomePage'
import { useAgendamentos } from '@/features/crm/hooks/useAgendamentos'
import DeterministicActionsPanel from '@/features/deterministic-actions/DeterministicActionsPanel'
import { useDeterministicActions } from '@/features/deterministic-actions/useDeterministicActions'
import { PageCanvas } from '@/design-system/page'
import { PageHeading } from '@/components/molecules/PageHeading'
import { Skeleton } from '@/components/atoms/Skeleton'

function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function isToday(iso: string) {
  const d = new Date(iso)
  const t = new Date()
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  )
}

function VendedorHomeLoadingSkeleton() {
  return (
    <PageCanvas
      as="div"
      width="dashboard"
      bottomClearance="navigation"
      className="flex min-h-full flex-col gap-5"
      aria-busy="true"
      aria-live="polite"
      aria-label="Carregando cockpit do vendedor"
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-52" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
        <Skeleton className="min-h-[280px] rounded-2xl" />
        <Skeleton className="min-h-[280px] rounded-2xl" />
      </div>
    </PageCanvas>
  )
}

export default function VendedorHomePage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const home = useVendedorHomePage()
  const { agendamentos, metrics: agendaMetrics } = useAgendamentos()
  const deterministic = useDeterministicActions()
  const filteredActions = useMemo(
    () => deterministic.actions.filter(a => a.scenarioCode !== 'AUTOMATIC_TASK_ORIGIN_PENDING'),
    [deterministic.actions],
  )

  const firstName = profile?.name?.trim().split(/\s+/)[0] || 'Você'

  const today = new Date()
  const weekday = capitalize(
    new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' }).format(today),
  )
  const longDate = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo',
  }).format(today)

  const meta = typeof home.metrics?.meta === 'number' && Number.isFinite(home.metrics.meta) ? Math.max(0, home.metrics.meta) : 0
  const vendas = typeof home.metrics?.vendasMes === 'number' && Number.isFinite(home.metrics.vendasMes) ? Math.max(0, home.metrics.vendasMes) : 0
  const faltam = Math.max(meta - vendas, 0)
  const atingimento = typeof home.metrics?.atingimento === 'number' && Number.isFinite(home.metrics.atingimento)
    ? home.metrics.atingimento
    : (meta > 0 ? (vendas / meta) * 100 : 0)
  const atingimentoPct = Number.isFinite(atingimento) ? Math.min(100, Math.max(0, Math.round(atingimento))) : 0

  const agendaHoje = useMemo(() => agendamentos.filter(a => isToday(a.data_hora)), [agendamentos])

  const oportunidadesAtivas = useMemo(
    () => (home.oportunidades || []).filter(o => !isEtapaTerminal(o.etapa)),
    [home.oportunidades],
  )

  const posicaoRanking = useMemo(() => {
    if (!profile?.id || !home.ranking?.length) return null
    const idx = home.ranking.findIndex(r => r.user_id === profile.id)
    return idx >= 0 ? idx + 1 : null
  }, [home.ranking, profile?.id])

  const rawDiscipline = home.discipline?.percentage
  const disciplina = typeof rawDiscipline === 'number' && Number.isFinite(rawDiscipline)
    ? Math.min(100, Math.max(0, rawDiscipline))
    : 0

  const agendaCount = agendaMetrics?.agendamentosHoje ?? 0
  const opCount = oportunidadesAtivas.length

  const ritualItems = [
    { label: 'Fechamento Diário enviado', done: Boolean(home.todayCheckin) },
    {
      label: agendaCount === 1 ? '1 agendamento para hoje' : `${agendaCount} agendamentos para hoje`,
      done: agendaCount > 0,
    },
    {
      label: opCount === 1 ? '1 oportunidade ativa na carteira' : `${opCount} oportunidades ativas na carteira`,
      done: opCount > 0,
    },
  ]

  if (home.isLoading) {
    return <VendedorHomeLoadingSkeleton />
  }

  return (
    <PageCanvas as="div" width="dashboard" bottomClearance="navigation" className="flex flex-col gap-5 text-foreground">
        <PageHeading
          icon={Target}
          title={`${saudacao()}, ${firstName}! 👋`}
          subtitle="Acompanhe sua rotina e resultados do dia."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-foreground">{weekday}</p>
                <p className="text-xs text-muted-foreground">{longDate}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/central-execucao')}
                  className="flex h-[36px] items-center gap-1 rounded-xl border border-border-strong px-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
                >
                  <CalendarClock size={14} /> Rotina do Dia
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/fechamento-diario')}
                  className={`flex h-[36px] items-center gap-1 rounded-xl border px-3 text-sm font-semibold shadow-sm transition-colors ${
                    home.todayCheckin
                      ? 'border-status-success text-status-success-text hover:bg-status-success-surface'
                      : 'border-status-warning text-status-warning-text hover:bg-status-warning-surface'
                  }`}
                >
                  <ClipboardCheck size={14} />
                  {home.todayCheckin ? 'Fechamento ✓' : 'Enviar Fechamento'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void home.handleRefresh?.()
                    void deterministic.refresh()
                  }}
                  disabled={home.isRefetching || deterministic.loading}
                  aria-label="Atualizar"
                  className="grid h-[36px] w-10 place-items-center rounded-xl text-muted-foreground hover:bg-surface-alt disabled:opacity-50"
                >
                  <RefreshCw size={16} className={home.isRefetching || deterministic.loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          }
        />

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Métricas do dia">
          <article className="flex min-h-[140px] flex-col justify-between rounded-2xl bg-gradient-to-br from-brand-primary to-status-success p-5 text-white shadow-md">
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-100">Atingimento do Mês</p>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20">
                <TrendingUp size={18} />
              </span>
            </div>
            <div>
              <p className="text-3xl font-bold leading-tight">{atingimentoPct}%</p>
              <p className="mt-1 text-sm text-emerald-100">
                {atingimentoPct >= 100 ? '🎯 Meta batida!' : `${vendas} de ${meta} vendas realizadas`}
              </p>
            </div>
          </article>

          <article className="flex min-h-[140px] flex-col justify-between rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Faltam para a Meta</p>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted">
                <Target size={18} className="text-muted-foreground" />
              </span>
            </div>
            <div>
              {meta === 0 ? (
                <>
                  <p className="text-2xl font-bold text-muted-foreground">Meta não cadastrada</p>
                  <p className="mt-1 text-sm text-muted-foreground">Fale com seu gerente.</p>
                </>
              ) : faltam === 0 ? (
                <>
                  <p className="text-3xl font-bold text-status-success-text">0 vendas</p>
                  <p className="mt-1 text-sm text-muted-foreground">Meta do mês atingida! 🎉</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-foreground">{faltam} {faltam === 1 ? 'venda' : 'vendas'}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Para atingir a meta mensal</p>
                </>
              )}
            </div>
          </article>

          <article
            className="flex min-h-[140px] flex-col justify-between rounded-2xl border border-border-subtle bg-white p-5 shadow-sm cursor-pointer hover:bg-surface-alt transition-colors"
            role="link"
            tabIndex={0}
            onClick={() => navigate('/central-execucao')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                navigate('/central-execucao')
              }
            }}
          >
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Agenda Hoje</p>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted">
                <CalendarClock size={18} className="text-muted-foreground" />
              </span>
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{agendaMetrics.agendamentosHoje}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {agendaMetrics.agendamentosHoje === 0
                  ? 'Nenhum compromisso hoje'
                  : `compromisso${agendaMetrics.agendamentosHoje !== 1 ? 's' : ''} confirmado${agendaMetrics.agendamentosHoje !== 1 ? 's' : ''}`}
              </p>
            </div>
          </article>

          <article
            className={`flex min-h-[140px] flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm cursor-pointer hover:bg-surface-alt transition-colors ${
              posicaoRanking === 1 ? 'border-status-warning/30' : 'border-border-subtle'
            }`}
            role="link"
            tabIndex={0}
            onClick={() => navigate('/classificacao')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                navigate('/classificacao')
              }
            }}
          >
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ranking</p>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted">
                <Trophy size={18} className={posicaoRanking === 1 ? 'text-status-warning-text' : 'text-muted-foreground'} />
              </span>
            </div>
            <div>
              <p className={`text-3xl font-bold ${posicaoRanking === 1 ? 'text-status-warning-text' : 'text-foreground'}`}>
                {posicaoRanking ? `#${posicaoRanking}` : '—'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">posição na loja</p>
            </div>
          </article>
        </section>

        <section className="flex flex-col gap-4 lg:flex-row">
          <div className="lg:w-[60%]">
            <article className="h-full rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-bold text-foreground">Disciplina Semanal</h2>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Consistência nos fechamentos</p>
                  <p className="text-xl font-bold text-foreground">{Math.round(disciplina)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Oportunidades ativas</p>
                  <p className="text-xl font-bold text-foreground">{oportunidadesAtivas.length}</p>
                </div>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.round(disciplina))}%`,
                    background:
                      disciplina >= 80
                        ? chartTokens.success()
                        : disciplina >= 50
                        ? chartTokens.warning()
                        : chartTokens.danger(),
                  }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {disciplina >= 80 ? 'Excelente ritmo na semana' : disciplina >= 50 ? 'Bom progresso, mantenha a frequência' : 'Atenção à disciplina diária'}
              </p>
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                {disciplina >= 80
                  ? '🔥 Você está no caminho certo. Continue com o mesmo ritmo!'
                  : disciplina >= 50
                  ? '📈 Progresso positivo. Feche o dia com consistência.'
                  : '⚠️ Priorize registrar o fechamento diário todos os dias.'}
              </p>
            </article>
          </div>
          <div className="lg:w-[40%]">
            <DeterministicActionsPanel
              actions={filteredActions}
              loading={deterministic.loading}
              error={deterministic.error}
              refresh={deterministic.refresh}
              resolveAction={deterministic.resolveAction}
              title={filteredActions.length > 0 ? "Ação sugerida" : "Nenhuma pendência"}
              maxItems={1}
              compact
            />
          </div>
        </section>

        <section aria-label="Checklist do dia" className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Checklist do Dia</h2>
          </div>
          <div className="space-y-3">
            {ritualItems.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                {item.done
                  ? <CheckCircle size={18} className="text-status-success-text flex-shrink-0" />
                  : <Circle size={18} className="text-text-disabled flex-shrink-0" />}
                <p className={`text-sm ${item.done ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4 lg:flex-row">
          <div className="lg:w-[55%]">
            <div className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground">Rotina do Dia — Hoje</h2>
                <button
                  type="button"
                  onClick={() => navigate('/central-execucao')}
                  className="flex items-center gap-0.5 text-xs font-medium text-status-success-text hover:text-status-success-text"
                >
                  Ver tudo <span aria-hidden>›</span>
                </button>
              </div>
              {agendaHoje.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">Nenhum compromisso agendado para hoje.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/central-execucao')}
                    className="mt-2 text-xs font-medium text-status-success-text hover:underline"
                  >
                    Criar atividade
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {agendaHoje.slice(0, 5).map(item => (
                    <div key={item.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-400" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.cliente?.nome || 'Cliente'}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.tipo} · {new Date(item.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={15} className="text-text-disabled flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
              {agendaHoje.length > 5 && (
                <button
                  type="button"
                  onClick={() => navigate('/central-execucao')}
                  className="mt-3 w-full text-center text-xs font-medium text-status-success-text hover:underline"
                >
                  Ver mais {agendaHoje.length - 5} compromissos
                </button>
              )}
            </div>
          </div>

          <div className="lg:w-[45%]">
            <div className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm h-full">
              <h2 className="mb-4 text-sm font-bold text-foreground">Acesso rápido</h2>
              <div className="grid grid-cols-2 gap-3">
                <ShortcutCard
                  label="Mentor Comercial"
                  icon={<Users size={20} className="text-status-info" />}
                  onClick={() => navigate('/carteira-clientes')}
                />
                <ShortcutCard
                  label="Minha Meta"
                  icon={<Target size={20} className="text-status-success-text" />}
                  onClick={() => navigate('/meu-funil')}
                />
                <ShortcutCard
                  label="Fechamento Diário"
                  icon={<CheckSquare size={20} className="text-status-info-text" />}
                  onClick={() => navigate('/fechamento-diario')}
                />
                <ShortcutCard
                  label="Desenvolvimento"
                  icon={<BookOpen size={20} className="text-status-warning-text" />}
                  onClick={() => navigate('/desenvolvimento')}
                />
              </div>
            </div>
          </div>
        </section>
    </PageCanvas>
  )
}

function ShortcutCard({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-border-subtle bg-surface-alt px-4 py-4 flex flex-col items-center gap-2 hover:bg-muted transition-colors w-full"
    >
      {icon}
      <span className="text-xs font-medium text-muted-foreground text-center leading-tight">{label}</span>
    </button>
  )
}
