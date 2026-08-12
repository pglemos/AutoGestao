import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, Database, Download, ExternalLink, Server, ShieldCheck, Cpu, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/molecules/Card'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Badge } from '@/components/atoms/Badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { toast } from '@/lib/toast'
import { buildTeamContactsWorkbook, type TeamContactRow } from '@/lib/team-contacts-export'

interface AuditEntry {
    id: string
    created_at: string
    action: string
    actor_email?: string | null
    target?: string | null
    metadata?: Record<string, unknown> | null
}

interface StoreAuditRow {
    id: string
    created_at: string
    store_id: string | null
    changed_by: string | null
    changes: Record<string, unknown> | null
}

interface ExportContactRpcRow {
    loja: string | null
    papel: string | null
    nome: string | null
    telefone: string | null
    email: string | null
    origem: string | null
    vinculo_desde: string | null
}

export function SistemaMxTab() {
    const [audit, setAudit] = useState<AuditEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [exportingContacts, setExportingContacts] = useState(false)
    const [health, setHealth] = useState({
        api: 'verificando',
        db: 'verificando',
        network: 'verificando',
        checkedAt: null as string | null,
        tone: 'warning' as 'success' | 'warning' | 'error',
    })

    const fetchHealth = async () => {
        const startedAt = performance.now()
        const { error } = await supabase.from('lojas').select('id').limit(1)
        const latency = `${Math.max(1, Math.round(performance.now() - startedAt))}ms`
        setHealth({
            api: error ? 'erro' : latency,
            db: error ? 'falha' : 'OK',
            network: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online',
            checkedAt: new Date().toISOString(),
            tone: error ? 'error' : 'success',
        })
    }

    const fetchAudit = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('logs_auditoria_loja')
            .select('id, created_at, store_id, changed_by, changes')
            .order('created_at', { ascending: false })
            .limit(20)
        if (!error && data) {
            setAudit((data as StoreAuditRow[]).map(row => ({
                id: row.id,
                created_at: row.created_at,
                action: 'UPDATE_LOJA',
                actor_email: row.changed_by ? `user:${row.changed_by.slice(0, 8)}` : 'sistema',
                target: row.store_id ? `loja:${row.store_id.slice(0, 8)}` : null,
                metadata: row.changes,
            })))
        }
        setLoading(false)
    }

    const handleExportContacts = async () => {
        setExportingContacts(true)
        try {
            const { data, error } = await supabase.rpc('exportar_contatos_cadastros_mx')
            if (error) throw error

            const rows: TeamContactRow[] = ((data || []) as ExportContactRpcRow[]).map((row) => ({
                Loja: row.loja || '',
                Papel: row.papel || '',
                Nome: row.nome || '',
                Telefone: row.telefone || '',
                Email: row.email || '',
                Origem: row.origem || '',
                'Vínculo desde': row.vinculo_desde || '',
            }))
            const { exportWorkbookToExcel } = await import('@/lib/export')
            const success = exportWorkbookToExcel(buildTeamContactsWorkbook(rows), 'Contatos_Cadastros_MX')
            if (!success) throw new Error('Falha ao gerar arquivo XLSX.')
            toast.success(`${rows.length} contatos exportados.`)
            void fetchAudit()
        } catch (error) {
            console.error('Erro ao exportar contatos dos cadastros:', error)
            toast.error('Não foi possível exportar os contatos dos cadastros.')
        } finally {
            setExportingContacts(false)
        }
    }

    useEffect(() => {
        fetchAudit()
        fetchHealth()
    }, [])

    return (
        <div className="space-y-mx-lg">
            {/* System status header */}
            <Card className="p-mx-lg border-none bg-pure-black text-white relative overflow-hidden">
                <div className="absolute -right-20 -top-20 w-mx-48 h-mx-48 bg-status-success/20 rounded-mx-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex items-center justify-between gap-mx-md flex-wrap">
                    <div className="flex items-center gap-mx-md">
                        <div className="w-mx-14 h-mx-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-status-success-text">
                            <Server size={28} />
                        </div>
                        <div>
                            <Typography variant="h3" tone="white" className="tracking-tight">Sistema MX</Typography>
                            <Typography variant="caption" tone="white" className="opacity-60">
                                Saúde, auditoria e operações críticas
                            </Typography>
                        </div>
                    </div>
                    <div className="flex items-center gap-mx-md">
                        <StatusPill icon={<Cpu size={14} />} label="API" tone={health.tone} value={health.api} />
                        <StatusPill icon={<Database size={14} />} label="DB" tone={health.tone} value={health.db} />
                        <StatusPill icon={<Activity size={14} />} label="Rede" tone={health.network === 'offline' ? 'error' : health.tone} value={health.network} />
                    </div>
                </div>
            </Card>

            {/* Operações críticas */}
            <div className="grid md:grid-cols-4 gap-mx-md">
                <CriticalOpCard
                    icon={<RefreshCw size={22} />}
                    label="Reprocessamento"
                    desc="Reimportar dados brutos de uma loja"
                    route="/configuracoes/reprocessamento"
                    severity="warning"
                />
                <CriticalOpCard
                    icon={<Cpu size={22} />}
                    label="Auditoria de Funil"
                    desc="Diagnóstico heurístico MX 20/60/33"
                    route="/auditoria"
                    severity="info"
                />
                <CriticalOpCard
                    icon={<ShieldCheck size={22} />}
                    label="Configuração Operacional"
                    desc="Página dedicada de parâmetros por loja"
                    route="/configuracoes/operacional"
                    severity="info"
                />
                <ExportContactsCard
                    exporting={exportingContacts}
                    onExport={handleExportContacts}
                />
            </div>

            {/* Auditoria */}
            <Card className="border-none bg-white overflow-hidden">
                <header className="flex items-center justify-between p-mx-md border-b border-border">
                    <div className="flex items-center gap-mx-sm">
                        <div className="w-mx-12 h-mx-12 rounded-2xl bg-brand-primary-subtle text-status-success-text flex items-center justify-center">
                            <Activity size={20} />
                        </div>
                        <div>
                            <Typography variant="caption" className="">Log de Auditoria</Typography>
                            <Typography variant="tiny" tone="muted" className="font-bold">Últimas 20 ações sensíveis</Typography>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => { fetchAudit(); fetchHealth() }} className="rounded-2xl" aria-label="Atualizar auditoria e saúde">
                        <RefreshCw size={16} />
                    </Button>
                </header>

                {loading ? (
                    <div className="p-mx-xl text-center"><RefreshCw size={24} className="animate-spin mx-auto text-status-success-text" /></div>
                ) : audit.length === 0 ? (
                    <div className="p-mx-xl text-center space-y-mx-sm">
                        <Activity size={40} className="mx-auto text-muted-foreground opacity-30" />
                        <Typography variant="caption" tone="muted" className="">Nenhum registro de auditoria</Typography>
                    </div>
                ) : (
                    <div className="divide-y divide-border-default">
                        {audit.map(entry => (
                            <div key={entry.id} className="flex items-start gap-mx-md p-mx-md hover:bg-gray-50 transition-colors">
                                <div className="w-mx-10 h-mx-10 rounded-2xl bg-status-warning/10 text-status-warning flex items-center justify-center shrink-0">
                                    <AlertTriangle size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <Typography variant="caption" className="tracking-tight font-mono-numbers">
                                        {entry.action}
                                    </Typography>
                                    <Typography variant="tiny" tone="muted" className="font-bold mt-1">
                                        {entry.actor_email || 'sistema'} {entry.target ? `→ ${entry.target}` : ''}
                                    </Typography>
                                </div>
                                <Badge variant="outline" className="text-mx-micro shrink-0">
                                    {format(new Date(entry.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                                </Badge>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Versão */}
            <Card className="p-mx-md border-none bg-gray-50">
                <div className="flex items-center justify-between">
                    <Typography variant="tiny" tone="muted" className="">Versão / Último check</Typography>
                    <Typography variant="tiny" className="font-mono-numbers">
                        {import.meta.env.VITE_APP_VERSION || '1.0.0'} · {health.checkedAt ? format(new Date(health.checkedAt), 'dd/MM HH:mm', { locale: ptBR }) : 'pendente'}
                    </Typography>
                </div>
            </Card>
        </div>
    )
}

function ExportContactsCard({ exporting, onExport }: { exporting: boolean; onExport: () => void }) {
    return (
        <Card className="p-mx-md border-none bg-white hover:shadow-sm transition-shadow">
            <div className="w-mx-12 h-mx-12 rounded-2xl border border-status-success/20 bg-status-success/5 text-status-success flex items-center justify-center mb-mx-sm">
                {exporting ? <RefreshCw size={22} className="animate-spin" /> : <Download size={22} />}
            </div>
            <Typography variant="caption" className="tracking-tight">Exportar Contatos</Typography>
            <Typography variant="tiny" tone="muted" className="font-bold leading-relaxed mt-1 mb-mx-sm">
                Baixar XLSX de donos, sócios, gerentes e vendedores ativos
            </Typography>
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={exporting}
                onClick={onExport}
                className="h-mx-9 px-3 text-mx-micro"
            >
                {exporting ? 'Gerando' : 'Baixar'} <Download size={11} className="ml-1" />
            </Button>
        </Card>
    )
}

function StatusPill({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'success' | 'warning' | 'error' }) {
    const colors = {
        success: 'bg-status-success/10 text-status-success border-status-success/20',
        warning: 'bg-status-warning/10 text-status-warning border-status-warning/20',
        error: 'bg-status-error/10 text-status-error border-status-error/20',
    }
    return (
        <div className={`flex items-center gap-mx-xs px-3 h-mx-10 rounded-mx-full border ${colors[tone]}`}>
            {icon}
            <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
            <span className="text-xs font-bold tabular-nums opacity-70">{value}</span>
        </div>
    )
}

function CriticalOpCard({ icon, label, desc, route, severity }: {
    icon: React.ReactNode
    label: string
    desc: string
    route: string
    severity: 'warning' | 'info' | 'error'
}) {
    const sev = {
        warning: 'border-status-warning/20 bg-status-warning/5 text-status-warning',
        info: 'border-brand-primary/20 bg-brand-primary-subtle text-status-success-text',
        error: 'border-status-error/20 bg-status-error/5 text-status-error',
    }
    return (
        <Card className="p-mx-md border-none bg-white hover:shadow-sm transition-shadow">
            <div className={`w-mx-12 h-mx-12 rounded-2xl border flex items-center justify-center mb-mx-sm ${sev[severity]}`}>
                {icon}
            </div>
            <Typography variant="caption" className="tracking-tight">{label}</Typography>
            <Typography variant="tiny" tone="muted" className="font-bold leading-relaxed mt-1 mb-mx-sm">{desc}</Typography>
            <Button asChild variant="outline" size="sm" className="h-mx-9 px-3 text-mx-micro">
                <Link to={route}>Abrir <ExternalLink size={11} className="ml-1" /></Link>
            </Button>
        </Card>
    )
}
