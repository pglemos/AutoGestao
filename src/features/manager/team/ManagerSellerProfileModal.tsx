import { useState } from 'react'
import {
  Activity,
  Award,
  BarChart3,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  ChevronDown,
  Eye,
  FileText,
  GraduationCap,
  MessageSquarePlus,
  MessageSquare,
  Plus,
  ShieldCheck,
  TrendingUp,
  UserRound,
  X,
} from 'lucide-react'
import type { RankingEntry } from '@/types/database'
import type { ManagerTeamCard } from './manager-team-kanban'

type ProfileTab = 'overview' | 'performance' | 'routine' | 'feedbacks' | 'training'
type PerformancePeriod = 'current' | 'quarter'

type ManagerSellerProfileModalProps = {
  open: boolean
  seller: RankingEntry | null
  card: ManagerTeamCard | null
  storeName: string
  onClose: () => void
  onOpenFeedback: () => void
  onOpenRoutine: () => void
  onOpenTraining: () => void
}

const tabs: Array<{ key: ProfileTab; label: string }> = [
  { key: 'overview', label: 'Visão Geral' },
  { key: 'performance', label: 'Performance' },
  { key: 'routine', label: 'Rotina' },
  { key: 'feedbacks', label: 'Feedbacks' },
  { key: 'training', label: 'Treinamentos' },
]

