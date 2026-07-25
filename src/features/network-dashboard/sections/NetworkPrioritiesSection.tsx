import { MxSectionCard, MxSectionHeader } from '@/components/module/MxModuleVisualPrimitives'
import { StoreHealthTable } from '../components/StoreHealthTable'
import type { NetworkSort, StoreDiagnostic } from '../types'

export function NetworkPrioritiesSection(props: { rows: StoreDiagnostic[]; sort: NetworkSort; onSort: (sort: NetworkSort) => void; onOpen: (row: StoreDiagnostic) => void }) {
  return <MxSectionCard><MxSectionHeader title="Saúde operacional por loja" description="Ritmo, conversão, projeção e disciplina em uma única leitura." /><div className="p-5"><StoreHealthTable {...props} /></div></MxSectionCard>
}
