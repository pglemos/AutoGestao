import { Shield, Lock, FileText, ChevronRight, Zap, ShieldCheck, ArrowLeft, AlertTriangle } from 'lucide-react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/atoms/Badge'
import { Typography } from '@/components/atoms/Typography'
import { Button } from '@/components/atoms/Button'
import { Card, CardContent } from '@/components/molecules/Card'

export default function Terms() {
    const navigate = useNavigate()

    return (
        <main className="min-h-screen bg-surface-alt flex items-center justify-center p-mx-sm sm:p-10 selection:bg-brand-primary selection:text-white relative overflow-hidden">

            <div className="absolute top-mx-0 right-mx-0 w-mx-hero h-mx-hero bg-brand-primary/5 rounded-mx-full blur-mx-xl -mr-mx-lg -mt-mx-lg pointer-events-none" aria-hidden="true" />
            <div className="absolute bottom-mx-0 left-mx-0 w-mx-hero h-mx-hero bg-status-success-surface rounded-mx-full blur-mx-xl -ml-mx-lg -mb-mx-lg pointer-events-none" aria-hidden="true" />

            <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-4xl"
            >
                <Card className="border-none shadow-mx-elite bg-white overflow-hidden flex flex-col relative z-10">
                    <header className="bg-brand-secondary p-mx-10 md:p-16 relative overflow-hidden text-center">
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 to-transparent z-0 pointer-events-none" />
                        <div className="absolute inset-0 bg-mx-matrix opacity-20 pointer-events-none" />

                        <div className="w-mx-20 h-mx-header rounded-mx-3xl bg-white/10 text-white flex items-center justify-center mx-auto mb-8 shadow-mx-xl backdrop-blur-xl relative z-10 border border-white/10">
                            <FileText size={32} strokeWidth={2} />
                        </div>
                        <Typography variant="h1" tone="white" className="text-4xl md:text-5xl mb-4 relative z-10 uppercase tracking-tighter">Termos de <Typography as="span" variant="h1" tone="brand">Serviço</Typography></Typography>
                        <Typography variant="tiny" tone="white" className="max-w-xl mx-auto opacity-60 relative z-10 block font-black uppercase">CONTRATO DE LICENCIAMENTO & USO MX PERFORMANCE</Typography>
                    </header>

                    <CardContent className="p-mx-10 md:p-20 space-y-mx-14">
                        <div className="space-y-mx-10">
                            <Typography variant="p" className="text-xl font-bold text-text-secondary leading-relaxed border-l-4 border-brand-primary pl-8 italic uppercase tracking-tight">
                                "O acesso contínuo e a utilização do sistema MX PERFORMANCE caracterizam concordância incondicional com as diretrizes e protocolos de segurança aqui estipulados."
                            </Typography>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-mx-lg">
                                <Card className="bg-surface-alt p-mx-10 rounded-mx-3xl border-none shadow-mx-inner group hover:bg-white hover:shadow-mx-lg transition-all">
                                    <div className="w-mx-14 h-mx-14 rounded-mx-xl bg-mx-indigo-50 text-brand-primary flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform">
                                        <Lock size={24} strokeWidth={2} />
                                    </div>
                                    <Typography variant="h2" className="text-2xl mb-4 uppercase tracking-tight">Autoridade de Acesso</Typography>
                                    <Typography variant="caption" tone="muted" className="leading-relaxed uppercase font-black opacity-60">
                                        O portal é dedicado restritamente a colaboradores com credenciais validadas. Cada agente responde pela segurança de suas chaves.
                                    </Typography>
                                </Card>

                                <Card className="bg-surface-alt p-mx-10 rounded-mx-3xl border-none shadow-mx-inner group hover:bg-white hover:shadow-mx-lg transition-all">
                                    <div className="w-mx-14 h-mx-14 rounded-mx-xl bg-status-warning-surface text-status-warning flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform">
                                        <AlertTriangle size={24} strokeWidth={2} />
                                    </div>
                                    <Typography variant="h2" className="text-2xl mb-4 uppercase tracking-tight">Obrigações & Sanções</Typography>
                                    <Typography variant="caption" tone="muted" className="leading-relaxed uppercase font-black opacity-60">
                                        O provimento de dados deve ser factual. Distorções recorrentes autorizam o encerramento do acesso por quebra de governança.
                                    </Typography>
                                </Card>
                            </div>

                            <div className="space-y-mx-md pt-10 border-t border-border-default">
                                <header className="flex items-center gap-mx-sm">
                                    <div className="w-mx-10 h-mx-10 rounded-mx-lg bg-mx-black text-brand-primary flex items-center justify-center shadow-mx-lg"><Zap size={20} /></div>
                                    <Typography variant="h2" className="text-2xl uppercase tracking-tighter">Desempenho e Disponibilidade</Typography>
                                </header>
                                <Typography variant="caption" tone="muted" className="text-base font-black leading-relaxed uppercase tracking-tight">
                                    As informações transacionadas via interface (Lançamentos Diários, Metas, Feedbacks) são estritamente para fins de consultoria operacional. A MX assegura as melhores tecnologias para processamento dos índices preditivos com alta disponibilidade.
                                </Typography>
                            </div>
                        </div>

                        <footer className="pt-10 border-t border-border-default flex flex-col sm:flex-row items-center justify-between gap-mx-10">
                            <Button variant="ghost" onClick={() => navigate(-1)} className="text-tiny font-black uppercase tracking-widest text-text-tertiary hover:text-brand-primary bg-white shadow-sm rounded-mx-full px-8 h-mx-xl">
                                <ArrowLeft size={16} className="mr-2" /> VOLTAR AO SISTEMA
                            </Button>
                            <div className="text-center sm:text-right space-y-mx-tiny">
                                <Typography variant="tiny" tone="muted" className="font-black uppercase">MX CONSULTORIA LTDA © {new Date().getFullYear()}</Typography>
                                <Typography variant="tiny" tone="muted" className="font-black block tracking-widest uppercase">PLATAFORMA LICENCIADA</Typography>
                            </div>
                        </footer>
                    </CardContent>
                </Card>
            </motion.div>
        </main>
    )
}
