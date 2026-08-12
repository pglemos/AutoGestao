import { Shield, Lock, FileText, ShieldCheck, ArrowLeft, CalendarDays } from 'lucide-react'
import { motion } from 'motion/react'
import { Link, useNavigate } from 'react-router-dom'
import { Typography } from '@/components/atoms/Typography'
import { Button } from '@/components/atoms/Button'
import { Card, CardContent } from '@/components/molecules/Card'

export default function Privacy() {
    const navigate = useNavigate()

    return (
        // lint-page-roots-ignore: idem Terms — card centrado, rota pública.
        <main className="min-h-screen bg-surface-alt flex items-center justify-center p-mx-sm sm:p-10 selection:bg-brand-primary selection:text-white relative overflow-hidden">

            <div className="absolute top-mx-0 right-mx-0 w-mx-hero h-mx-hero bg-brand-primary/5 rounded-mx-full blur-mx-xl -mr-mx-lg -mt-mx-lg pointer-events-none" aria-hidden="true" />
            <div className="absolute bottom-mx-0 left-mx-0 w-mx-hero h-mx-hero bg-status-success-surface rounded-mx-full blur-mx-xl -ml-mx-lg -mb-mx-lg pointer-events-none" aria-hidden="true" />

            <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-4xl"
            >
                <Card className="border-none bg-white overflow-hidden flex flex-col relative z-10">
                    <header className="bg-gray-900 p-mx-10 md:p-16 relative overflow-hidden text-center">
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 to-transparent z-0 pointer-events-none" />
                        
                        <div className="w-mx-20 h-mx-header rounded-2xl bg-white/10 text-white flex items-center justify-center mx-auto mb-8 shadow-sm backdrop-blur-xl relative z-10 border border-white/10">
                            <Lock size={32} strokeWidth={2} />
                        </div>
                        <Typography variant="h1" tone="white" className="text-display mb-4 relative z-10">Política de <span className="text-status-success-text">Privacidade</span></Typography>
                        <Typography variant="tiny" tone="white" className="max-w-xl mx-auto opacity-60 relative z-10 block">MX PERFORMANCE - PROTECAO & TRATAMENTO DE DADOS</Typography>
                    </header>

                    <CardContent className="p-mx-10 md:p-20 space-y-mx-14">
                        <div className="space-y-mx-10">
                            <Typography variant="p" className="text-label font-bold border-l-4 border-brand-primary pl-8">
                                O MX PERFORMANCE e uma plataforma da MX Consultoria para gestao de visitas, rotinas comerciais e sincronizacao autorizada com o Google Calendar.
                            </Typography>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-mx-lg">
                                <Card className="bg-gray-50 p-mx-10 border-none group hover:bg-white hover:shadow-sm transition-all">
                                    <div className="w-mx-14 h-mx-14 rounded-2xl bg-mx-indigo-50 text-status-success-text flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform">
                                        <FileText size={24} strokeWidth={2} />
                                    </div>
                                    <Typography variant="h2" className="mb-4">Coleta de Métricas</Typography>
                                    <Typography variant="caption" tone="muted" className="leading-relaxed opacity-60">
                                        Registramos dados operacionais informados pelos usuarios, como visitas, lojas, equipe, metas, indicadores e historico de acompanhamento.
                                    </Typography>
                                </Card>

                                <Card className="bg-gray-50 p-mx-10 border-none group hover:bg-white hover:shadow-sm transition-all">
                                    <div className="w-mx-14 h-mx-14 rounded-2xl bg-status-success-surface text-status-success flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform">
                                        <Shield size={24} strokeWidth={2} />
                                    </div>
                                    <Typography variant="h2" className="mb-4">Privilégios RLS</Typography>
                                    <Typography variant="caption" tone="muted" className="leading-relaxed opacity-60">
                                        O acesso e controlado por autenticacao, papeis internos e Row-Level Security para limitar a visualizacao conforme a hierarquia do usuario.
                                    </Typography>
                                </Card>
                            </div>

                            <div className="space-y-mx-md pt-10 border-t border-border">
                                <header className="flex items-center gap-mx-sm">
                                    <div className="w-mx-10 h-mx-10 rounded-xl bg-gray-900 text-status-success-text flex items-center justify-center shadow-sm"><CalendarDays size={20} /></div>
                                    <Typography variant="h2">Uso de Dados do Google Calendar e Meet</Typography>
                                </header>
                                <Typography variant="caption" tone="muted" className="leading-relaxed">
                                    Quando um usuario autoriza a integracao, o MX PERFORMANCE acessa eventos do Google Calendar e artefatos autorizados do Google Meet somente para exibir, criar, atualizar e sincronizar visitas, aulas, eventos online, links de reuniao, transcricoes e atas relacionadas ao trabalho da MX Consultoria. O sistema nao vende dados do Google, nao usa dados do Google Calendar ou Google Meet para publicidade e nao compartilha essas informacoes com terceiros fora da operacao autorizada.
                                </Typography>
                                <Typography variant="caption" tone="muted" className="leading-relaxed block">
                                    O usuario pode revogar o acesso a qualquer momento pela conta Google em Seguranca &gt; Apps e servicos de terceiros, ou solicitar remocao de dados pelo canal administrativo da MX Consultoria.
                                </Typography>
                            </div>

                            <div className="space-y-mx-md pt-10 border-t border-border">
                                <header className="flex items-center gap-mx-sm">
                                    <div className="w-mx-10 h-mx-10 rounded-xl bg-gray-900 text-status-success-text flex items-center justify-center shadow-sm"><ShieldCheck size={20} /></div>
                                    <Typography variant="h2">Arquitetura de Blindagem</Typography>
                                </header>
                                <Typography variant="caption" tone="muted" className="text-base leading-relaxed tracking-tight">
                                    Mantemos registros de auditoria para alteracoes relevantes no sistema e aplicamos controles de acesso para proteger informacoes operacionais, comerciais e de agenda.
                                </Typography>
                            </div>
                        </div>

                        <footer className="pt-10 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-mx-10 w-full flex-wrap">
                            <Button variant="ghost" onClick={() => navigate(-1)} className="text-caption font-bold text-muted-foreground hover:text-status-success-text bg-white shadow-sm rounded-mx-full px-6 h-mx-xl w-full sm:w-auto justify-center">
                                <ArrowLeft size={16} className="mr-2" /> VOLTAR AO SISTEMA
                            </Button>
                            <div className="text-center sm:text-right space-y-mx-tiny">
                                <Link to="/" className="text-label font-bold text-mx-green-800 hover:text-mx-green-900">MX PERFORMANCE</Link>
                                <Typography variant="tiny" tone="muted" className="">MX CONSULTORIA LTDA © {new Date().getFullYear()}</Typography>
                                <Typography variant="tiny" tone="muted" className="block">POLITICA PUBLICA DE PRIVACIDADE</Typography>
                            </div>
                        </footer>
                    </CardContent>
                </Card>
            </motion.div>
        </main>
    )
}
