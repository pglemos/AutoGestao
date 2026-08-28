import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { usePDI_MX } from '@/hooks/usePDI_MX'
import type { PDIAvaliacao360, PDIMeta360, PDIPlanoAcao360, PDIPrintBundle } from '@/hooks/usePDI_MX'
import { useAuth } from '@/hooks/useAuth'
import { canManagePDI as canManagePDICapability } from '@/lib/auth/capabilities'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts'
import { Target, History, Printer, ChevronLeft, Sparkles, User, Pencil, Eye } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Typography } from '@/components/atoms/Typography'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Label } from '@/components/atoms/Label'
import { Textarea } from '@/components/atoms/Textarea'
import { Modal, ModalBody } from '@/components/organisms/Modal'
import { toast } from '@/lib/toast'

const PRAZO_LABEL: Record<string, string> = {
    '6_meses': 'Metas de Curto Prazo (6 Meses)',
    '12_meses': 'Metas de Médio Prazo (12 Meses)',
    '24_meses': 'Metas de Longo Prazo (24 Meses)',
}

type EditTarget =
    | { kind: 'metas'; prazo: string }
    | { kind: 'avaliacoes' }
    | { kind: 'acoes' }

type MetaDraft = { id: string; descricao: string; tipo: string }
type AvaliacaoDraft = { id: string; competencia: string; nota: string; alvo: string }
type AcaoDraft = {
    id: string
    competencia: string
    descricaoAcao: string
    dataConclusao: string
    impacto: string
    custo: string
}

const IMPACTO_CUSTO = ['baixo', 'medio', 'alto']

/** Caneta de correção. Fica fora do papel impresso: `print:hidden`. */
function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClick}
            aria-label={label}
            className="print:hidden w-mx-10 h-mx-10 rounded-xl text-muted-foreground hover:text-status-success-text hover:bg-brand-primary-subtle bg-white shadow-sm border border-border-subtle shrink-0"
        >
            <Pencil size={16} />
        </Button>
    )
}

