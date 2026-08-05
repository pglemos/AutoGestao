import { Award, Medal, Trophy } from 'lucide-react'
import type { RankedVendedor } from '@/features/ranking/hooks/useStoreRankingPageData'
import { initials } from './manager-ranking-comparison'

const PODIUM = [
  { position: 1, icon: Trophy, badge: 'bg-yellow-400', ring: 'ring-yellow-300', bar: 'bg-gradient-to-t from-yellow-300 to-yellow-400', height: 'h-28', order: 'md:order-2' },
  { position: 2, icon: Medal, badge: 'bg-gray-300', ring: 'ring-gray-200', bar: 'bg-gradient-to-t from-gray-200 to-gray-300', height: 'h-20', order: 'md:order-1' },
  { position: 3, icon: Award, badge: 'bg-amber-500', ring: 'ring-amber-300', bar: 'bg-gradient-to-t from-amber-400 to-amber-500', height: 'h-16', order: 'md:order-3' },
] as const

export function ManagerRankingPodium({ ranking }: { ranking: RankedVendedor[] }) {
  const top3 = ranking.slice(0, 3)
  if (top3.length === 0) return null

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" aria-label="Pódio do ranking">
      <h2 className="mb-4 text-sm font-semibold text-gray-800">Pódio — Top 3</h2>
      <div className="grid grid-cols-3 items-end gap-3 md:gap-4">
        {PODIUM.map(step => {
          const seller = top3[step.position - 1]
          const Icon = step.icon
          if (!seller) return <div key={step.position} className={step.order} />
          return (
            <div key={step.position} className={`${step.order} flex flex-col items-center`}>
              <div className="relative mb-2">
                <span className={`grid h-14 w-14 place-items-center rounded-full bg-gray-100 text-sm font-bold text-gray-700 ring-4 md:h-16 md:w-16 md:text-base ${step.ring}`}>
                  {initials(seller.nome)}
                </span>
                <span className={`absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full text-white shadow ${step.badge}`}>
                  <Icon size={13} />
                </span>
              </div>
              <p className="max-w-full truncate text-center text-xs font-semibold text-gray-800 md:text-sm">{seller.nome.split(' ')[0]}</p>
              <p className="mb-2 text-[11px] text-gray-400">{seller.pontuacao === null ? 'sem pontuação' : `${seller.pontuacao} pts`}</p>
              <div className={`flex w-full items-start justify-center pt-1.5 ${step.height} ${step.bar} rounded-t-xl`}>
                <span className="text-sm font-bold text-white">{step.position}º</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default ManagerRankingPodium
