import { Activity } from 'lucide-react'
import { motion } from 'motion/react'
import { Badge } from '@/components/atoms/Badge'
import { Card } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'

type Props = { reaching: number }

export function StoreHealthCard({ reaching }: Props) {
  return (
    <Card className="p-mx-10 md:p-14 text-white border-none relative overflow-hidden flex-1 group">
      <div className="absolute top-mx-0 right-mx-0 w-mx-sidebar-expanded h-mx-64 bg-brand-primary/10 rounded-mx-full blur-mx-xl -mr-32 -mt-32 transition-opacity group-hover:opacity-100" />
      <div className="relative z-10 flex flex-col justify-between h-full">
        <div>
          <div className="w-mx-2xl h-mx-2xl rounded-2xl bg-white/10 text-white flex items-center justify-center border border-white/10 shadow-none mb-10 transform group-hover:rotate-6 transition-transform">
            <Activity size={32} />
          </div>
          <Typography
            variant="h2"
            tone="white"
            className="text-3xl leading-none mb-4 tracking-tighter"
          >
            Saúde da Loja
          </Typography>
          <Typography
            variant="p"
            tone="white"
            className=" text-xs font-bold italic leading-relaxed"
          >
            "Ritmo operacional sincronizado com a meta projetada."
          </Typography>
        </div>
        <div className="pt-14 border-t border-white/10 mt-14 space-y-mx-10">
          <div className="flex justify-between items-end">
            <div>
              <Typography
                variant="caption"
                tone="white"
                className="mb-2 block"
              >
                Eficiência Real
              </Typography>
              <Typography
                variant="h1"
                tone="white"
                className="text-7xl tabular-nums leading-none tracking-tighter"
              >
                {reaching}%
              </Typography>
            </div>
            <Badge
              variant="outline"
              className="text-white border-white/20 mb-2"
            >
              {reaching >= 80 ? 'TARGET OK' : 'ATENÇÃO'}
            </Badge>
          </div>
          <div className="h-mx-sm w-full bg-white/5 rounded-mx-full overflow-hidden p-mx-tiny shadow-none border border-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(reaching, 100)}%` }}
              transition={{ duration: 2, ease: 'circOut' }}
              className="h-full bg-white rounded-mx-full shadow-mx-glow-white transition-all duration-1000"
            />
          </div>
        </div>
      </div>
    </Card>
  )
}

export default StoreHealthCard
