import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, CheckCircle2, X, CalendarClock, CheckSquare, History } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { useCheckinAuditor } from '@/hooks/useCheckinAuditor'
import { toast } from '@/lib/toast'
import type { CheckinCorrectionRequest, DailyCheckin } from '@/types/database'
import { addDaysDateOnly } from '../lib/crm-derived-totals'
import { RegularizarFechamentoDrawer, type RegularizarCrmValues } from './RegularizarFechamentoDrawer'
import { NotificationBellButton } from '@/components/NotificationBellButton'
import { isSubmittedClosing, type PreviousClosingCard } from '../lib/active-closing-context'
import {
  actionsForHistoryRowState,
  HISTORY_ROW_STATE_LABEL,
  latestRequestForCheckin,
  latestRequestForDate,
  resolveHistoryRowState,
  type HistoryRowAction,
} from '../lib/checkin-history-state'
import { SellerPageHeader } from '@/components/seller/SellerPageHeader'
import { CHECKIN_ZERO_REASONS } from '@/hooks/useCheckins'

const REGULARIZACAO_REASON = 'Regularização do fechamento diário'

interface PillarProgress {
  key: string
  label: string
  filled: boolean
}

interface CheckinHeaderProps {
dateStr: string
pillars: PillarProgress[]
totalAgendamentosD1?: number
creditosValidos?: number
setCustomReferenceDate: (value: string) => void
handleExit: () => void
historyOpen: boolean
  setHistoryOpen: (open: boolean) => void
  checkins?: DailyCheckin[]
  previousCard?: PreviousClosingCard | null
  activeClosingDate: string
  saveCheckin: (
    formData: any,
    scope?: any,
    customDate?: string,
    officialReferenceDate?: string,
  ) => Promise<{ error: string | null; id?: string }>
}

