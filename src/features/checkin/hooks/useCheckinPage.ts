import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/lib/toast'
import {
    CHECKIN_EDIT_LIMIT_MINUTES,
    CHECKIN_MAX_INPUT_VALUE,
    MX_TIMEZONE,
    useCheckins,
} from '@/hooks/useCheckins'
import { validarFunil, calcularTotais } from '@/lib/calculations'
import type { DailyCheckin } from '@/types/database'
import { requestToastConfirmation } from '@/lib/ui/confirmAction'
import { useFeedbackActions } from '@/features/crm/hooks/useFeedbackActions'
import { resolveFeedbackActionCloseLock } from '../lib/feedback-action-lock'
import { useCrmDerivedTotals } from './useCrmDerivedTotals'
import { useAuth } from '@/hooks/useAuth'
import { addDaysDateOnly } from '../lib/crm-derived-totals'
import { calcularDisciplina } from '../lib/disciplina'
import { deriveClientesListFromCrm } from '../lib/clientes-list-from-crm'
import { supabase } from '@/lib/supabase'
import { useOportunidades } from '@/features/crm/hooks/useOportunidades'
import { useAgendamentos } from '@/features/crm/hooks/useAgendamentos'
import { getActiveClosingContext } from '../lib/active-closing-context'
import { reconstructCheckinFormFromHistorical } from '../lib/reconstruct-checkin-form'
import type { StepId as ClosingStepId } from '../sections/FluxoFechamento'
import { useCheckinAutosave } from '../autosave/useCheckinAutosave'
import { autosaveResultFromSave } from '../autosave/classify-autosave-failure'

export interface CheckinForm {
    leads: number
    leads_cart: number
    leads_net: number
    agd_cart_prev: number
    agd_net_prev: number
    agd_cart: number
    agd_net: number
    vnd_porta: number
    vnd_cart: number
    vnd_net: number
    visitas: number
    visitas_porta: number
    visitas_cart: number
    visitas_net: number
    note: string
    zero_reason: string
}

const createEmptyCheckinForm = (): CheckinForm => ({
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
    note: '',
    zero_reason: '',
})

export interface ClienteRow {
    id: string
    clienteDbId?: string
    fechamentoId: string
    vendedorId: string
    dataCompetenciaFechamento: string
    nomeCliente: string
    telefone: string
    veiculoInteresse: string
    tipoVeiculo?: string | null
    valorNegociado: number | null
    dataAgendamento: string
    canal: 'Carteira' | 'Internet' | 'Showroom'
    compareceu: 'Sim' | 'Não' | null
    carroAvaliado: 'Sim' | 'Não'
    sinal: number
    financiamento: 'Aprovado' | 'Recusado' | 'Não se aplica'
    vendaRealizada: 'Sim' | 'Não' | 'Em Negociação'
    dataNovoAgendamento?: string
    motivoPerda?: string
    observacoes?: string
    tipoRegistroCalculado: string
}

export type NumericCheckinField = Exclude<keyof CheckinForm, 'note' | 'zero_reason'>

export const CHECKIN_MAX_INPUT_HELP = `O teto ${CHECKIN_MAX_INPUT_VALUE} evita erro de digitação, importação duplicada ou lançamento fora da escala operacional.`

// Timezone Helpers
export function getSPTime() {
    const spString = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
    return new Date(spString)
}

export function getSPDateOnly(date: Date = new Date()): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    })
    return formatter.format(date)
}

export function getSPHoursMinutes(date: Date = new Date()): { hours: number; minutes: number } {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo',
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: 'h23'
    })
    const parts = formatter.formatToParts(date)
    const byType = new Map(parts.map(p => [p.type, p.value]))
    const hours = Number(byType.get('hour') || 0)
    const minutes = Number(byType.get('minute') || 0)
    return { hours, minutes }
}

export function parseDateOnly(val: string | null | undefined): string {
    if (!val) return ''
    const match = val.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/)
    if (match) return `${match[1]}-${match[2]}-${match[3]}`
    return val.slice(0, 10)
}

export function calcularTipoRegistro(
    vendaRealizada: string,
    canal: string,
    dataAgendamento: string,
    dataCompetencia: string
): { tipo: string; contaParaDisciplina: boolean } {
    if (vendaRealizada === 'Sim') {
        return { tipo: 'Venda', contaParaDisciplina: false }
    }
    if (vendaRealizada === 'Não') {
        return { tipo: 'Perda', contaParaDisciplina: false }
    }
    
    // Venda realizada = Em Negociação
    const dataD1 = addDaysDateOnly(dataCompetencia, 1)
    const dateAgd = parseDateOnly(dataAgendamento)
    const dateComp = parseDateOnly(dataCompetencia)
    const dateD1Str = parseDateOnly(dataD1)
    
    const canalLower = canal.toLowerCase()
    const isCorrectCanal = canalLower === 'carteira' || canalLower === 'internet'
    
    if (dateAgd === dateD1Str && isCorrectCanal) {
        return { tipo: 'Agendamento D+1', contaParaDisciplina: true }
    }
    
    if (dateAgd === dateComp) {
        return { tipo: 'Agendamento do Dia', contaParaDisciplina: false }
    }
    
    if (dateAgd > dateD1Str) {
        return { tipo: 'Agendamento Futuro', contaParaDisciplina: false }
    }
    
    return { tipo: 'Em Negociação fora do D+1', contaParaDisciplina: false }
}

