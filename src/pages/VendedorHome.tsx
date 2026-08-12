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

  const firstName = profile?.name?.trim().split(/\s+/)[0] || 'Nome não informado'

  const today = new Date()
  const weekday = capitalize(
    new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' }).format(today),
  )
  const longDate = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo',
  }).format(today)

  const meta = home.metrics?.meta ?? 0
  const vendas = home.metrics?.vendasMes ?? 0
  const faltam = Math.max(meta - vendas, 0)
  const atingimento = home.metrics?.atingimento ?? 0
  const atingimentoPct = Math.min(100, Math.round(atingimento))

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

  const disciplina = home.discipline?.percentage ?? 0

  const ritualItems = [
    { label: 'Fechamento Diário enviado', done: Boolean(home.todayCheckin) },
    {
      label: `${agendaMetrics.agendamentosHoje} agendamento${agendaMetrics.agendamentosHoje !== 1 ? 's' : ''} para hoje`,
      done: agendaMetrics.agendamentosHoje > 0,
    },
    {
      label: `${oportunidadesAtivas.length} oportunidade${oportunidadesAtivas.length !== 1 ? 's' : ''} ativas na carteira`,
      done: oportunidadesAtivas.length > 0,
    },
  ]

  if (home.isLoading) {
    return (
      <PageCanvas
        as="div"
        width="dashboard"
        bottomClearance="navigation"
        className="flex min-h-full items-center justify-center"
        aria-busy="true"
        aria-live="polite"
        aria-label="Carregando cockpit"
      >
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Carregando cockpit...</p>
        </div>
      </PageCanvas>
    )
  }

  return (
    <PageCanvas as="div" width="dashboard" bottomClearance="navigation" className="flex flex-col gap-5 text-foreground">
        <header className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {saudacao()}, {firstName}! 👋
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">Acompanhe sua rotina e resultados do dia.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-foreground">{weekday}</p>
                <p className="text-xs text-muted-foreground">{longDate}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/central-execucao')}
                  className="flex h-[36px] items-center gap-1 rounded-xl border border-gray-800 px-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-gray-100"
                >
                  <CalendarClock size={14} /> Rotina do Dia
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/fechamento-diario')}
                  className={`flex h-[36px] items-center gap-1 rounded-xl border px-3 text-sm font-semibold shadow-sm transition-colors ${
                    home.todayCheckin
                      ? 'border-emerald-600 text-emerald-700 hover:bg-emerald-50'
                      : 'border-amber-500 text-amber-700 hover:bg-amber-50'
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
                  className="grid h-[36px] w-10 place-items-center rounded-xl text-muted-foreground hover:bg-gray-50 disabled:opacity-50"
                >
                  <RefreshCw size={16} className={home.isRefetching || deterministic.loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Métricas do dia">
          <article className="flex min-h-[140px] flex-col justify-between rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-5 text-white shadow-md">
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

          <article className="flex min-h-[140px] flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Faltam para a Meta</p>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gray-100">
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
                  <p className="text-3xl font-bold text-emerald-600">0 vendas</p>
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
            className="flex min-h-[140px] flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
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
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gray-100">
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
            className={`flex min-h-[140px] flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors ${
              posicaoRanking === 1 ? 'border-amber-200' : 'border-gray-100'
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
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gray-100">
                <Trophy size={18} className={posicaoRanking === 1 ? 'text-amber-500' : 'text-muted-foreground'} />
              </span>
            </div>
            <div>
              <p className={`text-3xl font-bold ${posicaoRanking === 1 ? 'text-amber-500' : 'text-foreground'}`}>
                {posicaoRanking ? `#${posicaoRanking}` : '—'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">posição na loja</p>
            </div>
          </article>
        </section>

        <section className="flex flex-col gap-4 lg:flex-row">
          <div className="lg:w-[60%]">
            <article className="h-full rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
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
              <div className="relative h-3 overflow-hidden rounded-full bg-gray-100">
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

        <section aria-label="Checklist do dia" className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Checklist do Dia</h2>
          </div>
          <div className="space-y-3">
            {ritualItems.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                {item.done
                  ? <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
                  : <Circle size={18} className="text-text-disabled flex-shrink-0" />}
                <p className={`text-sm ${item.done ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4 lg:flex-row">
          <div className="lg:w-[55%]">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground">Rotina do Dia — Hoje</h2>
                <button
                  type="button"
                  onClick={() => navigate('/central-execucao')}
                  className="flex items-center gap-0.5 text-xs font-medium text-emerald-600 hover:text-emerald-700"
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
                    className="mt-2 text-xs font-medium text-emerald-600 hover:underline"
                  >
                    Criar atividade
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
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
                  className="mt-3 w-full text-center text-xs font-medium text-emerald-600 hover:underline"
                >
                  Ver mais {agendaHoje.length - 5} compromissos
                </button>
              )}
            </div>
          </div>

          <div className="lg:w-[45%]">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm h-full">
              <h2 className="mb-4 text-sm font-bold text-foreground">Acesso rápido</h2>
              <div className="grid grid-cols-2 gap-3">
                <ShortcutCard
                  label="Mentor Comercial"
                  icon={<Users size={20} className="text-indigo-500" />}
                  onClick={() => navigate('/carteira-clientes')}
                />
                <ShortcutCard
                  label="Minha Meta"
                  icon={<Target size={20} className="text-emerald-500" />}
                  onClick={() => navigate('/meu-funil')}
                />
                <ShortcutCard
                  label="Fechamento Diário"
                  icon={<CheckSquare size={20} className="text-blue-500" />}
                  onClick={() => navigate('/fechamento-diario')}
                />
                <ShortcutCard
                  label="Desenvolvimento"
                  icon={<BookOpen size={20} className="text-amber-500" />}
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
      className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-4 flex flex-col items-center gap-2 hover:bg-gray-100 transition-colors w-full"
    >
      {icon}
      <span className="text-xs font-medium text-muted-foreground text-center leading-tight">{label}</span>
    </button>
  )
}
