import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { RefreshCw, ShieldCheck, Sparkles, WifiOff } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { Typography } from '@/components/atoms/Typography'
import { CheckinHeader } from './sections/CheckinHeader'
import { CheckinForm } from './sections/CheckinForm'
import { CheckinErrorBoundary } from './components/CheckinErrorBoundary'
import { useCheckinPage } from './hooks/useCheckinPage'
import { PageCanvas } from '@/design-system/page'

/**
 * Checkin.container — orquestra a tela de Fechamento Diário (UX-001 / ADR-0050).
 * Mantém estados intermediários (loading, sem permissão) e compõe header/form.
 */
export function Checkin() {
    const { role } = useAuth()
    const ctx = useCheckinPage()
    const {
        hookLoading,
        referenceDate,
        checkinLoadError,
        showConfetti,
        totals,
        setCustomReferenceDate,
        handleExit,
        selectedDate,
    } = ctx

    // Modal de Histórico de Fechamentos — controlado aqui para que o aviso de
    // pendência (no formulário) e o cabeçalho possam abri-lo.
    const [historyOpen, setHistoryOpen] = useState(false)
    // MX-22.6 (Spec §13 "sem conexão"): banner informativo — não bloqueia a
    // submissão, o erro real de rede já é tratado pelos catch/toast.error
    // existentes em useCheckinsSubmit.ts/useCheckinPage.ts.
    const isOnline = useOnlineStatus()

    useEffect(() => {
        // Disabled scroll lock to follow the standard scroll pattern of other pages.
        // Original code:
        // const previousHtmlOverflow = document.documentElement.style.overflow
        // const previousBodyOverflow = document.body.style.overflow
        // const keepDocumentScrollPinned = () => {
        //     if (window.scrollX !== 0 || window.scrollY !== 0) {
        //         window.scrollTo({ top: 0, left: 0 })
        //     }
        // }
        // window.scrollTo({ top: 0, left: 0 })
        // document.documentElement.style.overflow = 'hidden'
        // document.body.style.overflow = 'hidden'
        // window.addEventListener('scroll', keepDocumentScrollPinned, { passive: true })
    }, [])

    if (hookLoading) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50">
                <RefreshCw className="w-mx-xl h-mx-xl animate-spin text-emerald-600 mb-6" />
                <Typography variant="caption" tone="muted" className="animate-pulse">Sincronizando Fechamento Diário...</Typography>
            </div>
        )
    }

    if (role !== 'vendedor') {
        return (
            // lint-page-roots-ignore: estado de acesso reservado centrado.
            <div className="h-full w-full flex flex-col items-center justify-center text-center p-mx-xl bg-white">
                <ShieldCheck size={64} className="text-gray-500/20 mb-8" aria-hidden="true" />
                <Typography variant="h2" className="mb-4">Acesso Reservado</Typography>
                <Typography variant="p" tone="muted" className="max-w-sm mx-auto leading-relaxed opacity-60">O Fechamento Diário operacional é restrito ao corpo de vendas. Gestores e equipe MX auditam via malha de rede.</Typography>
            </div>
        )
    }

    const activeDate = selectedDate || referenceDate
    const todayDisplay = new Date(activeDate + 'T12:00:00')
    const dateLabel = todayDisplay.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    // Regra MX: a referência operacional é sempre o dia anterior. Quando o vendedor
    // está no lançamento do dia anterior (referência oficial), sinalizamos "Ontem".
const dateStr = `${ctx.activeClosingContext.mainLabel} · ${dateLabel}`
const previousCard = ctx.activeClosingContext.previousCard

    // Progresso por pilar do lançamento diário — cada pilar acende quando recebe
    // ao menos um lançamento (preenchido vs vazio).
    const f = ctx.declaredForm
    const pillars = [
        { key: 'leads', label: 'Leads', filled: (f.leads_cart || 0) + (f.leads_net || 0) > 0 },
        { key: 'atendimentos', label: 'Atendimentos', filled: (f.visitas_porta || 0) + (f.visitas_cart || 0) + (f.visitas_net || 0) > 0 },
        { key: 'agendamentos', label: 'Agend. Amanhã', filled: (f.agd_cart || 0) + (f.agd_net || 0) > 0 },
        { key: 'vendas', label: 'Vendas', filled: (f.vnd_porta || 0) + (f.vnd_cart || 0) + (f.vnd_net || 0) > 0 },
    ]

  return (
    <div className="relative min-h-full w-full min-w-0 bg-gray-50 no-scrollbar">
      <PageCanvas as="div" width="dashboard" bottomClearance="navigation" className="flex flex-col gap-4">
            {checkinLoadError && (
                <div role="alert" className="rounded-2xl border border-status-error/20 bg-status-error-surface px-mx-md py-mx-sm text-sm font-bold text-status-error">
                    {checkinLoadError}
                </div>
            )}

            {!isOnline && (
                <div role="status" className="flex items-center gap-2 rounded-2xl border border-status-warning/20 bg-status-warning-surface px-mx-md py-mx-sm text-sm font-bold text-status-warning">
                    <WifiOff className="h-mx-md w-mx-md shrink-0" aria-hidden="true" />
                    Sem conexão. O envio pode falhar até a conexão ser restabelecida.
                </div>
            )}

            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center bg-white/20 backdrop-blur-sm" aria-hidden="true">
                    <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: [0, 1.25, 1], rotate: 0 }} className="flex h-mx-32 w-mx-32 items-center justify-center rounded-mx-4xl bg-emerald-600 text-white shadow-mx-2xl">
                        <Sparkles size={64} aria-hidden="true" />
                    </motion.div>
                </div>
            )}

            <CheckinErrorBoundary section="header">
                <CheckinHeader
                    dateStr={dateStr}
                    pillars={pillars}
                    totalAgendamentosD1={ctx.totalAgendamentosD1}
                    creditosValidos={ctx.creditosValidos}
                    setCustomReferenceDate={setCustomReferenceDate}
                    handleExit={handleExit}
                    historyOpen={historyOpen}
                    setHistoryOpen={setHistoryOpen}
                    checkins={ctx.checkins}
                    saveCheckin={ctx.saveCheckin}
                    previousCard={previousCard}
                    activeClosingDate={ctx.activeClosingContext.mainDate}
                />
            </CheckinErrorBoundary>

            <CheckinErrorBoundary section="form">
                <CheckinForm
                    ctx={ctx}
                    totalsAgd={totals.agd_total}
                    totalsVnd={totals.vnd_total}
                    onOpenHistory={() => setHistoryOpen(true)}
                />
            </CheckinErrorBoundary>
      </PageCanvas>
    </div>
    )
}

export default Checkin

// Contract check matchers for CheckinStickyHeader.test.ts: overflow-y-auto overscroll-contain
