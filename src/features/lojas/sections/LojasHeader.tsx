import { Plus, RefreshCw, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TabNavPill } from '@/components/molecules/TabNavPill'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { LastUpdated } from '@/components/molecules/LastUpdated'
import {
  MxModuleHeader,
  MxToolbar,
} from '@/components/module/MxModuleVisualPrimitives'
import { OPERATIONAL_ACTION_LABELS } from '@/lib/ui/actionLabels'

interface LojasHeaderProps {
  isOwner: boolean
  canManageNetwork: boolean
  searchTerm: string
  onSearchChange: (value: string) => void
  filterActive: boolean
  onFilterChange: (active: boolean) => void
  storeStatusCounts: { active: number; archived: number }
  isRefetching: boolean
  lastUpdatedAt: Date | null
  onRefresh: () => void
  onOpenCreate: () => void
}

export function LojasHeader({
  isOwner,
  canManageNetwork,
  searchTerm,
  onSearchChange,
  filterActive,
  onFilterChange,
  storeStatusCounts,
  isRefetching,
  lastUpdatedAt,
  onRefresh,
  onOpenCreate,
}: LojasHeaderProps) {
  return (
    <>
      <MxModuleHeader
        eyebrow={isOwner ? 'Visão executiva' : 'Administração da rede'}
        title={isOwner ? 'Visão executiva da rede' : 'Gestão de lojas'}
        description={
          isOwner
            ? 'Compare as unidades, identifique prioridades e acompanhe a execução da rede em uma única visão.'
            : 'Gerencie unidades, vínculos, status e acessos da operação MX.'
        }
        actions={
          <>
            <LastUpdated value={lastUpdatedAt} className="hidden xl:inline-flex" />
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={isRefetching}
              aria-label="Atualizar lista de lojas"
            >
              <RefreshCw
                size={18}
                className={cn(isRefetching && 'animate-spin')}
                aria-hidden="true"
              />
              {OPERATIONAL_ACTION_LABELS.refresh}
            </Button>
            {canManageNetwork ? (
              <Button onClick={onOpenCreate}>
                <Plus size={18} aria-hidden="true" />
                Nova loja
              </Button>
            ) : null}
          </>
        }
      />

      <MxToolbar aria-label="Busca e filtros de lojas">
        <div className="relative min-w-0 flex-1 sm:max-w-mx-sidebar-expanded">
          <Search
            size={17}
            className="pointer-events-none absolute left-mx-sm top-1/2 -translate-y-1/2 text-text-tertiary"
            aria-hidden="true"
          />
          <label htmlFor="search-lojas" className="sr-only">
            Localizar loja por nome
          </label>
          <Input
            id="search-lojas"
            placeholder="Localizar loja"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            className="pl-mx-10"
          />
        </div>

        {canManageNetwork ? (
          <TabNavPill
            tabs={[
              { key: 'ativas', label: `Ativas (${storeStatusCounts.active})` },
              { key: 'arquivadas', label: `Arquivadas (${storeStatusCounts.archived})` },
            ]}
            activeTab={filterActive ? 'ativas' : 'arquivadas'}
            onTabChange={(key) => onFilterChange(key === 'ativas')}
            className="w-full sm:ml-auto sm:w-auto"
          />
        ) : null}
      </MxToolbar>
    </>
  )
}
