import { MxSectionCard, MxSectionHeader } from '@/components/module/MxModuleVisualPrimitives'
import { StoreHealthTable } from '../components/StoreHealthTable'
import type { NetworkCockpitStore, NetworkSort } from '../types'

export function NetworkPrioritiesSection(props: { rows: NetworkCockpitStore[]; sort: NetworkSort; onSort: (sort: NetworkSort) => void; onOpen: (row: NetworkCockpitStore) => void }) {
  return <MxSectionCard><MxSectionHeader title="Evolução e riscos por loja" description="Resultados, disciplina, ações e consultoria com origem rastreável." /><div className="p-5"><StoreHealthTable {...props} /></div></MxSectionCard>
}
