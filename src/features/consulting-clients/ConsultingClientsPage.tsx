import { CalendarDays, Plus, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/atoms/Button'
import { MxErrorState, MxLoadingState, MxModuleHeader, MxModulePage, MxSectionCard, MxSectionHeader } from '@/components/module/MxModuleVisualPrimitives'
import { ConsultingClientTable } from './components/ConsultingClientTable'
import { ConsultingClientFormModal } from './components/ConsultingClientFormModal'
import { ConsultingClientMetrics } from './sections/ConsultingClientMetrics'
import { ConsultingClientToolbar } from './sections/ConsultingClientToolbar'
import { useConsultingClientsController } from './hooks/useConsultingClientsController'

function AdministrativeConsultingClientsPage() {
  const controller = useConsultingClientsController()
  return (
    <MxModulePage id="internal-consulting-clients">
      <MxModuleHeader eyebrow="Gestão de clientes" title="CRM de Consultoria" description="Acompanhe clientes, evolução das visitas, módulos contratados e saúde do ritual." actions={<><Button asChild variant="secondary"><Link to="/agenda"><CalendarDays size={18} />Agenda MX</Link></Button><Button variant="secondary" onClick={() => void controller.refetch()}><RefreshCw size={18} />Atualizar</Button>{controller.canCreate ? <Button onClick={() => controller.setOpen(true)}><Plus size={18} />Novo cliente</Button> : null}</>} />
      {controller.loading ? <MxLoadingState label="Carregando clientes" /> : controller.error ? <MxErrorState description={controller.error} retry={() => void controller.refetch()} /> : <><ConsultingClientMetrics metrics={controller.metrics as Record<string, number>} /><ConsultingClientToolbar search={controller.search} onSearch={controller.setSearch} /><MxSectionCard><MxSectionHeader title="Clientes da consultoria" description={`${controller.rows.length} registro(s) visível(is).`} /><div className="p-5"><ConsultingClientTable rows={controller.rows} onEdit={controller.editClient} onArchive={clientId => void controller.archiveClient(clientId)} onRestore={clientId => void controller.restoreClient(clientId)} /></div></MxSectionCard></>}
      <ConsultingClientFormModal open={controller.open} editing={Boolean(controller.editingClientId)} draft={controller.draft} submitting={controller.submitting} modules={controller.modules} onDraft={controller.setDraft} onSubmit={() => void controller.submit()} onClose={controller.closeForm} />
    </MxModulePage>
  )
}

export function ConsultingClientsPage() {
  return <AdministrativeConsultingClientsPage />
}

export default ConsultingClientsPage
