import { useState, useEffect, useMemo, useRef } from 'react'
import { usePDI_MX, type PDISuggestedAction } from '@/hooks/usePDI_MX'
import { useTeam } from '@/hooks/useTeam'
import { useAuth } from '@/hooks/useAuth'
import { X, Target, LayoutDashboard, Zap, ChevronLeft, ChevronRight, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react'
import { Typography } from '@/components/atoms/Typography'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Card } from '@/components/molecules/Card'
import { toast } from '@/lib/toast'
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts'
import { cn } from '@/lib/utils'
import { chartTokens } from '@/lib/charts/tokens'
import { PDI_ORIGEM_NOTA } from '@/lib/pdi-self-assessment'
import { Dialog, DialogBody, DialogContent, DialogTitle } from '@/components/ui/dialog'

type WizardMeta = { prazo: string; tipo: string; descricao: string }
type WizardAction = { competencia_id: string; descricao_acao: string; data_conclusao: string; impacto: string; custo: string }
type WizardForm = {
    colaborador_id: string
    cargo_id: string
    proxima_revisao_data: string
    metas: WizardMeta[]
    avaliacoes: Record<string, number>
    plano_acao: WizardAction[]
}

const createInitialForm = (): WizardForm => ({
    colaborador_id: '',
    cargo_id: '',
    proxima_revisao_data: '',
    metas: [
        { prazo: '6_meses', tipo: 'pessoal', descricao: '' },
        { prazo: '6_meses', tipo: 'profissional', descricao: '' },
        { prazo: '6_meses', tipo: 'pessoal', descricao: '' },
        { prazo: '12_meses', tipo: 'pessoal', descricao: '' },
        { prazo: '12_meses', tipo: 'profissional', descricao: '' },
        { prazo: '12_meses', tipo: 'pessoal', descricao: '' },
        { prazo: '24_meses', tipo: 'pessoal', descricao: '' },
        { prazo: '24_meses', tipo: 'profissional', descricao: '' },
        { prazo: '24_meses', tipo: 'pessoal', descricao: '' },
    ],
    avaliacoes: {},
    plano_acao: Array.from({ length: 5 }, () => ({ competencia_id: '', descricao_acao: '', data_conclusao: '', impacto: 'medio', custo: 'medio' })),
})

const initialPreChecklist = { conversaIndividual: false, localReservado: false }
const initialClosingChecklist = { revisaoExplicada: false, impressaoCombinada: false, compromissoSimbolico: false }

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function restoreWizardForm(value: unknown): WizardForm | null {
    if (!isRecord(value)) return null
    const initial = createInitialForm()
    const savedMetas = Array.isArray(value.metas) ? value.metas : []
    const savedActions = Array.isArray(value.plano_acao) ? value.plano_acao : []
    const metas = initial.metas.map((meta, index) => {
        const saved = savedMetas[index]
        if (!isRecord(saved)) return meta
        return {
            prazo: typeof saved.prazo === 'string' ? saved.prazo : meta.prazo,
            tipo: typeof saved.tipo === 'string' ? saved.tipo : meta.tipo,
            descricao: typeof saved.descricao === 'string' ? saved.descricao : meta.descricao,
        }
    })
    const plano_acao = initial.plano_acao.map((action, index) => {
        const saved = savedActions[index]
        if (!isRecord(saved)) return action
        return {
            competencia_id: typeof saved.competencia_id === 'string' ? saved.competencia_id : action.competencia_id,
            descricao_acao: typeof saved.descricao_acao === 'string' ? saved.descricao_acao : action.descricao_acao,
            data_conclusao: typeof saved.data_conclusao === 'string' ? saved.data_conclusao : action.data_conclusao,
            impacto: typeof saved.impacto === 'string' ? saved.impacto : action.impacto,
            custo: typeof saved.custo === 'string' ? saved.custo : action.custo,
        }
    })
    const savedEvaluations = isRecord(value.avaliacoes) ? value.avaliacoes : {}
    const avaliacoes = Object.fromEntries(
        Object.entries(savedEvaluations).filter(([, nota]) => typeof nota === 'number' && Number.isFinite(nota)),
    ) as Record<string, number>

    return {
        colaborador_id: typeof value.colaborador_id === 'string' ? value.colaborador_id : '',
        cargo_id: typeof value.cargo_id === 'string' ? value.cargo_id : '',
        proxima_revisao_data: typeof value.proxima_revisao_data === 'string' ? value.proxima_revisao_data : '',
        metas,
        avaliacoes,
        plano_acao,
    }
}

function removeWizardDraft(key: string | null) {
    if (!key || typeof window === 'undefined') return
    try {
        window.sessionStorage.removeItem(key)
    } catch {
        // Storage can be unavailable in private browsing; the wizard remains usable.
    }
}

