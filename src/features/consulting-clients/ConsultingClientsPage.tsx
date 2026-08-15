import { CalendarDays, Plus, RefreshCw } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import { MxErrorState, MxLoadingState, MxModuleHeader, MxModulePage, MxSectionCard, MxSectionHeader } from '@/components/module/MxModuleVisualPrimitives'
import { ConsultingClientTable } from './components/ConsultingClientTable'
import { ConsultingClientFormModal } from './components/ConsultingClientFormModal'
import { ConsultingClientMetrics } from './sections/ConsultingClientMetrics'
import { ConsultingClientToolbar } from './sections/ConsultingClientToolbar'
import { useConsultingClientsController } from './hooks/useConsultingClientsController'

type ConsultingClientsPageProps = {
  embedded?: boolean
}

function AdministrativeConsultingClientsPage({ embedded = false }: ConsultingClientsPageProps) {
  const controller = useConsultingClientsController()
  const location = useLocation()
  // Rotas wide (consultoria/clientes): largura e clearance vêm da metadata.
  const { width: pageWidth, bottomClearance: pageBottomClearance } = resolveRouteLayout(location.pathname)
  const content = (
    <div className="w-full space-y-5">
      <MxModuleHeader eyebrow="Gestão de clientes" title="CRM de Consultoria" description="Acompanhe clientes, evolução das visitas, módulos contratados e saúde do ritual." actions={<><Button asChild variant="outline"><Link to="/agenda"><CalendarDays size={18} />Agenda MX</Link></Button><Button variant="outline" onClick={() => void controller.refetch()}><RefreshCw size={18} />Atualizar</Button>{controller.canCreate ? <><Button variant="outline" onClick={() => controller.setOpen(true)}><Plus size={18} />Cadastro rápido</Button><Button asChild><Link to="/clientes/novo"><Plus size={18} />Novo cliente</Link></Button></> : null}</>} />
      {controller.loading ? <MxLoadingState label="Carregando clientes" /> : controller.error ? <MxErrorState description={controller.error} retry={() => void controller.refetch()} /> : <><ConsultingClientMetrics metrics={controller.metrics as Record<string, number>} /><ConsultingClientToolbar search={controller.search} onSearch={controller.setSearch} /><MxSectionCard><MxSectionHeader title="Clientes da consultoria" description={`${controller.rows.length} registro(s) visível(is).`} /><div className="p-5"><ConsultingClientTable detailBasePath={location.pathname.startsWith('/clientes') ? '/clientes' : '/consultoria/clientes'} rows={controller.rows} onEdit={controller.editClient} onArchive={clientId => void controller.archiveClient(clientId)} onRestore={clientId => void controller.restoreClient(clientId)} /></div></MxSectionCard></>}
      <ConsultingClientFormModal open={controller.open} editing={Boolean(controller.editingClientId)} draft={controller.draft} submitting={controller.submitting} modules={controller.modules} onDraft={controller.setDraft} onSubmit={() => void controller.submit()} onClose={controller.closeForm} />
    </div>
  )

  if (embedded) return <div id="internal-consulting-clients-embedded">{content}</div>
  return <MxModulePage id="internal-consulting-clients" width={pageWidth} bottomClearance={pageBottomClearance}>{content}</MxModulePage>
}

export function ConsultingClientsPage(props: ConsultingClientsPageProps) {
  return <AdministrativeConsultingClientsPage {...props} />
}

export default ConsultingClientsPage