export default function PDIPrint() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const { role } = useAuth()
    const { fetchPrintBundle, updatePDIDocument, loading } = usePDI_MX()
    const [bundle, setBundle] = useState<PDIPrintBundle | null>(null)
    const [error, setError] = useState(false)
    const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
    const [metaDrafts, setMetaDrafts] = useState<MetaDraft[]>([])
    const [avaliacaoDrafts, setAvaliacaoDrafts] = useState<AvaliacaoDraft[]>([])
    const [acaoDrafts, setAcaoDrafts] = useState<AcaoDraft[]>([])
    const [saving, setSaving] = useState(false)

    const canManage = canManagePDICapability(role)
    const canEdit = searchParams.get('editar') === '1' && canManage

    const toggleEditMode = () => {
        const next = new URLSearchParams(searchParams)
        if (canEdit) {
            next.delete('editar')
        } else {
            next.set('editar', '1')
        }
        setSearchParams(next, { replace: true })
    }

    const loadBundle = useCallback(async () => {
        if (!id) return
        try {
            setBundle(await fetchPrintBundle(id))
        } catch {
            setError(true)
        }
    }, [id, fetchPrintBundle])

    useEffect(() => {
        void loadBundle()
    }, [loadBundle])

    const openMetasEditor = (prazo: string) => {
        setMetaDrafts((bundle?.metas || [])
            .filter(m => m.prazo === prazo && m.id)
            .map(m => ({ id: m.id as string, descricao: m.descricao || '', tipo: m.tipo || 'profissional' })))
        setEditTarget({ kind: 'metas', prazo })
    }

    const openAvaliacoesEditor = () => {
        setAvaliacaoDrafts((bundle?.avaliacoes || [])
            .filter(a => a.id)
            .map(a => ({ id: a.id as string, competencia: a.competencia, nota: String(a.nota), alvo: String(a.alvo) })))
        setEditTarget({ kind: 'avaliacoes' })
    }

    const openAcoesEditor = () => {
        setAcaoDrafts((bundle?.plano_acao || [])
            .filter(a => a.id)
            .map(a => ({
                id: a.id as string,
                competencia: a.competencia,
                descricaoAcao: a.descricao_acao || '',
                dataConclusao: (a.data_conclusao || '').slice(0, 10),
                impacto: a.impacto || 'medio',
                custo: a.custo || 'medio',
            })))
        setEditTarget({ kind: 'acoes' })
    }

    const handleSave = async () => {
        if (!editTarget) return

        if (editTarget.kind === 'metas' && metaDrafts.some(m => !m.descricao.trim())) {
            toast.error('A descrição da meta não pode ficar vazia.')
            return
        }
        if (editTarget.kind === 'avaliacoes') {
            const invalid = avaliacaoDrafts.some(a => {
                const nota = Number(a.nota)
                const alvo = Number(a.alvo)
                return !Number.isInteger(nota) || !Number.isInteger(alvo) || nota < 0 || nota > 10 || alvo < 0 || alvo > 10
            })
            if (invalid) {
                toast.error('Nota e alvo precisam ser números inteiros entre 0 e 10.')
                return
            }
        }
        if (editTarget.kind === 'acoes') {
            const invalid = acaoDrafts.some(a => !a.descricaoAcao.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(a.dataConclusao))
            if (invalid) {
                toast.error('Informe a ação e um prazo válido para cada linha.')
                return
            }
        }

        setSaving(true)
        const { error: saveError } = await updatePDIDocument(
            editTarget.kind === 'metas'
                ? { metas: metaDrafts.map(m => ({ id: m.id, descricao: m.descricao.trim(), tipo: m.tipo })) }
                : editTarget.kind === 'avaliacoes'
                    ? { avaliacoes: avaliacaoDrafts.map(a => ({ id: a.id, nota: Number(a.nota), alvo: Number(a.alvo) })) }
                    : {
                        acoes: acaoDrafts.map(a => ({
                            id: a.id,
                            descricaoAcao: a.descricaoAcao.trim(),
                            dataConclusao: a.dataConclusao,
                            impacto: a.impacto,
                            custo: a.custo,
                        })),
                    }
        )
        setSaving(false)

        if (saveError) {
            toast.error(saveError)
            return
        }

        await loadBundle()
        setEditTarget(null)
        toast.success('PDI atualizado.')
    }

    const radarData = useMemo(() => (bundle?.avaliacoes || []).map((av: PDIAvaliacao360) => ({
        subject: av.competencia,
        A: av.nota,
        alvo: av.alvo,
        fullMark: av.alvo,
    })), [bundle])

    if (loading && !bundle) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-surface-alt">
            <Typography variant="h3" className="animate-pulse">Carregando Bundle Documental...</Typography>
        </div>
    )

    if (error || !bundle) return (
        // lint-page-roots-ignore: estado centrado de documento não encontrado.
        <div className="min-h-screen p-mx-20 text-center flex flex-col items-center justify-center bg-surface-alt">
            <History size={48} className="text-muted-foreground mb-6 opacity-20" />
            <Typography variant="h3" tone="muted" className="tracking-tighter">Plano ou permissão não localizados.</Typography>
            <button onClick={() => navigate(-1)} className="mt-8 px-8 py-4 bg-brand-primary text-white rounded-mx-full font-bold text-xs uppercase tracking-widest">VOLTAR</button>
        </div>
    )

    const handlePrint = () => {
        window.print()
    }

    const colaboradorNome = bundle.sessao.colaborador_nome || bundle.sessao.seller_name || bundle.sessao.colaborador_id
    const gerenteNome = bundle.sessao.gerente_nome || bundle.sessao.manager_name || bundle.sessao.gerente_id
    const lojaNome = bundle.sessao.loja_nome || bundle.sessao.store_name

    const metasPorPrazo = (prazo: string) => bundle.metas.filter((m: PDIMeta360) => m.prazo === prazo)

    return (
        // lint-page-roots-ignore: documento para impressão. A largura é A4
        // (max-w-[210mm]) e o padding vertical existe só na visualização em
        // tela (print:py-0) — não é margem de página, é folha.
        <div className="print-document min-h-screen bg-brand-primary-subtle font-sans print:bg-background flex flex-col items-center py-10 print:py-0 overflow-x-hidden">

            {/* Action Bar (Not Printed) */}
            <div className="w-[210mm] max-w-full flex items-center justify-between mb-8 print:hidden px-4">
                <button onClick={() => navigate(-1)} className="flex items-center gap-mx-xs px-6 py-3 bg-white border border-border rounded-mx-full text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-surface-alt outline-none focus-visible:ring-4 focus-visible:ring-status-success/20">
                    <ChevronLeft size={16} /> Voltar
                </button>
                <div className="flex items-center gap-mx-sm">
                    {/* Quem pode corrigir alterna aqui mesmo: abrir o documento pelo
                        "Abrir PDI" e ter que voltar ao card só para pegar a caneta
                        é um caminho que ninguém percorre no meio de uma conversa
                        de feedback. */}
                    {canManage && (
                        <button
                            onClick={toggleEditMode}
                            className="flex items-center gap-mx-xs px-6 py-3 bg-white border border-border rounded-mx-full text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-surface-alt outline-none focus-visible:ring-4 focus-visible:ring-status-success/20"
                        >
                            {canEdit ? <><Eye size={16} /> Ver como fica impresso</> : <><Pencil size={16} /> Corrigir PDI</>}
                        </button>
                    )}
                    <button onClick={handlePrint} className="flex items-center gap-mx-xs px-8 py-3 bg-gray-900 text-white rounded-mx-full text-xs font-bold uppercase tracking-widest shadow-sm hover:scale-105 active:scale-95 transition-transform outline-none focus-visible:ring-4 focus-visible:ring-status-success/20">
                        <Printer size={16} /> Imprimir PDI (A4)
                    </button>
                </div>
            </div>

            {canEdit && (
                <div className="w-[210mm] max-w-full mb-8 print:hidden px-4">
                    <div className="rounded-2xl border border-status-info/20 bg-status-info-surface p-mx-md">
                        <Typography variant="h3" className="text-status-info-text">Modo de correção</Typography>
                        <Typography variant="p" className="mt-mx-xs text-sm text-status-info-text">
                            Use as canetas ao lado de cada bloco para corrigir metas, notas de competência e o plano de ação. As correções entram no documento impresso.
                        </Typography>
                    </div>
                </div>
            )}

            {/* A4 Document Container */}
            <div className="w-[210mm] bg-background shadow-2xl print:shadow-none print:w-full print:max-w-none text-foreground flex flex-col gap-y-[20mm] print:gap-y-0">

                {/* --- PÁGINA 1: CAPA --- */}
                <div className="p-[20mm] print:p-0 min-h-[297mm] print:min-h-0 relative break-after-page flex flex-col border border-border print:border-none">
                    <div className="absolute top-mx-0 left-mx-0 w-full h-mx-lg bg-gray-900" />
                    <header className="flex justify-between items-start mt-10 print:mt-4 mb-20 print:mb-10 border-b-4 border-mx-black pb-8 print:pb-5">
                        <div>
                            <div className="flex items-center gap-mx-sm mb-4">
                                <div className="w-mx-xl h-mx-xl bg-gray-900 text-white flex items-center justify-center rounded-2xl shadow-md"><Target size={24} /></div>
                                <Typography variant="h2" className="text-xl tracking-tighter">MX <span className="text-status-success-text">PERFORMANCE</span></Typography>
                            </div>
                            <Typography variant="h1" className="text-4xl tracking-tighter leading-none">Plano de Desenvolvimento<br/>Individual <span className="text-status-success-text">(PDI)</span></Typography>
                        </div>
                        <div className="text-right">
                            <Typography variant="mono" className="text-xs bg-surface-alt px-4 py-2 rounded">Protocolo: {bundle.sessao.id.split('-')[0]}</Typography>
                        </div>
                    </header>

                    <div className="mb-14 print:mb-8 flex gap-mx-md items-center">
                        <div className="w-mx-2xl h-mx-2xl rounded-mx-full bg-surface-alt border border-border flex items-center justify-center">
                            <User size={24} className="text-muted-foreground" />
                        </div>
                        <div>
                            <Typography variant="tiny" tone="muted" className="">Colaborador (Especialista)</Typography>
                            <Typography variant="h2" className="text-2xl border-b-2 border-brand-primary inline-block pb-1 mt-1">{colaboradorNome}</Typography>
                            {lojaNome && (
                                <Typography variant="tiny" tone="muted" className="mt-2 block">{lojaNome}</Typography>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-center space-y-mx-xl">
                        {['6_meses', '12_meses', '24_meses'].map(prazo => (
                            <div key={prazo}>
                                <div className="flex items-center justify-between gap-mx-sm border-b border-brand-primary/40 pb-1.5 mb-4">
                                    <Typography variant="h3" className="text-brand-secondary">{PRAZO_LABEL[prazo]}</Typography>
                                    {canEdit && <EditButton label={`Editar ${PRAZO_LABEL[prazo]}`} onClick={() => openMetasEditor(prazo)} />}
                                </div>
                                <ul className="space-y-mx-xs pl-8 list-none">
                                    {metasPorPrazo(prazo).map((m, i) => (
                                        <li key={m.id || i} className="text-sm font-bold uppercase relative before:content-[''] before:absolute before:-left-5 before:top-1.5 before:w-2 before:h-2 before:bg-brand-primary before:rounded-full">
                                            <span className="text-status-success-text text-xs mr-2">[{m.tipo}]</span> {m.descricao}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <footer className="mt-auto pt-10 print:pt-6 text-center space-y-mx-sm">
                        <Sparkles size={24} className="mx-auto text-status-success-text opacity-30" />
                        <Typography variant="p" className="text-sm font-bold italic leading-relaxed">
                            "Comprometa-se com suas metas e encare os obstáculos como etapas para atingir o objetivo final.
                            Disciplina é a ponte entre metas e realizações."
                        </Typography>
                    </footer>
                </div>

                {/* --- PÁGINA 2: VENDEDOR 1 / MAPA DE COMPETÊNCIAS --- */}
                <div className="p-[20mm] print:p-0 min-h-[297mm] print:min-h-0 break-after-page flex flex-col border border-border print:border-none relative">
                    <header className="flex justify-between items-end border-b-2 border-mx-black pb-4 mb-10 print:mb-5">
                        <div className="flex items-center gap-mx-sm">
                            <Typography variant="h2" className="text-2xl tracking-tighter">Mapa de Competências</Typography>
                            {canEdit && <EditButton label="Editar notas de competência" onClick={openAvaliacoesEditor} />}
                        </div>
                        <Typography variant="caption" tone="muted" className="text-mx-tiny">Página 2 / Vendedor 1</Typography>
                    </header>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-10 mb-10 print:mb-4">
                        <div className="space-y-mx-sm">
                            <Typography variant="tiny" className="">Mapeamento Técnico & Comportamental</Typography>
                            <table className="w-full text-xs font-bold border-collapse">
                                <thead>
                                    <tr className="bg-surface-alt border-b-2 border-mx-black">
                                        <th className="py-2 px-3 text-left uppercase">Competência</th>
                                        <th className="py-2 px-3 text-center uppercase">Nota</th>
                                        <th className="py-2 px-3 text-center uppercase">Alvo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bundle.avaliacoes.map((av, i) => (
                                        <tr key={av.id || i} className="border-b border-border break-inside-avoid">
                                            <td className="py-2 px-3">{av.competencia}</td>
                                            <td className="py-2 px-3 text-center text-status-success-text">{av.nota}</td>
                                            <td className="py-2 px-3 text-center text-muted-foreground">{av.alvo}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col items-center justify-center border-l-2 border-border pl-10">
                            <Typography variant="tiny" className="mb-4 text-center">Gráfico Radar (Atigimento vs. Alvo)</Typography>
                            {/* Largura fixa em vez de ResponsiveContainer: no @media print
                                o container é medido antes do layout da folha e o radar
                                sai colapsado numa linha. A folha é A4 fixa, então o
                                gráfico pode ser fixo também. */}
                            <div className="w-mx-80 h-mx-80 print:scale-90 print:origin-top">
                                <RadarChart width={320} height={320} cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                                    <PolarGrid stroke="#DFE0E1" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#526B7A', fontSize: 8, fontWeight: 900 }} />
                                    <Radar name="Alvo" dataKey="alvo" stroke="#526B7A" strokeDasharray="3 3" fill="transparent" />
                                    <Radar name="Nota" dataKey="A" stroke="#00A89D" strokeWidth={2} fill="#00A89D" fillOpacity={0.2} />
                                </RadarChart>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto">
                        <Typography variant="tiny" className="text-status-error-text mb-4">Top 5 Maiores Lacunas (Gaps) Identificadas</Typography>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-sm">                            {bundle.top_5_gaps.map((gap, i) => (
                                <div key={i} className="bg-status-error-surface p-mx-sm border border-status-error/30 rounded-lg flex justify-between items-center break-inside-avoid">
                                    <Typography variant="p" className="text-xs font-bold">{gap.competencia}</Typography>
                                    <Typography variant="h3" tone="error" className="text-lg">-{gap.gap}</Typography>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- PÁGINA 3: PLANO DE AÇÃO (PDI TABULAR) --- */}
                <div className="p-[20mm] print:p-0 min-h-[297mm] print:min-h-0 flex flex-col border border-border print:border-none">
                    <header className="flex justify-between items-end border-b-2 border-mx-black pb-4 mb-10">
                        <div className="flex items-center gap-mx-sm">
                            <Typography variant="h2" className="text-2xl tracking-tighter">Plano de Desenvolvimento Individual</Typography>
                            {canEdit && <EditButton label="Editar plano de ação" onClick={openAcoesEditor} />}
                        </div>
                        <Typography variant="caption" tone="muted" className="text-mx-tiny">Página 3 / Ações Mandatórias</Typography>
                    </header>

                    <div className="mb-14 print:mb-6">
                        <Typography variant="tiny" className="mb-6 block">Ações de Desenvolvimento (Próximos 6 Meses)</Typography>
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className="bg-gray-900 text-white text-left">
                                    <th className="py-4 px-4 font-bold uppercase tracking-widest">Item a Desenvolver</th>
                                    <th className="py-4 px-4 font-bold uppercase tracking-widest w-1/3">Ação de Desenvolvimento</th>
                                    <th className="py-4 px-4 font-bold uppercase tracking-widest text-center">Prazo</th>
                                    <th className="py-4 px-4 font-bold uppercase tracking-widest text-center">Impacto</th>
                                    <th className="py-4 px-4 font-bold uppercase tracking-widest text-center">Custo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bundle.plano_acao.map((acao: PDIPlanoAcao360, i: number) => (
                                    <tr key={acao.id || i} className="border-b-2 border-border break-inside-avoid">
                                        <td className="py-4 px-4 font-bold uppercase text-muted-foreground">{acao.competencia}</td>
                                        <td className="py-4 px-4 font-bold text-foreground">{acao.descricao_acao}</td>
                                        <td className="py-4 px-4 font-bold text-center text-status-success-text">{format(parseISO(acao.data_conclusao), 'dd/MM/yyyy')}</td>
                                        <td className="py-4 px-4 font-bold text-center uppercase">{acao.impacto}</td>
                                        <td className="py-4 px-4 font-bold text-center uppercase">{acao.custo}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-10 print:mt-6 p-mx-lg border-4 border-mx-black rounded-2xl flex flex-col items-center justify-center text-center space-y-mx-sm">
                        <Typography variant="h3" className="">A Equação da Motivação no Trabalho</Typography>
                        <Typography variant="h1" tone="brand" className="text-5xl font-mono-numbers my-4">$ = QI + DC</Typography>
                        <Typography variant="p" className="text-sm font-bold">
                            (Remuneração) = (Qualificação Individual) + (Demanda do Cargo)
                        </Typography>
                    </div>

                    <footer className="mt-auto pt-24 print:pt-8 grid grid-cols-1 sm:grid-cols-2 gap-mx-20 break-inside-avoid">
                        <div className="text-center space-y-mx-sm">
                            <div className="border-t-2 border-mx-black pt-4">
                                <Typography variant="p" className="text-sm">Assinatura do Gestor (MX)</Typography>
                                <Typography variant="tiny" tone="muted" className="text-mx-micro font-bold mt-1 block">{gerenteNome}</Typography>
                                <Typography variant="tiny" tone="muted" className="text-mx-micro font-bold mt-1 block">Responsável Técnico</Typography>
                            </div>
                        </div>
                        <div className="text-center space-y-mx-sm">
                            <div className="border-t-2 border-mx-black pt-4">
                                <Typography variant="p" className="text-sm">Assinatura do Vendedor</Typography>
                                <Typography variant="tiny" tone="muted" className="text-mx-micro font-bold mt-1 block">Concordância com as Metas</Typography>
                            </div>
                        </div>
                    </footer>
                </div>

            </div>

            <Modal
                open={editTarget !== null}
                onClose={() => setEditTarget(null)}
                size="xl"
                title={editTarget?.kind === 'metas'
                    ? PRAZO_LABEL[editTarget.prazo]
                    : editTarget?.kind === 'avaliacoes'
                        ? 'Notas de competência'
                        : 'Plano de ação'}
                footer={(
                    <div className="flex justify-end gap-mx-sm">
                        <Button type="button" variant="outline" onClick={() => setEditTarget(null)} disabled={saving}>Cancelar</Button>
                        <Button type="button" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar correções'}</Button>
                    </div>
                )}
            >
                <ModalBody>

                    {editTarget?.kind === 'metas' && (
                        <div className="space-y-mx-md">
                            {metaDrafts.map((meta, index) => (
                                <div key={meta.id} className="space-y-mx-xs">
                                    <Label htmlFor={`meta-${meta.id}`}>Meta {index + 1}</Label>
                                    <Textarea
                                        id={`meta-${meta.id}`}
                                        value={meta.descricao}
                                        rows={2}
                                        onChange={e => setMetaDrafts(drafts => drafts.map(d => d.id === meta.id ? { ...d, descricao: e.target.value } : d))}
                                    />
                                    <div className="flex items-center gap-mx-sm">
                                        <Label htmlFor={`meta-tipo-${meta.id}`} className="text-xs">Tipo</Label>
                                        <select
                                            id={`meta-tipo-${meta.id}`}
                                            value={meta.tipo}
                                            onChange={e => setMetaDrafts(drafts => drafts.map(d => d.id === meta.id ? { ...d, tipo: e.target.value } : d))}
                                            className="h-mx-xl px-4 bg-white border border-border rounded-2xl text-sm font-bold outline-none uppercase"
                                        >
                                            <option value="pessoal">Pessoal</option>
                                            <option value="profissional">Profissional</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {editTarget?.kind === 'avaliacoes' && (
                        <div className="space-y-mx-sm">
                            {avaliacaoDrafts.map(av => (
                                <div key={av.id} className="flex items-center justify-between gap-mx-sm border-b border-border pb-3">
                                    <Typography variant="p" className="text-sm font-bold flex-1">{av.competencia}</Typography>
                                    <div className="flex items-center gap-mx-xs">
                                        <Label htmlFor={`nota-${av.id}`} className="text-xs">Nota</Label>
                                        <Input
                                            id={`nota-${av.id}`}
                                            type="number"
                                            min={0}
                                            max={10}
                                            step={1}
                                            value={av.nota}
                                            onChange={e => setAvaliacaoDrafts(drafts => drafts.map(d => d.id === av.id ? { ...d, nota: e.target.value } : d))}
                                            className="w-mx-20 text-center"
                                        />
                                    </div>
                                    <div className="flex items-center gap-mx-xs">
                                        <Label htmlFor={`alvo-${av.id}`} className="text-xs">Alvo</Label>
                                        <Input
                                            id={`alvo-${av.id}`}
                                            type="number"
                                            min={0}
                                            max={10}
                                            step={1}
                                            value={av.alvo}
                                            onChange={e => setAvaliacaoDrafts(drafts => drafts.map(d => d.id === av.id ? { ...d, alvo: e.target.value } : d))}
                                            className="w-mx-20 text-center"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {editTarget?.kind === 'acoes' && (
                        <div className="space-y-mx-md">
                            {acaoDrafts.map(acao => (
                                <div key={acao.id} className="space-y-mx-xs border-b border-border pb-4">
                                    <Typography variant="tiny" tone="muted">{acao.competencia}</Typography>
                                    <Label htmlFor={`acao-${acao.id}`}>Ação de desenvolvimento</Label>
                                    <Textarea
                                        id={`acao-${acao.id}`}
                                        value={acao.descricaoAcao}
                                        rows={2}
                                        onChange={e => setAcaoDrafts(drafts => drafts.map(d => d.id === acao.id ? { ...d, descricaoAcao: e.target.value } : d))}
                                    />
                                    <div className="flex flex-wrap items-end gap-mx-sm">
                                        <div className="space-y-mx-xs">
                                            <Label htmlFor={`prazo-${acao.id}`} className="text-xs">Prazo</Label>
                                            <Input
                                                id={`prazo-${acao.id}`}
                                                type="date"
                                                value={acao.dataConclusao}
                                                onChange={e => setAcaoDrafts(drafts => drafts.map(d => d.id === acao.id ? { ...d, dataConclusao: e.target.value } : d))}
                                            />
                                        </div>
                                        <div className="space-y-mx-xs">
                                            <Label htmlFor={`impacto-${acao.id}`} className="text-xs">Impacto</Label>
                                            <select
                                                id={`impacto-${acao.id}`}
                                                value={acao.impacto}
                                                onChange={e => setAcaoDrafts(drafts => drafts.map(d => d.id === acao.id ? { ...d, impacto: e.target.value } : d))}
                                                className="block h-mx-xl px-4 bg-white border border-border rounded-2xl text-sm font-bold outline-none uppercase"
                                            >
                                                {IMPACTO_CUSTO.map(v => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-mx-xs">
                                            <Label htmlFor={`custo-${acao.id}`} className="text-xs">Custo</Label>
                                            <select
                                                id={`custo-${acao.id}`}
                                                value={acao.custo}
                                                onChange={e => setAcaoDrafts(drafts => drafts.map(d => d.id === acao.id ? { ...d, custo: e.target.value } : d))}
                                                className="block h-mx-xl px-4 bg-white border border-border rounded-2xl text-sm font-bold outline-none uppercase"
                                            >
                                                {IMPACTO_CUSTO.map(v => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                </ModalBody>
            </Modal>
        </div>
    )
}
