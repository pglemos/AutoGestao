import { useState, useMemo, useRef, useEffect } from 'react'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  DollarSign,
  Globe,
  LockKeyhole,
  Minus,
  Plus,
  RefreshCw,
  Save,
  Store,
  Users,
  HelpCircle,
  Award,
  Clock,
  Check,
  X,
  AlertCircle,
  Info,
  History,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'
import { CHECKIN_MAX_INPUT_VALUE } from '@/hooks/useCheckins'
import { CheckinValidationBanner } from './CheckinValidationBanner'
import { CheckinSuccessSection } from './CheckinSuccessSection'
import { CheckinCrmSection } from './CheckinCrmSection'
import { FluxoFechamento } from './FluxoFechamento'
import { CheckinAutosaveStatus } from '../autosave/CheckinAutosaveStatus'
import type { CheckinPageContext, NumericCheckinField } from '../hooks/useCheckinPage'
import { shouldConfirmBeforeFinalizar } from '../lib/confirm-finalize'
import { addDaysDateOnly } from '../lib/crm-derived-totals'

interface CheckinFormProps {
  ctx: CheckinPageContext
  totalsAgd: number
  totalsVnd: number
  onOpenHistory?: () => void
}

const BRL = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

// Interactive Tooltip Component
export function InfoTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!visible) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setVisible(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [visible])

  const updateCoords = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setCoords({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      })
    }
  }

  useEffect(() => {
    if (visible) {
      updateCoords()
      window.addEventListener('resize', updateCoords)
      window.addEventListener('scroll', updateCoords, { capture: true })
      return () => {
        window.removeEventListener('resize', updateCoords)
        window.removeEventListener('scroll', updateCoords, { capture: true })
      }
    }
  }, [visible])

  return (
    <div ref={ref} className="relative inline-block ml-1.5 align-middle">
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible(!visible)}
        onBlur={() => setVisible(false)}
        className="text-muted-foreground/50 hover:text-status-success-text transition-colors focus:outline-none"
        aria-label="Informação adicional"
      >
        <HelpCircle size={14} className="stroke-[2.5]" />
      </button>
      {visible && (
        <div
          className="fixed z-[9999] w-64 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-white p-3 text-[12px] font-medium leading-relaxed text-muted-foreground shadow-lg pointer-events-none transition-all"
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
          }}
        >
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white" />
          {text}
        </div>
      )}
    </div>
  )
}

export function CheckinForm({ ctx, totalsAgd, totalsVnd, onOpenHistory }: CheckinFormProps) {
  const [disciplineModalOpen, setDisciplineModalOpen] = useState(false)
  const [confirmFinalizeModalOpen, setConfirmFinalizeModalOpen] = useState(false)
  const {
    form,
    saving,
    metricScope,
    fieldErrors,
    numberDrafts,
    changedFields,
    funnelError,
    inputError,
    minutesUntilEditLock,
    hasCrmActivity,
    saveNotice,
    mandatoryFeedbackActionsCount,
    navigate,
    updateField,
    updateNumberField,
    commitNumberField,
        submitCheckin,
    handleSaveDraft,
    crmDerived,
    historicalCheckin,
    isLate,
    // Added Props
    clientesList,
    fechamentoLiberado,
    finalizadoAposPrazo,
    isPastDeadline,
    lockStage,
  disciplinePercent,
  completedItems,
  pendingItems,
  fechamentoConcluido,
  temAgendamentoDataDiferente,
    realSalesCount,
    realFaturamento,
    totalAgendamentosD1,
    creditosValidos,
    creditosCarteira,
    creditosInternet,
        customReferenceDate,
        declaredForm,
        declaredProgressTotals,
        activeClosingContext,
        autosaveState,
        autosaveEnabled,
        retryAutosave,
        closingStep,
        setClosingStep,
    } = ctx

    const selectedDate = ctx.selectedDate || customReferenceDate || ctx.referenceDate
    const mainDateLabel = selectedDate.split('-').reverse().join('/')
    const resumoTitle = activeClosingContext.mainLabel === 'Hoje' ? 'RESUMO DE HOJE' : 'RESUMO DO FECHAMENTO ANTERIOR'
    const detalhesD1Concluidos = totalAgendamentosD1 <= 0 || creditosValidos >= totalAgendamentosD1
    const hasIncompleteD1 = shouldConfirmBeforeFinalizar({ totalAgendamentosD1, creditosValidos })

    const readValue = (field: NumericCheckinField) =>
        Number(declaredForm[field] ?? form[field] ?? 0)

    const display = declaredProgressTotals

  const showCrmBadge = !historicalCheckin && crmDerived.hasCrmData

  const showDiscreetPendingBanner = false

const counterProps = {
form,
fieldErrors,
numberDrafts,
    changedFields,
    updateField,
    updateNumberField,
    commitNumberField,
    readValue,
disabled: fechamentoConcluido,
}

  // Visual messages for discipline card
  const disciplineMessage = useMemo(() => {
    if (fechamentoConcluido) {
      return 'Fechamento concluído. Envio realizado com sucesso — as informações foram enviadas para sua liderança.'
    }
    if (finalizadoAposPrazo) {
      return 'Fechamento realizado fora do prazo. Penalização de 10% aplicada.'
    }
    if (disciplinePercent < 70) {
      return 'Preencha os números do fechamento para iniciar a pontuação.'
    }
    if (disciplinePercent === 70) {
      return 'Você informou apenas as quantidades. Cadastre os agendamentos para amanhã para ganhar até +30%.'
    }
    if (disciplinePercent > 70 && disciplinePercent < 100) {
      if (temAgendamentoDataDiferente) {
        return 'Existe agendamento com data diferente de amanhã. A pontuação foi ajustada.'
      }
      return 'Você cadastrou parte dos agendamentos para amanhã. Complete os cadastros para alcançar 100%.'
    }
    if (disciplinePercent === 100) {
      return 'Fechamento completo. Todos os agendamentos para amanhã foram detalhados corretamente.'
    }
    return ''
  }, [disciplinePercent, fechamentoConcluido, fechamentoLiberado, finalizadoAposPrazo, isPastDeadline, temAgendamentoDataDiferente])

    const onFormSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (fechamentoConcluido || saving) return
        setConfirmFinalizeModalOpen(true)
    }

    // Confirmar etapa deixa de ser só navegação: os inputs pendentes são
    // commitados e o rascunho vai para o servidor na hora.
    const handleStepConfirmed = () => {
        Object.keys(numberDrafts).forEach(field => commitNumberField(field as NumericCheckinField))
        void handleSaveDraft()
    }

