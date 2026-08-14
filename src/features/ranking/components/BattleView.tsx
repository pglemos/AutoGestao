import React from 'react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import type { RankingEntry } from '@/types/database'
import { Avatar } from '@/components/atoms/Avatar'

interface BattleViewProps {
    opponents: string[]
    ranking: RankingEntry[]
}

export function BattleView({ opponents, ranking }: BattleViewProps) {
    const p1Id = opponents[0]
    const p2Id = opponents[1]

    const p1 = ranking.find(s => s.user_id === p1Id)
    const p2 = ranking.find(s => s.user_id === p2Id)

    if (!p1 || !p2) return <div className="text-center p-mx-xl text-muted-foreground font-bold uppercase tracking-widest">Selecione dois vendedores</div>

    const ComparisonRow = ({ label, v1, v2, format = (v: number) => v }: { label: string, v1: number, v2: number, format?: (v: number) => ReactNode }) => {
        const total = v1 + v2
        const p1Pct = total === 0 ? 50 : (v1 / total) * 100
        const winner = v1 > v2 ? 'p1' : v2 > v1 ? 'p2' : 'draw'

        return (
            <div className="mb-6 group">
                <div className="flex justify-between items-end mb-2 text-sm font-bold text-white">
                    <span className={winner === 'p1' ? 'text-status-success-text scale-110 transition-transform' : 'text-muted-foreground'}>{format(v1)}</span>
                    <span className="text-mx-tiny uppercase text-muted-foreground tracking-widest">{label}</span>
                    <span className={winner === 'p2' ? 'text-status-info-text scale-110 transition-transform' : 'text-muted-foreground'}>{format(v2)}</span>
                </div>
                <div className="h-mx-sm bg-gray-900 rounded-full overflow-hidden flex relative shadow-none">
                    <div className={`h-full transition-all duration-1000 ${winner === 'p1' ? 'bg-brand-primary shadow-mx-glow-brand' : 'bg-brand-primary/50'}`} style={{ width: `${p1Pct}%` }}></div>
                    <div className="w-mx-tiny bg-surface-alt z-[var(--mx-z-sticky)] skew-x-[-20deg]"></div>
                    <div className={`h-full transition-all duration-1000 flex-1 ${winner === 'p2' ? 'bg-status-info shadow-mx-glow-brand' : 'bg-status-info/50'}`}></div>
                </div>
            </div>
        )
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 relative gap-mx-lg md:gap-0">
                {/* VS Badge */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-mx-20 h-mx-20 rounded-full bg-gray-900 border-4 border-surface-alt flex items-center justify-center z-[var(--mx-z-sticky)] shadow-xl">
                    <span className="font-display font-bold text-2xl italic text-white">VS</span>
                </div>

                {/* Player 1 */}
                <div className="bg-gray-900 p-mx-lg rounded-3xl border border-brand-primary/20 flex flex-col items-center w-full md:w-mx-sm/12 relative overflow-hidden">
                    <div className="absolute top-mx-0 right-mx-0 w-mx-32 h-mx-32 bg-brand-primary blur-mx-huge opacity-20 rounded-full"></div>
                    <Avatar src={p1.avatar_url || undefined} alt={`Avatar de ${p1.user_name}`} fallback={p1.user_name} className="w-mx-20 h-mx-20 rounded-2xl border-2 border-brand-primary shadow-mx-glow-brand mb-4" />
                    <h3 className="font-display font-bold text-2xl text-white text-center">{p1.user_name}</h3>
                    <p className="text-xs font-bold text-status-success-text uppercase tracking-widest text-center mt-1">{p1.store_name}</p>
                </div>

                {/* Player 2 */}
                <div className="bg-gray-900 p-mx-lg rounded-3xl border border-status-info/20 flex flex-col items-center w-full md:w-mx-sm/12 relative overflow-hidden">
                    <div className="absolute top-mx-0 left-mx-0 w-mx-32 h-mx-32 bg-status-info blur-mx-huge opacity-20 rounded-full"></div>
                    <Avatar src={p2.avatar_url || undefined} alt={`Avatar de ${p2.user_name}`} fallback={p2.user_name} className="w-mx-20 h-mx-20 rounded-2xl border-2 border-status-info shadow-mx-glow-brand mb-4" />
                    <h3 className="font-display font-bold text-2xl text-white text-center">{p2.user_name}</h3>
                    <p className="text-xs font-bold text-status-info-text uppercase tracking-widest text-center mt-1">{p2.store_name}</p>
                </div>
            </div>

            <div className="glass-panel p-mx-xl rounded-2xl bg-gray-900/80 backdrop-blur-xl border border-white/10">
                <ComparisonRow label="Atingimento (%)" v1={p1.atingimento} v2={p2.atingimento} format={(v) => `${Math.round(v)}%`} />
                <ComparisonRow label="Vendas Totais" v1={p1.vnd_total} v2={p2.vnd_total} />
                <ComparisonRow label="Leads" v1={p1.leads} v2={p2.leads} />
                <ComparisonRow label="Agendamentos" v1={p1.agd_total} v2={p2.agd_total} />
                <ComparisonRow label="Visitas" v1={p1.visitas} v2={p2.visitas} />
            </div>
        </motion.div>
    )
}
