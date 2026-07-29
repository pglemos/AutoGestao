import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Map as MapIcon, Plus } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { WizardPDI } from '@/features/pdi/WizardPDI'
import { useAuth } from '@/hooks/useAuth'
import { usePDISessions, type PDIPlanoAcao360, type PDISessionSummary } from '@/hooks/usePDI_MX'
import { useSellersByStore } from '@/hooks/useStores'
import { MxErrorState, MxLoadingState, MxSectionCard, MxSectionHeader, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { MxPageTabs } from '@/components/module/MxPageTabs'
import { DevelopmentPdiMetrics } from './DevelopmentPdiMetrics'
import { DevelopmentPdiFilters } from './DevelopmentPdiFilters'
import { DevelopmentPdiTable, type DevelopmentPdiRow } from './DevelopmentPdiTable'
import { DevelopmentTeamCompetencyMap } from './DevelopmentTeamCompetencyMap'
import { filterDevelopmentPdiRows, type DevelopmentPdiStatusFilter } from './development-filters'

type InternalTab = 'mine' | 'team'

function localDateKey(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function isCompleted(status?: string | null) {
  return ['concluido', 'concluida', 'completed', 'finalizado'].includes((status || '').toLocaleLowerCase('pt-BR'))
}

function isActionDone(status?: string | null) {
  return ['concluida', 'concluido', 'completed', 'justificada'].includes((status || '').toLocaleLowerCase('pt-BR'))
}

function pdiStatus(pdi: PDISessionSummary | null, today: string): DevelopmentPdiRow['status'] {
  if (!pdi) return { key: 'none', label: 'Sem PDI', rank: 4, className: 'bg-gray-100 text-gray-600' }
  if (isCompleted(pdi.status)) return { key: 'completed', label: 'Concluído', rank: 3, className: 'bg-emerald-100 text-emerald-700' }
  if (pdi.due_date && pdi.due_date < today) return { key: 'overdue', label: 'Em atraso', rank: 1, className: 'bg-red-100 text-red-700' }
  return { key: 'active', label: 'PDI ativo', rank: 2, className: 'bg-blue-100 text-blue-700' }
}

export default function ManagerPDIReference() {
  const navigate = useNavigate()
  const { profile, storeId } = useAuth()
  const { pdis, loading, error, refetch } = usePDISessions()
  const { sellers, loading: sellersLoading, error: sellersError } = useSellersByStore(storeId)
  const [tab, setTab] = useState<InternalTab>('team')
  const [sellerId, setSellerId] = useState('')
  const [statusFilter, setStatusFilter] = useState<DevelopmentPdiStatusFilter>('all')
  const [showWizard, setShowWizard] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const today = localDateKey(new Date())

  const rows = useMemo<DevelopmentPdiRow[]>(() => sellers.map((seller: { id: string; name?: string | null }) => {
    const pdi = pdis.find((item: PDISessionSummary) => item.colaborador_id === seller.id && !isCompleted(item.status)) || pdis.find((item: PDISessionSummary) => item.colaborador_id === seller.id) || null
    const actions = pdi?.plano_acao || []
    const completedActions = actions.filter((action: PDIPlanoAcao360) => isActionDone(action.status)).length
    const progress = actions.length ? Math.round((completedActions / actions.length) * 100) : 0
    const overdueActions = actions.filter((action: PDIPlanoAcao360) => !isActionDone(action.status) && action.data_conclusao < today).length
    return { seller: { id: seller.id, name: seller.name || 'Vendedor' }, pdi, status: pdiStatus(pdi, today), progress, overdueActions }
  }), [pdis, sellers, today])

  const filteredRows = useMemo(() => filterDevelopmentPdiRows(rows, sellerId, statusFilter), [rows, sellerId, statusFilter])
  const active = pdis.filter((item: PDISessionSummary) => !isCompleted(item.status)).length
  const overdue = pdis.filter((item: PDISessionSummary) => pdiStatus(item, today).key === 'overdue').length
  const overdueActions = pdis.flatMap((item: PDISessionSummary) => item.plano_acao || []).filter((action: PDIPlanoAcao360) => !isActionDone(action.status) && action.data_conclusao < today).length
  const reviews = pdis.filter((item: PDISessionSummary) => item.due_date && item.due_date >= today && !isCompleted(item.status)).length
  const myPdi = pdis.find((item: PDISessionSummary) => item.colaborador_id === profile?.id) || null

  if (loading || sellersLoading) return <MxSectionCard><MxLoadingState label="Carregando PDIs" /></MxSectionCard>
  if (sellersError) return <MxSectionCard><MxErrorState description="Não foi possível carregar os vendedores." /></MxSectionCard>
  if (error) return <MxSectionCard><MxErrorState description="Não foi possível carregar os PDIs." retry={() => void refetch()} /></MxSectionCard>

  return (
    <div className="space-y-5">
      <MxSectionCard>
        <MxSectionHeader title="PDI" description="Desenvolva competências por meio de avaliações, ações práticas e acompanhamentos periódicos." />
      </MxSectionCard>
      <MxPageTabs items={[{ key: 'mine', label: 'Meu PDI' }, { key: 'team', label: 'PDI da Equipe' }]} activeKey={tab} onChange={setTab} ariaLabel="PDI" />

      {tab === 'mine' ? (
        <MxSectionCard>
          <div className="p-5">
            {myPdi ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><Typography variant="h3" className="text-lg font-semibold text-gray-800">Seu plano de desenvolvimento</Typography><Typography variant="p" className="mt-1 text-sm text-gray-500">Acompanhe metas, competências e ações do seu PDI atual.</Typography></div><Button onClick={() => navigate(`/pdi/${myPdi.id}/print`)}>Abrir meu PDI</Button></div>
            ) : <MxStatusBanner tone="info">Nenhum PDI foi vinculado ao seu perfil.</MxStatusBanner>}
          </div>
        </MxSectionCard>
      ) : (
        <>
          <DevelopmentPdiMetrics reviews={reviews} active={active} overdue={overdue} overdueActions={overdueActions} />
          <div className="flex flex-wrap gap-2">
            <Button data-mx-requires-manage="" onClick={() => setShowWizard(true)}><Plus size={16} className="mr-2" />Iniciar novo PDI</Button>
            <Button variant="outline" onClick={() => setShowMap(true)}><MapIcon size={16} className="mr-2" />Ver mapa da equipe</Button>
          </div>
          <DevelopmentPdiFilters sellers={sellers.map((seller: { id: string; name?: string | null }) => ({ id: seller.id, name: seller.name || 'Vendedor' }))} sellerId={sellerId} status={statusFilter} onSellerChange={setSellerId} onStatusChange={setStatusFilter} />
          <DevelopmentPdiTable rows={filteredRows} onOpenOrStart={(row) => row.pdi ? navigate(`/pdi/${row.pdi.id}/print`) : setShowWizard(true)} />
        </>
      )}

      {showWizard ? <WizardPDI onClose={() => setShowWizard(false)} onSuccess={async (sessionId?: string) => { setShowWizard(false); await refetch(); if (sessionId) navigate(`/pdi/${sessionId}/print`) }} /> : null}
      <DevelopmentTeamCompetencyMap open={showMap} pdis={pdis} onClose={() => setShowMap(false)} />
    </div>
  )
}
