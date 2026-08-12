import { Megaphone, Send, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useBroadcasts } from '@/hooks/useBroadcasts'
import { Card } from '@/components/molecules/Card'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Badge } from '@/components/atoms/Badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { type Notification as AppNotification } from '@/lib/schemas/notification.schema'

type BroadcastDisplay = AppNotification & {
    titulo?: string | null
    mensagem?: string | null
}

export function BroadcastsTab() {
    const { broadcasts, loading, refetch } = useBroadcasts()

    return (
        <div className="space-y-mx-lg">
            <Card className="p-mx-lg border-none bg-pure-black text-white relative overflow-hidden">
                <div className="absolute -right-20 -top-20 w-mx-48 h-mx-48 bg-brand-primary/20 rounded-mx-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex items-start justify-between gap-mx-md">
                    <div className="flex items-start gap-mx-md flex-1">
                        <div className="w-mx-14 h-mx-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-status-success-text">
                            <Megaphone size={28} />
                        </div>
                        <div className="space-y-mx-xs">
                            <Typography variant="h3" tone="white" className="tracking-tight">Comunicados da Rede</Typography>
                            <Typography variant="caption" tone="white" className="opacity-60">
                                Broadcasts oficiais MX para vendedores, gerentes e donos
                            </Typography>
                        </div>
                    </div>
                    <Button asChild variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs shrink-0">
                        <Link to="/notificacoes">
                            <Send size={14} className="mr-2" /> Compor
                        </Link>
                    </Button>
                </div>
            </Card>

            <Card className="border-none bg-white overflow-hidden">
                <header className="flex items-center justify-between p-mx-md border-b border-border">
                    <div>
                        <Typography variant="caption" className="">Últimos Broadcasts</Typography>
                        <Typography variant="tiny" tone="muted" className="font-bold">Histórico de comunicados disparados</Typography>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => refetch()} className="rounded-2xl" aria-label="Atualizar broadcasts">
                        <RefreshCw size={16} />
                    </Button>
                </header>

                {loading ? (
                    <div className="p-mx-xl text-center"><RefreshCw size={24} className="animate-spin mx-auto text-status-success-text" /></div>
                ) : broadcasts.length === 0 ? (
                    <div className="p-mx-xl text-center space-y-mx-sm">
                        <Megaphone size={40} className="mx-auto text-muted-foreground opacity-30" />
                        <Typography variant="caption" tone="muted" className="">Nenhum broadcast disparado ainda</Typography>
                    </div>
                ) : (
                    <div className="divide-y divide-border-default">
                        {broadcasts.slice(0, 10).map((b: BroadcastDisplay) => (
                            <div key={b.broadcast_id || b.id} className="p-mx-md hover:bg-surface-alt transition-colors">
                                <div className="flex items-start justify-between gap-mx-sm">
                                    <div className="flex-1 min-w-0">
                                        <Typography variant="caption" className="tracking-tight">
                                            {b.titulo || b.title || 'Sem título'}
                                        </Typography>
                                        <Typography variant="tiny" tone="muted" className="font-bold leading-relaxed mt-1 line-clamp-2">
                                            {b.mensagem || b.message || ''}
                                        </Typography>
                                    </div>
                                    <Badge variant="outline" className="text-mx-micro shrink-0">
                                        {b.created_at ? format(new Date(b.created_at), 'dd/MM HH:mm', { locale: ptBR }) : '—'}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    )
}