export function CheckinHeader({
dateStr,
pillars,
totalAgendamentosD1 = 0,
creditosValidos = 0,
setCustomReferenceDate,
historyOpen,
setHistoryOpen,
 checkins = [],
 previousCard = null,
 activeClosingDate,
 saveCheckin,
  ..._props
}: CheckinHeaderProps) {
const { requestCorrection, fetchOwnRequests, loading: auditorLoading } = useCheckinAuditor()
    // MX-22.3 (GAP 2): solicitações de regularização do PRÓPRIO vendedor,
    // pra combinar com lancamentos_diarios e expor os 7 estados do §8.1.
    const [ownRequests, setOwnRequests] = useState<CheckinCorrectionRequest[]>([])
    const [detailRequest, setDetailRequest] = useState<CheckinCorrectionRequest | null>(null)

  const [activeView, setActiveView] = useState<'list' | 'form' | 'detail'>('list')
  const [selectedRow, setSelectedRow] = useState<any | null>(null)

  useEffect(() => {
    if (!historyOpen) return
    let cancelled = false
    fetchOwnRequests()
      .then(reqs => { if (!cancelled) setOwnRequests(reqs) })
      .catch(() => { if (!cancelled) setOwnRequests([]) })
    return () => { cancelled = true }
  }, [historyOpen, fetchOwnRequests])
  const [productionZeroModalOpen, setProductionZeroModalOpen] = useState(false)
  const [productionZeroReason, setProductionZeroReason] = useState('')
  const [productionZeroDate, setProductionZeroDate] = useState('')
  const [productionZeroSaving, setProductionZeroSaving] = useState(false)
  const [formValues, setFormValues] = useState({
    leads_cart: 0,
    leads_net: 0,
    visitas_porta: 0,
    visitas_cart: 0,
    visitas_net: 0,
    agd_cart: 0,
    agd_net: 0,
    vnd_porta: 0,
    vnd_cart: 0,
    vnd_net: 0,
  })

  // Generate last 7 days of history (starting from yesterday backwards)
  const historyRows = useMemo(() => {
    const list = []
    const spString = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
    const todaySP = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(spString))

    // MX-22.3 (AC-1; §8.1 "Em andamento"): i=0 inclui hoje, único jeito de
    // "Em andamento" existir/ser testável — hoje o loop começava em ontem.
    for (let i = 0; i <= 7; i++) {
      const date = addDaysDateOnly(todaySP, -i)
      const isToday = i === 0
      const checkin = checkins.find(c => c.reference_date === date && c.metric_scope === 'daily')
      // Fallback: buscar solicitação por data quando não existe checkin 'daily'
      // (ex: produção zero retroativa que criou placeholder 'historical')
      const latestRequest = latestRequestForCheckin(ownRequests, checkin?.id)
        ?? latestRequestForDate(ownRequests, date)
      const state = resolveHistoryRowState({ date, checkin: checkin ?? null, latestRequest, now: new Date(), isToday })

      if (checkin) {
        const salesCount = (checkin.vnd_porta_prev_day || 0)
          + (checkin.vnd_cart_prev_day || 0)
          + (checkin.vnd_net_prev_day || 0)

        // Disciplina oficial persistida pelo servidor. Registros antigos sem
        // pontuação permanecem indisponíveis em vez de receber um valor local.
        const score = checkin.pontuacao_disciplina_final != null
          ? String(Math.round(checkin.pontuacao_disciplina_final))
          : null

        // Formatted time
        const finalized = isSubmittedClosing(checkin)
        const formattedTime = finalized ? new Date(checkin.submitted_at).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }) : '—'

        const leads = checkin.leads_prev_day || 0
        const atend = checkin.visit_prev_day || 0
        const agend = (checkin.agd_cart_today || 0) + (checkin.agd_net_today || 0)

        list.push({
          date,
          finalized,
          status: HISTORY_ROW_STATE_LABEL[state],
          state,
          latestRequest,
          score: finalized && score ? (score.includes('%') ? score : `${score}%`) : '—',
          time: formattedTime,
          sales: salesCount,
          leads,
          atend,
          agend,
          vendas: salesCount,
        })
      } else {
        list.push({
          date,
          finalized: false,
          status: HISTORY_ROW_STATE_LABEL[state],
          state,
          latestRequest,
          score: '—',
          time: '—',
          sales: 0,
          leads: 0,
          atend: 0,
          agend: 0,
          vendas: 0,
        })
      }
    }
    return list
  }, [checkins, ownRequests])

  const handleSelectRow = (row: any) => {
    setSelectedRow(row)
    if (row.finalized) {
      const checkin = checkins.find(c => c.reference_date === row.date)
      if (checkin) {
        // P0-02 (auditoria 2026-07-10): não jogar o total inteiro em
        // leads_cart/visitas_porta e zerar os demais canais — isso perdia a
        // distribuição real ao reabrir para regularização. Quando o canal de
        // visitas não foi rastreado (registro antigo, colunas NULL), preserva
        // o total em visitas_porta em vez de inventar uma distribuição.
        const hasVisitasCanal = checkin.visitas_porta_prev_day !== null && checkin.visitas_porta_prev_day !== undefined
        setFormValues({
          leads_cart: checkin.leads_prev_day || 0,
          leads_net: checkin.leads_net_prev_day || 0,
          visitas_porta: hasVisitasCanal ? (checkin.visitas_porta_prev_day || 0) : (checkin.visit_prev_day || 0),
          visitas_cart: hasVisitasCanal ? (checkin.visitas_cart_prev_day || 0) : 0,
          visitas_net: hasVisitasCanal ? (checkin.visitas_net_prev_day || 0) : 0,
          agd_cart: checkin.agd_cart_today || 0,
          agd_net: checkin.agd_net_today || 0,
          vnd_porta: checkin.vnd_porta_prev_day || 0,
          vnd_cart: checkin.vnd_cart_prev_day || 0,
          vnd_net: checkin.vnd_net_prev_day || 0,
        })
      } else {
        setFormValues({
          leads_cart: 0, leads_net: 0,
          visitas_porta: 0, visitas_cart: 0, visitas_net: 0,
          agd_cart: 0, agd_net: 0,
          vnd_porta: 0, vnd_cart: 0, vnd_net: 0,
        })
      }
    } else {
      setFormValues({
        leads_cart: 0, leads_net: 0,
        visitas_porta: 0, visitas_cart: 0, visitas_net: 0,
        agd_cart: 0, agd_net: 0,
        vnd_porta: 0, vnd_cart: 0, vnd_net: 0,
      })
    }
    setActiveView('form')
  }

  const handleAdjustPrevious = () => {
    if (!previousCard) return
    const date = previousCard.date
    const finalized = previousCard.type === 'previous_done'

    const checkin = checkins.find(c => c.reference_date === date && c.metric_scope === 'daily')

    const row = {
      date,
      finalized,
      status: finalized ? 'Finalizado' : 'Pendente de Fechamento',
      score: '—',
      time: '—',
      sales: checkin ? (checkin.vnd_porta_prev_day || 0) + (checkin.vnd_cart_prev_day || 0) + (checkin.vnd_net_prev_day || 0) : 0,
      leads: checkin ? checkin.leads_prev_day || 0 : 0,
      atend: checkin ? checkin.visit_prev_day || 0 : 0,
      agend: checkin ? (checkin.agd_cart_today || 0) + (checkin.agd_net_today || 0) : 0,
      vendas: checkin ? (checkin.vnd_porta_prev_day || 0) + (checkin.vnd_cart_prev_day || 0) + (checkin.vnd_net_prev_day || 0) : 0,
    }

    handleSelectRow(row)
    setActiveView('form')
    setHistoryOpen(true)
  }

  const handleViewPreviousHistory = () => {
    setActiveView('list')
    setHistoryOpen(true)
  }

  const handleFieldChange = (field: string, val: number) => {
    setFormValues(prev => ({
      ...prev,
      [field]: Math.max(0, Math.floor(val)),
    }))
  }

  const handleSubmitCorrection = async (crmValues: RegularizarCrmValues) => {
    if (!selectedRow) return

    try {
      let checkinId = ''
      
      if (selectedRow.finalized) {
        const existing = checkins.find(c =>
          c.reference_date === selectedRow.date
          && c.metric_scope === 'daily'
          && isSubmittedClosing(c),
        )
        if (existing) {
          checkinId = existing.id
        }
      }
      
      // If no checkin exists (Pendente), create a placeholder checkin first
      if (!checkinId) {
        const placeholderPayload = {
          leads: 0,
          leads_cart: 0,
          leads_net: 0,
          agd_cart_prev: 0,
          agd_net_prev: 0,
          agd_cart: 0,
          agd_net: 0,
          vnd_porta: 0,
          vnd_cart: 0,
          vnd_net: 0,
          visitas: 0,
          visitas_porta: 0,
          visitas_cart: 0,
          visitas_net: 0,
          note: null,
          zero_reason: 'Outro',
        }
        
        const res = await saveCheckin(placeholderPayload, 'historical', selectedRow.date)
        if (res.error) {
          toast.error(`Erro ao iniciar regularização: ${res.error}`)
          return
        }
        
        if (!res.id) {
          toast.error('Erro ao buscar identificador do fechamento.')
          return
        }
        checkinId = res.id
      }
      
      // Build the requested values payload
      // P0-02/P0-06 (auditoria 2026-07-10): agd_cart_prev_day/agd_net_prev_day
      // (agendamentos D-1) NÃO são editáveis neste drawer — antes eram
      // enviados como 0 fixo, o que zerava esses campos em toda regularização
      // aprovada, mesmo sem o usuário ter tocado neles. Omitir as chaves faz
      // a RPC solicitar_regularizacao_fechamento preservar o valor original
      // (fallback já implementado no servidor). leads_prev_day/leads_net_prev_day
      // e visitas_*_prev_day usam os nomes de coluna reais para a RPC não
      // precisar somar leads_cart+leads_net em Carteira (mesmo bug do P0-02).
      const requestedValues = {
        reference_date: selectedRow.date,
        leads_prev_day: Number(formValues.leads_cart),
        leads_net_prev_day: Number(formValues.leads_net),
        visitas_porta_prev_day: Number(formValues.visitas_porta),
        visitas_cart_prev_day: Number(formValues.visitas_cart),
        visitas_net_prev_day: Number(formValues.visitas_net),
        agd_cart: Number(crmValues.agd_cart),
        agd_net: Number(crmValues.agd_net),
        agd_cart_today: Number(crmValues.agd_cart),
        agd_net_today: Number(crmValues.agd_net),
        vnd_porta_prev_day: Number(crmValues.vnd_porta),
        vnd_cart_prev_day: Number(crmValues.vnd_cart),
        vnd_net_prev_day: Number(crmValues.vnd_net),
        visit_prev_day: Number(formValues.visitas_porta) + Number(formValues.visitas_cart) + Number(formValues.visitas_net),
        zero_reason: (Number(formValues.leads_cart) + Number(formValues.leads_net) + Number(formValues.visitas_porta) + Number(formValues.visitas_cart) + Number(formValues.visitas_net) + Number(crmValues.agd_cart) + Number(crmValues.agd_net) + Number(crmValues.vnd_porta) + Number(crmValues.vnd_cart) + Number(crmValues.vnd_net) === 0) ? 'Outro' : undefined,
      }
      
      const res = await requestCorrection(checkinId, requestedValues, REGULARIZACAO_REASON)
      if (res.error) {
        toast.error(`Erro ao enviar solicitação: ${res.error}`)
      } else {
        toast.success('Solicitação enviada ao gestor. Os dados serão aplicados após a aprovação.')
        setActiveView('list')
      }
} catch (err) {
toast.error('Erro inesperado ao processar solicitação.')
console.error(err)
}
}

  const handleOpenProductionZeroModal = () => {
    const activeCheckin = checkins.find(
      checkin => checkin.reference_date === activeClosingDate && checkin.metric_scope === 'daily',
    )
    setProductionZeroReason(activeCheckin?.zero_reason || '')
    setProductionZeroDate(activeClosingDate)
    setProductionZeroModalOpen(true)
  }

  const handleSelectProductionZeroDate = (date: string) => {
    setProductionZeroDate(date)
    const existing = checkins.find(
      checkin => checkin.reference_date === date && checkin.metric_scope === 'daily',
    )
    setProductionZeroReason(existing?.zero_reason || '')
  }

  const handleMarkProductionZero = async () => {
    if (!productionZeroReason) {
      toast.error('Selecione o motivo da produção zero.')
      return
    }
    if (!productionZeroDate) {
      toast.error('Selecione a data da produção zero.')
      return
    }

    const isActiveDate = productionZeroDate === activeClosingDate

    setProductionZeroSaving(true)
    try {
      if (isActiveDate) {
        // Data operacional ativa: salva diretamente (escopo 'daily')
        const result = await saveCheckin(
          {
            reference_date: productionZeroDate,
            leads: 0,
            leads_cart: 0,
            leads_net: 0,
            agd_cart_prev: 0,
            agd_net_prev: 0,
            agd_cart: 0,
            agd_net: 0,
            vnd_porta: 0,
            vnd_cart: 0,
            vnd_net: 0,
            visitas: 0,
            visitas_porta: 0,
            visitas_cart: 0,
            visitas_net: 0,
            note: null,
            zero_reason: productionZeroReason,
          },
          'daily',
          productionZeroDate,
          activeClosingDate,
        )

        if (result.error) {
          toast.error(`Não foi possível marcar Produção Zero: ${result.error}`)
          return
        }
      } else {
        // Datas retroativas: cria checkin placeholder (se necessário) e envia
        // solicitação de regularização para o gestor aprovar.
        let checkinId = ''

        const existing = checkins.find(
          c => c.reference_date === productionZeroDate && isSubmittedClosing(c),
        )
        if (existing) {
          checkinId = existing.id
        }

        if (!checkinId) {
          const placeholderPayload = {
            leads: 0,
            leads_cart: 0,
            leads_net: 0,
            agd_cart_prev: 0,
            agd_net_prev: 0,
            agd_cart: 0,
            agd_net: 0,
            vnd_porta: 0,
            vnd_cart: 0,
            vnd_net: 0,
            visitas: 0,
            visitas_porta: 0,
            visitas_cart: 0,
            visitas_net: 0,
            note: null,
            zero_reason: 'Outro',
          }
          const res = await saveCheckin(placeholderPayload, 'historical', productionZeroDate)
          if (res.error) {
            toast.error(`Erro ao iniciar produção zero: ${res.error}`)
            return
          }
          if (!res.id) {
            toast.error('Erro ao buscar identificador do fechamento.')
            return
          }
          checkinId = res.id
        }

        // Envia solicitação de regularização com valores zero + motivo
        const requestedValues = {
          reference_date: productionZeroDate,
          leads_prev_day: 0,
          leads_net_prev_day: 0,
          visitas_porta_prev_day: 0,
          visitas_cart_prev_day: 0,
          visitas_net_prev_day: 0,
          agd_cart: 0,
          agd_net: 0,
          agd_cart_today: 0,
          agd_net_today: 0,
          vnd_porta_prev_day: 0,
          vnd_cart_prev_day: 0,
          vnd_net_prev_day: 0,
          visit_prev_day: 0,
          zero_reason: productionZeroReason,
        }

        const res = await requestCorrection(checkinId, requestedValues, `Produção Zero — ${productionZeroReason}`)
        if (res.error) {
          toast.error(`Erro ao enviar produção zero: ${res.error}`)
          return
        }
      }

      toast.success(isActiveDate ? 'Produção Zero marcada com sucesso.' : 'Produção Zero enviada para aprovação do gestor.')
      setProductionZeroModalOpen(false)
      // Atualiza a lista de solicitações próprias para refletir o novo estado
      fetchOwnRequests()
        .then(reqs => setOwnRequests(reqs))
        .catch(() => {})
    } catch (error) {
      console.error(error)
      toast.error('Não foi possível marcar Produção Zero.')
    } finally {
      setProductionZeroSaving(false)
    }
}