const handleFinalizarMesmoAssim = () => {
    setConfirmFinalizeModalOpen(false)
    void submitCheckin()
  }

  // Bloqueio de horário desativado por decisão do produto (09/07/2026): o
  // vendedor pode enviar/editar o fechamento diário a qualquer horário, em
  // qualquer dia. isPastDeadline/isLate seguem calculados (dia operacional
  // correto, texto informativo), mas não bloqueiam mais nada aqui. A única
  // trava real que resta é fechamentoConcluido — depois de finalizado, só
  // dá pra ajustar via Histórico/Regularização.
  const submitBlockedByDeadline = false
  const editLockedWithoutLiberacao = false

return (
<form onSubmit={onFormSubmit} className="mt-mx-xs grid w-full min-w-0 grid-cols-[minmax(0,1fr)] gap-mx-sm pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-16">
{/* Aviso discreto (após 12h01, sem liberação — Especificação Funcional §3.3) */}
      {showDiscreetPendingBanner && (
        <div className="hidden items-center gap-3 rounded-xl border border-status-warning/30 bg-status-warning-surface px-4 py-3 sm:flex">
          <AlertTriangle size={16} className="shrink-0 text-[#F59E0B]" />
          <p className="text-body-sm font-medium text-[#92400E]">
            Existe um fechamento anterior pendente.{' '}
            <button type="button" onClick={onOpenHistory} className="font-semibold underline transition-colors hover:text-status-warning-text">
              Acesse o Histórico de Fechamentos
            </button>{' '}
            para regularizar.
          </p>
        </div>
      )}

      {(funnelError || inputError) && (
        <CheckinValidationBanner
          metricScope={metricScope}
          minutesUntilEditLock={minutesUntilEditLock}
          funnelError={funnelError}
          inputError={inputError}
        />
      )}

      {hasCrmActivity && (
        <div className="flex items-start gap-3 rounded-xl border border-status-info/30 bg-status-info-surface px-4 py-3" role="status">
          <Info size={16} className="mt-0.5 shrink-0 text-status-info-text" aria-hidden="true" />
          <p className="text-body-sm font-semibold text-status-info-text">
            O CRM registra atividade acima do declarado. O fechamento salvará exatamente os números informados por você; a divergência ficará disponível para conferência da liderança.
          </p>
        </div>
      )}

      {/* Estado do rascunho sempre visível. Sticky para acompanhar o scroll de
          uma tela longa — sem isto, o vendedor rola para preencher e perde de
          vista se o que digitou já chegou ao servidor. */}
      <div className="sticky top-2 z-20 -mx-1 px-1">
        <CheckinAutosaveStatus
          state={autosaveState}
          finalizado={fechamentoConcluido}
          saving={saving}
          disabled={!autosaveEnabled && fechamentoConcluido}
          onSaveNow={() => void handleSaveDraft()}
          onRetry={() => void retryAutosave()}
        />
      </div>

      {/* Fluxo único em todos os breakpoints: Showroom → Carteira → Internet →
          Vendas. Antes existia um bloco exclusivo de mobile que começava por
          Internet — mesma tela, ordem e regra diferentes por dispositivo. */}
      <section className="w-full max-w-full min-w-0 scroll-mt-6">
        <FluxoFechamento
          readValue={readValue}
          updateField={updateField}
 disabled={fechamentoConcluido}
 finalized={fechamentoConcluido}
          agdCartAtivos={creditosCarteira}
          agdNetAtivos={creditosInternet}
          temClientesCadastrados={clientesList.length > 0}
          onStepConfirmed={handleStepConfirmed}
          currentStep={closingStep}
          onStepChange={setClosingStep}
        />
      </section>



      <section className="grid w-full min-w-0 grid-cols-1 gap-mx-md">
        <div className="space-y-mx-md">
          <CheckinCrmSection ctx={ctx} allowInlineQuickEdit={false} />

          {mandatoryFeedbackActionsCount > 0 && metricScope === 'daily' && (
            <Card className="border border-status-error/20 bg-status-error-surface p-mx-md">
              <div className="flex items-start gap-mx-sm">
                <AlertTriangle size={22} className="mt-1 shrink-0 text-status-error-text" />
                <div>
                  <Typography variant="h3" className="text-status-error-text">
                    Ação obrigatória do gestor
                  </Typography>
                  <Typography variant="p" className="mt-mx-xs text-sm font-semibold text-status-error-text">
                    Conclua a ação na Central ou registre uma justificativa antes de finalizar o fechamento.
                  </Typography>
                </div>
              </div>
            </Card>
          )}

          <CheckinSuccessSection saveNotice={saveNotice} onHome={() => navigate('/home')} />
        </div>
      </section>

      {/* Symmetric dashboard blocks: Resumo + Disciplina */}
<section className="grid w-full max-w-full min-w-0 scroll-mt-6 gap-5 md:scroll-mt-48 xl:grid-cols-2">
        {/* ── RESUMO DO DIA ANTERIOR ── */}
        <div className="rounded-2xl border border-[#dfe7f0] bg-white px-4 py-5 shadow-mx-lg flex flex-col justify-between gap-4 sm:px-6">
<p className="text-[12px] font-extrabold uppercase tracking-widest text-[#334155]">{resumoTitle}</p>

          {/* 4 metrics: 2x2 grid on mobile, single row with dividers from sm+ */}
          <div className="grid grid-cols-2 gap-y-4 sm:flex sm:items-stretch sm:gap-y-0 sm:divide-x sm:divide-[#DFE0E1]">
            <div className="flex flex-col items-center gap-1 px-2 sm:flex-1 sm:px-4 sm:first:pl-0">
              <span className="text-h2 font-bold leading-none tabular-nums text-status-info-text">{display.leads}</span>
              <span className="mt-1 text-caption font-semibold text-[#526B7A] text-center leading-tight">Leads Recebidos</span>
            </div>
            <div className="flex flex-col items-center gap-1 px-2 sm:flex-1 sm:px-4">
              <span className="text-h2 font-bold leading-none tabular-nums text-status-info-text">{display.visitas}</span>
              <span className="mt-1 text-caption font-semibold text-[#526B7A] text-center leading-tight">Atendimentos</span>
            </div>
            <div className="flex flex-col items-center gap-1 px-2 sm:flex-1 sm:px-4">
              <span className="text-h2 font-bold leading-none tabular-nums text-[#F59E0B]">{display.agd}</span>
              <span className="mt-1 text-caption font-semibold text-[#526B7A] text-center leading-tight">Agendamentos D+1</span>
            </div>
            <div className="flex flex-col items-center gap-1 px-2 sm:flex-1 sm:px-4 sm:last:pr-0">
              <span className="text-h2 font-bold leading-none tabular-nums text-[#EF4343]">{realSalesCount}</span>
              <span className="mt-1 text-caption font-semibold text-[#526B7A] text-center leading-tight">Vendas Realizadas</span>
            </div>
          </div>

          {/* Faturamento bar */}
          <div className="flex items-center justify-between border-t border-[#DFE0E1] pt-3">
            <span className="text-caption font-extrabold uppercase tracking-widest text-[#526B7A]">FATURAMENTO</span>
            <span className="text-h3 font-bold tabular-nums text-[#22C55E]">{BRL(realFaturamento)}</span>
          </div>
        </div>

        {/* ── DISCIPLINA – FECHAMENTO DIÁRIO ── */}
        {(() => {
          const pontosExtras = totalAgendamentosD1 > 0
            ? Math.round((creditosValidos / totalAgendamentosD1) * 30)
            : 30
          // Escala de cores da Disciplina (Especificação Funcional §18):
          // 0-39% vermelho, 40-69% laranja, 70-89% azul, 90-100% verde.
          const arcColor =
            disciplinePercent >= 90 ? '#22C55E' : disciplinePercent >= 70 ? '#3B82F6' : disciplinePercent >= 40 ? '#F97316' : '#EF4444'
          const trackColor = '#F7F8F8'
          const arcDeg = Math.round(disciplinePercent * 3.6)
          return (
            <div className="rounded-2xl border border-[#dfe7f0] bg-white px-6 py-5 shadow-mx-lg flex items-center gap-5">
              {/* Thick donut ring — matches reference proportions */}
              <div
                className="relative shrink-0 rounded-full"
                style={{
                  width: 96,
                  height: 96,
                  background: `conic-gradient(${arcColor} ${arcDeg}deg, ${trackColor} 0deg)`,
                }}
              >
                {/* Inner white circle (ring thickness = 11px) */}
                <div
                  className="absolute rounded-full bg-white flex flex-col items-center justify-center"
                  style={{ inset: 11 }}
                >
                  <span className="text-h3 font-bold leading-none tabular-nums text-[#071822]">
                    {disciplinePercent}%
                  </span>
                </div>
              </div>

              {/* Text column */}
              <div className="flex flex-1 min-w-0 flex-col gap-2">
                <p className="text-caption font-extrabold uppercase tracking-widest text-[#526B7A]">
                  DISCIPLINA – FECHAMENTO DIÁRIO
                </p>

                {disciplineMessage && (
                  <p className="text-[12px] font-medium text-[#526B7A] leading-snug">
                    {disciplineMessage}
                  </p>
                )}

                <p className="text-caption font-medium text-[#526B7A]">
                  70% base + {pontosExtras}% detalhamento
                </p>

                <button
                  type="button"
                  className="flex w-fit cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-[12px] font-semibold text-status-info-text transition-colors hover:underline"
                  onClick={() => setDisciplineModalOpen(true)}
                >
                  Saiba mais
                  <Info size={13} className="shrink-0" />
                </button>
              </div>
            </div>
          )
        })()}
      </section>

      {disciplineModalOpen && (
<div className="fixed inset-0 z-[140] grid place-items-center bg-surface-overlay/35 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] backdrop-blur-[3px]">
<div className="flex max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-[min(620px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#DFE0E1] bg-white shadow-mx-2xl transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* Fixed Header */}
            <header className="px-6 py-5 border-b border-[#DFE0E1] flex items-center justify-between bg-[#F7F8F8]">
              <div>
                <h2 className="text-lg font-extrabold text-[#071822] uppercase tracking-tight">
                  ENTENDA SUA PONTUAÇÃO DE DISCIPLINA
                </h2>
                <p className="text-xs font-semibold text-[#526B7A] mt-1">
                  A pontuação do Fechamento Diário mede o quanto você manteve sua rotina comercial organizada no dia.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDisciplineModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-[#526B7A] hover:bg-[#F7F8F8] transition-colors"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </header>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs leading-relaxed text-[#526B7A]">
              
              {/* SECTION 1: Fechamento básico — 70% */}
              <div className="space-y-2">
                <h3 className="font-extrabold text-status-info-text flex items-center gap-1.5 uppercase tracking-wider text-caption">
                  <Check size={14} className="stroke-[3]" /> 1. Fechamento básico — 70%
                </h3>
                <p>
                  Você garante 70% da pontuação quando informa as quantidades do dia:
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Leads recebidos;</li>
                  <li>Atendimentos realizados;</li>
                  <li>Agendamentos para amanhã;</li>
                  <li>E finaliza o fechamento do dia.</li>
                </ul>
                <p>
                  Ou seja: se você preencher apenas os números e finalizar o fechamento, sua disciplina será de 70%.
                </p>
                <div className="bg-status-info-surface text-status-info-text font-bold p-2.5 rounded-lg border border-status-info/30 flex items-center gap-2">
                  <Info size={14} />
                  <span>Preencheu os números do dia = 70%</span>
                </div>
              </div>

              {/* SECTION 2: Cadastro dos agendamentos — até +30% */}
              <div className="space-y-2">
                <h3 className="font-extrabold text-[#22C55E] flex items-center gap-1.5 uppercase tracking-wider text-caption">
                  <Award size={14} className="stroke-[2.5]" /> 2. Cadastro dos agendamentos — até +30%
                </h3>
                <p>
                  Os outros 30% são conquistados quando você detalha, no campo “Cadastrar Novo Cliente”, os agendamentos que informou no card “Agendamento para Amanhã”.
                </p>
                <p className="font-semibold text-[#071822]">
                  Exemplo:
                </p>
                <p>
                  Se você informou no card “Agendamento para Amanhã”:
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Carteira: 1 agendamento</li>
                  <li>Internet: 1 agendamento</li>
                </ul>
                <p>
                  Total: 2 agendamentos para amanhã. Então você precisa cadastrar 2 clientes no card “Cadastrar Novo Cliente”, sendo:
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>1 cliente do canal Carteira;</li>
                  <li>1 cliente do canal Internet.</li>
                </ul>
                <p>
                  Se cadastrar corretamente os 2 clientes, sua pontuação será 100%. Se cadastrar apenas 1 dos 2 clientes, sua pontuação será 85%.
                </p>
                <div className="bg-brand-primary-subtle text-brand-primary-active font-bold p-2.5 rounded-lg border border-brand-primary/30 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#22C55E]" />
                  <span>Detalhou todos os agendamentos para amanhã corretamente = 100%</span>
                </div>
              </div>

              {/* SECTION 3: Quando um cadastro conta como agendamento? */}
              <div className="space-y-2">
                <h3 className="font-extrabold text-status-info-text flex items-center gap-1.5 uppercase tracking-wider text-caption">
                  <HelpCircle size={14} /> 3. Quando um cadastro conta como agendamento?
                </h3>
                <p>
                  Para o cadastro contar na pontuação extra, ele precisa cumprir estas regras:
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>O canal deve ser Carteira ou Internet;</li>
                  <li>O campo “Venda Realizada” deve estar como “Em Negociação”;</li>
                  <li>A data do agendamento deve ser para o dia seguinte ao fechamento, ou seja, para amanhã.</li>
                </ul>
                <p className="font-semibold text-[#071822]">
                  Exemplo:
                </p>
                <p>
                  Se o fechamento é do dia 22/05, o agendamento deve estar marcado para 23/05.
                </p>
                <div className="bg-[#FFF7E6] text-[#d97706] font-bold p-2.5 rounded-lg border border-[#fed7aa] flex items-center gap-2">
                  <AlertCircle size={14} className="text-[#d97706]" />
                  <span>Para contar como agendamento, a venda deve estar como Em Negociação.</span>
                </div>
              </div>

              {/* SECTION 4: Atenção à data do agendamento */}
              <div className="space-y-2">
                <h3 className="font-extrabold text-[#F59E0B] flex items-center gap-1.5 uppercase tracking-wider text-caption">
                  <Clock size={14} /> 4. Atenção à data do agendamento
                </h3>
                <p>
                  Todo agendamento informado no card “Agendamento para Amanhã” deve ser cadastrado com data para o dia seguinte.
                </p>
                <p>
                  Se a data cadastrada for diferente de amanhã, o sistema considera apenas 50% daquele cadastro para a pontuação extra.
                </p>
                <p className="font-semibold text-[#071822]">
                  Exemplo:
                </p>
                <p>
                  Você informou 3 agendamentos para amanhã. Depois cadastrou:
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>2 clientes com data correta para amanhã;</li>
                  <li>1 cliente com data diferente.</li>
                </ul>
                <p>
                  Neste caso, sua pontuação será ajustada e ficará em 95%.
                </p>
                <div className="bg-status-error-surface text-status-error-text font-bold p-2.5 rounded-lg border border-status-error/30 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-status-error-text" />
                  <span>Agendamento com data diferente de amanhã vale apenas 50% na pontuação extra.</span>
                </div>
              </div>

              {/* SECTION 5: Venda não é agendamento */}
              <div className="space-y-2">
                <h3 className="font-extrabold text-[#22C55E] flex items-center gap-1.5 uppercase tracking-wider text-caption">
                  <DollarSign size={14} /> 5. Venda não é agendamento
                </h3>
                <p>
                  Se no cadastro do cliente você marcar: <strong className="text-[#071822]">“Venda Realizada = Sim”</strong>
                </p>
                <p>
                  O sistema entende que foi uma venda. Esse registro vai contar para:
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Vendas realizadas;</li>
                  <li>Faturamento;</li>
                  <li>Funil de vendas.</li>
                </ul>
                <p>
                  Mas ele não conta como agendamento para amanhã. Para contar como agendamento, o campo deve estar como: <strong className="text-[#071822]">“Venda Realizada = Em Negociação”</strong>.
                </p>
                <div className="bg-status-info-surface text-status-info-text font-bold p-2.5 rounded-lg border border-status-info/30 flex items-center gap-2">
                  <Info size={14} />
                  <span>Venda Realizada = Sim conta como venda, não como agendamento.</span>
                </div>
              </div>

              {/* SECTION 6: Data operacional */}
              <div className="space-y-2">
                <h3 className="font-extrabold text-[#64748B] flex items-center gap-1.5 uppercase tracking-wider text-caption">
                  <Clock size={14} /> 6. Data operacional
                </h3>
                <p>
                  Antes de 12h, conclua primeiro o fechamento anterior. Assim que ele for finalizado, o fechamento de hoje será liberado imediatamente.
                </p>
                <p>
                  Depois de 12h, o dia atual fica disponível e qualquer pendência anterior segue para o Histórico. Nesta fase, o horário não bloqueia o envio.
                </p>
                <div className="bg-[#F7F8F8] text-[#526B7A] font-bold p-2.5 rounded-lg border border-[#DFE0E1] flex items-center gap-2">
                  <LockKeyhole size={14} />
                  <span>Fechamento concluído é imutável; correções são solicitadas pelo Histórico.</span>
                </div>
              </div>

              {/* SECTION 7: Resumo rápido */}
              <div className="space-y-2 bg-[#F7F8F8] p-4 rounded-xl border border-[#DFE0E1]">
                <h3 className="font-extrabold text-status-info-text uppercase tracking-wider text-caption">
                  7. Resumo rápido
                </h3>
                <ul className="space-y-1.5 font-semibold text-[#071822]">
                  <li className="flex items-center gap-1.5"><Check size={12} className="text-[#22C55E] stroke-[3]" /> Preencheu os números do dia: 70%</li>
                  <li className="flex items-center gap-1.5"><Check size={12} className="text-[#22C55E] stroke-[3]" /> Detalhou todos os agendamentos para amanhã corretamente: 100%</li>
                  <li className="flex items-center gap-1.5"><Check size={12} className="text-[#22C55E] stroke-[3]" /> Detalhou apenas parte dos agendamentos: pontuação proporcional</li>
                  <li className="flex items-center gap-1.5"><Check size={12} className="text-[#22C55E] stroke-[3]" /> Cadastrou com data diferente de amanhã: aquele cadastro vale apenas 50%</li>
                  <li className="flex items-center gap-1.5"><Check size={12} className="text-[#22C55E] stroke-[3]" /> Cliente vendido conta como venda, não como agendamento</li>
                  <li className="flex items-center gap-1.5"><Check size={12} className="text-[#22C55E] stroke-[3]" /> D-1 concluído libera D0 imediatamente; pendências antigas seguem para o Histórico</li>
                </ul>
                <p className="italic text-[#475569] mt-3">
                  “Essa regra existe para manter seu funil atualizado e ajudar você, sua liderança e a loja a acompanharem melhor as oportunidades reais de venda.”
                </p>
              </div>
            </div>

            {/* Fixed Footer */}
            <footer className="px-6 py-4 border-t border-[#DFE0E1] flex justify-end bg-[#F7F8F8]">
              <button
                type="button"
                onClick={() => setDisciplineModalOpen(false)}
                className="h-10 px-6 font-bold bg-[#00A89D] hover:bg-[#00A89D] text-white rounded-xl shadow-sm transition-colors"
              >
                Entendi
              </button>
            </footer>
          </div>
        </div>
      )}

{confirmFinalizeModalOpen && (
<div className="fixed inset-0 z-[140] grid place-items-center bg-surface-overlay/35 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] backdrop-blur-[3px]">
<div role="dialog" aria-modal="true" aria-labelledby="checkin-finalize-title" aria-describedby="checkin-finalize-description" className="flex max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-[min(460px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#DFE0E1] bg-white shadow-mx-2xl transition-all animate-in fade-in zoom-in-95 duration-200">
<header className="border-b border-[#DFE0E1] bg-white px-6 py-5">
<h2 id="checkin-finalize-title" className="text-h5 font-bold leading-snug tracking-tight text-[#0F172A]">
Confirma que não haverá mais registros {activeClosingContext.mainLabel}?
</h2>
</header>
<div id="checkin-finalize-description" className="space-y-3 px-6 py-5 text-body-sm leading-relaxed text-[#64748B]">
<p>
Ao concluir, leads, atendimentos, vendas e demais informações referentes ao dia{' '}
<strong className="text-[#0F172A]">{mainDateLabel}</strong> serão encerrados e não poderão mais ser alterados.
</p>
<p>
Novos registros comerciais continuam disponíveis 24 horas. Para corrigir números deste fechamento após a conclusão, use o Histórico.
</p>
{hasIncompleteD1 && (
<div className="rounded-xl border border-status-warning/30 bg-status-warning-surface px-4 py-3 text-[12px] font-semibold text-status-warning-text">
Você informou {totalAgendamentosD1} Agendamentos D+1 e detalhou {creditosValidos}. A pontuação será calculada apenas com os agendamentos detalhados.
</div>
)}
</div>
<div className="hidden">
              <p>
 Ao concluir, leads, atendimentos, vendas e demais informações referentes ao dia{' '}
                <strong className="text-[#071822]">{creditosValidos}</strong>. O fechamento poderá ser finalizado normalmente, porém sua pontuação de disciplina será calculada apenas com os agendamentos detalhados.
              </p>
              <ul className="space-y-1.5 font-semibold text-[#071822] bg-[#F7F8F8] rounded-xl border border-[#DFE0E1] p-4">
                <li>Agendamentos D+1 informados: {totalAgendamentosD1}</li>
                <li>Agendamentos D+1 detalhados: {creditosValidos}</li>
                <li>Pontuação estimada de disciplina: {disciplinePercent}%</li>
              </ul>
            </div>
 <footer className="flex items-center justify-end gap-3 border-t border-border-subtle px-6 py-4">
              <button
                type="button"
 onClick={() => setConfirmFinalizeModalOpen(false)}
 className="rounded-xl border border-[#E5E7EB] px-5 py-2.5 text-body-sm font-semibold text-[#64748B] transition-colors hover:bg-slate-50"
              >
 Não, voltar
              </button>
              <button
                type="button"
 onClick={handleFinalizarMesmoAssim}
disabled={saving}
className="rounded-xl bg-[#22C55E] px-6 py-2.5 text-body-sm font-bold text-white shadow-sm shadow-green-100 transition-colors hover:bg-brand-primary disabled:opacity-50"
              >
 Sim, concluir
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Finalizar Fechamento */}
      <div className="min-w-0 rounded-2xl border border-[#dfe7f0] bg-white px-6 py-5 shadow-mx-lg mt-5 space-y-4">
        {isPastDeadline && !fechamentoConcluido && (
          <div className="rounded-xl border border-status-warning/30 bg-status-warning-surface p-4 shadow-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-status-warning-text" />
              <div className="flex-1">
                <Typography variant="p" className="text-sm font-bold text-status-warning-text">
                  Este fechamento está pendente, mas continua disponível para envio sem liberação de gerente. Após concluir, qualquer correção deverá ser solicitada pelo Histórico.
                </Typography>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:gap-6">
          {/* Green pill button */}
          <button
            type="submit"
 disabled={saving || submitBlockedByDeadline || editLockedWithoutLiberacao || fechamentoConcluido}
          className={cn(
            "inline-flex w-full shrink-0 items-center justify-center gap-2.5 rounded-full px-6 py-3.5 text-center text-[12px] font-extrabold uppercase tracking-[0.06em] text-white shadow-[0_8px_20px_rgba(22,163,74,0.28)] transition-all sm:w-auto sm:px-8 sm:text-body-sm sm:tracking-[0.08em]",
saving || submitBlockedByDeadline || editLockedWithoutLiberacao || fechamentoConcluido
              ? "bg-[#526B7A] cursor-not-allowed shadow-none"
              : "bg-[#00A89D] hover:bg-[#00A89D] active:scale-[0.98]"
          )}
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <LockKeyhole size={15} className="shrink-0" />
            )}
 <span>{saving ? 'Salvando...' : fechamentoConcluido ? 'FECHAMENTO CONCLUÍDO' : submitBlockedByDeadline ? 'AGUARDANDO LIBERAÇÃO DO GERENTE' : 'FINALIZAR FECHAMENTO DO DIA'}</span>
          </button>

          {/* Warning text */}
          <p className="text-body-sm font-semibold text-[#526B7A] leading-snug">
            {fechamentoConcluido ? (
              'Este fechamento já foi enviado. Para ajustes, use o histórico e solicite correção.'
            ) : (
              <>
                Após finalizar, as informações serão enviadas para sua liderança e{' '}
                <strong className="font-extrabold text-[#071822]">não poderão mais ser editadas.</strong>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Desktop: botão vive dentro do header (SellerPageHeader actions). Mobile: sem header de topo, mantém aqui. */}
      {onOpenHistory && (
        <div className="flex justify-end md:hidden">
          <button
            type="button"
            onClick={onOpenHistory}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-white px-4 text-body-sm font-semibold text-muted-foreground shadow-sm transition-colors hover:border-[#005BFF] hover:text-status-info-text"
          >
            <History size={15} aria-hidden="true" />
            Histórico de Fechamentos
          </button>
        </div>
      )}
    </form>
  )
}

function MetricGroupCard({
  title,
  columns,
  children,
  tooltipText,
}: {
  title: string
  columns: string
  children: ReactNode
  tooltipText?: string
}) {
  const [step, ...labelParts] = title.split('. ')
  const label = labelParts.join('. ') || title
  const stepTone =
    step === '1'
      ? 'bg-[#22C55E]'
      : step === '2'
        ? 'bg-[#F59E0B]'
        : 'bg-[#005BFF]'

  return (
    <Card className="min-w-0 overflow-hidden rounded-mx-2xl border border-[#dfe7f0] bg-white p-0 shadow-mx-lg">
      <header className="flex min-h-12 items-start gap-2 border-b border-[#DFE0E1] px-4 py-3 sm:items-center sm:px-5">
        <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-caption font-bold text-white ${stepTone}`}>
          {step}
        </span>
        <h2 className="min-w-0 text-[12px] font-extrabold uppercase leading-snug tracking-[0.06em] text-[#334155] sm:text-body-sm sm:tracking-[0.08em]">
          {label}
        </h2>
        {tooltipText && <InfoTooltip text={tooltipText} />}
      </header>
      <div className={`grid min-w-0 divide-y divide-[#DFE0E1] p-3 sm:divide-y-0 sm:divide-x sm:p-5 ${columns}`}>{children}</div>
    </Card>
  )
}

function MetricCounterCard({
  label,
  icon: Icon,
  field,
  tone,
  crmBadge,
  form,
  fieldErrors,
  numberDrafts,
  changedFields,
  updateField,
  updateNumberField,
  commitNumberField,
  readValue,
  disabled,
}: {
  label: string
  icon: LucideIcon
  field: NumericCheckinField
  tone: 'success' | 'info' | 'warning'
  crmBadge?: boolean
  form: CheckinPageContext['form']
  fieldErrors: CheckinPageContext['fieldErrors']
  numberDrafts: CheckinPageContext['numberDrafts']
  changedFields: CheckinPageContext['changedFields']
  updateField: CheckinPageContext['updateField']
  updateNumberField: CheckinPageContext['updateNumberField']
  commitNumberField: CheckinPageContext['commitNumberField']
  readValue: (field: NumericCheckinField) => number
  disabled?: boolean
}) {
  const displayValue = readValue(field)
  const inputValue = numberDrafts[field] ?? String(displayValue)
  const iconToneClass =
    tone === 'success'
      ? 'bg-[#22C55E] text-white'
      : tone === 'info'
        ? 'bg-[#005BFF] text-white'
        : 'bg-[#F59E0B] text-white'

  const setNext = (next: number) => {
    if (disabled) return
    updateField(field, Math.max(0, Math.min(CHECKIN_MAX_INPUT_VALUE, next)))
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let val = event.target.value.replace(/\D/g, '')
    if (val !== '') {
      let num = Number(val)
      if (num > CHECKIN_MAX_INPUT_VALUE) {
        num = CHECKIN_MAX_INPUT_VALUE
        val = String(CHECKIN_MAX_INPUT_VALUE)
      }
      updateNumberField(field, val)
    } else {
      updateNumberField(field, '')
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
    }
  }

  const handleBlur = () => {
    commitNumberField(field)
  }

  const handleWheel = (event: React.WheelEvent<HTMLInputElement>) => {
    event.currentTarget.blur()
  }

  return (
    <div
      className={cn(
    "relative flex min-h-[124px] min-w-0 flex-col items-center justify-center gap-2 bg-white px-2 py-4 text-center sm:px-3",
        fieldErrors[field] && "ring-2 ring-[#EF4343]/20 rounded-xl"
      )}
    >
      <div className="flex items-center gap-1">
        <span className="text-body-sm font-bold text-[#526B7A]">
          {label}
        </span>
        {crmBadge && (
          <span className="inline-flex items-center justify-center rounded-full bg-[#00A89D]/10 px-1.5 py-0.5 text-caption font-bold text-[#00A89D] border border-[#00A89D]/20">
            CRM
          </span>
        )}
      </div>

      <span className={cn("grid h-11 w-11 place-items-center rounded-full shadow-sm", iconToneClass)}>
        <Icon size={19} />
      </span>

      <input
        type="text"
        inputMode="numeric"
        name={String(field)}
        aria-label={label}
        disabled={disabled}
        value={inputValue}
        onFocus={event => event.target.select()}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        onBlur={handleBlur}
        onWheel={handleWheel}
        className="
          h-11 w-20 rounded-xl border border-[#DFE0E1] bg-[#F7F8F8] text-center
          text-h3 font-extrabold leading-none text-[#071822]
          outline-none tabular-nums cursor-text transition-all
          [appearance:textfield]
          [&::-webkit-inner-spin-button]:appearance-none
          [&::-webkit-outer-spin-button]:appearance-none
          hover:border-[#00A89D]/30 hover:bg-[#F7F8F8]
          focus:border-[#00A89D] focus:bg-white focus:ring-4 focus:ring-[#00A89D]/10
        "
      />

      <div className="mt-1 grid h-8 w-full max-w-[120px] grid-cols-[28px_minmax(0,1fr)_28px] overflow-hidden rounded-lg border border-[#DFE0E1] bg-white shadow-sm transition-all focus-within:border-[#00A89D]/40 focus-within:ring-2 focus-within:ring-[#00A89D]/20">
        <button
          type="button"
          aria-label={`Diminuir ${label}`}
          disabled={disabled || (Number(form[field]) <= 0 && displayValue <= 0)}
          onClick={() => setNext(displayValue - 1)}
          className="grid h-full w-full place-items-center bg-[#F7F8F8] text-[#526B7A] hover:bg-[#EF4343]/10 hover:text-[#EF4343] disabled:opacity-40 border-r border-[#DFE0E1] transition-colors"
        >
          <Minus size={13} />
        </button>

        <span className="grid place-items-center text-[14px] font-extrabold tabular-nums text-[#071822] bg-[#F7F8F8]">
          {displayValue}
        </span>

        <button
          type="button"
          aria-label={`Aumentar ${label}`}
          disabled={disabled || displayValue >= CHECKIN_MAX_INPUT_VALUE}
          onClick={() => setNext(displayValue + 1)}
          className="grid h-full w-full place-items-center bg-[#F7F8F8] text-[#526B7A] hover:bg-[#00A89D]/10 hover:text-[#00A89D] disabled:opacity-40 border-l border-[#DFE0E1] transition-colors"
        >
          <Plus size={13} />
        </button>
      </div>

      {fieldErrors[field] && (
        <Typography variant="tiny" tone="error" className="font-semibold mt-1">
          {fieldErrors[field]}
        </Typography>
      )}
    </div>
  )
}

function ResumoItem({
  label,
  value,
  icon: Icon,
  tone = 'success',
}: {
  label: string
  value: string
  icon: LucideIcon
  tone?: 'success' | 'info' | 'warning'
}) {
  const iconClass =
    tone === 'success'
      ? 'bg-[#ecfdf5] text-[#00A89D] border border-[#bbf7d0]'
      : tone === 'info'
        ? 'bg-[#E8F3F2] text-[#00A89D] border border-[#bfdbfe]'
        : 'bg-[#FFF7E6] text-[#F59F0A] border border-[#FFF7E6]'

  return (
    <div className="grid min-h-[88px] place-items-center rounded-xl border border-[#DFE0E1] bg-white p-3 text-center shadow-sm">
      <span className="text-caption font-bold text-[#526B7A] uppercase tracking-wider">
        {label}
      </span>
      <span className={`max-w-full font-extrabold text-[#071822] tabular-nums ${value.length > 7 ? 'text-xs' : 'text-h5'}`}>
        {value}
      </span>
      <span className={cn("grid h-7 w-7 place-items-center rounded-full", iconClass)}>
        <Icon size={13} />
      </span>
    </div>
  )
}