export function ManagerSellerProfileModal({
  open,
  seller,
  card,
  storeName,
  onClose,
  onOpenFeedback,
  onOpenRoutine,
  onOpenTraining,
}: ManagerSellerProfileModalProps) {
  const [tab, setTab] = useState<ProfileTab>('overview')
  const [performancePeriod, setPerformancePeriod] = useState<PerformancePeriod>('current')

  if (!open || !seller || !card) return null

  const result = card.result
  const consistency = card.consistency
  const status = statusCopy(card.overallStatus)
  const sellerTarget = seller.meta > 0 ? seller.meta : null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 p-4">
      <section role="dialog" aria-modal="true" aria-label={`Perfil de ${seller.user_name}`} className="z-[120] flex max-h-[92vh] w-[90vw] max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-gray-100 px-6 py-4 sm:gap-4">
          <div className="ml-4 flex min-w-0 items-center gap-4 sm:ml-0">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-emerald-100 text-lg font-bold text-emerald-700">
              {initials(seller.user_name)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-gray-800">{seller.user_name}</h2>
              <p className="truncate text-sm text-gray-500">{storeName} · Vendedor</p>
              <p className="mt-1 text-xs text-gray-500"><span className={`mr-1 rounded-lg px-2 py-0.5 font-medium ${status.badge}`}>{status.label}</span><span className="hidden sm:inline"> · {card.reason}</span></p>
            </div>
          </div>
          <div className="order-first flex w-full shrink-0 translate-x-6 items-center justify-end gap-2 sm:order-none sm:translate-x-0 sm:w-auto">
            <button type="button" onClick={onOpenFeedback} className="flex h-8 !min-h-0 items-center gap-1 whitespace-nowrap rounded-xl border border-emerald-200 px-3 text-xs font-medium text-emerald-700 hover:bg-emerald-50"><MessageSquarePlus size={14}/>Registrar feedback</button>
            <button type="button" onClick={onOpenRoutine} className="flex h-8 !min-h-0 items-center gap-1 whitespace-nowrap rounded-xl bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700"><CalendarClock size={14}/>Ver rotina de hoje</button>
            <button type="button" aria-label="Fechar perfil do vendedor" className="ml-1 hidden text-gray-400 hover:text-gray-600 sm:inline-flex" onClick={onClose}><X size={20}/></button>
          </div>
        </header>

        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-gray-100 px-6 pt-3" aria-label="Abas do perfil do vendedor" role="tablist">
            {tabs.map((item) => (
              <button key={item.key} type="button" role="tab" aria-label={item.label} aria-selected={tab === item.key} onClick={() => setTab(item.key)} className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium ${tab === item.key ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{item.label}</button>
            ))}
        </nav>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
            {tab === 'overview' && <OverviewTab seller={seller} card={card} result={result} consistency={consistency} sellerTarget={sellerTarget} status={status} />}
            {tab === 'performance' && <PerformanceTab seller={seller} card={card} period={performancePeriod} onPeriodChange={setPerformancePeriod} />}
            {tab === 'routine' && <RoutineTab card={card} onOpenRoutine={onOpenRoutine} />}
            {tab === 'feedbacks' && <FeedbacksTab onOpenFeedback={onOpenFeedback} />}
            {tab === 'training' && <TrainingTab onOpenTraining={onOpenTraining} />}
        </div>
      </section>
    </div>
  )
}

function OverviewTab({ seller, card, result, consistency, sellerTarget, status }: { seller: RankingEntry; card: ManagerTeamCard; result: number | null; consistency: number | null; sellerTarget: number | null; status: ReturnType<typeof statusCopy> }) {
  return <>
    <div className="grid gap-4 sm:grid-cols-2">
      <HeroMetric icon={TrendingUp} label="Resultado" value={formatPercent(result)} detail={`${seller.vnd_total} / ${sellerTarget === null ? '—' : formatNumber(sellerTarget)} vendas`} tone={status.tone} />
      <HeroMetric icon={ShieldCheck} label="Consistência" value={formatPercent(consistency)} detail={consistency === null ? 'Dados insuficientes' : consistency >= 75 ? 'Consistência Boa' : 'Consistência Baixa'} tone={consistency === null ? 'muted' : consistency < 50 ? 'critical' : consistency < 75 ? 'attention' : 'success'} />
    </div>

    <details className="group overflow-hidden rounded-xl border border-gray-200">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-2"><Activity size={15} className="text-emerald-600" /> Composição da Consistência</span><ChevronDown size={16} className="text-gray-400 transition-transform group-open:rotate-180" /></summary>
      <div className="divide-y divide-gray-100 border-t border-gray-100 bg-gray-50 px-4 text-sm text-gray-600">
        <ConsistencyLine label="Rotina (peso 70%)" value={card.routine} />
        <ConsistencyLine label="Disciplina do Fechamento (peso 30%)" value={card.discipline} />
        <ConsistencyLine label="Consistência final" value={consistency} strong />
        <p className="pt-3 text-[11px] text-gray-400">Fórmula: Rotina × 0,70 + Disciplina × 0,30</p>
        <p className="pb-1 pt-1 text-xs italic text-gray-500">A Consistência combina a execução da rotina com a disciplina do fechamento.</p>
      </div>
    </details>

    <section className="rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-bold text-gray-700">Composição do Status</h3>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <div className="space-y-4 md:border-r md:border-gray-100 md:pr-5"><StatusLine label="Resultado Comercial" value={formatPercent(result)} helper={result === null ? 'Faixa indisponível' : result < 50 ? 'Faixa: Muito abaixo' : result < 80 ? 'Faixa: Abaixo' : result < 100 ? 'Faixa: Próximo da meta' : 'Faixa: Meta atingida'} /><StatusLine label="Consistência Comercial" value={formatPercent(consistency)} helper={consistency === null ? 'Faixa indisponível' : consistency < 50 ? 'Faixa: Consistência Baixa' : consistency < 75 ? 'Faixa: Atenção' : 'Faixa: Consistência Boa'} /></div>
        <div className="space-y-2 text-sm"><StatusLine label="Status Geral" value={status.label} /><StatusLine label="Status por Resultado" value={statusFromResult(result)} /><StatusLine label="Status por Consistência" value={statusFromConsistency(consistency)} /><p className="pt-1 text-xs text-gray-600"><span className="text-gray-400">Motivo: </span>{card.reason}</p><StatusLine label="Índice Gerencial" value={card.managementIndex === null ? '—' : `${Math.round(card.managementIndex)} pontos`} helper="Índice de apoio à priorização — não determina o status." /></div>
      </div>
      {consistency === null && <p className="mt-4 text-xs font-medium text-amber-600">Consistência parcial — aguardando fechamentos oficiais.</p>}
    </section>

    <section className="rounded-xl bg-gray-50 p-4"><h3 className="text-sm font-bold text-gray-700">Diagnóstico atual</h3><p className="mt-2 text-sm text-gray-600">{card.reason}</p><p className="mt-3 flex items-center gap-2 text-xs text-emerald-700"><CheckCircle2 size={14} /> Ponto positivo: <strong>—</strong></p></section>

    <section className="rounded-xl border border-gray-200 p-4"><h3 className="text-sm font-bold text-gray-700">Informações gerenciais</h3><div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3"><Info label="Data da última venda" value="—" /><Info label="Dias sem vender" value="—" /><Info label="Último feedback" value="—" /><Info label="Próximo feedback agendado" value="—" /><Info label="PDI ativo" value="Nenhum PDI ativo" /><Info label="Próximo compromisso do PDI" value="—" /><Info label="Treinamentos pendentes" value="—" /><Info label="Último acesso à Universidade MX" value="—" /></div></section>
  </>
}

function PerformanceTab({ seller, card, period, onPeriodChange }: { seller: RankingEntry; card: ManagerTeamCard; period: PerformancePeriod; onPeriodChange: (period: PerformancePeriod) => void }) {
  const target = seller.meta > 0 ? seller.meta : null
  return <div className="space-y-5">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <Metric icon={TrendingUp} label="Vendas no período" value={seller.vnd_total} tone="success" />
      <Metric icon={BarChart3} label="Meta proporcional" value={target === null ? '—' : formatNumber(target)} tone="info" />
      <Metric icon={TrendingUp} label="% da meta" value={formatPercent(card.result)} tone="attention" />
      <Metric icon={Activity} label="Conversão geral" value="—" tone="purple" />
      <Metric icon={CalendarClock} label="Dias desde última venda" value="—" tone="default" />
    </div>
    <section className="rounded-xl border border-gray-100 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-bold text-gray-800">Vendas acumuladas × Meta acumulada</h3><div className="inline-flex rounded-xl bg-gray-50 p-1"><button type="button" aria-pressed={period === 'current'} onClick={() => onPeriodChange('current')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${period === 'current' ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>Mês atual</button><button type="button" aria-pressed={period === 'quarter'} onClick={() => onPeriodChange('quarter')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${period === 'quarter' ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>Últimos 3 meses</button></div></div>
      <div className="relative mt-4 h-60 overflow-hidden rounded-lg border border-gray-100 bg-[linear-gradient(#f3f4f6_1px,transparent_1px),linear-gradient(90deg,#f3f4f6_1px,transparent_1px)] bg-[size:32px_32px]" aria-label={`Série acumulada — ${period === 'current' ? 'Mês atual' : 'Últimos 3 meses'}`}><div className="absolute inset-x-5 bottom-12 border-t border-gray-300" /><div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap text-xs"><span className="text-emerald-500">— Vendas acumuladas</span><span className="text-gray-400">— Meta acumulada</span></div><p className="absolute bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-gray-400">Série diária indisponível no contrato atual.</p></div>
    </section>
    <section className="rounded-xl border border-gray-100 bg-white p-4"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold text-gray-800">Resultado por canal</h3><span className="text-xs text-gray-400">Leads registrados no MX</span></div><div className="mt-4 grid gap-3 md:grid-cols-3"><ChannelMetric label="Showroom" base="atendimentos" /><ChannelMetric label="Carteira" base="contatos/leads" /><ChannelMetric label="Internet" base="leads" /><ChannelMetric label="Atendimento anterior / Sem canal" base="Base" sales={seller.vnd_total} /></div><div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-sm font-semibold text-gray-700"><span>Total de vendas no período</span><span>{seller.vnd_total}</span></div></section>
  </div>
}

function RoutineTab({ card, onOpenRoutine }: { card: ManagerTeamCard; onOpenRoutine: () => void }) {
  return <div className="space-y-5"><section className="grid min-h-44 place-items-center rounded-xl bg-gray-50 px-5 py-12 text-center"><div><Activity className="mx-auto mb-3 h-10 w-10 text-gray-300"/><p className="text-sm text-gray-500">{card.routine === null ? 'Não há dados de rotina para o período selecionado.' : `Execução verificada: ${Math.round(card.routine)}%.`}</p></div></section><button type="button" className="inline-flex h-9 items-center gap-1 rounded-xl bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700" onClick={onOpenRoutine}>Abrir Rotina da Equipe <span aria-hidden="true">→</span></button></div>
}

function FeedbacksTab({ onOpenFeedback }: { onOpenFeedback: () => void }) {
  return <div className="space-y-5"><div className="flex flex-wrap gap-2"><button type="button" className="inline-flex h-9 items-center gap-1 rounded-xl bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700" onClick={onOpenFeedback}><Plus size={14}/>Novo Feedback</button><button type="button" className="inline-flex h-9 items-center gap-1 rounded-xl border border-gray-200 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50" onClick={onOpenFeedback}><Eye size={14}/>Ver histórico completo</button></div><section className="rounded-xl border border-gray-100 bg-white p-4"><h3 className="text-sm font-semibold text-gray-800">PDI ativo</h3><EmptyPanel icon={FileText} text="Nenhum PDI ativo." compact /></section><section className="rounded-xl border border-gray-100 bg-white p-4"><h3 className="text-sm font-semibold text-gray-800">Histórico de feedbacks</h3><EmptyPanel icon={MessageSquare} text="Nenhum feedback registrado para este vendedor." action="Registrar feedback" onAction={onOpenFeedback} compact /></section></div>
}

function TrainingTab({ onOpenTraining }: { onOpenTraining: () => void }) {
  return <div className="space-y-5"><div className="flex flex-wrap gap-2"><button type="button" className="inline-flex h-9 items-center gap-1 rounded-xl bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700" onClick={onOpenTraining}><Plus size={14}/>Recomendar treinamento</button><button type="button" className="inline-flex h-9 items-center gap-1 rounded-xl border border-gray-200 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50" onClick={onOpenTraining}><Eye size={14}/>Ver acompanhamento completo</button></div><section className="rounded-xl border border-gray-100 bg-white p-4"><h3 className="mb-3 text-sm font-semibold text-gray-800">Acompanhamento de treinamentos</h3><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Metric icon={BookOpen} label="Trilha atual" value="—" compact /><Metric icon={CheckCircle2} label="Progresso geral" value="—" compact /><Metric icon={Award} label="Certificados" value="—" compact /><Metric icon={Clock} label="Último acesso" value="—" compact /></div></section><section className="rounded-xl bg-gray-50"><EmptyPanel icon={GraduationCap} text="Nenhum treinamento atribuído a este vendedor." action="Recomendar treinamento" onAction={onOpenTraining} /></section></div>
}

function HeroMetric({ icon: Icon, label, value, detail, tone }: { icon: typeof TrendingUp; label: string; value: string; detail: string; tone: 'critical' | 'attention' | 'success' | 'muted' }) {
  const theme = { critical: 'border-red-100 bg-red-50 text-red-600', attention: 'border-amber-100 bg-amber-50 text-amber-600', success: 'border-emerald-100 bg-emerald-50 text-emerald-600', muted: 'border-gray-100 bg-gray-50 text-gray-500' }[tone]
  return <div className={`rounded-xl border p-4 ${theme}`}><div className="flex items-center gap-2 text-sm font-bold"><Icon size={15} />{label}</div><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-gray-500">{detail}</p></div>
}

function ConsistencyLine({ label, value, strong = false }: { label: string; value: number | null; strong?: boolean }) { return <div className="flex items-center justify-between gap-3 py-2"><span>{label}:</span><strong className={strong ? 'text-gray-800' : 'font-semibold text-gray-700'}>{formatPercent(value)}</strong></div> }
function Metric({ icon: Icon, label, value, compact = false, tone = 'default' }: { icon: typeof TrendingUp; label: string; value: string | number; compact?: boolean; tone?: 'default' | 'success' | 'info' | 'attention' | 'purple' }) { const colors = { default: 'text-gray-400 text-gray-800', success: 'text-emerald-500 text-emerald-600', info: 'text-blue-500 text-blue-600', attention: 'text-amber-500 text-amber-600', purple: 'text-violet-500 text-violet-600' }[tone].split(' '); return <div className={`rounded-xl bg-gray-50 ${compact ? 'p-3' : 'p-3.5'}`}><Icon size={16} className={colors[0]}/><p className={`mt-1 font-bold ${compact ? 'text-lg' : 'text-2xl'} ${colors[1]}`}>{value}</p><p className="text-xs text-gray-500">{label}</p></div> }
function ChannelMetric({ label, base, sales = '—' }: { label: string; base: string; sales?: string | number }) { return <div className="rounded-xl bg-gray-50 p-4"><p className="font-semibold text-gray-800">{label}</p><div className="mt-4 space-y-1.5 text-sm"><MetricRow label={base} value="—" /><MetricRow label="Vendas" value={sales} accent /><MetricRow label="Conversão" value="—" /></div></div> }
function MetricRow({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) { return <div className="flex items-center justify-between gap-3"><span className="text-gray-500">{label}</span><strong className={accent ? 'font-semibold text-emerald-600' : 'font-semibold text-gray-800'}>{value}</strong></div> }
function EmptyPanel({ icon: Icon, text, action, onAction, compact = false }: { icon: typeof FileText; text: string; action?: string; onAction?: () => void; compact?: boolean }) { return <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'px-5 py-12'}`}><Icon className="mb-2 h-8 w-8 text-gray-300"/><p className="text-sm text-gray-500">{text}</p>{action && onAction ? <button type="button" className="mt-3 inline-flex h-9 items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50" onClick={onAction}><Plus size={14}/>{action}</button> : null}</div> }
function StatusLine({ label, value, helper }: { label: string; value: string; helper?: string }) { return <div className="flex items-start justify-between gap-4"><span className="text-gray-500">{label}:</span><span className="text-right font-semibold text-gray-700">{value}{helper && <small className="mt-0.5 block text-[11px] font-normal text-gray-400">{helper}</small>}</span></div> }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-sm font-semibold text-gray-700">{value}</p></div> }
function formatPercent(value: number | null) { return value === null ? '—' : `${Math.round(value)}%` }
function formatNumber(value: number) { return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) }
function initials(name: string) { const parts = name.trim().split(/\s+/); return parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : parts[0]?.[0]?.toUpperCase() || '?' }
function statusCopy(status: ManagerTeamCard['overallStatus']) { return status === 'on_track' ? { label: 'Em dia', badge: 'bg-emerald-100 text-emerald-700', tone: 'success' as const } : status === 'attention' ? { label: 'Atenção', badge: 'bg-amber-100 text-amber-700', tone: 'attention' as const } : status === 'not_applicable' ? { label: 'Não aplicável', badge: 'bg-gray-100 text-gray-600', tone: 'muted' as const } : { label: 'Crítico', badge: 'bg-red-100 text-red-600', tone: 'critical' as const } }
function statusFromResult(value: number | null) { return value === null ? '—' : value >= 100 ? 'Em dia' : value >= 80 ? 'Atenção' : 'Crítico' }
function statusFromConsistency(value: number | null) { return value === null ? '—' : value >= 75 ? 'Em dia' : value >= 50 ? 'Atenção' : 'Crítico' }

export default ManagerSellerProfileModal
