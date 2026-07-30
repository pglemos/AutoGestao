import { useEffect, useState } from 'react'
import { ChevronDown, Save, RefreshCw, ShieldCheck, ShieldAlert, History, Mail, Info, BarChart3, Target } from 'lucide-react'
import { useStores } from '@/hooks/useTeam'
import { useStoreDeliveryRules } from '@/hooks/useData'
import { useStoreMetaRules } from '@/hooks/useGoals'
import { isAdministradorMx, isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { toast } from '@/lib/toast'
import { Card } from '@/components/molecules/Card'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Badge } from '@/components/atoms/Badge'
import type { TabContext } from '@/features/configuracoes/types'
import type { StoreMetaRules } from '@/types/database'

type IndividualGoalMode = StoreMetaRules['individual_goal_mode']

const INDIVIDUAL_GOAL_OPTIONS: Array<{ value: IndividualGoalMode; label: string }> = [
    { value: 'even', label: 'Distribuída igualmente' },
    { value: 'proportional', label: 'Proporcional ao histórico' },
]

function isIndividualGoalMode(value: string): value is IndividualGoalMode {
    return INDIVIDUAL_GOAL_OPTIONS.some(option => option.value === value)
}

const fieldId = (prefix: string, label: string) =>
    `${prefix}-${label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`