const completedPillars = pillars.filter((pillar) => pillar.filled).length
const baseReady = completedPillars >= 3
const safeTotalAgendamentosD1 = Math.max(0, Number(totalAgendamentosD1) || 0)
const safeCreditosValidos = Math.max(0, Number(creditosValidos) || 0)
const detailRatio = safeTotalAgendamentosD1 > 0 ? Math.min(1, safeCreditosValidos / safeTotalAgendamentosD1) : baseReady ? 1 : 0
const detailsComplete = baseReady && detailRatio >= 1
const activeStep = baseReady ? 4 : Math.min(3, Math.max(1, completedPillars + 1))
const progressPercent = baseReady
? detailsComplete
? 100
: Math.min(99, 70 + Math.round(detailRatio * 30))
: Math.min(70, completedPillars * 20)
const stepItems = [
{ step: 1, label: 'Showroom', percent: 20, done: completedPillars >= 1 },
{ step: 2, label: 'Carteira', percent: 20, done: completedPillars >= 2 },
{ step: 3, label: 'Internet', percent: 30, done: baseReady },
{ step: 4, label: 'Vendas / Agendamentos', percent: 30, done: detailsComplete },
]
const activeStepLabel = stepItems.find((item) => item.step === activeStep)?.label ?? 'Internet'

