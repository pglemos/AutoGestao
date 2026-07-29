import { FileText } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxActionGroup, MxSectionCard, MxSectionHeader } from '@/components/module/MxModuleVisualPrimitives'
import type { NetworkReportType } from '../types'

const options: Array<{ type: NetworkReportType; label: string }> = [
  { type: 'matinal', label: 'Disparar matinal' },
  { type: 'semanal', label: 'Disparar semanal' },
  { type: 'mensal', label: 'Disparar mensal' },
]

export function NetworkReportActions({ loading, onTrigger }: {
  loading: NetworkReportType | null
  onTrigger: (type: NetworkReportType) => void
}) {
  return (
    <MxSectionCard>
      <MxSectionHeader title="Relatórios da rede" description="Disparos controlados para os ciclos operacionais existentes." />
      <MxActionGroup className="p-5">
        {options.map(option => (
          <Button key={option.type} variant="outline" disabled={Boolean(loading)} onClick={() => onTrigger(option.type)}>
            <FileText size={17} />
            {loading === option.type ? 'Disparando...' : option.label}
          </Button>
        ))}
      </MxActionGroup>
    </MxSectionCard>
  )
}
