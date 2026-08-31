import { useMemo, useState } from 'react'
import { ArrowLeft, ClipboardList, Plus, RefreshCw } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import {
  MxErrorState,
  MxLoadingState,
  MxModuleHeader,
  MxModulePage,
} from '@/components/module/MxModuleVisualPrimitives'
import { useConsultingClientDetailBySlug } from '@/hooks/useConsultingClientBySlug'
import { ClientActionPlanContextPanel } from './ClientActionPlanContextPanel'
import { ClientActionPlanWizard } from '../planos-acao/ClientActionPlanWizard'

export default function ClientActionPlanPage() {
  const { clientSlug = '' } = useParams()
  const [searchParams] = useSearchParams()
  const location = useMemo(() => ({ pathname: `/clientes/${clientSlug}/plano-acao` }), [clientSlug])
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)
  const { client, loading, error, refetch } = useConsultingClientDetailBySlug(clientSlug)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const clientId = client?.id ?? searchParams.get('clientId') ?? ''
  const storeId = searchParams.get('storeId') ?? client?.primary_store_id ?? null

  return (
    <MxModulePage id="admin-mx-cliente-plano-acao" width={width} bottomClearance={bottomClearance}>
      <div className="w-full space-y-5">
        <MxModuleHeader
          icon={ClipboardList}
          eyebrow="Administração MX"
          title={client ? `Plano de Ação — ${client.name}` : 'Plano de Ação'}
          description={client ? 'Kanban e lista de ações do cliente selecionado.' : 'Carregando cliente...'}
          actions={(
            <>
              <Button asChild variant="outline"><Link to={client ? `/clientes/${client.slug || client.id}` : '/clientes'}><ArrowLeft size={16} />Voltar</Link></Button>
              <Button variant="outline" onClick={() => void refetch()}><RefreshCw size={16} />Atualizar</Button>
              {client ? <Button onClick={() => setWizardOpen(true)}><Plus size={16} />Nova Ação</Button> : null}
            </>
          )}
        />

        {loading ? <MxLoadingState label="Carregando plano de ação" /> : error ? <MxErrorState description={error} retry={() => void refetch()} /> : !client ? (
          <MxErrorState description="Cliente não encontrado." retry={() => void refetch()} />
        ) : (
          <ClientActionPlanContextPanel
            clientId={client.id}
            clientSlug={client.slug}
            primaryStoreId={storeId}
            refreshKey={refreshKey}
            onCreatePlan={() => setWizardOpen(true)}
          />
        )}

        {client && wizardOpen ? (
          <ClientActionPlanWizard
            open
            clientId={client.id}
            clientName={client.name}
            onClose={() => setWizardOpen(false)}
            onSaved={() => {
              setWizardOpen(false)
              setRefreshKey(value => value + 1)
              void refetch()
            }}
          />
        ) : null}
      </div>
    </MxModulePage>
  )
}
