import { ChevronRight, Database, FileText, ListChecks, Sparkles } from 'lucide-react'
import { Card } from '@/components/molecules/Card'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Badge } from '@/components/atoms/Badge'
import { ConsultingParametersView } from '@/features/consultoria/components/ConsultingParametersView'

export function ConsultoriaPmrTab() {
    return (
        <div className="space-y-mx-lg">
            <Card className="p-mx-lg border-none bg-pure-black text-white relative overflow-hidden">
                <div className="absolute -right-20 -top-20 w-mx-48 h-mx-48 bg-brand-primary/20 rounded-mx-full blur-3xl pointer-events-none" />
                <div className="relative z-[var(--mx-z-sticky)] flex items-start gap-mx-md">
                    <div className="w-mx-14 h-mx-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-status-success-text">
                        <Sparkles size={28} />
                    </div>
                    <div className="flex-1 space-y-mx-xs">
                        <Typography variant="h3" tone="white" className="tracking-tight">Parâmetros da Consultoria PMR</Typography>
                        <Typography variant="caption" tone="white" className="opacity-60">
                            Conjuntos ativos, programas de visita, métricas e diagnósticos
                        </Typography>
                    </div>
                </div>
            </Card>

            <div className="grid md:grid-cols-3 gap-mx-md">
                <ShortcutCard
                    icon={<Database size={22} />}
                    label="Conjuntos de Parâmetros"
                    desc="Versionamento dos parâmetros PMR ativos por programa"
                    badge="Ativo"
                />
                <ShortcutCard
                    icon={<ListChecks size={22} />}
                    label="Programas de Visita"
                    desc="Mapeamento de visitas e blocos por programa de consultoria"
                    badge="7 visitas"
                />
                <ShortcutCard
                    icon={<FileText size={22} />}
                    label="Catálogo de Métricas"
                    desc="Indicadores acompanhados ao longo do programa"
                    badge="Sincronizado"
                />
            </div>

            {/* Embed da view existente */}
            <div className="rounded-2xl overflow-hidden border border-border">
                <ConsultingParametersView />
            </div>
        </div>
    )
}

function ShortcutCard({ icon, label, desc, badge }: { icon: React.ReactNode; label: string; desc: string; badge: string }) {
    return (
        <Card className="p-mx-md border-none bg-white">
            <div className="flex items-start gap-mx-sm">
                <div className="w-mx-12 h-mx-12 rounded-2xl bg-brand-primary-subtle text-status-success-text flex items-center justify-center">
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-mx-xs">
                        <Typography variant="caption" className="tracking-tight">{label}</Typography>
                        <Badge variant="success" className="text-mx-micro shrink-0">{badge}</Badge>
                    </div>
                    <Typography variant="tiny" tone="muted" className="font-bold leading-relaxed mt-1">{desc}</Typography>
                </div>
            </div>
        </Card>
    )
}
