import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePDI_MX } from '@/hooks/usePDI_MX'
import type { PDIAvaliacao360, PDIMeta360, PDIPlanoAcao360, PDIPrintBundle } from '@/hooks/usePDI_MX'
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts'
import { Target, History, Printer, ChevronLeft, Sparkles, User, Calendar, Award } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Typography } from '@/components/atoms/Typography'

export default function PDIPrint() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { fetchPrintBundle, loading } = usePDI_MX()
    const [bundle, setBundle] = useState<PDIPrintBundle | null>(null)
    const [error, setError] = useState(false)
    const printRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (id) {
            fetchPrintBundle(id).then(data => {
                setBundle(data)
            }).catch(() => {
                setError(true)
            })
        }
    }, [id, fetchPrintBundle])

    if (loading) return (
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

    const radarData = bundle.avaliacoes.map((av: PDIAvaliacao360) => ({
        subject: av.competencia,
        A: av.nota,
        alvo: av.alvo,
        fullMark: av.alvo
    }))

    const metas6 = bundle.metas.filter((m: PDIMeta360) => m.prazo === '6_meses')
    const metas12 = bundle.metas.filter((m: PDIMeta360) => m.prazo === '12_meses')
    const metas24 = bundle.metas.filter((m: PDIMeta360) => m.prazo === '24_meses')

    return (
        // lint-page-roots-ignore: documento para impressão. A largura é A4
        // (max-w-[210mm]) e o padding vertical existe só na visualização em
        // tela (print:py-0) — não é margem de página, é folha.
        <div className="min-h-screen bg-brand-primary-subtle font-sans print:bg-background flex flex-col items-center py-10 print:py-0 overflow-x-hidden">
            
            {/* Action Bar (Not Printed) */}
            <div className="w-full max-w-[210mm] flex items-center justify-between mb-8 print:hidden px-4">
                <button onClick={() => navigate(-1)} className="flex items-center gap-mx-xs px-6 py-3 bg-white border border-border rounded-mx-full text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-surface-alt">
                    <ChevronLeft size={16} /> Voltar
                </button>
                <button onClick={handlePrint} className="flex items-center gap-mx-xs px-8 py-3 bg-gray-900 text-white rounded-mx-full text-xs font-bold uppercase tracking-widest shadow-sm hover:scale-105 active:scale-95 transition-transform">
                    <Printer size={16} /> Imprimir Bundle PDI (A4)
                </button>
            </div>

            {/* A4 Document Container */}
            <div ref={printRef} className="w-[210mm] bg-background shadow-2xl print:shadow-none print:w-full print:max-w-none text-foreground flex flex-col gap-y-[20mm]">
                
                {/* --- PÁGINA 1: CAPA --- */}
                <div className="p-[20mm] h-[297mm] relative break-after-page flex flex-col border border-border print:border-none">
                    <div className="absolute top-mx-0 left-mx-0 w-full h-mx-lg bg-gray-900" />
                    <header className="flex justify-between items-start mt-10 mb-20 border-b-4 border-mx-black pb-8">
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

                    <div className="mb-14 flex gap-mx-md items-center">
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
                        <div>
                            <Typography variant="h3" className="text-brand-secondary border-b border-brand-primary/40 pb-1.5 mb-4">Metas de Curto Prazo (6 Meses)</Typography>
                            <ul className="space-y-mx-xs pl-8 list-none">
                                {metas6.map((m, i) => (
                                    <li key={i} className="text-sm font-bold uppercase relative before:content-[''] before:absolute before:-left-5 before:top-1.5 before:w-2 before:h-2 before:bg-brand-primary before:rounded-full">
                                        <span className="text-status-success-text text-xs mr-2">[{m.tipo}]</span> {m.descricao}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <Typography variant="h3" className="text-brand-secondary border-b border-brand-primary/40 pb-1.5 mb-4">Metas de Médio Prazo (12 Meses)</Typography>
                            <ul className="space-y-mx-xs pl-8 list-none">
                                {metas12.map((m, i) => (
                                    <li key={i} className="text-sm font-bold uppercase relative before:content-[''] before:absolute before:-left-5 before:top-1.5 before:w-2 before:h-2 before:bg-brand-primary before:rounded-full">
                                        <span className="text-status-success-text text-xs mr-2">[{m.tipo}]</span> {m.descricao}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <Typography variant="h3" className="text-brand-secondary border-b border-brand-primary/40 pb-1.5 mb-4">Metas de Longo Prazo (24 Meses)</Typography>
                            <ul className="space-y-mx-xs pl-8 list-none">
                                {metas24.map((m, i) => (
                                    <li key={i} className="text-sm font-bold uppercase relative before:content-[''] before:absolute before:-left-5 before:top-1.5 before:w-2 before:h-2 before:bg-brand-primary before:rounded-full">
                                        <span className="text-status-success-text text-xs mr-2">[{m.tipo}]</span> {m.descricao}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <footer className="mt-auto pt-10 text-center space-y-mx-sm">
                        <Sparkles size={24} className="mx-auto text-status-success-text opacity-30" />
                        <Typography variant="p" className="text-sm font-bold italic leading-relaxed">
                            "Comprometa-se com suas metas e encare os obstáculos como etapas para atingir o objetivo final. 
                            Disciplina é a ponte entre metas e realizações."
                        </Typography>
                    </footer>
                </div>

                {/* --- PÁGINA 2: VENDEDOR 1 / MAPA DE COMPETÊNCIAS --- */}
                <div className="p-[20mm] min-h-[297mm] break-after-page flex flex-col border border-border print:border-none relative">
                    <header className="flex justify-between items-end border-b-2 border-mx-black pb-4 mb-10">
                        <Typography variant="h2" className="text-2xl tracking-tighter">Mapa de Competências</Typography>
                        <Typography variant="caption" tone="muted" className="text-mx-tiny">Página 2 / Vendedor 1</Typography>
                    </header>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-10 mb-10">
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
                                        <tr key={i} className="border-b border-border">
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
                            <div className="w-full h-mx-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                                        <PolarGrid stroke="#DFE0E1" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#526B7A', fontSize: 8, fontWeight: 900 }} />
                                        <Radar name="Alvo" dataKey="alvo" stroke="#526B7A" strokeDasharray="3 3" fill="transparent" />
                                        <Radar name="Nota" dataKey="A" stroke="#00A89D" strokeWidth={2} fill="#00A89D" fillOpacity={0.2} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto">
                        <Typography variant="tiny" className="text-status-error-text mb-4">Top 5 Maiores Lacunas (Gaps) Identificadas</Typography>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-sm">                            {bundle.top_5_gaps.map((gap, i) => (
                                <div key={i} className="bg-status-error-surface p-mx-sm border border-status-error/30 rounded-lg flex justify-between items-center">
                                    <Typography variant="p" className="text-xs font-bold">{gap.competencia}</Typography>
                                    <Typography variant="h3" tone="error" className="text-lg">-{gap.gap}</Typography>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- PÁGINA 3: PLANO DE AÇÃO (PDI TABULAR) --- */}
                <div className="p-[20mm] min-h-[297mm] flex flex-col border border-border print:border-none">
                    <header className="flex justify-between items-end border-b-2 border-mx-black pb-4 mb-10">
                        <Typography variant="h2" className="text-2xl tracking-tighter">Plano de Desenvolvimento Individual</Typography>
                        <Typography variant="caption" tone="muted" className="text-mx-tiny">Página 3 / Ações Mandatórias</Typography>
                    </header>

                    <div className="mb-14">
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
                                    <tr key={i} className="border-b-2 border-border">
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

                    <div className="mt-10 p-mx-lg border-4 border-mx-black rounded-2xl flex flex-col items-center justify-center text-center space-y-mx-sm">
                        <Typography variant="h3" className="">A Equação da Motivação no Trabalho</Typography>
                        <Typography variant="h1" tone="brand" className="text-5xl font-mono-numbers my-4">$ = QI + DC</Typography>
                        <Typography variant="p" className="text-sm font-bold">
                            (Remuneração) = (Qualificação Individual) + (Demanda do Cargo)
                        </Typography>
                    </div>

                    <footer className="mt-auto pt-24 grid grid-cols-1 sm:grid-cols-2 gap-mx-20">
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
        </div>
    )
}