return (
<header className="relative z-[var(--mx-z-topbar)] shrink-0 space-y-4 md:pt-3 border-none bg-transparent shadow-none pb-1 w-full">
      {/* Contract matcher: md:sticky md:top-0 */}
      {/* Top Header Row (Desktop only, centered rounded card matching meu-funil) */}
      <div className="hidden md:block w-full">
        <SellerPageHeader
          icon={CheckSquare}
          title="Fechamento"
          actions={
            <>
              <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-white px-3 py-1.5 shadow-sm">
                <CalendarDays size={18} className="shrink-0 text-status-info-text" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-caption font-bold uppercase tracking-[0.08em] text-muted-foreground">Data operacional principal</p>
                  <p className="truncate text-body-sm font-bold text-mx-navy">{dateStr}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomReferenceDate('')}
                  className="ml-1 inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border border-border bg-white px-3 text-[12px] font-bold text-mx-navy shadow-sm hover:border-status-info hover:text-status-info-text"
                >
                  Ver data atual
                </button>
              </div>
              <button
                type="button"
                onClick={handleViewPreviousHistory}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-white px-4 text-body-sm font-semibold text-muted-foreground shadow-sm transition-colors hover:border-status-info hover:text-status-info-text"
              >
                <History size={15} aria-hidden="true" />
                Histórico de Fechamentos
              </button>
            </>
          }
        />
      </div>