export function WizardPDI({ onClose, onSuccess }: { onClose: () => void, onSuccess: (sessionId?: string) => void }) {
    const { profile, storeId } = useAuth()
    const { sellers: teamMembers } = useTeam()
    const sellers = useMemo(
        () => teamMembers.filter(member => member.role === 'vendedor'),
        [teamMembers],
    )
    const { cargos, template, loading, error: dataError, fetchCargos, fetchTemplate, fetchSuggestedActions, saveSessionBundle } = usePDI_MX()
    
    const [currentStep, setCurrentStep] = useState(0)
    const [saving, setSaving] = useState(false)
    const [suggestedActions, setSuggestedActions] = useState<Record<string, PDISuggestedAction[]>>({})
    const [preChecklist, setPreChecklist] = useState(initialPreChecklist)
    const [closingChecklist, setClosingChecklist] = useState(initialClosingChecklist)

    const [form, setForm] = useState<WizardForm>(createInitialForm)
    const [validationMessage, setValidationMessage] = useState<string | null>(null)
    const [invalidFields, setInvalidFields] = useState<string[]>([])
    const [draftReady, setDraftReady] = useState(false)
    const [draftRestored, setDraftRestored] = useState(false)
    const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
    const skipAutosaveRef = useRef(false)

    const draftKey = useMemo(
        () => profile?.id ? `mx:pdi:draft:${profile.id}:${storeId || 'all'}` : null,
        [profile?.id, storeId],
    )

    const clearValidation = () => {
        setValidationMessage(null)
        setInvalidFields([])
    }

    const failValidation = (message: string, fields: string[] = []) => {
        setValidationMessage(message)
        setInvalidFields(fields)
        toast.error(message)
        focusFirstInvalidField(fields)
        return false
    }

    const isInvalid = (field: string) => invalidFields.includes(field)
    const describedBy = (field: string) => isInvalid(field) ? 'pdi-wizard-validation-error' : undefined

    const validationFieldId = (field: string) => {
        if (field === 'colaborador') return 'pdi-colaborador'
        if (field === 'cargo') return 'pdi-cargo'
        if (field === 'pre-conversa') return 'pdi-pre-conversa'
        if (field === 'pre-local') return 'pdi-pre-local'
        if (field === 'review-date') return 'pdi-review-date'
        if (field === 'actions') return 'pdi-action-0-competencia'
        if (field === 'closing-review') return 'pdi-closing-review'
        if (field === 'closing-print') return 'pdi-closing-print'
        if (field.startsWith('meta-')) return `pdi-meta-${field.slice('meta-'.length)}`
        if (field.startsWith('competencia-')) return `pdi-competencia-${field.slice('competencia-'.length)}`
        if (field.startsWith('action-')) return `pdi-${field}`
        return field
    }

    const focusFirstInvalidField = (fields: string[]) => {
        if (typeof window === 'undefined') return
        window.setTimeout(() => {
            const target = fields
                .map(validationFieldId)
                .map(id => document.getElementById(id))
                .find((element): element is HTMLElement => Boolean(element))
                || document.getElementById('pdi-wizard-validation-error')
            if (!target) return
            target.focus({ preventScroll: true })
            target.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }, 0)
    }

    useEffect(() => {
        setDraftReady(false)
        let restored = false
        if (draftKey && typeof window !== 'undefined') {
            try {
                const raw = window.sessionStorage.getItem(draftKey)
                if (raw) {
                    const draft = JSON.parse(raw) as Record<string, unknown>
                    const restoredForm = restoreWizardForm(draft.form)
                    if (restoredForm) {
                        setForm(restoredForm)
                        restored = true
                    }
                    if (typeof draft.currentStep === 'number' && Number.isFinite(draft.currentStep)) {
                        setCurrentStep(Math.max(0, Math.min(3, Math.trunc(draft.currentStep))))
                    }
                    if (isRecord(draft.preChecklist)) {
                        setPreChecklist({
                            conversaIndividual: draft.preChecklist.conversaIndividual === true,
                            localReservado: draft.preChecklist.localReservado === true,
                        })
                    }
                    if (isRecord(draft.closingChecklist)) {
                        setClosingChecklist({
                            revisaoExplicada: draft.closingChecklist.revisaoExplicada === true,
                            impressaoCombinada: draft.closingChecklist.impressaoCombinada === true,
                            compromissoSimbolico: draft.closingChecklist.compromissoSimbolico === true,
                        })
                    }
                }
            } catch {
                removeWizardDraft(draftKey)
            }
        }
        setDraftRestored(restored)
        setDraftReady(true)
    }, [draftKey])

    useEffect(() => {
        if (!draftReady || !draftKey || typeof window === 'undefined') return
        if (skipAutosaveRef.current) {
            skipAutosaveRef.current = false
            return
        }
        setDraftStatus('saving')
        const timeout = window.setTimeout(() => {
            try {
                window.sessionStorage.setItem(draftKey, JSON.stringify({
                    currentStep,
                    form,
                    preChecklist,
                    closingChecklist,
                    savedAt: new Date().toISOString(),
                }))
                setDraftStatus('saved')
            } catch {
                // The draft is an enhancement; a full session must still work without storage.
                setDraftStatus('idle')
            }
        }, 400)
        return () => window.clearTimeout(timeout)
    }, [draftKey, draftReady, currentStep, form, preChecklist, closingChecklist])

    const discardDraft = () => {
        skipAutosaveRef.current = true
        removeWizardDraft(draftKey)
        setCurrentStep(0)
        setForm(createInitialForm())
        setPreChecklist(initialPreChecklist)
        setClosingChecklist(initialClosingChecklist)
        setSuggestedActions({})
        setDraftRestored(false)
        setDraftStatus('idle')
        clearValidation()
    }

    const selectedSeller = useMemo(
        () => sellers.find(s => s.id === form.colaborador_id),
        [sellers, form.colaborador_id]
    )

    const selectedCargo = useMemo(
        () => cargos.find(c => c.id === form.cargo_id),
        [cargos, form.cargo_id]
    )

    useEffect(() => {
        fetchCargos().then(cargos => {
            const vendedor = cargos?.find(c => c.nome.toLowerCase().includes('consultor'))
            if (vendedor) setForm(f => f.cargo_id ? f : ({ ...f, cargo_id: vendedor.id }))
        })
    }, [fetchCargos])

    useEffect(() => {
        if (!form.cargo_id) return
        let active = true
        fetchTemplate(form.cargo_id).then(t => {
                if (!active) return
                if (t?.competencias) {
                    const initialEval: Record<string, number> = {}
                    t.competencias.forEach(c => initialEval[c.id] = t.escala?.[0]?.nota ?? 6)
                    setForm(f => Object.keys(f.avaliacoes).length ? f : ({ ...f, avaliacoes: initialEval }))
                }
            })
        return () => { active = false }
    }, [form.cargo_id, fetchTemplate])

    // Fetch suggested actions when a top gap is selected in the action plan
    const handleCompetenciaAcaoChange = async (index: number, compId: string) => {
        clearValidation()
        setForm(current => {
            const novoPlano = [...current.plano_acao]
            novoPlano[index] = { ...novoPlano[index], competencia_id: compId, descricao_acao: '' }
            return { ...current, plano_acao: novoPlano }
        })

        if (compId && !suggestedActions[compId]) {
            const actions = await fetchSuggestedActions(compId)
            setSuggestedActions(prev => ({ ...prev, [compId]: actions }))
        }
    }

    const topGaps = useMemo(() => {
        if (!template?.competencias) return []
        return template.competencias.map(c => ({
            id: c.id,
            nome: c.nome,
            alvo: c.alvo,
            nota: form.avaliacoes[c.id] ?? c.alvo,
            gap: c.alvo - (form.avaliacoes[c.id] ?? c.alvo)
        })).sort((a, b) => b.gap - a.gap).slice(0, 5)
    }, [template, form.avaliacoes])

    const validateMetas = () => {
        const groups = ['6_meses', '12_meses', '24_meses']
        for (const prazo of groups) {
            const groupIndexes = form.metas.map((meta, index) => meta.prazo === prazo ? index : -1).filter(index => index >= 0)
            const metasDoPrazo = form.metas.filter(m => m.prazo === prazo && m.descricao.trim())
            const temPessoal = metasDoPrazo.some(m => m.tipo === 'pessoal')
            const temProfissional = metasDoPrazo.some(m => m.tipo === 'profissional')
            if (metasDoPrazo.length !== 3) {
                return failValidation(`Para ${prazo.replace('_', ' ')}, preencha exatamente 3 metas.`, groupIndexes.map(index => `meta-${index}`))
            }
            if (!temPessoal || !temProfissional) {
                return failValidation(`Para ${prazo.replace('_', ' ')}, é necessário ao menos 1 meta pessoal e 1 profissional.`, groupIndexes.map(index => `meta-${index}`))
            }
        }
        return true
    }

    const validateMapeamento = () => {
        if (!template?.competencias?.length || !template?.escala?.length) {
            return failValidation('A metodologia do cargo ainda não carregou competências e escala.', ['cargo'])
        }

        const min = template.escala[0].nota
        const max = template.escala[template.escala.length - 1].nota
        const missing = template.competencias.find(c => typeof form.avaliacoes[c.id] !== 'number')
        if (missing) {
            return failValidation(`Informe a nota da competência ${missing.nome}.`, [`competencia-${missing.id}`])
        }

        const outOfRange = template.competencias.find(c => {
            const nota = form.avaliacoes[c.id]
            return nota < min || nota > max
        })
        if (outOfRange) {
            return failValidation(`A nota de ${outOfRange.nome} precisa estar entre ${min} e ${max}.`, [`competencia-${outOfRange.id}`])
        }

        return true
    }

    const parseDateOnly = (value: string) => new Date(`${value}T12:00:00`)

    const addMonths = (date: Date, months: number) => {
        const next = new Date(date)
        next.setMonth(next.getMonth() + months)
        return next
    }

    const validateAcoes = () => {
        if (!validateMapeamento()) return false
        if (form.plano_acao.length !== 5) {
            return failValidation('O PDI deve conter exatamente 5 ações de desenvolvimento.', ['actions'])
        }

        const topGapIds = new Set(topGaps.map(g => g.id))
        const selectedCompetencias = new Set<string>()
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const sixMonthsLimit = addMonths(today, 6)

        for (let i = 0; i < form.plano_acao.length; i++) {
            const a = form.plano_acao[i]
            if (!a.competencia_id || !a.descricao_acao.trim() || !a.data_conclusao) {
                const fields = [
                    !a.competencia_id ? `action-${i}-competencia` : '',
                    !a.descricao_acao.trim() ? `action-${i}-descricao` : '',
                    !a.data_conclusao ? `action-${i}-data` : '',
                ].filter(Boolean)
                return failValidation(`Ação ${i + 1} está incompleta. Selecione a competência, descreva a ação e informe a data.`, fields)
            }
            if (!topGapIds.has(a.competencia_id)) {
                return failValidation(`Ação ${i + 1} precisa estar vinculada a uma das 5 maiores lacunas.`, [`action-${i}-competencia`])
            }
            if (selectedCompetencias.has(a.competencia_id)) {
                return failValidation('Use uma competência diferente para cada uma das 5 ações.', [`action-${i}-competencia`])
            }
            selectedCompetencias.add(a.competencia_id)

            const actionDate = parseDateOnly(a.data_conclusao)
            if (actionDate < today || actionDate > sixMonthsLimit) {
                return failValidation(`Ação ${i + 1} precisa ter conclusão dentro dos próximos 6 meses.`, [`action-${i}-data`])
            }
        }
        if (!form.proxima_revisao_data) {
            return failValidation('Informe a data da próxima revisão mensal.', ['review-date'])
        }
        const reviewDate = parseDateOnly(form.proxima_revisao_data)
        if (reviewDate < today || reviewDate > addMonths(today, 2)) {
            return failValidation('A próxima revisão precisa estar agendada dentro do ciclo mensal.', ['review-date'])
        }
        return true
    }

    const handleNext = () => {
        clearValidation()
        if (currentStep === 0 && (!form.colaborador_id || !form.cargo_id)) {
            return failValidation('Selecione colaborador e cargo.', [!form.colaborador_id ? 'colaborador' : '', !form.cargo_id ? 'cargo' : ''].filter(Boolean))
        }
        if (currentStep === 0 && !(selectedSeller?.store_id || storeId)) return failValidation('O vendedor selecionado precisa estar vinculado a uma loja.', ['colaborador'])
        if (currentStep === 0 && (!preChecklist.conversaIndividual || !preChecklist.localReservado)) {
            return failValidation('Confirme a aplicação individual e o local reservado antes de iniciar.', [!preChecklist.conversaIndividual ? 'pre-conversa' : '', !preChecklist.localReservado ? 'pre-local' : ''].filter(Boolean))
        }
        if (currentStep === 1 && !validateMetas()) return
        if (currentStep === 2 && !validateMapeamento()) return
        setCurrentStep(s => s + 1)
    }

    const handleSubmit = async () => {
        clearValidation()
        if (!validateAcoes()) return
        if (!closingChecklist.revisaoExplicada || !closingChecklist.impressaoCombinada) {
            failValidation('Confirme a revisão mensal e a impressão/entrega do PDI antes de concluir.', [
                !closingChecklist.revisaoExplicada ? 'closing-review' : '',
                !closingChecklist.impressaoCombinada ? 'closing-print' : '',
            ].filter(Boolean))
            return
        }
        setSaving(true)
        try {
            const payload = {
                colaborador_id: form.colaborador_id,
                loja_id: selectedSeller?.store_id || storeId || '',
                cargo_id: form.cargo_id,
                proxima_revisao_data: form.proxima_revisao_data,
                metas: form.metas.filter(m => m.descricao.trim()),
                avaliacoes: Object.entries(form.avaliacoes).map(([competencia_id, nota_atribuida]) => {
                    const comp = template?.competencias.find(c => c.id === competencia_id)
                    return { competencia_id, nota_atribuida, alvo: comp?.alvo || selectedCargo?.nota_max || 10, origem_nota: PDI_ORIGEM_NOTA.GESTOR }
                }),
                plano_acao: form.plano_acao
            }
            const sessionId = await saveSessionBundle(payload)
            toast.success('Sessão de PDI concluída com sucesso. O documento está pronto para impressão.')
            skipAutosaveRef.current = true
            removeWizardDraft(draftKey)
            setDraftRestored(false)
            setDraftStatus('idle')
            onSuccess(String(sessionId || ''))
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao salvar PDI'
            setValidationMessage(message)
            setInvalidFields([])
            toast.error(message)
        } finally {
            setSaving(false)
        }
    }

    const randomFrase = useMemo(() => template?.frases?.[Math.floor(Math.random() * template.frases.length)] || '', [template])
    const steps = [
        { id: 'setup', label: 'Especialista', icon: Target },
        { id: 'metas', label: 'Metas (7 min)', icon: Target },
        { id: 'skills', label: 'Mapeamento (10 min)', icon: LayoutDashboard },
        { id: 'actions', label: 'Plano de Ação (11 min)', icon: Zap }
    ]

    return (
        <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
            <DialogContent showClose={false} size="xl" className="max-w-[var(--mx-overlay-size-xl)] gap-0 border-none bg-white p-0">
                <header className="flex shrink-0 flex-col gap-4 border-b border-border bg-white p-4 shadow-sm sm:gap-5 sm:p-6 lg:p-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-mx-sm">
                            <div className="w-mx-xl h-mx-xl rounded-2xl bg-brand-primary text-white flex items-center justify-center shadow-sm"><Target size={24} /></div>
                            <div>
                                <DialogTitle>
                                    <Typography variant="h2" as="span" className="tracking-tighter">Sessão PDI MX 360º</Typography>
                                </DialogTitle>
                                <Typography variant="tiny" tone="brand" className="font-bold">{steps[currentStep].label}</Typography>
                            </div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar sessão de PDI" className="rounded-mx-full w-mx-xl h-mx-xl bg-surface-alt hover:bg-border-default"><X size={24} /></Button>
                    </div>
                    {randomFrase && (
                        <div className="bg-brand-primary-subtle border border-brand-primary/20 p-mx-sm rounded-2xl flex items-center gap-mx-sm">
                            <Sparkles className="text-status-success-text shrink-0" size={20} />
                            <Typography variant="p" tone="brand" className="text-sm font-bold italic">{randomFrase}</Typography>
                        </div>
                    )}
                    {draftRestored && (
                        <div className="flex flex-col gap-3 rounded-2xl border border-status-info/20 bg-status-info-surface p-3 text-sm text-status-info-text sm:flex-row sm:items-center sm:justify-between">
                            <span>Rascunho restaurado nesta sessão. Você pode continuar de onde parou.</span>
                            <Button type="button" variant="outline" size="sm" onClick={discardDraft} className="w-full border-status-info/30 bg-white sm:w-auto">Descartar rascunho</Button>
                        </div>
                    )}
                    <div className="flex items-center justify-between gap-3">
                        <Typography variant="tiny" className="font-semibold text-muted-foreground">Etapa {currentStep + 1} de {steps.length}</Typography>
                        <Typography variant="tiny" tone="muted">Preenchimento do PDI</Typography>
                    </div>
                    {draftKey && draftStatus !== 'idle' && (
                        <Typography variant="tiny" tone="muted" aria-live="polite">
                            {draftStatus === 'saving' ? 'Salvando rascunho...' : 'Rascunho salvo automaticamente nesta sessão.'}
                        </Typography>
                    )}
                    <div className="flex items-center justify-between gap-mx-sm" role="progressbar" aria-label="Progresso do preenchimento do PDI" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={currentStep + 1}>
                        {steps.map((step, idx) => (
                            <div key={step.id} className="flex-1 flex flex-col gap-mx-xs">
                                <div className={cn("h-mx-xs rounded-mx-full transition-all duration-500", idx <= currentStep ? "bg-brand-primary" : "bg-surface-alt")} />
                            </div>
                        ))}
                    </div>
                    {(validationMessage || dataError) && (
                        <div id="pdi-wizard-validation-error" role="alert" aria-live="assertive" tabIndex={-1} className="flex items-start gap-2 rounded-xl border border-status-error/20 bg-status-error-surface px-3 py-2.5 text-sm text-status-error-text">
                            <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                            <span>{validationMessage || 'Não foi possível carregar toda a metodologia. Tente novamente ou feche e reabra a sessão.'}</span>
                        </div>
                    )}
                </header>

                <DialogBody className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    {loading && !template ? (
                        <div className="flex justify-center py-20"><Typography variant="h3" className="animate-pulse">Sincronizando Metodologia MX...</Typography></div>
                    ) : (
                        <>
                            {currentStep === 0 && (
                                <div className="mx-auto max-w-2xl space-y-6">
                                    <div className="space-y-mx-sm">
                                        <label htmlFor="pdi-colaborador" className="text-sm font-bold text-foreground">1. Selecione o especialista</label>
                                        <select
                                            id="pdi-colaborador"
                                            value={form.colaborador_id}
                                            onChange={e => { clearValidation(); setForm(current => ({ ...current, colaborador_id: e.target.value })) }}
                                            aria-invalid={isInvalid('colaborador') || undefined}
                                            aria-describedby={describedBy('colaborador')}
                                            className="w-full h-mx-2xl px-6 bg-surface-alt rounded-2xl font-bold text-lg outline-none border focus:border-brand-primary"
                                        >
                                            <option value="">Selecione o vendedor...</option>
                                            {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-mx-sm">
                                        <label htmlFor="pdi-cargo" className="text-sm font-bold text-foreground">2. Escala de avaliação (cargo)</label>
                                        <select
                                            id="pdi-cargo"
                                            value={form.cargo_id}
                                            onChange={e => {
                                                clearValidation()
                                                setForm(current => ({ ...current, cargo_id: e.target.value, avaliacoes: e.target.value === current.cargo_id ? current.avaliacoes : {} }))
                                            }}
                                            aria-invalid={isInvalid('cargo') || undefined}
                                            aria-describedby={describedBy('cargo')}
                                            className="w-full h-mx-2xl px-6 bg-surface-alt rounded-2xl font-bold text-lg outline-none border focus:border-brand-primary"
                                        >
                                            <option value="">Selecione o nível do cargo...</option>
                                            {cargos.map(c => <option key={c.id} value={c.id}>Nível {c.nivel} - {c.nome} ({c.nota_min} a {c.nota_max})</option>)}
                                        </select>
                                    </div>
                                    <Card className="space-y-mx-sm border bg-surface-alt p-mx-md">
                                        <Typography variant="tiny" tone="brand" className="font-bold">Protocolo de Aplicação</Typography>
                                        <div className="grid gap-mx-xs">
                                            <label className="flex items-start gap-mx-sm text-sm font-bold text-muted-foreground">
                                                <input
                                                    id="pdi-pre-conversa"
                                                    type="checkbox"
                                                    checked={preChecklist.conversaIndividual}
                                                    onChange={e => { clearValidation(); setPreChecklist(prev => ({ ...prev, conversaIndividual: e.target.checked })) }}
                                                    aria-invalid={isInvalid('pre-conversa') || undefined}
                                                    aria-describedby={describedBy('pre-conversa')}
                                                    className="mt-1 accent-brand-primary"
                                                />
                                                Aplicação individual prevista em 45 minutos, seguindo a pauta de metas, competências e ações.
                                            </label>
                                            <label className="flex items-start gap-mx-sm text-sm font-bold text-muted-foreground">
                                                <input
                                                    id="pdi-pre-local"
                                                    type="checkbox"
                                                    checked={preChecklist.localReservado}
                                                    onChange={e => { clearValidation(); setPreChecklist(prev => ({ ...prev, localReservado: e.target.checked })) }}
                                                    aria-invalid={isInvalid('pre-local') || undefined}
                                                    aria-describedby={describedBy('pre-local')}
                                                    className="mt-1 accent-brand-primary"
                                                />
                                                Local reservado na loja, com conversa individual e sem interrupções.
                                            </label>
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {currentStep === 1 && (
                                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                                    {['6_meses', '12_meses', '24_meses'].map(prazo => (
                                        <Card key={prazo} className="space-y-4 border-none bg-surface-alt p-mx-md shadow-sm">
                                            <Typography variant="h3" className="border-b border-border/10 pb-3 font-bold">Visão {prazo.replace('_', ' ')}</Typography>
                                            {form.metas.map((meta, idx) => meta.prazo === prazo && (
                                                <div key={idx} className={cn('space-y-mx-xs rounded-2xl border border-border bg-white p-mx-sm shadow-sm', isInvalid(`meta-${idx}`) && 'border-status-error ring-1 ring-status-error/30')}>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <label htmlFor={`pdi-meta-type-${idx}`} className="text-mx-tiny font-semibold text-muted-foreground">Meta {idx + 1}</label>
                                                        <select
                                                            id={`pdi-meta-type-${idx}`}
                                                            value={meta.tipo}
                                                            onChange={e => { clearValidation(); setForm(current => { const nm = [...current.metas]; nm[idx] = { ...nm[idx], tipo: e.target.value }; return { ...current, metas: nm } }) }}
                                                            aria-label={`Tipo da meta ${idx + 1} para ${prazo.replace('_', ' ')}`}
                                                            aria-invalid={isInvalid(`meta-${idx}`) || undefined}
                                                            aria-describedby={describedBy(`meta-${idx}`)}
                                                            className="text-mx-tiny font-bold uppercase text-status-success-text bg-transparent outline-none cursor-pointer"
                                                        >
                                                            <option value="pessoal">META PESSOAL</option>
                                                            <option value="profissional">META PROFISSIONAL</option>
                                                        </select>
                                                    </div>
                                                    <label htmlFor={`pdi-meta-${idx}`} className="sr-only">Descrição da meta {idx + 1} para {prazo.replace('_', ' ')}</label>
                                                    <textarea
                                                        id={`pdi-meta-${idx}`}
                                                        value={meta.descricao}
                                                        placeholder="Descreva a meta..."
                                                        aria-label={`Descrição da meta ${idx + 1} para ${prazo.replace('_', ' ')}`}
                                                        aria-invalid={isInvalid(`meta-${idx}`) || undefined}
                                                        aria-describedby={describedBy(`meta-${idx}`)}
                                                        onChange={e => { clearValidation(); setForm(current => { const nm = [...current.metas]; nm[idx] = { ...nm[idx], descricao: e.target.value }; return { ...current, metas: nm } }) }}
                                                        className="min-h-24 w-full resize-none text-sm font-bold outline-none placeholder:font-normal"
                                                    />
                                                </div>
                                            ))}
                                        </Card>
                                    ))}
                                </div>
                            )}

                            {currentStep === 2 && template && (
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-4 rounded-2xl bg-foreground p-mx-md text-white sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0">
                                            <Typography variant="h3" tone="white" className="">Mapeamento da Capacidade Atual</Typography>
                                            <Typography variant="p" tone="white" className="opacity-80">Avalie as competências do especialista de acordo com a escala do cargo. A lacuna é a diferença entre a nota atual e o alvo.</Typography>
                                        </div>
                                        <div className="shrink-0 sm:text-right">
                                            <Typography variant="tiny" tone="white" className="opacity-60 font-bold">Escala do cargo</Typography>
                                            <Typography variant="h2" tone="white">{template.escala[0]?.nota} a {template.escala[template.escala.length - 1]?.nota}</Typography>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                        {['tecnica', 'comportamental'].map(tipo => (
                                            <div key={tipo} className="space-y-mx-md">
                                                <Typography variant="h3" className="border-b pb-3 font-bold">Competências {tipo === 'tecnica' ? 'técnicas' : 'comportamentais'}</Typography>
                                                {template.competencias.filter(c => c.tipo === tipo).map(c => {
                                                    const nota = form.avaliacoes[c.id] ?? template.escala[0]?.nota ?? 0
                                                    const descritor = template.escala.find(e => e.nota === nota)?.descritor || ''
                                                    return (
                                                        <div key={c.id} className={cn('space-y-mx-sm rounded-2xl border border-border bg-surface-alt p-mx-md transition-colors hover:border-brand-primary/50', isInvalid(`competencia-${c.id}`) && 'border-status-error ring-1 ring-status-error/30')}>
                                                            <div className="flex items-start justify-between gap-mx-sm">
                                                                <div className="min-w-0">
                                                                    <label htmlFor={`pdi-competencia-${c.id}`} className="font-bold text-foreground">Nota de {c.nome}</label>
                                                                    <Typography variant="tiny" tone="muted" className="mt-1 leading-snug">{c.descricao_completa}</Typography>
                                                                </div>
                                                                <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-border text-center min-w-mx-20">
                                                                    <Typography variant="h2" tone="brand">{nota}</Typography>
                                                                </div>
                                                            </div>
                                                            
                                                            <input
                                                                id={`pdi-competencia-${c.id}`}
                                                                type="range" min={template.escala[0]?.nota} max={template.escala[template.escala.length - 1]?.nota}
                                                                value={nota}
                                                                aria-label={`Nota de ${c.nome}`}
                                                                aria-invalid={isInvalid(`competencia-${c.id}`) || undefined}
                                                                aria-describedby={describedBy(`competencia-${c.id}`)}
                                                                onChange={e => { clearValidation(); setForm(f => ({ ...f, avaliacoes: { ...f.avaliacoes, [c.id]: Number(e.target.value) } })) }}
                                                                className="w-full accent-brand-primary"
                                                            />
                                                            
                                                            <div className="flex justify-between items-center bg-white p-mx-xs rounded-xl text-xs font-bold text-muted-foreground border border-border">
                                                                <span className="flex items-center gap-mx-xs text-status-success-text/80"><AlertCircle size={14} aria-hidden="true" /> Ind: {c.indicador}</span>
                                                                <span className="uppercase text-mx-tiny tracking-widest">{descritor}</span>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 && template && (
                                <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                                    <div className="space-y-mx-md xl:col-span-4">
                                        <Card className="flex h-mx-96 flex-col items-center justify-center border-none bg-surface-alt p-mx-md shadow-sm">
                                            <Typography variant="tiny" className="mb-4 font-bold">Radar de competências</Typography>
                                            
                                            {/* Tabela Acessível para Leitores de Tela */}
                                            <table className="sr-only">
                                                <caption>Mapeamento de Competências e Notas</caption>
                                                <thead>
                                                    <tr>
                                                        <th scope="col">Competência</th>
                                                        <th scope="col">Nota Atual</th>
                                                        <th scope="col">Alvo</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {template.competencias.map(c => (
                                                        <tr key={c.id}>
                                                            <td>{c.nome}</td>
                                                            <td>{form.avaliacoes[c.id] ?? 0}</td>
                                                            <td>{c.alvo}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>

                                            <ResponsiveContainer width="100%" height="100%">
                                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={template.competencias.map(c => ({ name: c.nome, nota: form.avaliacoes[c.id] ?? 0, alvo: c.alvo, fullMark: c.alvo }))}>
                                                    <PolarGrid stroke="var(--color-border-subtle)" />
                                                    <PolarAngleAxis dataKey="name" tick={{ fill: chartTokens.axisTickStrong(), fontSize: 9, fontWeight: 900 }} />
                                                    <Radar name="Alvo" dataKey="alvo" stroke={chartTokens.axisTickMuted()} strokeDasharray="3 3" fill="transparent" />
                                                    <Radar name="Nota" dataKey="nota" stroke="var(--color-brand-primary)" strokeWidth={2} fill="var(--color-brand-primary)" fillOpacity={0.3} />
                                                </RadarChart>
                                            </ResponsiveContainer>
                                        </Card>
                                        <div className="space-y-mx-xs">
                                            <Typography variant="tiny" className="font-bold">Top 5 maiores lacunas</Typography>
                                            <Typography variant="tiny" tone="muted">Quanto maior a diferença entre nota e alvo, maior a prioridade.</Typography>
                                            {topGaps.map((gap, i) => (
                                                <div key={gap.id} className="flex items-center justify-between gap-3 rounded-xl border border-status-error/20 bg-white p-mx-xs shadow-sm">
                                                    <Typography variant="p" className="text-xs font-bold">{i + 1}. {gap.nome}</Typography>
                                                    <div className="text-right">
                                                        <Typography variant="mono" className="text-mx-tiny">Nota: {gap.nota}/{gap.alvo}</Typography>
                                                        <Typography variant="tiny" className="text-status-error-text font-bold">{gap.gap > 0 ? `Lacuna: ${gap.gap} ${gap.gap === 1 ? 'ponto' : 'pontos'}` : 'No alvo'}</Typography>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-mx-md xl:col-span-8">
                                        <div className="flex flex-col gap-3 border-b border-border-subtle pb-4 sm:flex-row sm:items-end sm:justify-between">
                                            <div>
                                                <Typography variant="h3" className="font-bold">5 ações de desenvolvimento</Typography>
                                                <Typography variant="tiny" tone="muted">Cada ação deve atacar uma lacuna diferente.</Typography>
                                            </div>
                                            <div className="flex flex-col sm:items-end">
                                                <label htmlFor="pdi-review-date" className="text-mx-tiny font-bold uppercase tracking-wide text-muted-foreground">Revisão mensal</label>
                                                <input
                                                    id="pdi-review-date"
                                                    type="date"
                                                    value={form.proxima_revisao_data}
                                                    onChange={e => { clearValidation(); setForm(current => ({ ...current, proxima_revisao_data: e.target.value })) }}
                                                    aria-invalid={isInvalid('review-date') || undefined}
                                                    aria-describedby={describedBy('review-date')}
                                                    className="text-sm font-bold text-status-success-text outline-none"
                                                />
                                            </div>
                                        </div>

                                        {form.plano_acao.map((acao, idx) => (
                                            <div key={idx} className={cn('space-y-mx-sm rounded-2xl border border-border bg-surface-alt p-mx-md', ['action-' + idx + '-competencia', 'action-' + idx + '-descricao', 'action-' + idx + '-data'].some(isInvalid) && 'border-status-error ring-1 ring-status-error/30')}>
                                                <div className="flex items-center gap-mx-sm">
                                                    <div className="w-mx-lg h-mx-lg rounded-mx-full bg-brand-primary text-white flex items-center justify-center font-bold text-xs shrink-0">{idx + 1}</div>
                                                    <label htmlFor={`pdi-action-${idx}-competencia`} className="sr-only">Competência da ação {idx + 1}</label>
                                                    <select
                                                        id={`pdi-action-${idx}-competencia`}
                                                        value={acao.competencia_id}
                                                        onChange={e => handleCompetenciaAcaoChange(idx, e.target.value)}
                                                        aria-label={`Competência da ação ${idx + 1}`}
                                                        aria-invalid={isInvalid(`action-${idx}-competencia`) || undefined}
                                                        aria-describedby={describedBy(`action-${idx}-competencia`)}
                                                        className="flex-1 h-mx-xl px-4 bg-white border border-border rounded-2xl text-sm font-bold outline-none uppercase"
                                                    >
                                                        <option value="">-- Vincular a uma lacuna --</option>
                                                        {topGaps.map(g => <option key={g.id} value={g.id}>{g.nome} ({g.gap > 0 ? `${g.gap} ${g.gap === 1 ? 'ponto' : 'pontos'} abaixo` : 'no alvo'})</option>)}
                                                    </select>
                                                </div>

                                                {acao.competencia_id && suggestedActions[acao.competencia_id]?.length > 0 && (
                                                    <div className="pl-12">
                                                        <label htmlFor={`pdi-action-${idx}-recommended`} className="sr-only">Ação recomendada para a ação {idx + 1}</label>
                                                        <select
                                                            id={`pdi-action-${idx}-recommended`}
                                                            aria-label={`Ação recomendada para a ação ${idx + 1}`}
                                                            onChange={e => { clearValidation(); setForm(current => { const np = [...current.plano_acao]; np[idx] = { ...np[idx], descricao_acao: e.target.value }; return { ...current, plano_acao: np } }) }}
                                                            className="w-full p-mx-xs bg-brand-primary-subtle border border-brand-primary/20 rounded-xl text-xs font-bold text-status-success-text outline-none cursor-pointer"
                                                        >
                                                            <option value="">✨ Selecionar Ação Recomendada da MX...</option>
                                                            {suggestedActions[acao.competencia_id].map(sa => (
                                                                <option key={sa.id} value={sa.descricao_acao}>{sa.descricao_acao}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}

                                                <div className="pl-12 space-y-mx-sm">
                                                    <label htmlFor={`pdi-action-${idx}-descricao`} className="sr-only">Descrição da ação {idx + 1}</label>
                                                    <textarea
                                                        id={`pdi-action-${idx}-descricao`}
                                                        value={acao.descricao_acao}
                                                        placeholder="Descreva a ação de desenvolvimento..."
                                                        aria-label={`Descrição da ação ${idx + 1}`}
                                                        aria-invalid={isInvalid(`action-${idx}-descricao`) || undefined}
                                                        aria-describedby={describedBy(`action-${idx}-descricao`)}
                                                        onChange={e => { clearValidation(); setForm(current => { const np = [...current.plano_acao]; np[idx] = { ...np[idx], descricao_acao: e.target.value }; return { ...current, plano_acao: np } }) }}
                                                        className="min-h-24 w-full resize-none rounded-2xl border border-border bg-white p-mx-sm text-sm font-bold outline-none"
                                                    />
                                                    <div className="grid grid-cols-1 gap-mx-sm sm:grid-cols-3">
                                                        <div className="min-w-0">
                                                            <label htmlFor={`pdi-action-${idx}-data`} className="mb-1 block text-mx-tiny font-bold uppercase tracking-wide text-muted-foreground">Conclusão</label>
                                                            <input
                                                                id={`pdi-action-${idx}-data`}
                                                                type="date"
                                                                aria-label={`Data de conclusão da ação ${idx + 1}`}
                                                                aria-invalid={isInvalid(`action-${idx}-data`) || undefined}
                                                                aria-describedby={describedBy(`action-${idx}-data`)}
                                                                value={acao.data_conclusao}
                                                                onChange={e => { clearValidation(); setForm(current => { const np = [...current.plano_acao]; np[idx] = { ...np[idx], data_conclusao: e.target.value }; return { ...current, plano_acao: np } }) }}
                                                                className="w-full h-mx-xl rounded-2xl border border-border bg-white px-4 text-sm font-bold outline-none"
                                                            />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <label htmlFor={`pdi-action-${idx}-impacto`} className="mb-1 block text-mx-tiny font-bold uppercase tracking-wide text-muted-foreground">Impacto</label>
                                                            <select id={`pdi-action-${idx}-impacto`} aria-label={`Impacto da ação ${idx + 1}`} value={acao.impacto} onChange={e => { clearValidation(); setForm(current => { const np = [...current.plano_acao]; np[idx] = { ...np[idx], impacto: e.target.value }; return { ...current, plano_acao: np } }) }} className="w-full h-mx-xl rounded-2xl border border-border bg-white px-4 text-sm font-bold uppercase outline-none">
                                                                <option value="alto">Alto</option><option value="medio">Médio</option><option value="baixo">Baixo</option>
                                                            </select>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <label htmlFor={`pdi-action-${idx}-custo`} className="mb-1 block text-mx-tiny font-bold uppercase tracking-wide text-muted-foreground">Custo</label>
                                                            <select id={`pdi-action-${idx}-custo`} aria-label={`Custo da ação ${idx + 1}`} value={acao.custo} onChange={e => { clearValidation(); setForm(current => { const np = [...current.plano_acao]; np[idx] = { ...np[idx], custo: e.target.value }; return { ...current, plano_acao: np } }) }} className="w-full h-mx-xl rounded-2xl border border-border bg-white px-4 text-sm font-bold uppercase outline-none">
                                                                <option value="alto">Alto</option><option value="medio">Médio</option><option value="baixo">Baixo</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        <Card className="space-y-mx-sm border border-brand-primary/20 bg-white p-mx-md shadow-sm">
                                            <Typography variant="tiny" tone="brand" className="font-bold">Encerramento da Sessão</Typography>
                                            <div className="grid gap-mx-xs">
                                                <label className="flex items-start gap-mx-sm text-sm font-bold text-muted-foreground">
                                                    <input
                                                        id="pdi-closing-review"
                                                        type="checkbox"
                                                        checked={closingChecklist.revisaoExplicada}
                                                        onChange={e => { clearValidation(); setClosingChecklist(prev => ({ ...prev, revisaoExplicada: e.target.checked })) }}
                                                        aria-invalid={isInvalid('closing-review') || undefined}
                                                        aria-describedby={describedBy('closing-review')}
                                                        className="mt-1 accent-brand-primary"
                                                    />
                                                    Próximo passo explicado: no próximo mês haverá nova conversa para analisar evolução e apoio necessário.
                                                </label>
                                                <label className="flex items-start gap-mx-sm text-sm font-bold text-muted-foreground">
                                                    <input
                                                        id="pdi-closing-print"
                                                        type="checkbox"
                                                        checked={closingChecklist.impressaoCombinada}
                                                        onChange={e => { clearValidation(); setClosingChecklist(prev => ({ ...prev, impressaoCombinada: e.target.checked })) }}
                                                        aria-invalid={isInvalid('closing-print') || undefined}
                                                        aria-describedby={describedBy('closing-print')}
                                                        className="mt-1 accent-brand-primary"
                                                    />
                                                    Impressão e entrega do PDF combinadas; ao concluir, o sistema abre Capa, Vendedor 1 e PDI para impressão.
                                                </label>
                                                <label className="flex items-start gap-mx-sm text-sm font-bold text-muted-foreground">
                                                    <input
                                                        id="pdi-closing-symbolic"
                                                        type="checkbox"
                                                        checked={closingChecklist.compromissoSimbolico}
                                                        onChange={e => { clearValidation(); setClosingChecklist(prev => ({ ...prev, compromissoSimbolico: e.target.checked })) }}
                                                        className="mt-1 accent-brand-primary"
                                                    />
                                                    Compromisso simbólico: combine um gesto simples que represente o próximo passo, ou marque como dispensado.
                                                </label>
                                            </div>
                                        </Card>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </DialogBody>

                <footer className="flex shrink-0 flex-col gap-mx-md border-t border-border bg-white p-4 sm:flex-row sm:justify-between sm:p-6 lg:p-8">
                    <Button type="button" variant="ghost" onClick={() => currentStep > 0 ? setCurrentStep(s => s - 1) : onClose()} className="h-mx-14 w-full rounded-mx-full border border-border px-8 text-xs font-bold uppercase sm:w-auto">
                        <ChevronLeft size={18} className="mr-2" /> {currentStep === 0 ? 'CANCELAR' : 'VOLTAR'}
                    </Button>
                    <Button type="button" onClick={currentStep < 3 ? handleNext : handleSubmit} disabled={saving} className="h-mx-14 w-full rounded-mx-full px-6 text-xs font-bold sm:w-auto sm:px-12">
                        {saving ? <div className="animate-spin mr-2"><LayoutDashboard size={18}/></div> : (currentStep === 3 ? <CheckCircle2 size={18} className="mr-2" /> : <ChevronRight size={18} className="ml-2" />)}
                        {currentStep === 3 ? 'CONCLUIR SESSÃO & GERAR PDI' : 'PRÓXIMO'}
                    </Button>
                </footer>
            </DialogContent>
        </Dialog>
    );
}
