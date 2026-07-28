import type { ComponentType, PropsWithChildren } from 'react'
import { Button } from '@/components/atoms/Button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { NetworkCockpitStore, PersonEvolution } from '../types'
import { PersonEvolutionList } from './PersonEvolutionList'
import { SourceTrace } from './SourceTrace'
import { StoreEvolutionPanel } from './StoreEvolutionPanel'

export type NetworkDrilldownTarget = 'store' | 'strategic' | 'actions' | 'consulting' | 'closing'

const TypedSheet = Sheet as ComponentType<PropsWithChildren<{
  open: boolean
  onOpenChange(open: boolean): void
}>>
const TypedSheetContent = SheetContent as ComponentType<PropsWithChildren<{
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
}>>
const TypedSheetHeader = SheetHeader as ComponentType<PropsWithChildren<{ className?: string }>>
const TypedSheetTitle = SheetTitle as ComponentType<PropsWithChildren<{ className?: string }>>

export function NetworkDrilldownDrawer({ store, open, onOpenChange, onNavigate, onOpenPerson }: {
  store: NetworkCockpitStore | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: (target: NetworkDrilldownTarget, store: NetworkCockpitStore) => void
  onOpenPerson: (person: PersonEvolution, store: NetworkCockpitStore) => void
}) {
  return (
    <TypedSheet open={open} onOpenChange={onOpenChange}>
      <TypedSheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
        <TypedSheetHeader><TypedSheetTitle>{store?.name || 'Detalhes da loja'}</TypedSheetTitle></TypedSheetHeader>
        {store ? (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onNavigate('store', store)}>Abrir loja</Button>
              <Button variant="managerSecondary" onClick={() => onNavigate('strategic', store)}>Plano Estratégico</Button>
              <Button variant="managerSecondary" onClick={() => onNavigate('actions', store)}>Plano de Ação</Button>
              <Button variant="managerSecondary" onClick={() => onNavigate('consulting', store)}>Consultoria</Button>
              <Button variant="managerSecondary" onClick={() => onNavigate('closing', store)}>Fechamento diário</Button>
            </div>
            <StoreEvolutionPanel store={store} />
            <PersonEvolutionList title="Vendedores" people={store.sellersEvolution} onOpen={person => onOpenPerson(person, store)} />
            <PersonEvolutionList title="Gerentes" people={store.managersEvolution} onOpen={person => onOpenPerson(person, store)} />
            {store.ownerEvolution ? <PersonEvolutionList title="Dono ou responsável" people={[store.ownerEvolution]} onOpen={person => onOpenPerson(person, store)} /> : null}
            <SourceTrace sources={store.sources} />
          </div>
        ) : null}
      </TypedSheetContent>
    </TypedSheet>
  )
}