export function OperacionalLojaTab({ isReadOnly }: TabContext) {
    const { role, storeId: authStoreId } = useAuth()
    const { lojas } = useStores()
    const isGlobal = isAdministradorMx(role)

    const initialStoreId = !isGlobal && authStoreId ? authStoreId : ''
    const [selectedStoreId, setSelectedStoreId] = useState(initialStoreId)

    useEffect(() => {
        if (!selectedStoreId && lojas.length > 0) {
            setSelectedStoreId(isGlobal ? lojas[0].id : (authStoreId || lojas[0].id))
        }
    }, [lojas, isGlobal, authStoreId, selectedStoreId])

    const { deliveryRules, updateDeliveryRules } = useStoreDeliveryRules(selectedStoreId)
    const { metaRules, updateMetaRules } = useStoreMetaRules(selectedStoreId)

    const [emailLists, setEmailLists] = useState({ matinal: '', weekly: '', monthly: '' })
    const [settings, setSettings] = useState({
        audit_mode: false,
        strict_checkin: true,
        morning_report_time: '10:30',
        allow_manual_retro: false,
    })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (deliveryRules) {
            setEmailLists({
                matinal: deliveryRules.matinal_recipients?.join(', ') || '',
                weekly: deliveryRules.weekly_recipients?.join(', ') || '',
                monthly: deliveryRules.monthly_recipients?.join(', ') || '',
            })
        }
    }, [deliveryRules])

    const handleSave = async () => {
        if (!selectedStoreId) return
        if (isReadOnly) return toast.error('Esta aba está disponível apenas para leitura neste perfil.')
        setSaving(true)
        const { error } = await updateDeliveryRules({
            matinal_recipients: emailLists.matinal.split(',').map(e => e.trim()).filter(e => e.includes('@')),
            weekly_recipients: emailLists.weekly.split(',').map(e => e.trim()).filter(e => e.includes('@')),
            monthly_recipients: emailLists.monthly.split(',').map(e => e.trim()).filter(e => e.includes('@')),
        })
        setSaving(false)
        if (error) toast.error(error)
        else toast.success('Parâmetros operacionais firmados!')
    }

    if (!isPerfilInternoMx(role) && role !== 'dono') {
        return (
            <Card className="p-mx-xl border-none bg-gray-50 text-center">
                <ShieldAlert size={40} className="text-gray-500 mx-auto opacity-30" />
                <Typography variant="caption" tone="muted" className="mt-mx-sm">
                    Apenas administradores e donos podem acessar parâmetros operacionais.
                </Typography>
            </Card>
        )
    }

    return (
        <div className="space-y-mx-lg">
            {/* Seletor de loja */}
            <Card className="p-mx-md border-none bg-white">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-mx-md">
                    <Typography variant="caption" className="shrink-0">
                        Unidade Alvo
                    </Typography>
                    <div className="relative flex-1 w-full">
                        <select
                            id="operational-store"
                            name="store_id"
                            value={selectedStoreId}
                            onChange={e => setSelectedStoreId(e.target.value)}
                            disabled={!isGlobal && lojas.length <= 1}
                            className="w-full h-mx-12 px-mx-sm pr-mx-10 bg-gray-50 border border-gray-200 rounded-2xl font-bold uppercase text-xs cursor-pointer appearance-none disabled:opacity-50"
                        >
                            <option value="">Selecione a unidade...</option>
                            {lojas.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <ChevronDown size={16} className="absolute right-mx-sm top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !selectedStoreId || isReadOnly}
                        className="h-mx-12 px-6 text-xs shrink-0"
                    >
                        {saving ? <RefreshCw className="animate-spin mr-2" size={14} /> : <ShieldCheck size={14} className="mr-2" />}
                        Firmar
                    </Button>
                </div>
            </Card>

            {!selectedStoreId ? (
                <Card className="p-mx-xl border-none bg-gray-50 text-center">
                    <Typography variant="caption" tone="muted" className="">Selecione uma loja para configurar.</Typography>
                </Card>
            ) : (
                <>
                    {/* Políticas operacionais */}
                    <Card className="p-mx-lg md:p-mx-xl border-none bg-white">
                        <header className="border-b border-gray-200 pb-mx-md mb-mx-lg flex items-center justify-between gap-mx-sm">
                            <div>
                                <Typography variant="h3" className="tracking-tight">Políticas Operacionais</Typography>
                                <Typography variant="caption" tone="muted" className="mt-1">Regras de negócio mandatárias</Typography>
                            </div>
                            <Badge variant="outline" className="text-mx-micro shrink-0">Persistência em breve</Badge>
                        </header>
                        <div className="space-y-mx-md">
                            {/* Estes 3 toggles ainda não têm coluna correspondente no banco (regras_entrega_loja) —
                                desabilitados até a persistência real ser implementada, para não fingir que a escolha foi salva. */}
                            {[
                                { label: 'Diagnóstico detalhado', desc: 'Registro ampliado de eventos operacionais para suporte técnico', field: 'audit_mode' },
                                { label: 'Fechamento Diário Estrito', desc: 'Bloquear cockpit sem Fechamento Diário obrigatório', field: 'strict_checkin' },
                               { label: 'Fechamento Retroativo', desc: 'Autorizar gerência a retroagir dados (falha sistêmica)', field: 'allow_manual_retro' },
                            ].map(s => (
                                <ToggleRow
                                    key={s.field}
                                    label={s.label}
                                    desc={s.desc}
                                    value={Boolean(settings[s.field as keyof typeof settings])}
                                    onChange={() => setSettings(p => ({ ...p, [s.field]: !p[s.field as keyof typeof settings] }))}
                                    disabled
                                />
                            ))}

                            <div className="flex items-center justify-between p-mx-md bg-gray-50 rounded-2xl border border-gray-100 gap-mx-md">
                                <div>
                                    <Typography variant="caption" className="tracking-tight">Justiça Matemática</Typography>
                                    <Typography variant="tiny" tone="muted" className="">Base de cálculo da projeção</Typography>
                                </div>
                                <div className="flex p-mx-tiny bg-white border border-gray-200 rounded-mx-full shadow-sm">
                                    <Button
                                        variant={metaRules?.projection_mode === 'calendar' ? 'secondary' : 'ghost'}
                                        size="sm"
                                        onClick={() => updateMetaRules({ projection_mode: 'calendar' })}
                                        disabled={isReadOnly}
                                        className="h-mx-9 px-4 rounded-mx-full text-mx-tiny font-bold uppercase"
                                    >Calendário</Button>
                                    <Button
                                        variant={metaRules?.projection_mode === 'business' ? 'secondary' : 'ghost'}
                                        size="sm"
                                        onClick={() => updateMetaRules({ projection_mode: 'business' })}
                                        disabled={isReadOnly}
                                        className="h-mx-9 px-4 rounded-mx-full text-mx-tiny font-bold uppercase"
                                    >Dias Úteis</Button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-mx-md bg-gray-50 rounded-2xl border border-gray-100 gap-mx-md">
                                <div>
                                    <Typography variant="caption" className="tracking-tight">Horário Limite Matinal</Typography>
                                    <Typography variant="tiny" tone="muted" className="">Deadline para disparo automático</Typography>
                                </div>
                                <div className="relative">
                                    <History size={14} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input
                                        id="morning-report-time"
                                        name="morning_report_time"
                                        type="time"
                                        value={settings.morning_report_time}
                                        onChange={e => setSettings(p => ({ ...p, morning_report_time: e.target.value }))}
                                        disabled
                                        className="h-mx-xl pl-9 pr-4 bg-white border border-gray-200 rounded-2xl font-mono-numbers font-bold text-sm focus:border-brand-primary outline-none disabled:opacity-50"
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Metas e Benchmarks */}
                    <Card className="p-mx-lg md:p-mx-xl border-none bg-white">
                        <header className="border-b border-gray-200 pb-mx-md mb-mx-lg flex items-center gap-mx-sm">
                            <Target size={20} className="text-emerald-600" />
                            <div>
                                <Typography variant="h3" className="tracking-tight">Metas & Benchmarks</Typography>
                                <Typography variant="caption" tone="muted" className="mt-1">Distribuição e referência</Typography>
                            </div>
                        </header>
                        <div className="grid md:grid-cols-2 gap-mx-md">
                            <NumberField
                                label="Meta mensal da loja (R$)"
                                value={metaRules?.monthly_goal || 0}
                                onChange={v => updateMetaRules({ monthly_goal: v })}
                                disabled={isReadOnly}
                            />
                            <SelectField
                                label="Modo de meta individual"
                                value={metaRules?.individual_goal_mode || 'even'}
                                onChange={v => {
                                    if (isIndividualGoalMode(v)) updateMetaRules({ individual_goal_mode: v })
                                }}
                                disabled={isReadOnly}
                                options={INDIVIDUAL_GOAL_OPTIONS}
                            />
                            <NumberField
                                label="Benchmark Lead → Agendamento (%)"
                                value={metaRules?.bench_lead_agd || 20}
                                onChange={v => updateMetaRules({ bench_lead_agd: v })}
                                disabled={isReadOnly}
                            />
                            <NumberField
                                label="Benchmark Agendamento → Visita (%)"
                                value={metaRules?.bench_agd_visita || 60}
                                onChange={v => updateMetaRules({ bench_agd_visita: v })}
                                disabled={isReadOnly}
                            />
                            <NumberField
                                label="Benchmark Visita → Venda (%)"
                                value={metaRules?.bench_visita_vnd || 33}
                                onChange={v => updateMetaRules({ bench_visita_vnd: v })}
                                disabled={isReadOnly}
                            />
                        </div>
                    </Card>

                    {/* Privacidade da Remuneração */}
                    <Card className="p-mx-lg md:p-mx-xl border-none bg-white">
                        <header className="border-b border-gray-200 pb-mx-md mb-mx-lg flex items-center gap-mx-sm">
                            <ShieldCheck size={20} className="text-emerald-600" />
                            <div>
                                <Typography variant="h3" className="tracking-tight">Privacidade da Remuneração</Typography>
                                <Typography variant="caption" tone="muted" className="mt-1">Visibilidade do detalhamento ao vendedor</Typography>
                            </div>
                        </header>
                        <ToggleRow
                            label="Divulgar detalhamento ao vendedor"
                            desc="Quando desligado, o vendedor vê o total de comissão mas o cálculo detalhado (regras/bônus/fórmula) fica oculto"
                            value={metaRules?.remuneracao_detalhes_visivel ?? true}
                            onChange={() => updateMetaRules({ remuneracao_detalhes_visivel: !(metaRules?.remuneracao_detalhes_visivel ?? true) })}
                            disabled={isReadOnly}
                        />
                    </Card>

                    {/* Destinatários de e-mail */}
                    <Card className="p-mx-lg md:p-mx-xl border-none bg-white">
                        <header className="border-b border-gray-200 pb-mx-md mb-mx-lg flex items-center gap-mx-sm">
                            <Mail size={20} className="text-emerald-600" />
                            <div>
                                <Typography variant="h3" className="tracking-tight">Destinatários de Relatórios</Typography>
                                <Typography variant="caption" tone="muted" className="mt-1">Distribuição automática</Typography>
                            </div>
                        </header>
                        <div className="space-y-mx-md">
                            {[
                                { label: 'Relatório Matinal (D-0)', key: 'matinal' as const },
                                { label: 'Ciclo Semanal', key: 'weekly' as const },
                                { label: 'Estratégico/Direção', key: 'monthly' as const },
                            ].map(list => (
                                <div key={list.key} className="space-y-mx-xs">
                                    <div className="flex items-center justify-between px-1">
                                        <Typography variant="caption" className="">{list.label}</Typography>
                                        <Badge variant="outline" className="text-mx-micro">
                                            {emailLists[list.key].split(',').filter(Boolean).length} e-mails
                                        </Badge>
                                    </div>
                                    <textarea
                                        value={emailLists[list.key]}
                                        onChange={e => setEmailLists(p => ({ ...p, [list.key]: e.target.value }))}
                                        disabled={isReadOnly}
                                        placeholder="email1@empresa.com, email2@empresa.com..."
                                        className="w-full min-h-mx-24 p-mx-md bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 outline-none resize-none"
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="mt-mx-md p-mx-md bg-mx-indigo-50 border border-mx-indigo-100 rounded-2xl flex items-start gap-mx-sm">
                            <Info size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                            <Typography variant="tiny" tone="brand" className="leading-relaxed">
                                Separe os e-mails por vírgula. Validação de sintaxe antes do disparo automático.
                            </Typography>
                        </div>
                    </Card>
                </>
            )}
        </div>
    )
}

function ToggleRow({ label, desc, value, onChange, disabled }: { label: string; desc: string; value: boolean; onChange: () => void; disabled?: boolean }) {
    return (
        <div className="flex items-center justify-between p-mx-md bg-gray-50 rounded-2xl border border-gray-100 gap-mx-md">
            <div>
                <Typography variant="caption" className="tracking-tight">{label}</Typography>
                <Typography variant="tiny" tone="muted" className="opacity-70">{desc}</Typography>
            </div>
            <Button
                variant={value ? 'primary' : 'outline'}
                onClick={onChange}
                disabled={disabled}
                aria-pressed={value}
                className="w-mx-3xl h-mx-xl rounded-mx-full text-mx-tiny shadow-sm"
            >
                {value ? 'ATIVADO' : 'OFF'}
            </Button>
        </div>
    )
}

function NumberField({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
    const id = fieldId('operational-number', label)
    return (
        <div className="space-y-mx-xs">
            <Typography variant="tiny" tone="muted" className="px-1">{label}</Typography>
            <input
                id={id}
                name={id}
                type="number"
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                disabled={disabled}
                className="w-full h-mx-12 px-mx-sm bg-gray-50 border border-gray-200 rounded-2xl font-bold text-sm focus:border-brand-primary outline-none tabular-nums"
            />
        </div>
    )
}

function SelectField({ label, value, onChange, options, disabled }: {
    label: string
    value: string
    onChange: (v: string) => void
    options: { value: string; label: string }[]
    disabled?: boolean
}) {
    const id = fieldId('operational-select', label)
    return (
        <div className="space-y-mx-xs">
            <Typography variant="tiny" tone="muted" className="px-1">{label}</Typography>
            <select
                id={id}
                name={id}
                value={value}
                onChange={e => onChange(e.target.value)}
                disabled={disabled}
                className="w-full h-mx-12 px-mx-sm bg-gray-50 border border-gray-200 rounded-2xl font-bold text-xs uppercase cursor-pointer appearance-none focus:border-brand-primary outline-none"
            >
                {options.map(o => <option key={o.value} value={o.value}>{o.label.toUpperCase()}</option>)}
            </select>
        </div>
    )
}
