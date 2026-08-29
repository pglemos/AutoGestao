import { useMemo, useState } from 'react'
import {
  Building2,
  CalendarDays,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import { TabNav } from '@/components/molecules/TabNav'
import {
  MxErrorState,
  MxLoadingState,
  MxModuleHeader,
  MxModulePage,
} from '@/components/module/MxModuleVisualPrimitives'
import { useAuth } from '@/hooks/useAuth'
import { useStores, useStoresStats, type StoreUpdateFields } from '@/hooks/useStores'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { getPreRegistrationLink } from '@/lib/utils'
import type { Store } from '@/types/database'
import { CreateStoreModal, type NewStoreDraft } from '@/components/organisms/CreateStoreModal'
import { StoreEditModal } from '@/features/admin/components/StoreEditModal'
import { HardDeleteStoreModal } from '@/features/lojas/modals/HardDeleteStoreModal'
import type { ClientAction } from './clientes/ClientActionsMenu'
import { EnrollmentLinkModal } from './clientes/EnrollmentLinkModal'
import { ScheduleActivationModal } from './clientes/ScheduleActivationModal'
import { SuspendClientModal } from './clientes/SuspendClientModal'
import { createEnrollmentLink } from './clientes/enrollmentMutations'
import type { EnrollmentLinkDraft } from './clientes/enrollmentLink'
import { reactivateClient, scheduleActivation, suspendClient } from './clientes/lifecycleMutations'
import { isActive, portfolioCounters, type PortfolioClient } from './clientes/clientPortfolio'
import { useClientPortfolio } from './clientes/useClientPortfolio'
import { PortfolioOverviewTab } from './clientes/PortfolioOverviewTab'
import { OnboardingPortfolioTab } from './clientes/OnboardingPortfolioTab'
import { InscricoesTab } from './clientes/InscricoesTab'
import { GovernancaBloqueiosTab } from './clientes/GovernancaBloqueiosTab'

export type AdminClientesTab = 'carteira' | 'onboarding' | 'inscricoes' | 'governanca'

export function AdminClientesPage() {
  const { rows, loading: portfolioLoading, error: portfolioError, refetch: refetchPortfolio } = useClientPortfolio()
  const {
    lojas,
    refetch: refetchStores,
    createStore,
    updateStore,
    deleteStore,
  } = useStores()
  const { stats, refetch: refetchStats } = useStoresStats()

  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { supabaseUser } = useAuth()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)

  // Current Active Tab
  const requestedTab = searchParams.get('tab') as AdminClientesTab | null
  const [activeTab, setActiveTabState] = useState<AdminClientesTab>(
    requestedTab && ['carteira', 'onboarding', 'inscricoes', 'governanca'].includes(requestedTab)
      ? requestedTab
      : 'carteira'
  )

  const setActiveTab = (tab: AdminClientesTab) => {
    setActiveTabState(tab)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (tab === 'carteira') next.delete('tab')
      else next.set('tab', tab)
      return next
    }, { replace: true })
  }

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newStore, setNewStore] = useState<NewStoreDraft>({ name: '', manager_email: '' })
  const [creatingStore, setCreatingStore] = useState(false)

  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [savingStore, setSavingStore] = useState(false)

  const [hardDeleteStore, setHardDeleteStore] = useState<Store | null>(null)
  const [hardDeleteConfirmation, setHardDeleteConfirmation] = useState('')
  const [hardDeleting, setHardDeleting] = useState(false)

  const [suspendTarget, setSuspendTarget] = useState<PortfolioClient | null>(null)
  const [scheduleTarget, setScheduleTarget] = useState<PortfolioClient | null>(null)
  const [linkTarget, setLinkTarget] = useState<PortfolioClient | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const refetchAll = async () => {
    await Promise.all([refetchPortfolio(), refetchStores(), refetchStats()])
  }

  const counters = useMemo(() => portfolioCounters(rows), [rows])

  const tabsConfig = useMemo(() => [
    { key: 'carteira' as const, label: `Carteira 360 (${rows.length})` },
    { key: 'onboarding' as const, label: `Em Implantação (${counters.em_implantacao + counters.prontos_para_ativar})` },
    { key: 'inscricoes' as const, label: 'Inscrições & Links' },
    { key: 'governanca' as const, label: `Governança & Bloqueios (${counters.com_bloqueios})` },
  ], [rows.length, counters])

  const handleCopyLink = (name: string) => {
    const link = getPreRegistrationLink(name)
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(link)
      toast.success('Link de pré-cadastro de vendedores copiado!')
    } else {
      toast.info(`Link de cadastro: ${link}`)
    }
  }

  const handleAction = (client: PortfolioClient, action: ClientAction) => {
    const base = `/clientes/${client.slug || client.id}`
    const storeSlug = client.slug || client.id
    switch (action) {
      case 'abrir_visao360':
        navigate(base)
        break
      case 'acessar_workspace':
        navigate(`/lojas/${storeSlug}`)
        break
      case 'gerenciar_equipe':
        navigate(`/lojas/${storeSlug}/equipe`)
        break
      case 'copiar_link_cadastro':
        handleCopyLink(client.name)
        break
      case 'editar_loja': {
        const storeMatch = (lojas || []).find(s => s.id === client.id) || ({
          id: client.id,
          name: client.name,
          manager_email: null,
          legal_name: client.name,
          cnpj: client.cnpj,
          address: '',
          administrative_phone: '',
          partners: [],
          active: isActive(client),
        } as unknown as Store)
        setEditingStore(storeMatch)
        break
      }
      case 'arquivar_loja': {
        const storeMatch = (lojas || []).find(s => s.id === client.id) || ({
          id: client.id,
          name: client.name,
        } as unknown as Store)
        setHardDeleteStore(storeMatch)
        break
      }
      case 'continuar_onboarding':
        navigate(`/clientes/novo?continue=${client.id}`)
        break
      case 'gerar_link_autocadastro':
        setLinkTarget(client)
        break
      case 'adicionar_pessoa':
        navigate(`${base}?tab=pessoas`)
        break
      case 'abrir_jornada':
        navigate(`${base}?tab=jornada`)
        break
      case 'abrir_auditoria':
        navigate(`${base}?tab=historico`)
        break
      case 'programar_ativacao':
        setScheduleTarget(client)
        break
      case 'suspender':
        setSuspendTarget(client)
        break
      case 'validar_cadastros':
        navigate(`${base}?tab=pessoas`)
        break
    }
  }

  const handleCreateStoreSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newStore.name.trim()) {
      toast.error('Informe o nome da loja.')
      return
    }
    setCreatingStore(true)
    const result = await createStore(newStore.name, newStore.manager_email)
    setCreatingStore(false)
    if (result && !result.error) {
      toast.success('Loja criada com sucesso!')
      setIsCreateModalOpen(false)
      setNewStore({ name: '', manager_email: '' })
      await refetchAll()
    }
  }

  const handleStoreEditSubmit = async (id: string, updates: Partial<StoreUpdateFields>) => {
    setSavingStore(true)
    const result = await updateStore(id, updates)
    setSavingStore(false)
    if (!result?.error) {
      toast.success('Loja atualizada com sucesso!')
      setEditingStore(null)
      await refetchAll()
    }
  }

  const handleHardDeleteConfirm = async () => {
    if (!hardDeleteStore) return
    setHardDeleting(true)
    try {
      const { data, error } = await supabase.rpc('admin_hard_delete_store', {
        p_store_id: hardDeleteStore.id,
        p_confirmation: hardDeleteConfirmation.trim(),
      })
      if (error) {
        toast.error(error.message || 'Falha ao excluir loja definitivamente.')
        return
      }
      toast.success('Loja excluída com sucesso.')
      setHardDeleteStore(null)
      setHardDeleteConfirmation('')
      await refetchAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao excluir loja.')
    } finally {
      setHardDeleting(false)
    }
  }

  const doSuspend = async (reason: string) => {
    if (!suspendTarget || !supabaseUser) return null
    setSubmitting(true)
    const result = await suspendClient({ clientId: suspendTarget.id, reason, suspendedBy: supabaseUser.id })
    setSubmitting(false)
    if (result.error) return result.error
    toast.success('Cliente suspenso.')
    setSuspendTarget(null)
    await refetchAll()
    return null
  }

  const doSchedule = async (scheduledFor: string) => {
    if (!scheduleTarget || !supabaseUser) return null
    setSubmitting(true)
    const result = await scheduleActivation({ clientId: scheduleTarget.id, scheduledFor, scheduledBy: supabaseUser.id })
    setSubmitting(false)
    if (result.error) return result.error
    toast.success('Ativação programada.')
    setScheduleTarget(null)
    await refetchAll()
    return null
  }

  const doReactivate = async (client: PortfolioClient) => {
    if (!supabaseUser) return
    setSubmitting(true)
    const result = await reactivateClient({ clientId: client.id, activatedBy: supabaseUser.id })
    setSubmitting(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Cliente reativado.')
    await refetchAll()
  }

  const doCreateEnrollmentLink = async (draft: EnrollmentLinkDraft) => {
    if (!linkTarget || !supabaseUser) return null
    const result = await createEnrollmentLink(linkTarget.id, linkTarget.slug || '', location.pathname, draft, supabaseUser.id)
    if (result.error) {
      toast.error(result.error)
      return null
    }
    return result.url
  }

  return (
    <MxModulePage id="admin-mx-clientes" width={width} bottomClearance={bottomClearance}>
      <div className="w-full space-y-5">
        <MxModuleHeader
          icon={Building2}
          eyebrow="Administração MX & Rede"
          title="Clientes & Lojas MX"
          description="Central unificada de gestão da carteira, onboarding, rede de lojas, metas e acessos."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/agenda">
                  <CalendarDays size={14} className="mr-1.5" />
                  Agenda MX
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => void refetchAll()} aria-label="Atualizar carteira de clientes">
                <RefreshCw size={14} className="mr-1.5" />
                Atualizar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(true)}>
                <Plus size={14} className="mr-1.5" />
                Cadastro Rápido
              </Button>
              <Button asChild size="sm">
                <Link to="/clientes/novo">
                  <Plus size={14} className="mr-1.5" />
                  Novo Cliente
                </Link>
              </Button>
            </div>
          }
        />

        <TabNav
          tabs={tabsConfig}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          scrollable
        />

        {activeTab !== 'carteira' ? (
          <Button variant="ghost" size="sm" onClick={() => setActiveTab('carteira')}>
            ← Voltar para a carteira
          </Button>
        ) : null}

        <div id={`${activeTab}-panel`} role="tabpanel" aria-labelledby={`${activeTab}-tab`}>
          {portfolioLoading ? (
            <MxLoadingState label="Carregando carteira e rede de lojas" />
          ) : portfolioError ? (
            <MxErrorState description={portfolioError} retry={() => void refetchAll()} />
          ) : (
            <>
            {activeTab === 'carteira' && (
              <PortfolioOverviewTab
                rows={rows}
                lojas={lojas}
                stats={stats}
                onAction={handleAction}
                onCopyLink={handleCopyLink}
                onEditStore={setEditingStore}
                onRefetch={refetchAll}
              />
            )}

            {activeTab === 'onboarding' && (
              <OnboardingPortfolioTab
                rows={rows}
                onAction={handleAction}
              />
            )}

            {activeTab === 'inscricoes' && (
              <InscricoesTab
                clients={rows}
                lojas={lojas}
                onOpenEnrollmentModal={setLinkTarget}
              />
            )}

            {activeTab === 'governanca' && (
              <GovernancaBloqueiosTab
                rows={rows}
                onAction={handleAction}
                onReactivate={doReactivate}
              />
            )}
            </>
          )}
        </div>
      </div>

      <CreateStoreModal
        open={isCreateModalOpen}
        newStore={newStore}
        setNewStore={setNewStore}
        creating={creatingStore}
        onSubmit={handleCreateStoreSubmit}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <StoreEditModal
        open={Boolean(editingStore)}
        store={editingStore}
        saving={savingStore}
        onClose={() => setEditingStore(null)}
        onSubmit={handleStoreEditSubmit}
      />

      <HardDeleteStoreModal
        store={hardDeleteStore}
        confirmation={hardDeleteConfirmation}
        deleting={hardDeleting}
        onConfirmationChange={setHardDeleteConfirmation}
        onClose={() => {
          setHardDeleteStore(null)
          setHardDeleteConfirmation('')
        }}
        onConfirm={handleHardDeleteConfirm}
      />

      <SuspendClientModal
        open={Boolean(suspendTarget)}
        clientName={suspendTarget?.name ?? ''}
        submitting={submitting}
        onSubmit={doSuspend}
        onClose={() => setSuspendTarget(null)}
      />

      <ScheduleActivationModal
        open={Boolean(scheduleTarget)}
        clientName={scheduleTarget?.name ?? ''}
        submitting={submitting}
        onSubmit={doSchedule}
        onClose={() => setScheduleTarget(null)}
      />

      <EnrollmentLinkModal
        open={Boolean(linkTarget)}
        submitting={submitting}
        onSubmit={doCreateEnrollmentLink}
        onClose={() => setLinkTarget(null)}
      />
    </MxModulePage>
  )
}

export default AdminClientesPage
