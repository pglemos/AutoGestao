import { Package } from 'lucide-react'
import { MxErrorState, MxLoadingState, MxModuleHeader, MxModulePage, MxSectionCard, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { useDigitalProductsController } from './hooks/useDigitalProductsController'
import { DigitalProductMetrics } from './components/DigitalProductMetrics'
import { DigitalProductToolbar } from './components/DigitalProductToolbar'
import { DigitalProductGrid } from './components/DigitalProductGrid'
import { DigitalProductFormModal } from './components/DigitalProductFormModal'

export function DigitalProductsPage() {
  const controller = useDigitalProductsController()

  if (controller.loading) {
    return (
      <MxModulePage id="produtos-digitais" width="wide" bottomClearance="navigation" accessMode={controller.canManage ? 'manage' : 'read-only'}>
        <MxModuleHeader icon={Package} title="Produtos Digitais" description="Catálogo de produtos e materiais liberados por público." />
        <MxSectionCard><MxLoadingState label="Sincronizando produtos" /></MxSectionCard>
      </MxModulePage>
    )
  }

  if (controller.loadError) {
    return (
      <MxModulePage id="produtos-digitais" width="wide" bottomClearance="navigation" accessMode={controller.canManage ? 'manage' : 'read-only'}>
        <MxModuleHeader icon={Package} title="Produtos Digitais" description="Catálogo de produtos e materiais liberados por público." />
        <MxSectionCard><MxErrorState description={controller.loadError} retry={() => void controller.fetchProducts()} /></MxSectionCard>
      </MxModulePage>
    )
  }

  return (
    <MxModulePage id="produtos-digitais" width="wide" bottomClearance="navigation" accessMode={controller.canManage ? 'manage' : 'read-only'}>
      <MxModuleHeader
        icon={Package}
        title="Produtos Digitais"
        description={controller.canManage ? 'Administre publicação, público e ordem do catálogo operacional.' : 'Consulte os produtos ativos liberados para o seu perfil.'}
        eyebrow={controller.canManage ? 'Governança de catálogo' : 'Catálogo disponível'}
      />
      <DigitalProductMetrics metrics={controller.metrics} />
      <DigitalProductToolbar controller={controller} />
      {!controller.canManage ? <MxStatusBanner tone="info">Você está vendo apenas produtos ativos liberados para o seu perfil.</MxStatusBanner> : <MxStatusBanner tone="neutral">Produtos Digitais é o catálogo operacional. Regras de governança permanecem centralizadas em Configurações.</MxStatusBanner>}
      <MxSectionCard aria-live="polite"><div className="p-5"><DigitalProductGrid products={controller.filteredProducts} canManage={controller.canManage} onEdit={controller.openEditForm} onArchive={controller.requestArchive} /></div></MxSectionCard>
      <DigitalProductFormModal open={controller.showForm} editingProduct={controller.editingProduct} form={controller.form} saving={controller.saving} canManage={controller.canManage} onFormChange={controller.setForm} onToggleAudience={controller.toggleAudience} onSubmit={controller.submit} onClose={controller.closeForm} />
    </MxModulePage>
  )
}

export default DigitalProductsPage
