import type { ChangeEvent } from 'react'
import { Package, Plus, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxField, MxInput, MxSelect, MxToolbar } from '@/components/module/MxModuleVisualPrimitives'
import { MxPageTabs } from '@/components/module/MxPageTabs'
import { PRODUCT_AUDIENCES, PRODUCT_STATUSES } from '../lib/digitalProductCatalog'
import type { DigitalProductsController, ProductAudience, ProductCatalogMode, ProductStatus } from '../types'

export function DigitalProductToolbar({ controller }: { controller: DigitalProductsController }) {
  return (
    <MxToolbar className="items-end">
      {controller.canManage ? (
        <div className="w-full lg:w-auto lg:min-w-72">
          <MxPageTabs
            items={[{ key: 'administracao', label: 'Administração' }, { key: 'consumo', label: 'Consumo' }]}
            activeKey={controller.catalogMode}
            onChange={(value) => controller.setCatalogMode(value as ProductCatalogMode)}
            ariaLabel="Modo do catálogo"
            className="border-0 p-0 shadow-none"
          />
        </div>
      ) : null}

      <MxField label="Público" className="min-w-48 flex-1 sm:flex-none">
        <MxSelect value={controller.audienceFilter} onChange={(event: ChangeEvent<HTMLSelectElement>) => controller.setAudienceFilter(event.target.value as ProductAudience | 'todos')}>
          <option value="todos">Todos os públicos</option>
          {PRODUCT_AUDIENCES.map((audience) => <option key={audience.key} value={audience.key}>{audience.label}</option>)}
        </MxSelect>
      </MxField>

      {controller.canManage && controller.catalogMode === 'administracao' ? (
        <MxField label="Status" className="min-w-44 flex-1 sm:flex-none">
          <MxSelect value={controller.statusFilter} onChange={(event: ChangeEvent<HTMLSelectElement>) => controller.setStatusFilter(event.target.value as ProductStatus | 'todos')}>
            <option value="todos">Todos os status</option>
            {PRODUCT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </MxSelect>
        </MxField>
      ) : null}

      <MxField label="Buscar" className="min-w-60 flex-[2]">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <MxInput value={controller.searchTerm} onChange={(event: ChangeEvent<HTMLInputElement>) => controller.setSearchTerm(event.target.value)} placeholder="Buscar produto" className="pl-9" />
        </div>
      </MxField>

      <div className="flex flex-wrap items-end gap-2">
        <Button variant="managerOutline" size="icon" onClick={() => void controller.refresh()} aria-label="Atualizar produtos">
          <RefreshCw size={18} className={controller.isRefetching ? 'animate-spin' : ''} />
        </Button>
        {controller.canManage && controller.missingDefaultProducts.length > 0 ? (
          <Button data-mx-requires-manage="" variant="managerOutline" onClick={controller.requestCreateDefaults} disabled={controller.creatingDefaults}>
            <Package size={16} className="mr-2" />
            {controller.creatingDefaults ? 'Criando...' : `Criar padrão (${controller.missingDefaultProducts.length})`}
          </Button>
        ) : null}
        {controller.canManage ? (
          <Button data-mx-requires-manage="" onClick={controller.openCreateForm}>
            <Plus size={16} className="mr-2" />Novo produto
          </Button>
        ) : null}
      </div>
    </MxToolbar>
  )
}
