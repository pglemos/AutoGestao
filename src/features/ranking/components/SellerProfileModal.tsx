import React, { useEffect, useRef } from 'react'
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts'
import { X, Flame, Crown, TrendingUp, Activity, CheckCircle2 } from 'lucide-react'
import type { RankingEntry } from '@/types/database'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/atoms/Avatar'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { chartTokens } from '@/lib/charts/tokens'

interface SellerProfileModalProps {
    seller: RankingEntry
    onClose: () => void
}

export function SellerProfileModal({ seller, onClose }: SellerProfileModalProps) {
    const closeButtonRef = useRef<HTMLButtonElement>(null)
    const dialogRef = useRef<HTMLDivElement>(null)
    useFocusTrap(dialogRef, true)

    useEffect(() => {
        closeButtonRef.current?.focus()
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [onClose])
    
    // Calculate "RPG Attributes" based on real stats
    // Atingimento (Meta), Volume (Leads/Visitas), Conversão (Vendas / Leads), Consistência (Ritmo)
    const attributes = [
        { subject: 'Atingimento', A: Math.min(seller.atingimento, 100), fullMark: 100 },
        { subject: 'Volume', A: Math.min(((seller.leads + seller.visitas + seller.agd_total) / Math.max(seller.meta * 3, 1)) * 100, 100), fullMark: 100 },
        { subject: 'Conversão', A: seller.leads > 0 ? Math.min((seller.vnd_total / seller.leads) * 100, 100) : 0, fullMark: 100 },
        { subject: 'Ritmo', A: Math.min(seller.ritmo * 10, 100), fullMark: 100 },
        { subject: 'Visitas', A: Math.min(seller.visitas * 5, 100), fullMark: 100 },
    ]

    const trend = seller.atingimento > 80 ? 'up' : 'down'
    const badge = seller.position === 1 ? 'crown' : seller.atingimento >= 100 ? 'fire' : 'none'

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-mx-md">
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm" 
                onClick={onClose} 
            />
            
            <motion.div 
                ref={dialogRef}
                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-gray-900 w-full max-w-3xl rounded-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col md:flex-row text-white max-h-[90vh] border border-white/10"
                role="dialog"
                aria-modal="true"
                aria-labelledby="seller-profile-title"
            >
                <button ref={closeButtonRef} type="button" aria-label="Fechar perfil do vendedor" onClick={onClose} className="absolute top-mx-sm right-mx-sm p-mx-xs hover:bg-white/10 rounded-full transition-colors z-20">
                    <X className="w-mx-md h-mx-md text-muted-foreground" aria-hidden="true" />
                </button>

                {/* Left: Avatar & Badges */}
                <div className="w-full md:w-mx-tiny/3 bg-white/5 p-mx-xl flex flex-col items-center border-r border-white/5 relative overflow-hidden">
                    <div className="absolute top-mx-0 left-mx-0 w-full h-mx-tiny bg-gradient-to-r from-brand-primary to-transparent" aria-hidden="true"></div>
                    <div className="w-mx-32 h-mx-32 rounded-full p-mx-tiny bg-gradient-to-b from-brand-primary to-transparent mb-6 relative shrink-0">
                        <Avatar src={seller.avatar_url || undefined} alt={`Avatar de ${seller.user_name}`} fallback={seller.user_name} className="w-full h-full rounded-full border-4 border-mx-black bg-gray-50" />
                        <div className="absolute -bottom-2 -right-2 w-mx-10 h-mx-10 bg-gray-900 rounded-full flex items-center justify-center border-2 border-brand-primary text-status-success-text font-bold shadow-lg">
                            {seller.position}º
                        </div>
                    </div>
                    
                    <h2 id="seller-profile-title" className="font-display font-bold text-2xl text-white mb-1 text-center">{seller.user_name}</h2>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">{seller.store_name || 'Loja não informada'}</p>

                    <div className="flex gap-mx-xs justify-center w-full flex-wrap mb-8">
                        {badge === 'fire' && <div className="p-mx-xs bg-status-warning-surface text-status-warning rounded-xl border border-status-warning/30" title="On Fire"><Flame className="w-mx-sm h-mx-sm" /></div>}
                        {badge === 'crown' && <div className="p-mx-xs bg-status-warning-surface text-status-warning rounded-xl border border-status-warning/30" title="Líder do ranking"><Crown className="w-mx-sm h-mx-sm" /></div>}
                        {trend === 'up' && <div className="p-mx-xs bg-status-success-surface text-status-success rounded-xl border border-status-success/30" title="Em Ascensão"><TrendingUp className="w-mx-sm h-mx-sm" /></div>}
                    </div>

                    <div className="w-full space-y-mx-xs mt-auto">
                        <div className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-mx-xs bg-brand-primary text-mx-black shadow-mx-glow-brand">
                            <Activity className="w-mx-sm h-mx-sm" /> Performance
                        </div>
                    </div>
                </div>

                {/* Right: Content */}
                <div className="w-full md:w-mx-xs/3 p-mx-xl overflow-y-auto custom-scrollbar bg-gray-900/50">
                    
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="h-full flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold flex items-center gap-mx-xs">
                                    Atributos do Vendedor
                                </h3>
                                <div className="px-3 py-1 bg-white/10 rounded-lg text-xs font-bold uppercase text-muted-foreground">
                                    Nível {Math.floor(seller.atingimento / 10) || 1}
                                </div>
                            </div>

                            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                Atributos derivados de atingimento, volume operacional, conversão, ritmo e visitas.
                            </p>
                            <div className="flex-1 flex flex-col items-center justify-center mb-6 min-h-mx-64" aria-label="Radar de atributos derivados">
                                <div className="w-full h-mx-64 relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={attributes}>
                                            <PolarGrid stroke={chartTokens.gridDark()} />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: chartTokens.axisTickMuted(), fontSize: 10, fontWeight: 'bold' }} />
                                            <Radar name={seller.user_name} dataKey="A" stroke={chartTokens.series.s8()} strokeWidth={3} fill={chartTokens.series.s8()} fillOpacity={0.2} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <table className="sr-only">
                                <caption>Atributos derivados do vendedor</caption>
                                <tbody>
                                    {attributes.map(attribute => (
                                        <tr key={attribute.subject}>
                                            <th scope="row">{attribute.subject}</th>
                                            <td>{Math.round(attribute.A)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-mx-sm w-full">
                                <div className="bg-white/5 p-mx-md rounded-xl border border-white/5">
                                    <div className="text-mx-tiny text-muted-foreground uppercase font-bold mb-1">Vendas</div>
                                    <div className="text-2xl font-display font-bold text-white">{seller.vnd_total}</div>
                                </div>
                                <div className="bg-white/5 p-mx-md rounded-xl border border-white/5 relative overflow-hidden">
                                    <div className="text-mx-tiny text-muted-foreground uppercase font-bold mb-1">Leads</div>
                                    <div className="text-2xl font-display font-bold text-white">{seller.leads}</div>
                                </div>
                                <div className="bg-white/5 p-mx-md rounded-xl border border-white/5 relative overflow-hidden">
                                    <div className="text-mx-tiny text-muted-foreground uppercase font-bold mb-1">Agend.</div>
                                    <div className="text-2xl font-display font-bold text-white">{seller.agd_total}</div>
                                </div>
                                <div className="bg-white/5 p-mx-md rounded-xl border border-white/5 relative overflow-hidden">
                                    <div className="absolute right-mx-0 top-mx-0 p-mx-xs opacity-10"><CheckCircle2 className="w-mx-10 h-mx-10" /></div>
                                    <div className="text-mx-tiny text-muted-foreground uppercase font-bold mb-1">Meta</div>
                                    <div className="text-2xl font-display font-bold text-status-success-text">{seller.meta}</div>
                                </div>
                            </div>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    )
}
