import { useMemo } from 'react'
import { Modal } from '@/components/organisms/Modal'
import { MxEmptyState, MxProgress } from '@/components/module/MxModuleVisualPrimitives'
import { Map as MapIcon } from 'lucide-react'
import type { PDISessionSummary } from '@/hooks/usePDI_MX'

export function DevelopmentTeamCompetencyMap({ open, pdis, onClose }: { open: boolean; pdis: PDISessionSummary[]; onClose: () => void }) {
  const competencies = useMemo(() => {
    const map = new Map<string, { totalGap: number; count: number }>()
    for (const pdi of pdis as PDISessionSummary[]) {
      for (const item of pdi.avaliacoes || []) {
        const current = map.get(item.competencia) || { totalGap: 0, count: 0 }
        current.totalGap += Math.max(0, item.gap)
        current.count += 1
        map.set(item.competencia, current)
      }
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, averageGap: value.count ? value.totalGap / value.count : 0 }))
      .sort((a, b) => b.averageGap - a.averageGap)
  }, [pdis])

  return (
    <Modal open={open} onClose={onClose} title="Mapa de competências da equipe" description="Maiores lacunas médias identificadas nos PDIs ativos." size="xl" referenceStyle>
      {competencies.length ? (
        <div className="space-y-4">
          {competencies.map((item) => {
            const intensity = Math.min(100, Math.round(item.averageGap * 20))
            return <div key={item.name} className="rounded-xl border border-gray-100 p-4"><div className="mb-2 flex items-center justify-between gap-3"><span className="font-medium text-gray-800">{item.name}</span><span className="text-xs text-gray-500">Gap médio {item.averageGap.toFixed(1)}</span></div><MxProgress value={intensity} tone={intensity > 60 ? 'danger' : intensity > 30 ? 'warning' : 'success'} /></div>
          })}
        </div>
      ) : <MxEmptyState icon={MapIcon} title="Mapa ainda sem dados" description="As competências aparecem após a equipe possuir avaliações de PDI." />}
    </Modal>
  )
}
