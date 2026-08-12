import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Building2, Crown, Flame, Phone, Calendar, Users, Trophy, Sparkles, Target, Zap, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NetworkMetric } from '@/hooks/useNetworkPerformance'

type StoreEntry = NetworkMetric['byStore'][number]

interface StoreBattleViewProps {
  opponents: string[]
  lojas: StoreEntry[]
}

interface ComparisonRowProps {
  label: string
  v1: number
  v2: number
  format?: (v: number) => string
  higherIsBetter?: boolean
  icon: React.ComponentType<{ size?: number; className?: string }>
}

function useAnimatedNumber(value: number, duration = 900) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const from = display
    const to = value
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (to - from) * eased)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return display
}

function ComparisonRow({ label, v1, v2, format = v => Math.round(v).toString(), higherIsBetter = true, icon: Icon }: ComparisonRowProps) {
  const total = Math.abs(v1) + Math.abs(v2)
  const pct1 = total === 0 ? 50 : (v1 / total) * 100
  const winner = higherIsBetter
    ? v1 > v2 ? 'p1' : v2 > v1 ? 'p2' : 'draw'
    : v1 < v2 ? 'p1' : v2 < v1 ? 'p2' : 'draw'
  const a1 = useAnimatedNumber(v1)
  const a2 = useAnimatedNumber(v2)

  return (
    <div className="mb-6 group">
      <div className="flex justify-between items-end mb-2 text-sm font-bold text-white">
        <motion.span
          key={`p1-${v1}`}
          initial={{ scale: 0.95, opacity: 0.6 }}
          animate={{ scale: winner === 'p1' ? 1.12 : 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          className={cn('tabular-nums font-display', winner === 'p1' ? 'text-status-success-text drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'text-muted-foreground')}
        >
          {format(a1)}
        </motion.span>
        <span className="flex items-center gap-mx-xs text-mx-tiny uppercase text-muted-foreground tracking-widest">
          <Icon size={12} className="opacity-60" />
          {label}
        </span>
        <motion.span
          key={`p2-${v2}`}
          initial={{ scale: 0.95, opacity: 0.6 }}
          animate={{ scale: winner === 'p2' ? 1.12 : 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          className={cn('tabular-nums font-display', winner === 'p2' ? 'text-status-info-text drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-muted-foreground')}
        >
          {format(a2)}
        </motion.span>
      </div>
      <div className="h-mx-sm bg-gray-900 rounded-full overflow-hidden flex relative shadow-none">
        <motion.div
          className={cn('h-full', winner === 'p1' ? 'bg-brand-primary shadow-mx-glow-brand' : 'bg-brand-primary/40')}
          initial={{ width: 0 }}
          animate={{ width: `${pct1}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
        <div className="w-mx-tiny bg-gray-50 z-10 skew-x-[-20deg]" />
        <motion.div
          className={cn('h-full flex-1', winner === 'p2' ? 'bg-status-info shadow-mx-glow-brand' : 'bg-status-info/40')}
          initial={{ width: 0 }}
          animate={{ width: `${100 - pct1}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

export function StoreBattleView({ opponents, lojas }: StoreBattleViewProps) {
  const [showCelebration, setShowCelebration] = useState(false)
  const p1 = lojas.find(s => s.storeId === opponents[0])
  const p2 = lojas.find(s => s.storeId === opponents[1])

  const winnerSide: 'p1' | 'p2' | 'draw' = useMemo(() => {
    if (!p1 || !p2) return 'draw'
    let p1Wins = 0
    let p2Wins = 0
    const compare = (a: number, b: number) => { if (a > b) p1Wins++; else if (b > a) p2Wins++ }
    compare(p1.reaching, p2.reaching)
    compare(p1.sales, p2.sales)
    compare(p1.convLeadVnd, p2.convLeadVnd)
    compare(p1.convAgdVnd, p2.convAgdVnd)
    compare(p1.checkinDays, p2.checkinDays)
    if (p1Wins > p2Wins) return 'p1'
    if (p2Wins > p1Wins) return 'p2'
    return 'draw'
  }, [p1, p2])

  useEffect(() => {
    if (!p1 || !p2) return
    setShowCelebration(true)
    const t = setTimeout(() => setShowCelebration(false), 2400)
    return () => clearTimeout(t)
  }, [p1?.storeId, p2?.storeId])

  if (!p1 || !p2) {
    return (
      <div className="text-center p-mx-xl">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex flex-col items-center gap-mx-md"
        >
          <div className="w-mx-3xl h-mx-3xl rounded-2xl bg-gray-900 flex items-center justify-center shadow-sm">
            <Building2 size={36} className="text-status-success-text" />
          </div>
          <p className="font-bold uppercase tracking-widest text-muted-foreground">
            Selecione 2 lojas para iniciar o comparativo
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl mx-auto">
      {/* Confetti / celebration overlay */}
      <AnimatePresence>
        {showCelebration && winnerSide !== 'draw' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-[80] flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: [0, 1.4, 1], rotate: [0, 10, 0] }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="w-mx-4xl h-mx-4xl rounded-full bg-gray-900 border-4 border-status-warning/70 flex items-center justify-center shadow-2xl"
            >
              <Crown size={84} className="text-status-warning-text fill-status-warning/25" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header — Combatentes */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center mb-10 relative gap-mx-lg md:gap-mx-2xl">
        {/* VS Badge */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-mx-2xl h-mx-2xl rounded-full bg-gray-900 border-4 border-surface-alt items-center justify-center z-20 shadow-2xl"
        >
          <span className="font-display font-bold text-3xl italic text-status-success-text">VS</span>
        </motion.div>

        {/* Loja 1 */}
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className={cn(
            'bg-gray-900 p-mx-lg rounded-2xl flex flex-col items-center w-full md:flex-1 relative overflow-hidden shadow-sm border',
            winnerSide === 'p1' ? 'border-brand-primary/60 shadow-mx-glow-brand' : 'border-brand-primary/20'
          )}
        >
          <motion.div
            aria-hidden="true"
            animate={{ opacity: winnerSide === 'p1' ? [0.15, 0.35, 0.15] : 0.12 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-mx-0 border-2 border-brand-primary/30 rounded-2xl"
          />
          {winnerSide === 'p1' && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute top-mx-sm left-mx-sm z-10"
            >
              <Crown size={24} className="text-status-warning-text fill-status-warning/30" />
            </motion.div>
          )}
          <div className="w-mx-2xl h-mx-2xl rounded-2xl bg-brand-primary/10 border-2 border-brand-primary flex items-center justify-center mb-4 relative z-10">
            <Building2 size={32} className="text-status-success-text" />
          </div>
          <h3 className="font-display font-bold text-2xl text-white text-center relative z-10 truncate max-w-full">{p1.storeName}</h3>
          <p className="text-mx-tiny font-bold text-status-success-text uppercase tracking-widest text-center mt-1 relative z-10">
            {p1.reaching}% atingido
          </p>
          {winnerSide === 'p1' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3 px-3 py-1 rounded-full bg-status-warning/20 border border-status-warning/40 flex items-center gap-mx-xs relative z-10"
            >
              <Flame size={12} className="text-status-warning-text" />
              <span className="text-mx-tiny font-bold uppercase tracking-widest text-status-warning-text">Líder</span>
            </motion.div>
          )}
        </motion.div>

        {/* Mobile VS */}
        <div className="md:hidden text-center">
          <span className="font-display font-bold text-3xl italic text-status-success-text">VS</span>
        </div>

        {/* Loja 2 */}
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className={cn(
            'bg-gray-900 p-mx-lg rounded-2xl flex flex-col items-center w-full md:flex-1 relative overflow-hidden shadow-sm border',
            winnerSide === 'p2' ? 'border-status-info/60 shadow-mx-glow-brand' : 'border-status-info/20'
          )}
        >
          <motion.div
            aria-hidden="true"
            animate={{ opacity: winnerSide === 'p2' ? [0.15, 0.35, 0.15] : 0.12 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
            className="absolute inset-mx-0 border-2 border-status-info/30 rounded-2xl"
          />
          {winnerSide === 'p2' && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute top-mx-sm right-mx-sm z-10"
            >
              <Crown size={24} className="text-status-warning-text fill-status-warning/30" />
            </motion.div>
          )}
          <div className="w-mx-2xl h-mx-2xl rounded-2xl bg-status-info/10 border-2 border-status-info flex items-center justify-center mb-4 relative z-10">
            <Building2 size={32} className="text-status-info-text" />
          </div>
          <h3 className="font-display font-bold text-2xl text-white text-center relative z-10 truncate max-w-full">{p2.storeName}</h3>
          <p className="text-mx-tiny font-bold text-status-info-text uppercase tracking-widest text-center mt-1 relative z-10">
            {p2.reaching}% atingido
          </p>
          {winnerSide === 'p2' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3 px-3 py-1 rounded-full bg-status-warning/20 border border-status-warning/40 flex items-center gap-mx-xs relative z-10"
            >
              <Flame size={12} className="text-status-warning-text" />
              <span className="text-mx-tiny font-bold uppercase tracking-widest text-status-warning-text">Líder</span>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Indicadores */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gray-900/85 backdrop-blur-xl p-mx-xl rounded-2xl border border-white/10 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-mx-lg">
          <h4 className="font-display font-bold text-xl text-white uppercase flex items-center gap-mx-sm">
            <Sparkles size={18} className="text-status-success-text" /> Duelo de indicadores
          </h4>
          <div className="hidden sm:flex items-center gap-mx-sm text-mx-tiny font-bold uppercase tracking-widest">
            <span className="text-status-success-text">●</span>
            <span className="text-muted-foreground">Loja A</span>
            <span className="text-muted-foreground">vs</span>
            <span className="text-muted-foreground">Loja B</span>
            <span className="text-status-info-text">●</span>
          </div>
        </div>

        <ComparisonRow label="Atingimento (%)" v1={p1.reaching} v2={p2.reaching} format={v => `${Math.round(v)}%`} icon={Target} />
        <ComparisonRow label="Vendas Totais" v1={p1.sales} v2={p2.sales} icon={Trophy} />
        <ComparisonRow label="Projeção Final" v1={p1.projection} v2={p2.projection} icon={Activity} />
        <ComparisonRow label="Meta da Loja" v1={p1.goal} v2={p2.goal} icon={Target} />
        <ComparisonRow label="Leads Recebidos" v1={p1.leads} v2={p2.leads} icon={Phone} />
        <ComparisonRow label="Agendamentos" v1={p1.agd} v2={p2.agd} icon={Calendar} />
        <ComparisonRow label="Visitas" v1={p1.vis} v2={p2.vis} icon={Users} />
        <ComparisonRow label="Conv. Lead → Venda" v1={p1.convLeadVnd} v2={p2.convLeadVnd} format={v => `${v.toFixed(1)}%`} icon={Zap} />
        <ComparisonRow label="Conv. Agd → Venda" v1={p1.convAgdVnd} v2={p2.convAgdVnd} format={v => `${v.toFixed(1)}%`} icon={Zap} />
        <ComparisonRow label="Conv. Visita → Venda" v1={p1.convVisVnd} v2={p2.convVisVnd} format={v => `${v.toFixed(1)}%`} icon={Zap} />
        <ComparisonRow label="Disciplina (dias com lançamento)" v1={p1.checkinDays} v2={p2.checkinDays} icon={Sparkles} />
      </motion.div>

      {/* Veredito */}
      <AnimatePresence mode="wait">
        <motion.div
          key={winnerSide}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mt-8 text-center"
        >
          <div
            className={cn(
              'inline-flex items-center gap-mx-sm px-6 py-3 rounded-full font-display font-bold uppercase tracking-widest shadow-sm border',
              winnerSide === 'p1' && 'bg-brand-primary/15 border-brand-primary/40 text-status-success-text',
              winnerSide === 'p2' && 'bg-status-info/15 border-status-info/40 text-status-info',
              winnerSide === 'draw' && 'bg-status-warning/15 border-status-warning/40 text-status-warning'
            )}
          >
            <Crown size={18} />
            {winnerSide === 'draw'
              ? 'Empate técnico'
              : `${winnerSide === 'p1' ? p1.storeName : p2.storeName} venceu o duelo`}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
