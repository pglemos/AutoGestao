import { Calendar, Globe, Webhook, ExternalLink, ShieldCheck, Database, Zap } from 'lucide-react'
import { Card } from '@/components/molecules/Card'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Badge } from '@/components/atoms/Badge'
import { GoogleCalendarStatus } from '@/features/agenda/components/GoogleCalendarStatus'
import { Link } from 'react-router-dom'

export function IntegracoesTab() {
    return (
        <div className="space-y-mx-lg">
            {/* Google Calendar pessoal + central */}
            <Card className="p-mx-lg md:p-mx-xl border-none bg-white">
                <header className="flex items-center gap-mx-sm pb-mx-md border-b border-border mb-mx-lg">
                    <div className="w-mx-14 h-mx-14 rounded-2xl bg-brand-primary-subtle text-status-success-text flex items-center justify-center border border-brand-primary/20">
                        <Calendar size={26} />
                    </div>
                    <div>
                        <Typography variant="h3" className="tracking-tight">Google Calendar</Typography>
                        <Typography variant="caption" tone="muted" className="">Sincronização pessoal e Agenda Central MX</Typography>
                    </div>
                </header>
                <GoogleCalendarStatus />
            </Card>

            {/* Atalhos para áreas admin */}
            <div className="grid md:grid-cols-2 gap-mx-md">
                <IntegrationCard
                    icon={<Calendar size={22} />}
                    title="Agenda Admin MX"
                    desc="Coordenação central de visitas e eventos da rede"
                    badge="Operacional"
                    route="/agenda"
                />
                <IntegrationCard
                    icon={<Database size={22} />}
                    title="Reprocessamento de Dados"
                    desc="Reimportação manual de dados brutos por loja"
                    badge="Manual"
                    route="/configuracoes/reprocessamento"
                />
                <IntegrationCard
                    icon={<Zap size={22} />}
                    title="Auditoria de Funil"
                    desc="Diagnóstico heurístico da rede com benchmarks MX"
                    badge="MX"
                    route="/auditoria"
                />
                <IntegrationCard
                    icon={<ShieldCheck size={22} />}
                    title="OAuth & Tokens"
                    desc="Limpeza automática de estados OAuth (cron)"
                    badge="Auto"
                    disabled
                />
            </div>

            {/* Webhooks placeholder */}
            <Card className="p-mx-lg border-none bg-white">
                <header className="flex items-center justify-between pb-mx-md border-b border-border mb-mx-lg">
                    <div className="flex items-center gap-mx-sm">
                        <div className="w-mx-14 h-mx-14 rounded-2xl bg-surface-alt text-muted-foreground flex items-center justify-center border border-border">
                            <Webhook size={26} />
                        </div>
                        <div>
                            <Typography variant="h3" className="tracking-tight">Webhooks</Typography>
                            <Typography variant="caption" tone="muted" className="">Integrações externas</Typography>
                        </div>
                    </div>
                    <Badge variant="outline" className="">Em breve</Badge>
                </header>
                <Typography variant="caption" tone="muted" className="font-bold leading-relaxed">
                    Conecte sistemas externos via webhooks (Slack, Notion, ERPs, CRMs).
                    Endpoints de saída para eventos: novo lead, fechamento de venda, alerta de gap.
                </Typography>
            </Card>

            {/* Edge Functions */}
            <Card className="p-mx-lg border-none bg-white">
                <header className="flex items-center gap-mx-sm pb-mx-md border-b border-border mb-mx-lg">
                    <div className="w-mx-14 h-mx-14 rounded-2xl bg-status-success/10 text-status-success flex items-center justify-center border border-status-success/20">
                        <Globe size={26} />
                    </div>
                    <div>
                        <Typography variant="h3" className="tracking-tight">Edge Functions Registradas</Typography>
                        <Typography variant="caption" tone="muted" className="">Inventário local; saúde real via logs e Supabase</Typography>
                    </div>
                </header>
                <div className="grid md:grid-cols-2 gap-mx-sm">
                    {[
                        'register-user',
                        'relatorio-matinal',
                        'relatorio-mensal',
                        'feedback-semanal',
                        'send-individual-feedback',
                        'send-visit-report',
                        'google-calendar-sync',
                        'google-calendar-events',
                        'google-calendar-merged',
                        'google-oauth-handler',
                    ].map(fn => (
                        <div key={fn} className="flex items-center justify-between p-mx-sm bg-surface-alt rounded-2xl border border-border-subtle">
                            <Typography variant="tiny" className="font-mono-numbers font-bold">{fn}</Typography>
                            <Badge variant="outline" className="text-mx-micro">Registrada</Badge>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    )
}

function IntegrationCard({ icon, title, desc, badge, route, disabled }: {
    icon: React.ReactNode
    title: string
    desc: string
    badge: string
    route?: string
    disabled?: boolean
}) {
    return (
        <Card className="p-mx-md border-none bg-white hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-mx-sm">
                <div className="w-mx-12 h-mx-12 rounded-2xl bg-brand-primary-subtle text-status-success-text flex items-center justify-center shrink-0">{icon}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-mx-xs">
                        <Typography variant="caption" className="tracking-tight">{title}</Typography>
                        <Badge variant="outline" className="text-mx-micro shrink-0">{badge}</Badge>
                    </div>
                    <Typography variant="tiny" tone="muted" className="font-bold leading-relaxed mt-1 mb-mx-sm">{desc}</Typography>
                    {route && !disabled && (
                        <Button asChild variant="outline" size="sm" className="h-mx-9 px-3 text-mx-micro">
                            <Link to={route}>Acessar <ExternalLink size={11} className="ml-1" /></Link>
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    )
}