{previousCard && (
<section className={`rounded-xl border bg-white px-3 py-2 shadow-mx-lg ${
previousCard.type === 'previous_done' ? 'border-status-success/30' : 'border-status-warning/30'
}`}>
<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
<div className="flex min-w-0 items-start gap-2 md:flex-1">
<span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
previousCard.type === 'previous_done' ? 'bg-status-success-surface text-status-success-text' : 'bg-status-warning-surface text-status-warning-text'
}`}>
{previousCard.type === 'previous_done' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
</span>
<div className="min-w-0">
<p className={`text-caption font-bold uppercase tracking-[0.08em] ${
previousCard.type === 'previous_done' ? 'text-status-success-text' : 'text-status-warning-text'
}`}>
{previousCard.type === 'previous_done' ? 'FECHAMENTO ANTERIOR CONCLUÍDO' : 'FECHAMENTO ANTERIOR PENDENTE'}
</p>
<p className="whitespace-normal break-words text-[12px] font-semibold leading-relaxed text-muted-foreground">
{previousCard.type === 'previous_done'
? `Você enviou o fechamento do dia ${previousCard.date.split('-').reverse().join('/')} com sucesso. As informações foram encaminhadas para sua liderança. Caso precise corrigir algum dado, acesse o Histórico de Fechamentos, clique em Ajustar e envie a regularização para análise.`
: `O fechamento do dia ${previousCard.date.split('-').reverse().join('/')} não foi enviado dentro do prazo. A tela atual já está liberada para o fechamento de hoje. Para corrigir a pendência, acesse o Histórico de Fechamentos e envie a regularização para análise da liderança.`}
</p>
</div>
</div>
<div className="flex shrink-0 gap-2">
<button type="button" onClick={handleViewPreviousHistory} className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-white px-3 text-caption font-bold text-muted-foreground shadow-sm hover:border-status-info hover:text-status-info-text">
Ver histórico
</button>
<button type="button" onClick={handleAdjustPrevious} className={`inline-flex h-8 items-center justify-center rounded-lg px-3 text-caption font-bold shadow-sm ${
previousCard.type === 'previous_done' ? 'bg-brand-primary text-white hover:bg-brand-primary-hover' : 'bg-status-warning text-foreground hover:bg-status-warning'
}`}>
{previousCard.type === 'previous_done' ? 'Ajustar fechamento' : `Regularizar ${previousCard.date.slice(8, 10)}/${previousCard.date.slice(5, 7)}`}
</button>
</div>
</div>
</section>
)}

{/* Desktop: data operacional vive dentro do header (SellerPageHeader actions). Mobile: sem header de topo, mantém aqui. */}
<section aria-labelledby="checkin-operational-date" className="rounded-xl border border-border bg-white px-4 py-3 shadow-mx-lg md:hidden">
<div className="flex flex-wrap items-center justify-between gap-3">
<div className="flex min-w-0 items-center gap-2">
<CalendarDays size={18} className="shrink-0 text-status-info-text" aria-hidden="true" />
<div className="min-w-0">
<p className="text-caption font-bold uppercase tracking-[0.08em] text-muted-foreground">Data operacional principal</p>
<h2 id="checkin-operational-date" className="truncate text-body font-bold text-mx-navy sm:text-h5">{dateStr}</h2>
</div>
</div>
<button
type="button"
onClick={() => setCustomReferenceDate('')}
className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-[12px] font-bold text-mx-navy shadow-sm hover:border-status-info hover:text-status-info-text"
>
Ver data atual
</button>
</div>
</section>

<div className="space-y-3 md:hidden">

<section className="rounded-mx-2xl border border-border bg-white p-4 shadow-mx-lg">
<div className="flex items-start justify-between gap-4">
<div>
<div className="flex items-center gap-1.5">
<p className="text-[16px] font-bold tracking-tight text-mx-navy">Progresso do Fechamento</p>
<span className="grid h-5 w-5 place-items-center rounded-full border border-muted-foreground text-[12px] font-bold text-muted-foreground">i</span>
</div>
<p className="mt-3 text-body-sm font-bold text-muted-foreground">
Etapa {activeStep} de 4 <span className="text-muted-foreground">•</span> <span className="text-status-success-text">{activeStepLabel}</span>
</p>
</div>
<div className="text-right">
<p className="text-h2 font-bold leading-none text-status-success-text">{progressPercent}%</p>
<p className="mt-1 text-[12px] font-semibold text-muted-foreground">preenchido</p>
</div>
</div>
<div className="mt-4 h-3 rounded-full bg-border">
<div className="h-full rounded-full bg-status-success" style={{ width: `${progressPercent}%` }} />
</div>
</section>

<section className="grid grid-cols-4 overflow-hidden rounded-mx-2xl border border-border bg-white shadow-mx-lg">
{stepItems.map((item) => {
const active = item.step === activeStep
return (
<div key={item.step} className="flex min-w-0 flex-col items-center gap-1 border-r border-border px-2 py-3 text-center last:border-r-0">
<span className={item.done ? 'grid h-8 w-8 place-items-center rounded-full bg-status-success text-body font-bold text-white' : active ? 'grid h-8 w-8 place-items-center rounded-full bg-status-success text-[14px] font-bold text-white' : 'grid h-8 w-8 place-items-center rounded-full border border-muted-foreground text-[14px] font-bold text-muted-foreground'}>
{item.done ? '✓' : item.step}
</span>
<span className={active ? 'max-w-full text-caption font-bold leading-tight text-status-success-text' : 'max-w-full text-caption font-bold leading-tight text-mx-navy'}>
{item.step}. {item.label}
</span>
<span className={active ? 'text-caption font-bold text-status-success-text' : 'text-caption font-semibold text-muted-foreground'}>
{item.percent}%
</span>
</div>
)
})}
</section>
</div>

{/* Histórico de Fechamentos Modal */}
{historyOpen && activeView === 'list' && (
<div className="fixed inset-0 z-[var(--mx-z-modal)] grid place-items-center bg-surface-overlay/35 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] backdrop-blur-[3px]" role="dialog" aria-modal="true" aria-label="Histórico de Fechamentos">
<div className="flex max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-[min(42rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-mx-2xl transition-all animate-in fade-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <header className="px-6 py-5 border-b border-border flex items-center justify-between bg-surface-alt">
              <div>
                <h2 className="text-lg font-extrabold text-mx-navy uppercase tracking-tight">Histórico de Fechamentos</h2>
                <p className="text-xs font-semibold text-muted-foreground mt-1">Visualize ou regularize seus fechamentos operacionais dos últimos 7 dias.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHistoryOpen(false)
                  setActiveView('list')
                }}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-surface-alt transition-colors"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </header>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto">

              {
                /* --- LIST VIEW (Rounded Cards matching Mockup) --- */
                <div className="flex flex-col gap-3">
                  {historyRows.map(row => {
                    const dateObj = new Date(row.date + 'T12:00:00')
                    const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
                    const weekdayFormatted = weekday.charAt(0).toUpperCase() + weekday.slice(1, 3)

                    return (
                      <div
                        key={row.date}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-2xl transition-all ${
                          row.finalized
                            ? 'border-border bg-surface-alt/80'
                            : 'border-status-error/30 bg-status-error-surface/60'
                        }`}
                      >
                        {/* Left Side: Date & Icon */}
                        <div className="flex items-center gap-3">
                          <div className={`grid h-9 w-9 place-items-center rounded-xl ${
                            row.finalized ? 'bg-surface-alt text-status-success-text' : 'bg-status-error-surface text-status-error'
                          }`}>
                            <CalendarClock size={18} />
                          </div>
                          <div>
                            <span className="font-extrabold text-mx-navy text-sm">{formattedDate}</span>
                            <span className="text-muted-foreground text-xs font-bold ml-2 uppercase tracking-wide">{weekdayFormatted}</span>
                            {row.finalized && row.time && row.time !== '—' && (
                              <span className="text-muted-foreground text-xs font-bold ml-2">
                                · {row.time}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right Side: Status/Metrics & Action — MX-22.3 §8.1/§8.2:
                            estado combinado (lancamentos_diarios + solicitação de
                            regularização), ações exatas por estado. */}
                        <div className="flex items-center justify-between sm:justify-end gap-4 flex-wrap">
                          {row.finalized && (
                            <div className="flex items-center gap-3 text-xs flex-wrap">
                              <div>
                                <span className="text-status-success-text font-bold">{row.leads}</span>{' '}
                                <span className="text-muted-foreground font-semibold">leads</span>
                              </div>
                              <div className="h-3 w-px bg-border" />
                              <div>
                                <span className="text-status-success-text font-bold">{row.atend}</span>{' '}
                                <span className="text-muted-foreground font-semibold">atend.</span>
                              </div>
                              <div className="h-3 w-px bg-border" />
                              <div>
                                <span className="text-status-warning-text font-bold">{row.agend}</span>{' '}
                                <span className="text-muted-foreground font-semibold">agend.</span>
                              </div>
                              <div className="h-3 w-px bg-border" />
                              <div>
                                <span className="text-status-success-text font-bold">{row.vendas}</span>{' '}
                                <span className="text-muted-foreground font-semibold">vendas</span>
                              </div>
                            </div>
                          )}
                          {!row.finalized && row.state !== 'em_andamento' && (
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-caption font-extrabold ${
                              row.state === 'aguardando_aprovacao'
                                ? 'border-status-warning/40 bg-status-warning-surface text-status-warning-text'
                                : 'border-status-error/30 bg-status-error-surface text-status-error'
                            }`}>
                              {row.status}
                            </span>
                          )}
                          {row.state === 'em_andamento' && (
                            <span className="inline-flex items-center rounded-full border border-border bg-surface-alt px-2.5 py-0.5 text-caption font-extrabold text-muted-foreground">
                              Em andamento
                            </span>
                          )}
                          {row.state === 'aprovado' && (
                            <span className="inline-flex items-center rounded-full border border-status-success bg-surface-alt px-2.5 py-0.5 text-caption font-extrabold text-status-success-text">
                              Regularizado Aprovado
                            </span>
                          )}
                          {(actionsForHistoryRowState(row.state) as HistoryRowAction[]).map(action => {
                            const label: Record<HistoryRowAction, string> = {
                              ver_detalhes: 'Ver detalhes',
                              ajustar: 'Ajustar',
                              regularizar: 'Regularizar',
                              ver_solicitacao: 'Ver solicitação',
                              ver_versao_original: 'Ver versão original',
                              ver_versao_aprovada: 'Ver versão aprovada',
                              ver_auditoria: 'Ver auditoria',
                              ver_motivo_recusa: 'Ver motivo da recusa',
                              criar_nova_versao: 'Criar nova versão',
                            }
                            if (action === 'ver_detalhes') return null // já exibido como métricas inline
                            const opensDrawer = action === 'ajustar' || action === 'regularizar' || action === 'criar_nova_versao'
                            return (
                              <button
                                key={action}
                                type="button"
                                onClick={() => {
                                  if (opensDrawer) { handleSelectRow(row); return }
                                  setSelectedRow(row)
                                  setDetailRequest(row.latestRequest)
                                  setActiveView('detail')
                                }}
                                className="inline-flex h-7 items-center justify-center rounded-lg border border-border bg-white px-3 text-caption font-bold text-status-success-text hover:bg-surface-alt transition-colors shadow-sm cursor-pointer"
                              >
                                {label[action]}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              }

            </div>

            {/* Modal Footer */}
            <footer className="px-6 py-4 border-t border-border flex justify-between items-center bg-surface-alt">
              <Button
                type="button"
                onClick={handleOpenProductionZeroModal}
                disabled={productionZeroSaving}
                className="h-10 px-4 text-xs font-bold border border-status-warning/40 bg-status-warning-surface text-status-warning-text hover:bg-status-warning-surface rounded-xl shadow-sm transition-colors"
              >
                Marcar Produção Zero
              </Button>
              <Button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="h-10 px-5 text-xs font-bold bg-status-success hover:bg-status-success text-white rounded-xl shadow-sm transition-colors"
              >
                Fechar
              </Button>
            </footer>

          </div>
        </div>
      )}

      {historyOpen && productionZeroModalOpen && (
        <div
          className="fixed inset-0 z-[var(--mx-z-modal)] grid place-items-center bg-surface-overlay/35 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] backdrop-blur-[3px]"
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget && !productionZeroSaving) {
              setProductionZeroModalOpen(false)
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="production-zero-title"
            aria-describedby="production-zero-description"
            className="flex max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-[min(460px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-status-warning/40 bg-white shadow-mx-2xl animate-in fade-in zoom-in-95 duration-200"
            onMouseDown={event => event.stopPropagation()}
          >
            <header className="flex items-center gap-3 border-b border-status-warning/30 bg-status-warning-surface px-5 py-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-mx-lg bg-mx-navy text-status-warning-text">
                <AlertTriangle size={19} strokeWidth={2} aria-hidden="true" />
              </div>
              <div>
                <h2 id="production-zero-title" className="text-base font-extrabold text-status-warning-text">
                  Marcar Produção Zero
                </h2>
                <p id="production-zero-description" className="mt-0.5 text-xs font-semibold text-status-warning-text/70">
                  Escolha o motivo para {productionZeroDate.split('-').reverse().join('/')}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProductionZeroModalOpen(false)}
                disabled={productionZeroSaving}
                className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-status-warning-text hover:bg-status-warning-surface disabled:opacity-50"
                aria-label="Fechar seleção de Produção Zero"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <div className="space-y-3 overflow-y-auto p-5">
              <div className="space-y-1.5">
                <p className="text-xs font-extrabold uppercase tracking-wide text-status-warning-text/70">Data do fechamento</p>
                <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Data do fechamento">
                  {historyRows.map(row => {
                    const dateObj = new Date(row.date + 'T12:00:00')
                    const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                    const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
                    const weekdayFormatted = weekday.charAt(0).toUpperCase() + weekday.slice(1, 3)
                    const selected = productionZeroDate === row.date
                    return (
                      <button
                        key={row.date}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={row.finalized}
                        onClick={() => handleSelectProductionZeroDate(row.date)}
                        className={`flex flex-col items-center rounded-xl border px-1 py-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                          selected
                            ? 'border-status-warning bg-status-warning-surface text-status-warning-text ring-4 ring-status-warning/15'
                            : 'border-border bg-white text-muted-foreground hover:border-status-warning hover:bg-status-warning-surface'
                        }`}
                      >
                        <span className="text-caption font-extrabold uppercase leading-none">{weekdayFormatted}</span>
                        <span className="mt-0.5 text-caption font-bold leading-none">{formattedDate}</span>
                      </button>
                    )
                  })}
                </div>
                {productionZeroDate && productionZeroDate !== activeClosingDate && (
                  <p className="text-caption font-semibold leading-relaxed text-status-warning-text/70">
                    Data retroativa — o registro será salvo como lançamento histórico.
                  </p>
                )}
              </div>

              <div className="space-y-3" role="radiogroup" aria-label="Motivo da Produção Zero">
              {CHECKIN_ZERO_REASONS.map(reason => {
                const selected = productionZeroReason === reason
                return (
                  <button
                    key={reason}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setProductionZeroReason(reason)}
                    className={`flex min-h-12 w-full items-center justify-between rounded-xl border px-4 text-left text-sm font-extrabold uppercase tracking-wide transition-colors ${
                      selected
                        ? 'border-status-warning bg-status-warning-surface text-status-warning-text ring-4 ring-status-warning/15'
                        : 'border-border bg-white text-muted-foreground hover:border-status-warning hover:bg-status-warning-surface'
                    }`}
                  >
                    <span>{reason}</span>
                    <span className={`grid h-5 w-5 place-items-center rounded-full border-2 ${selected ? 'border-status-warning' : 'border-border'}`}>
                      {selected && <span className="h-2.5 w-2.5 rounded-full bg-status-warning" />}
                    </span>
                  </button>
                )
              })}
              </div>
            </div>

            <footer className="flex justify-end gap-2 border-t border-border bg-surface-alt px-5 py-4">
              <Button
                type="button"
                onClick={() => setProductionZeroModalOpen(false)}
                disabled={productionZeroSaving}
                className="h-10 rounded-xl border border-border bg-white px-4 text-xs font-bold text-muted-foreground hover:bg-surface-alt"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => void handleMarkProductionZero()}
                disabled={!productionZeroReason || !productionZeroDate || productionZeroSaving}
                className="h-10 rounded-xl bg-status-success px-4 text-xs font-bold text-white hover:bg-status-success disabled:cursor-not-allowed disabled:opacity-50"
              >
                {productionZeroSaving ? 'Salvando...' : 'Confirmar Produção Zero'}
              </Button>
            </footer>
          </div>
        </div>
      )}

      {historyOpen && activeView === 'form' && selectedRow && (
        <RegularizarFechamentoDrawer
          date={selectedRow.date}
          finalized={Boolean(selectedRow.finalized)}
          formValues={formValues}
          onFieldChange={handleFieldChange}
          saving={auditorLoading}
          onVoltar={() => setActiveView('list')}
          onClose={() => { setHistoryOpen(false); setActiveView('list') }}
          onSubmit={(crmValues) => void handleSubmitCorrection(crmValues)}
        />
      )}

      {/* MX-22.3 (§8.2): detalhe da regularização — cobre "Ver solicitação"
          (aguardando_aprovacao), "Ver versão original/aprovada/auditoria"
          (aprovado) e "Ver motivo da recusa" (recusado) num único painel de
          leitura, já que o spec não prescreve telas separadas por ação. */}
      {historyOpen && activeView === 'detail' && (
        <div
          className="fixed inset-0 z-[var(--mx-z-modal)] grid place-items-center bg-surface-overlay/35 px-4 backdrop-blur-[3px]"
          role="dialog"
          aria-modal="true"
          aria-label="Detalhe da regularização"
        >
          <div className="flex max-h-[80vh] w-full max-w-[min(32rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-mx-2xl">
            <header className="flex items-center justify-between border-b border-border bg-surface-alt px-6 py-5">
              <h2 className="text-lg font-extrabold uppercase tracking-tight text-mx-navy">Regularização</h2>
              <button
                type="button"
                onClick={() => { setActiveView('list'); setDetailRequest(null) }}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-alt"
                aria-label="Voltar"
              >
                <X size={18} />
              </button>
            </header>
            <div className="overflow-y-auto p-6 text-sm">
              {!detailRequest ? (
                <p className="text-muted-foreground">Nenhuma solicitação encontrada para esta data.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase text-muted-foreground">Status</span>
                    <p className="font-bold text-mx-navy">
                      {detailRequest.status === 'pending' && 'Em análise'}
                      {detailRequest.status === 'approved' && 'Aprovada'}
                      {detailRequest.status === 'rejected' && 'Recusada'}
                      {detailRequest.status === 'cancelled' && 'Cancelada'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase text-muted-foreground">Motivo</span>
                    <p className="text-mx-navy">{detailRequest.reason}</p>
                  </div>
                  {detailRequest.status === 'rejected' && detailRequest.rejection_reason && (
                    <div>
                      <span className="text-xs font-bold uppercase text-muted-foreground">Motivo da recusa</span>
                      <p className="text-mx-navy">{detailRequest.rejection_reason}</p>
                    </div>
                  )}
                  {detailRequest.delta && Object.keys(detailRequest.delta).length > 0 && (
                    <div>
                      <span className="text-xs font-bold uppercase text-muted-foreground">Versão original → solicitada (auditoria)</span>
                      <ul className="mt-1 flex flex-col gap-1">
                        {Object.entries(detailRequest.delta).map(([field, diff]) => (
                          <li key={field} className="flex justify-between rounded-lg bg-surface-alt px-3 py-1.5 text-xs">
                            <span className="font-bold text-muted-foreground">{field}</span>
                            <span className="text-mx-navy">{String(diff.original)} → {String(diff.solicitado)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {detailRequest.status === 'rejected' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveView('list')
                        const row = historyRows.find(r => r.date === selectedRow?.date)
                        if (row) handleSelectRow(row)
                      }}
                      className="mt-2 inline-flex h-9 items-center justify-center rounded-lg bg-status-success px-4 text-xs font-bold text-white shadow-sm transition-colors hover:bg-status-success"
                    >
                      Criar nova versão de regularização
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
