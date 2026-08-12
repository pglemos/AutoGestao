import React from 'react'
import { Trophy, Megaphone, Headphones, Activity } from 'lucide-react'
import type { RankingEntry } from '@/types/database'
import { motion } from 'motion/react'
import { Avatar } from '@/components/atoms/Avatar'
import { getDiasInfo } from '@/lib/calculations'

interface LiveFloorProps {
    ranking: RankingEntry[]
}

export function LiveFloor({ ranking }: LiveFloorProps) {
    const statuses = {
        available: { type: 'available', label: 'Check-in realizado', color: 'text-status-success-text', bg: 'bg-status-success-surface border-status-success/20', icon: Headphones },
        offline: { type: 'offline', label: 'Sem check-in', color: 'text-muted-foreground', bg: 'bg-gray-50 border-border', icon: Activity },
    }

    const liveAgents = ranking.map((seller) => {
        const status = seller.checked_in ? statuses.available : statuses.offline
        return {
            ...seller,
            status,
            duration: seller.checked_in ? 'OK' : '--',
            isCritical: false,
            avatar_url: seller.avatar_url || null,
        }
    })

    const totalSalesToday = ranking.reduce((acc, curr) => acc + (curr.vnd_yesterday || 0), 0)
    const diasInfo = getDiasInfo()
    const teamGoal = ranking.reduce((acc, curr) => acc + curr.meta, 0) / Math.max(diasInfo.total, 1)
    const teamProgress = teamGoal > 0 ? (totalSalesToday / teamGoal) * 100 : 0

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full gap-mx-lg pb-2 relative">
            <div className="bg-gray-900 rounded-2xl p-mx-tiny border border-white/10 flex items-center justify-between gap-mx-lg relative overflow-hidden shrink-0 shadow-lg">
                <div className="absolute top-mx-0 left-mx-0 h-full bg-brand-primary/10 transition-all duration-1000" style={{ width: `${Math.min(teamProgress, 100)}%` }} aria-hidden="true" />

                <div className="flex items-center gap-mx-md px-6 py-3 relative z-10">
                    <div className="w-mx-10 h-mx-10 rounded-xl bg-brand-primary text-foreground flex items-center justify-center font-bold shadow-mx-glow-brand">
                        <Trophy className="w-mx-sm h-mx-sm" aria-hidden="true" />
                    </div>
                    <div>
                        <div className="text-mx-tiny font-bold text-muted-foreground uppercase tracking-widest">Ritmo do Time Hoje</div>
                        <div className="text-xl font-bold text-white flex items-baseline gap-mx-tiny">
                            {totalSalesToday} <span className="text-sm text-muted-foreground font-bold">/ ~{Math.round(teamGoal)} Vendas</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 h-mx-xs bg-white/10 rounded-full overflow-hidden relative mx-4 max-w-md" aria-hidden="true">
                    <div className="h-full bg-gradient-to-r from-brand-primary to-status-info transition-all duration-1000 relative" style={{ width: `${Math.min(teamProgress, 100)}%` }} />
                </div>

                <div className="px-6 py-3 relative z-10 flex items-center gap-mx-sm">
                    <button
                        type="button"
                        disabled
                        title="Broadcast depende de backend de comunicação em tempo real."
                        className="flex items-center gap-mx-xs text-xs font-bold text-white/40 bg-white/5 border border-white/10 px-4 py-2 rounded-xl cursor-not-allowed"
                    >
                        <Megaphone className="w-mx-sm h-mx-sm text-white/40" aria-hidden="true" />
                        Broadcast indisponível
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-mx-lg min-h-0">
                <div className="flex-1 bg-gray-900 rounded-2xl border border-white/10 p-mx-lg overflow-y-auto custom-scrollbar relative">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="font-display font-bold text-xl text-white flex items-center gap-mx-xs">
                            <span className="w-mx-xs h-mx-xs rounded-full bg-status-success" aria-hidden="true" />
                            Monitoramento de Check-in
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-mx-md pb-20" role="list" aria-label="Status de check-in dos vendedores">
                        {liveAgents.length === 0 && (
                            <div className="col-span-full rounded-2xl border border-white/10 bg-white/5 p-mx-lg text-center">
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground leading-relaxed">
                                    Nenhum vendedor ativo encontrado para monitoramento.
                                </p>
                            </div>
                        )}
                        {liveAgents.map(agent => (
                            <div key={agent.user_id} role="listitem" className={`p-mx-md rounded-2xl border transition-all duration-300 relative overflow-hidden group ${agent.status.bg}`}>
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className="flex items-center gap-mx-sm">
                                        <div className="relative">
                                            <Avatar src={agent.avatar_url || undefined} alt={`Avatar de ${agent.user_name}`} fallback={agent.user_name} className="w-mx-10 h-mx-10 rounded-xl border border-white/10" />
                                            <div className={`absolute -bottom-1 -right-1 w-mx-xs h-mx-xs rounded-full border-2 border-mx-black ${agent.status.type === 'available' ? 'bg-status-success' : 'bg-status-warning'}`} aria-hidden="true" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm">{agent.user_name}</h4>
                                            <div className={`flex items-center gap-mx-tiny text-mx-tiny font-bold uppercase mt-0.5 ${agent.status.color}`}>
                                                <agent.status.icon className="w-mx-xs h-mx-xs" aria-hidden="true" />
                                                {agent.status.label}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="font-mono font-bold text-sm px-2 py-1 rounded-lg border bg-black/20 text-white/80 border-white/5">
                                        {agent.duration}
                                    </div>
                                </div>

                                <div className="space-y-mx-xs mb-4 relative z-10">
                                    <div className="flex justify-between text-mx-micro font-bold text-muted-foreground uppercase mb-1">
                                        <span>Vendas</span>
                                        <span className={agent.vnd_total > 0 ? 'text-status-success-text' : ''}>{agent.vnd_total}/{agent.meta}</span>
                                    </div>
                                    <div className="h-mx-tiny.5 bg-black/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-brand-primary rounded-full" style={{ width: `${Math.min(agent.atingimento, 100)}%` }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-full lg:w-mx-80 bg-gray-900 rounded-2xl border border-white/10 p-mx-lg flex flex-col shrink-0">
                    <h3 className="font-display font-bold text-lg text-white mb-6 flex items-center gap-mx-xs">
                        <Activity className="w-mx-sm h-mx-sm text-status-success-text" aria-hidden="true" />
                        Feed
                    </h3>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-mx-md pr-2">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-mx-lg text-center">
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground leading-relaxed">
                                Feed em tempo real indisponível até integração de eventos operacionais.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
