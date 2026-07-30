import { Activity } from 'lucide-react'
import { motion } from 'motion/react'
import { Card } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'
import { formatPercent } from '../data/formatters'
import type { NetworkMetrics } from '../data/types'

type Props = { metrics: NetworkMetrics }

export function AdminHealthCard({ metrics }: Props) {
  return (
    <Card className="p-mx-lg md:p-mx-10 text-white border-none relative overflow-hidden flex-1 group">
      <div className="relative z-10 flex flex-col justify-between h-full">
        <div>
          <div className="w-mx-2xl h-mx-2xl rounded-2xl bg-white/10 text-white flex items-center justify-center border border-white/10 shadow-none mb-8 transform group-hover:rotate-6 transition-transform">
            <Activity size={32} />
          </div>
          <Typography
            variant="h2"
            tone="white"
            className="text-3xl leading-none mb-4 tracking-tighter"
          >
            Saude Executiva
          </Typography>
          <Typography
            variant="p"
            tone="white"
            className="opacity-70 text-xs font-bold leading-relaxed"
          >
            Rede completa, base historica, metas, pessoas e consultoria no mesmo cockpit.
          </Typography>
        </div>
        <div className="pt-10 border-t border-white/10 mt-10 space-y-mx-8">
          <div className="grid grid-cols-2 gap-mx-sm">
            <div>
              <Typography
                variant="caption"
                tone="white"
                className="mb-2 block opacity-70"
              >
                Lojas ativas
              </Typography>
              <Typography
                variant="h1"
                tone="white"
                className="text-5xl tabular-nums leading-none"
              >
                {metrics.activeStoreCount}
              </Typography>
            </div>
            <div>
              <Typography
                variant="caption"
                tone="white"
                className="mb-2 block opacity-70"
              >
                Vendedores ativos
              </Typography>
              <Typography
                variant="h1"
                tone="white"
                className="text-5xl tabular-nums leading-none"
              >
                {metrics.activeSellers}
              </Typography>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-white/70 text-mx-tiny font-bold uppercase tracking-widest mb-3">
              <span>Cobertura operacional</span>
              <span>{formatPercent(metrics.disciplineRate)}</span>
            </div>
            <div className="h-mx-sm w-full bg-white/5 rounded-mx-full overflow-hidden p-mx-tiny shadow-none border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(metrics.disciplineRate, 100)}%` }}
                transition={{ duration: 2, ease: 'circOut' }}
                className="h-full bg-white rounded-mx-full shadow-mx-glow-white transition-all duration-1000"
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default AdminHealthCard