export function useCheckinPage() {
    const navigate = useNavigate()
    const { supabaseUser, profile } = useAuth()
    const [saving, setSaving] = useState(false)
    const [showConfetti, setShowConfetti] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [changedFields, setChangedFields] = useState<Set<keyof CheckinForm>>(new Set())
    const [metricScope, setMetricScope] = useState<'daily' | 'adjustment'>('daily')
    const [currentTime, setCurrentTime] = useState(() => new Date())
    const [inputError, setInputError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<NumericCheckinField | 'note' | 'zero_reason', string>>>({})
    const [numberDrafts, setNumberDrafts] = useState<Partial<Record<keyof CheckinForm, string>>>({})
    const [saveNotice, setSaveNotice] = useState<{ title: string; detail: string } | null>(null)

    const [form, setForm] = useState<CheckinForm>(() => createEmptyCheckinForm())
    // Etapa do fluxo mora aqui, não dentro de FluxoFechamento: o container
    // troca o formulário por um skeleton enquanto o refetch do autosave roda,
    // e isso remontava o componente jogando o vendedor de volta ao Showroom.
    const [closingStep, setClosingStep] = useState<ClosingStepId>('showroom')

    const { checkins, todayCheckin, saveCheckin, loading: hookLoading, referenceDate, fetchCheckinByDate, error: checkinLoadError } = useCheckins()
    const {
        acoes: feedbackActions,
        loading: feedbackActionsLoading,
        justificarAcoesFeedback,
    } = useFeedbackActions()
    const [historicalCheckin, setHistoricalCheckin] = useState<DailyCheckin | null>(null)
    const [loadingHistory, setLoadingHistory] = useState(false)
    // P0-02: true quando o lançamento reaberto é anterior à granularidade de
    // canal de visitas — o total em visitas_porta não reflete um canal real.
    const [visitasCanalIndisponivel, setVisitasCanalIndisponivel] = useState(false)
    
    const [customReferenceDate, setCustomReferenceDate] = useState('')
const todaySP = getSPDateOnly(currentTime)
const yesterdaySP = addDaysDateOnly(todaySP, -1)
const [previousCheckin, setPreviousCheckin] = useState<DailyCheckin | null>(null)

useEffect(() => {
if (!yesterdaySP) return
let cancelled = false
fetchCheckinByDate(yesterdaySP, 'daily')
.then(res => {
if (!cancelled) setPreviousCheckin(res)
})
.catch(() => {
if (!cancelled) setPreviousCheckin(null)
})
return () => { cancelled = true }
}, [yesterdaySP, fetchCheckinByDate])

const todayClosingFromList = useMemo(
() => checkins.find(checkin =>
checkin.reference_date === todaySP
&& checkin.metric_scope === 'daily'
&& (!supabaseUser?.id || checkin.seller_user_id === supabaseUser.id)
) ?? null,
[checkins, supabaseUser?.id, todaySP],
)

const yesterdayClosing = previousCheckin
?? (referenceDate === yesterdaySP ? todayCheckin : null)
?? checkins.find(checkin =>
checkin.reference_date === yesterdaySP
&& checkin.metric_scope === 'daily'
&& (!supabaseUser?.id || checkin.seller_user_id === supabaseUser.id)
) ?? null

const todayClosing = (referenceDate === todaySP ? todayCheckin : null) ?? todayClosingFromList

const activeClosingContext = useMemo(
() => getActiveClosingContext(currentTime, {
    [todaySP]: todayClosing,
    [yesterdaySP]: yesterdayClosing,
}),
[currentTime, todaySP, todayClosing, yesterdaySP, yesterdayClosing],
)

    useEffect(() => {
        // Regra MX: a produção declarada se refere sempre ao dia anterior,
        // independente do horário em que o vendedor abre a tela à tarde.
 if (activeClosingContext.mainDate) {
 setCustomReferenceDate(current => current === activeClosingContext.mainDate ? current : activeClosingContext.mainDate)
 setMetricScope('daily')
 setChangedFields(new Set())
        }
 }, [activeClosingContext.mainDate])

    // Clients/Opportunities Reactive List — fonte única é o CRM real
    // (oportunidades + agendamentos), não mais localStorage (EV-1.7).
 const selectedDate = customReferenceDate || activeClosingContext.mainDate || referenceDate
 const crmDerived = useCrmDerivedTotals(selectedDate)

    const { oportunidades, refetch: refetchOportunidades } = useOportunidades()
    const { agendamentos, refetch: refetchAgendamentos } = useAgendamentos()

    const clientesList = useMemo(
        () => deriveClientesListFromCrm(oportunidades, agendamentos, selectedDate),
        [oportunidades, agendamentos, selectedDate],
    )

    const refetchClientesList = useCallback(async () => {
        await Promise.all([refetchOportunidades(), refetchAgendamentos()])
    }, [refetchOportunidades, refetchAgendamentos])

    useEffect(() => {
        if (!selectedDate || !referenceDate) return
        if (selectedDate === referenceDate && metricScope === 'daily') {
            setHistoricalCheckin(todayCheckin)
        } else {
            setLoadingHistory(true)
            fetchCheckinByDate(selectedDate, metricScope)
                .then(res => setHistoricalCheckin(res))
                .catch(() => toast.error('Não foi possível carregar o lançamento selecionado.'))
                .finally(() => setLoadingHistory(false))
        }
    }, [selectedDate, metricScope, todayCheckin, referenceDate, fetchCheckinByDate])

    useEffect(() => {
        if (changedFields.size > 0) return
        setNumberDrafts({})
        if (historicalCheckin) {
            const { form: reconstructedForm, visitasCanalIndisponivel } = reconstructCheckinFormFromHistorical(historicalCheckin)
            setForm(reconstructedForm)
            setVisitasCanalIndisponivel(visitasCanalIndisponivel)
        } else {
            setForm(createEmptyCheckinForm())
            setVisitasCanalIndisponivel(false)
        }
    }, [historicalCheckin, changedFields.size, selectedDate])

    const declaredForm = useMemo<CheckinForm>(() => ({
        ...form,
        leads: Number(form.leads_cart) + Number(form.leads_net),
        visitas: Number(form.visitas_porta) + Number(form.visitas_cart) + Number(form.visitas_net),
    }), [form])

    const declaredProgressTotals = useMemo(() => ({
        leads: Number(declaredForm.leads_cart) + Number(declaredForm.leads_net),
        visitas: Number(declaredForm.visitas_porta) + Number(declaredForm.visitas_cart) + Number(declaredForm.visitas_net),
        agd: Number(declaredForm.agd_cart) + Number(declaredForm.agd_net),
        vendas: Number(declaredForm.vnd_porta) + Number(declaredForm.vnd_cart) + Number(declaredForm.vnd_net),
    }), [declaredForm])

    const declaredTotals = useMemo(() => calcularTotais(declaredForm), [declaredForm])
    const totals = declaredTotals

    useEffect(() => {
        const clock = setInterval(() => setCurrentTime(new Date()), 30000)
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (changedFields.size > 0 && !saving) { e.preventDefault(); e.returnValue = '' }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
            clearInterval(clock)
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [changedFields, saving])

const spTime = getSPHoursMinutes(currentTime)

    // O fechamento diário não possui trava global por horário. A janela
    // 09:30 é exclusiva da consolidação da Agenda D+1 (§11.2); a escolha da
    // data ativa e a transição D-1 → D0 pertencem ao ActiveClosingContext.
    const isPastDeadline = false
    const lockStage = 'on_time' as const

    // Liberação real (EV-1.6): fonte é fechamento_liberacoes (server),
    // não mais localStorage. Um lançamento já salvo também carrega o flag
    // (gravado pelo submit_checkin a partir da mesma tabela).
    const [liberacaoStatus, setLiberacaoStatus] = useState<'none' | 'pendente' | 'liberado'>('none')

    useEffect(() => {
        if (!supabaseUser?.id || !selectedDate) { setLiberacaoStatus('none'); return }
        let cancelled = false
        supabase
            .from('fechamento_liberacoes')
            .select('status')
            .eq('vendedor_id', supabaseUser.id)
            .eq('data_fechamento', selectedDate)
            .order('data_hora_solicitacao', { ascending: false })
            .limit(1)
            .maybeSingle()
            .then(({ data }) => {
                if (cancelled) return
                setLiberacaoStatus(data?.status === 'liberado' ? 'liberado' : data?.status === 'pendente' ? 'pendente' : 'none')
            })
        return () => { cancelled = true }
    }, [supabaseUser?.id, selectedDate])

    const fechamentoLiberado = liberacaoStatus === 'liberado' || Boolean(historicalCheckin?.fechamento_liberado)

    const finalizadoAposPrazo = useMemo(
        () => Boolean(historicalCheckin?.finalizado_apos_prazo),
        [historicalCheckin],
    )

    // WhatsApp Request — resolve o gerente real da loja (loja vem de
    // vendedores_loja; vendedor não tem loja_id direto) e usa o telefone real.
    const avisarGerenteWhatsapp = async () => {
        if (!supabaseUser?.id) return

        const { data: solicitacao, error: solicitarError } = await supabase.rpc('solicitar_liberacao_fechamento', {
            p_data_fechamento: selectedDate,
        })
        const result = solicitacao as { ok?: boolean; error?: string; data?: { token: string; store_id: string } } | null
        if (solicitarError || !result?.ok || !result.data) {
            toast.error(result?.error || solicitarError?.message || 'Não foi possível criar a solicitação de liberação.')
            return
        }
        setLiberacaoStatus('pendente')

        const { data: gerentes } = await supabase
            .from('vinculos_loja')
            .select('user_id, usuarios:user_id(name, phone)')
            .eq('store_id', result.data.store_id)
            .eq('role', 'gerente')
            .eq('is_active', true)
            .limit(1)

        const gerente = (gerentes?.[0] as unknown as { usuarios?: { name?: string; phone?: string } } | undefined)?.usuarios
        const telefoneDigits = (gerente?.phone || '').replace(/\D/g, '')

        const linkSeguro = `${window.location.origin}/liberacao-fechamento?token=${result.data.token}`
        const msg = `Olá, preciso de liberação para realizar meu Fechamento Diário com atraso.

Vendedor: ${profile?.name || 'Nome não informado'}
Data do fechamento: ${selectedDate.split('-').reverse().join('/')}
Horário da solicitação: ${new Date().toLocaleTimeString('pt-BR')}
Motivo: Fechamento não realizado até 09h30.

Por favor, acesse o sistema para liberar:
${linkSeguro}`

        const waUrl = telefoneDigits
            ? `https://wa.me/55${telefoneDigits}?text=${encodeURIComponent(msg)}`
            : `https://wa.me/?text=${encodeURIComponent(msg)}`
        window.open(waUrl, '_blank')
        toast.success(
            telefoneDigits ? `Solicitação enviada — abrindo WhatsApp de ${gerente?.name || 'gerente'}.` : 'Solicitação criada. Nenhum gerente com telefone cadastrado foi encontrado — selecione o contato manualmente no WhatsApp.',
        )
    }

    // Dynamic Discipline and Summary Calculations
    const crmDailyCounters = useMemo(() => {
        const dataD1 = addDaysDateOnly(selectedDate, 1)
        const isD1Negotiation = (cliente: ClienteRow) =>
            cliente.vendaRealizada === 'Em Negociação'
            && cliente.tipoRegistroCalculado === 'Agendamento D+1'
            && parseDateOnly(cliente.dataAgendamento) === dataD1

        return {
            agd_cart: clientesList.filter(cliente => cliente.canal === 'Carteira' && isD1Negotiation(cliente)).length,
            agd_net: clientesList.filter(cliente => cliente.canal === 'Internet' && isD1Negotiation(cliente)).length,
            visitas_porta: clientesList.filter(cliente => cliente.canal === 'Showroom' && cliente.compareceu === 'Sim').length,
            visitas_cart: clientesList.filter(cliente => cliente.canal === 'Carteira' && cliente.compareceu === 'Sim').length,
            visitas_net: clientesList.filter(cliente => cliente.canal === 'Internet' && cliente.compareceu === 'Sim').length,
            vnd_porta: clientesList.filter(cliente => cliente.canal === 'Showroom' && cliente.vendaRealizada === 'Sim').length,
            vnd_cart: clientesList.filter(cliente => cliente.canal === 'Carteira' && cliente.vendaRealizada === 'Sim').length,
            vnd_net: clientesList.filter(cliente => cliente.canal === 'Internet' && cliente.vendaRealizada === 'Sim').length,
        }
    }, [clientesList, selectedDate])

    const effectiveForm = useMemo<CheckinForm>(() => {
        const next: CheckinForm = {
            ...form,
            agd_cart: Math.max(Number(form.agd_cart ?? 0), crmDailyCounters.agd_cart),
            agd_net: Math.max(Number(form.agd_net ?? 0), crmDailyCounters.agd_net),
            visitas_porta: Math.max(Number(form.visitas_porta ?? 0), crmDailyCounters.visitas_porta),
            visitas_cart: Math.max(Number(form.visitas_cart ?? 0), crmDailyCounters.visitas_cart),
            visitas_net: Math.max(Number(form.visitas_net ?? 0), crmDailyCounters.visitas_net),
            vnd_porta: Math.max(Number(form.vnd_porta ?? 0), crmDailyCounters.vnd_porta),
            vnd_cart: Math.max(Number(form.vnd_cart ?? 0), crmDailyCounters.vnd_cart),
            vnd_net: Math.max(Number(form.vnd_net ?? 0), crmDailyCounters.vnd_net),
        }
        next.leads = Number(next.leads_cart) + Number(next.leads_net)
        next.visitas = Number(next.visitas_porta) + Number(next.visitas_cart) + Number(next.visitas_net)
        return next
    }, [crmDailyCounters, form])

    const effectiveTotals = useMemo(() => ({
        leads: Number(effectiveForm.leads_cart) + Number(effectiveForm.leads_net),
        visitas: Number(effectiveForm.visitas_porta) + Number(effectiveForm.visitas_cart) + Number(effectiveForm.visitas_net),
        agd: Number(effectiveForm.agd_cart) + Number(effectiveForm.agd_net),
        vendas: Number(effectiveForm.vnd_porta) + Number(effectiveForm.vnd_cart) + Number(effectiveForm.vnd_net),
    }), [effectiveForm])

    const hasCrmActivity = useMemo(
        () => effectiveTotals.leads > declaredProgressTotals.leads
            || effectiveTotals.visitas > declaredProgressTotals.visitas
            || effectiveTotals.agd > declaredProgressTotals.agd
            || effectiveTotals.vendas > declaredProgressTotals.vendas,
        [declaredProgressTotals, effectiveTotals],
    )

    const totalAgendamentosD1 = Number(declaredForm.agd_cart ?? 0) + Number(declaredForm.agd_net ?? 0)
    const hasDeclaredClosingInput = declaredProgressTotals.leads > 0
        || declaredProgressTotals.visitas > 0
        || declaredProgressTotals.agd > 0
        || declaredProgressTotals.vendas > 0
        || form.zero_reason !== ''

    const validosCarteira = useMemo(() => {
        return clientesList.filter(c =>
            c.canal === 'Carteira' &&
            c.vendaRealizada === 'Em Negociação' &&
            c.tipoRegistroCalculado === 'Agendamento D+1'
        ).length
    }, [clientesList])

    const validosInternet = useMemo(() => {
        return clientesList.filter(c =>
            c.canal === 'Internet' &&
            c.vendaRealizada === 'Em Negociação' &&
            c.tipoRegistroCalculado === 'Agendamento D+1'
        ).length
    }, [clientesList])

    const creditosCarteira = Math.min(validosCarteira, Number(declaredForm.agd_cart ?? 0))
    const creditosInternet = Math.min(validosInternet, Number(declaredForm.agd_net ?? 0))
    const creditosValidos = creditosCarteira + creditosInternet

    const disciplina = useMemo(
        () => calcularDisciplina({ totalAgendamentosD1, creditosValidos, finalizadoAposPrazo }),
        [totalAgendamentosD1, creditosValidos, finalizadoAposPrazo],
    )
    const pontosExtrasDisciplina = hasDeclaredClosingInput ? disciplina.pontosExtras : 0
    const rawDiscipline = hasDeclaredClosingInput ? disciplina.pontuacaoDisciplinaBase : 0
    const disciplinePercent = hasDeclaredClosingInput ? disciplina.pontuacaoDisciplinaFinal : 0

    const completedItems = useMemo(() => {
        const items = []
        const hasFormFill = declaredProgressTotals.leads > 0 || declaredProgressTotals.agd > 0 || declaredProgressTotals.visitas > 0 || declaredProgressTotals.vendas > 0 || form.zero_reason !== ''
        if (hasFormFill) {
            items.push('Preenchimento básico (70%)')
        }
        if (totalAgendamentosD1 > 0) {
            items.push(`Detalhamento p/ Amanhã: ${creditosValidos} de ${totalAgendamentosD1} (${Math.round(pontosExtrasDisciplina)}%)`)
        } else {
            items.push('Detalhamento p/ Amanhã (Sem agendamentos no dia)')
        }
        return items
    }, [declaredProgressTotals, form.zero_reason, totalAgendamentosD1, creditosValidos, pontosExtrasDisciplina])

    const pendingItems = useMemo(() => {
        const items = []
        if (totalAgendamentosD1 > creditosValidos) {
            items.push(`Cadastrar agendamentos p/ amanhã (${totalAgendamentosD1 - creditosValidos} pendentes)`)
        }
        if (finalizadoAposPrazo) {
            items.push('Atraso no fechamento (-10% de penalidade)')
        }
        return items
    }, [totalAgendamentosD1, creditosValidos, finalizadoAposPrazo])

    const temAgendamentoDataDiferente = useMemo(() => {
        return clientesList.some(c =>
            c.vendaRealizada === 'Em Negociação' &&
            (c.canal === 'Carteira' || c.canal === 'Internet') &&
            c.tipoRegistroCalculado !== 'Agendamento D+1'
        )
    }, [clientesList])

    const realSalesCount = useMemo(() => {
        return clientesList.filter(c => c.vendaRealizada === 'Sim').length
    }, [clientesList])

    const realFaturamento = useMemo(() => {
        return clientesList.filter(c => c.vendaRealizada === 'Sim').reduce((acc, c) => acc + (c.valorNegociado || 0), 0)
    }, [clientesList])

    const minutesUntilEditLock = useMemo(() => {
        const currentMinutes = spTime.hours * 60 + spTime.minutes
        return CHECKIN_EDIT_LIMIT_MINUTES - currentMinutes
    }, [spTime])

    const isLate = Boolean(historicalCheckin?.submitted_late)
    const declaredAllZero = useMemo(
        () => declaredProgressTotals.leads === 0 && declaredProgressTotals.agd === 0 && declaredProgressTotals.visitas === 0 && declaredProgressTotals.vendas === 0,
        [declaredProgressTotals],
    )
const fechamentoConcluido = metricScope === 'daily'
&& selectedDate === activeClosingContext.mainDate
&& activeClosingContext.isMainDateSubmitted
    const funnelError = useMemo(() => {
        try { return validarFunil(form) } catch { return 'Erro de validação' }
    }, [form])
    const mandatoryFeedbackActionsCount = useMemo(
        () => metricScope === 'daily'
            ? feedbackActions.filter(action => action.status === 'pendente' && action.obrigatoria_fechamento).length
            : 0,
        [feedbackActions, metricScope],
    )

    // --- Autosave do rascunho -------------------------------------------------
    // O payload do rascunho é o mesmo da finalização: só muda o
    // submission_status decidido pelo servidor a partir da flag isDraft.
    const draftPayload = useMemo(() => ({
        ...declaredForm,
        pontuacao_disciplina_base: rawDiscipline,
        fechamento_liberado: fechamentoLiberado,
    }), [declaredForm, rawDiscipline, fechamentoLiberado])

    // Autosave é exclusivo do fechamento diário em aberto. Ajuste técnico e
    // lançamento histórico continuam sendo atos explícitos da gestão.
    //
    // Não entram aqui os flags de carregamento (`loadingHistory`/`hookLoading`).
    // Eles ficam `true` em janelas normais de uso — a data operacional D-1 é
    // sempre buscada por `fetchCheckinByDate`, e cada refetch reabre a janela —
    // e desligavam o autosave justo enquanto o vendedor digitava: em produção o
    // rascunho só era gravado no clique manual. A proteção contra gravar
    // durante a hidratação é o guard de `changedFields`, que só fica preenchido
    // quando o usuário mexe em algum campo.
    const autosaveEnabled = metricScope === 'daily'
        && !fechamentoConcluido
        && selectedDate === activeClosingContext.mainDate

    const persistDraft = useCallback(
        async (snapshot: typeof draftPayload, expectedRevision: number) => {
            const result = await saveCheckin(
                snapshot,
                'daily',
                selectedDate,
                activeClosingContext.mainDate,
                true,
                expectedRevision,
            )
            return autosaveResultFromSave({ ...result, expectedRevision })
        },
        [saveCheckin, selectedDate, activeClosingContext.mainDate],
    )

    const autosave = useCheckinAutosave({
        save: persistDraft,
        enabled: autosaveEnabled,
        telemetry: { referenceDate: selectedDate, checkinId: historicalCheckin?.id ?? null },
    })

    // A revisão conhecida vem do banco: sem isto, a primeira gravação depois de
    // um refresh mandaria revisão 0 contra uma linha já avançada e cairia em
    // conflito falso.
    const hydrateAutosave = autosave.hydrate
    useEffect(() => {
        hydrateAutosave({
            revision: Number(historicalCheckin?.draft_revision ?? 0),
            lastSavedAt: historicalCheckin?.last_draft_saved_at ?? null,
        })
    }, [historicalCheckin?.id, historicalCheckin?.draft_revision, historicalCheckin?.last_draft_saved_at, hydrateAutosave])

    // Só o que o usuário mexeu dispara autosave. Hidratação e limpeza de
    // formulário mantêm changedFields vazio e não geram rascunho fantasma.
    const lastMarkedSnapshotRef = useRef<string | null>(null)
    const markDirty = autosave.markDirty
    useEffect(() => {
        if (!autosaveEnabled || changedFields.size === 0) return
        const serialized = JSON.stringify(draftPayload)
        if (lastMarkedSnapshotRef.current === serialized) return
        lastMarkedSnapshotRef.current = serialized
        markDirty(draftPayload)
    }, [autosaveEnabled, changedFields, draftPayload, markDirty])

    const setFieldError = (field: NumericCheckinField | 'note' | 'zero_reason', message: string | null) => {
        setFieldErrors(prev => {
            const next = { ...prev }
            if (message) next[field] = message
            else delete next[field]
            return next
        })
    }

    const updateField = (field: keyof CheckinForm, value: number | string) => {
        if (typeof value === 'number' && (!Number.isFinite(value) || value < 0 || value > CHECKIN_MAX_INPUT_VALUE)) {
            setInputError(`Informe um valor entre 0 e ${CHECKIN_MAX_INPUT_VALUE}.`)
            setFieldError(field as NumericCheckinField, `Use um número entre 0 e ${CHECKIN_MAX_INPUT_VALUE}.`)
            return
        }
        setInputError(null)
        setFieldError(field as NumericCheckinField, null)
        setSaveNotice(null)
        setForm(prev => {
            const next = { ...prev, [field]: value }
            if (field === 'leads_cart' || field === 'leads_net') {
                next.leads = Number(next.leads_cart) + Number(next.leads_net)
            }
            if (field === 'visitas_porta' || field === 'visitas_cart' || field === 'visitas_net') {
                next.visitas = Number(next.visitas_porta) + Number(next.visitas_cart) + Number(next.visitas_net)
            }
            return next
        })
        setChangedFields(prev => new Set(prev).add(field))
    }

    const updateNumberField = (field: keyof CheckinForm, rawValue: string) => {
        setNumberDrafts(prev => ({ ...prev, [field]: rawValue }))
        setChangedFields(prev => new Set(prev).add(field))
        if (rawValue === '') {
            setInputError(null)
            setFieldError(field as NumericCheckinField, 'Campo obrigatório antes de salvar.')
            return
        }
        const numericValue = Number(rawValue)
        if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > CHECKIN_MAX_INPUT_VALUE) {
            setFieldError(field as NumericCheckinField, `Use um número de 0 a ${CHECKIN_MAX_INPUT_VALUE}.`)
            setInputError(`Revise ${rawValue}: ${CHECKIN_MAX_INPUT_HELP}`)
            return
        }
        setFieldError(field as NumericCheckinField, null)
        updateField(field, numericValue)
    }

    const commitNumberField = (field: keyof CheckinForm) => {
        const isDraftEmpty = numberDrafts[field] === ''
        setNumberDrafts(prev => {
            const next = { ...prev }
            delete next[field]
            return next
        })
        if (isDraftEmpty) {
            updateField(field, 0)
        }
    }

    const handleExit = () => {
        if (changedFields.size > 0 && !saving) {
            requestToastConfirmation({
                key: 'checkin-unsaved-exit',
                title: 'Sair sem salvar?',
                description: 'Existem alterações no lançamento atual.',
                label: 'Sair',
                onConfirm: async () => navigate('/home'),
            })
            return
        }
        navigate('/home')
    }

  const submitCheckin = async () => {
    if (saving) return
    if (fechamentoConcluido) {
      const message = 'Fechamento já concluído para esta data. Para alterar, use o histórico e solicite correção.'
      setInputError(message)
      toast.error(message)
      return
    }
    if (Object.values(numberDrafts).some(value => value === '')) {
            const emptyFields = Object.entries(numberDrafts)
                .filter(([, value]) => value === '')
                .map(([field]) => field as NumericCheckinField)
            emptyFields.forEach(field => setFieldError(field, 'Preencha este campo ou use 0.'))
            setInputError('Preencha os campos numéricos vazios antes de salvar.')
            toast.error('Preencha os campos numéricos vazios antes de salvar.')
            return
        }
        if (declaredAllZero && !form.zero_reason) {
            setFieldError('zero_reason', 'Selecione o motivo da produção zero.')
            setInputError('Justificativa obrigatória para produção zero.')
            toast.error('Justificativa obrigatória para produção zero.')
            return
        }
        if (declaredAllZero && !form.note.trim()) {
            setFieldError('note', 'Descreva a observação da produção zero.')
            setInputError('Observação obrigatória para produção zero.')
            toast.error('Observação obrigatória para produção zero.')
            return
        }
        if (declaredAllZero && form.zero_reason === 'Outro' && form.note.trim().length < 8) {
            setFieldError('note', 'Descreva o motivo “Outro” com pelo menos 8 caracteres.')
            setInputError('Descreva o motivo com pelo menos 8 caracteres quando selecionar Outro.')
            toast.error('Descreva o motivo quando selecionar Outro.')
            return
        }
        if (funnelError) { setInputError(funnelError); toast.error(funnelError); return }
        if (metricScope === 'daily' && feedbackActionsLoading) {
            setInputError('Aguarde carregar as ações de feedback antes de finalizar.')
            toast.error('Aguarde carregar as ações de feedback antes de finalizar.')
            return
        }
        const feedbackActionLock = resolveFeedbackActionCloseLock({
            actions: feedbackActions,
            note: form.note,
            metricScope,
        })
        if (feedbackActionLock.blocked) {
            const message = feedbackActionLock.message || 'Existe ação obrigatória de feedback pendente.'
            setFieldError('note', message)
            setInputError(message)
            toast.error(message)
            return
        }

 setSaving(true)
 try {
        // Antes de finalizar, o rascunho pendente precisa chegar ao servidor.
        // Sem isto, a finalização poderia carimbar como oficial um snapshot
        // anterior à última digitação, ou competir com o autosave em voo.
        const flushed = await autosave.flush()
        if (flushed.status === 'conflict') {
            const message = 'Este fechamento foi atualizado em outra sessão. Recarregue e revise os dados antes de finalizar.'
            setInputError(message)
            toast.error(message)
            return
        }

        // Save the checkin to Supabase — disciplina base (antes da penalidade) e o
        // flag de liberação vão no payload; o servidor deriva a penalidade e o
        // valor final a partir do seu próprio relógio (não confia no client).
            const checkinPayload = {
                ...declaredForm,
                pontuacao_disciplina_base: rawDiscipline,
                fechamento_liberado: fechamentoLiberado,
            }
 const { error, code } = await saveCheckin(
     checkinPayload,
     metricScope,
     selectedDate,
     activeClosingContext.mainDate,
     false,
     metricScope === 'daily' ? flushed.revision : null,
 )
 if (code === 'DRAFT_VERSION_CONFLICT') {
     const message = 'Este fechamento foi atualizado em outra sessão. Recarregue e revise os dados antes de finalizar.'
     setInputError(message)
     toast.error(message)
     return
 }
 if (error) { toast.error(error); return }

        // MX-22.2 (AC-1/GAP-1): previousCheckin só é buscado uma vez na
        // virada de data (efeito acima, keyed em yesterdaySP) e nunca mais.
        // Sem isto, finalizar D-1 antes de meio-dia não troca a tela pra D0
        // de verdade — fica preso em "Ontem" até um F5. Recarrega direto
        // após o sucesso do submit, sem esperar o próximo render de data.
        if (metricScope === 'daily' && selectedDate === yesterdaySP) {
            fetchCheckinByDate(yesterdaySP, 'daily').then(setPreviousCheckin)
        }

        // Score/penalidade/liberação agora são persistidos pelo servidor
        // (lancamentos_diarios, EV-1.5/EV-1.6) — nada para gravar em localStorage.

        if (feedbackActionLock.actionIdsToJustify.length > 0) {
            const { error: feedbackActionError } = await justificarAcoesFeedback(
                feedbackActionLock.actionIdsToJustify,
                form.note,
            )
 if (feedbackActionError) {
 toast.error(feedbackActionError)
 return
 }
        }
        setChangedFields(new Set())
        setFieldErrors({})
        
        const submittedAtLabel = new Date().toLocaleTimeString('pt-BR', {
            timeZone: MX_TIMEZONE,
            hour: '2-digit',
            minute: '2-digit',
        })
        const submittedDateLabel = selectedDate.split('-').reverse().join('/')
        setSaveNotice({
            title: `Fechamento de ${submittedDateLabel} finalizado às ${submittedAtLabel}.`,
            detail: 'Fechamento concluído. Novos registros comerciais continuam disponíveis; correções deste fechamento devem ser solicitadas pelo Histórico.',
        })
        if (declaredProgressTotals.vendas > 0) setShowConfetti(true)
        toast.success('Fechamento finalizado com sucesso.')
 timerRef.current = setTimeout(() => setShowConfetti(false), 1200)
 } catch {
 toast.error('Não foi possível finalizar o fechamento. Tente novamente.')
 } finally {
 setSaving(false)
 }
 }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await submitCheckin()
    }

    const handleSaveDraft = async () => {
        if (saving) return

        setSaving(true)
        setInputError(null)

        try {
            // MX-22.2 (FEV-DATA-05): rascunho grava de verdade em
            // lancamentos_diarios (submission_status='draft'), não mais só
            // localStorage — sobrevive a refresh/troca de aba/dispositivo.
            // isSubmittedClosing já trata 'draft' como não finalizado, então
            // isso não aciona fechamentoConcluido nem a detecção de atraso.
            //
            // "Salvar agora" passa pelo mesmo coordenador do autosave: duas
            // gravações concorrentes da mesma linha poderiam terminar fora de
            // ordem e o clique manual venceria com dado mais velho.
            if (autosaveEnabled) {
                await autosave.saveNow(draftPayload)
                const state = autosave.getStateSnapshot()
                if (state.status === 'conflict') {
                    const message = 'Este fechamento foi atualizado em outra sessão. Recarregue e revise os dados.'
                    toast.error(message)
                    setInputError(message)
                    return
                }
                if (state.status === 'error') {
                    const message = state.error || 'Não foi possível salvar o rascunho.'
                    toast.error(message)
                    setInputError(message)
                    return
                }
            } else {
                const { error } = await saveCheckin(
                    draftPayload,
                    metricScope,
                    selectedDate,
                    activeClosingContext.mainDate,
                    true,
                )
                if (error) {
                    toast.error(error)
                    setInputError(error)
                    return
                }
            }

            setChangedFields(new Set())
            setSaveNotice({
                title: 'Rascunho salvo.',
                detail: 'O fechamento ainda não foi finalizado. Revise os números e finalize quando estiver pronto.',
            })
            toast.success('Rascunho salvo.')
        } catch {
            toast.error('Não foi possível salvar o rascunho.')
        } finally {
            setSaving(false)
        }
    }

    const saveTechnicalAdjustment = async (nextForm: CheckinForm, detailNote: string) => {
        if (saving) return { error: 'Salvamento em andamento.' }
        setSaving(true)
        setInputError(null)
        const normalizedForm: CheckinForm = {
            ...nextForm,
            leads: nextForm.leads_cart + nextForm.leads_net,
            visitas: nextForm.visitas_porta + nextForm.visitas_cart + nextForm.visitas_net,
            note: detailNote.trim() || nextForm.note,
        }
        const { error } = await saveCheckin(normalizedForm, 'adjustment', selectedDate)
        setSaving(false)
        if (error) {
            setInputError(error)
            toast.error(error)
            return { error }
        }
        setForm(normalizedForm)
        setChangedFields(new Set())
        setFieldErrors({})
        setSaveNotice({
            title: 'Ajustes técnicos registrados.',
            detail: 'O histórico foi atualizado e os indicadores serão recalculados para liderança.',
        })
        toast.success('Ajustes técnicos registrados.')
        return { error: null }
    }

    return {
        navigate,
        form,
        saving,
        showConfetti,
        changedFields,
        metricScope,
        inputError,
        fieldErrors,
        numberDrafts,
 saveNotice,
        currentTime,
        declaredForm,
        declaredProgressTotals,
        declaredTotals,
        effectiveForm,
        effectiveTotals,
 crmDailyCounters,
 historicalCheckin,
        loadingHistory,
        visitasCanalIndisponivel,
        customReferenceDate,
        hookLoading,
        referenceDate,
        checkinLoadError,
        crmDerived,
        totals,
        isLate,
        minutesUntilEditLock,
        declaredAllZero,
        hasCrmActivity,
        funnelError,
        mandatoryFeedbackActionsCount,
        setMetricScope,
        setCustomReferenceDate,
        updateField,
        updateNumberField,
        commitNumberField,
        handleExit,
        handleSubmit,
        submitCheckin,
        handleSaveDraft,
        autosaveState: autosave.state,
        autosaveEnabled,
        retryAutosave: autosave.retry,
        closingStep,
        setClosingStep,
        saveTechnicalAdjustment,
        // Added properties
selectedDate,
activeClosingContext,
clientesList,
        refetchClientesList,
        fechamentoLiberado,
        finalizadoAposPrazo,
        isPastDeadline,
        lockStage,
        avisarGerenteWhatsapp,
        spHours: spTime.hours,
        spMinutes: spTime.minutes,
        todaySP,
        yesterdaySP,
        supabaseUser,
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
        checkins,
        saveCheckin,
    }
}

export type CheckinPageContext = ReturnType<typeof useCheckinPage>
