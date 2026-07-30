import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { useScopedConsultingClientDetailBySlug } from '@/features/consulting-clients/hooks/useScopedConsultingClientDetailBySlug'
import { useConsultingModules } from '@/hooks/useConsultingModules'
import { useConsultingMethodology } from '@/hooks/useConsultingClients'
import { mergeAgendaOptionLabels, useAgendaOptions } from '@/hooks/useAgendaOptions'
import { supabase } from '@/lib/supabase'
import { slugify } from '@/lib/utils'
import { TabNav } from '@/components/molecules/TabNav'
import { TABS } from './data/tabs'
import { useActiveTab } from './hooks/useActiveTab'
import { useVisitForm } from './hooks/useVisitForm'
import { useLegacyCompletion } from './hooks/useLegacyCompletion'
import { ClientHeaderSection } from './sections/ClientHeaderSection'
import { TabContentRouter } from './sections/TabContentRouter'
import { LegacyCompletionModal } from './modals/LegacyCompletionModal'
import { VisitFormModal } from './modals/VisitFormModal'

export function ScopedConsultoriaClienteDetalhe() {
  const { clientSlug } = useParams<{ clientSlug: string }>()
  const { profile } = useAuth()

  const {
    client,
    assignableUsers,
    loading,
    error,
    canManage,
    upsertVisit,
    completeLegacyVisits,
  } = useScopedConsultingClientDetailBySlug(clientSlug)

  const {
    visitReasonOptions: agendaVisitReasonOptions,
    targetAudienceOptions: agendaTargetAudienceOptions,
  } = useAgendaOptions()

  const clientId = client?.id
  const [fallbackStoreId, setFallbackStoreId] = useState('')
  const resolvedStoreId = client?.primary_store_id || client?.store_id || fallbackStoreId || ''
  const { loading: modulesLoading } = useConsultingModules(clientId)
  const { steps: methodologySteps } = useConsultingMethodology(client?.program_template_key || 'pmr_7')

  const { activeTab, handleTabChange } = useActiveTab()

  const visitFormApi = useVisitForm({ client, methodologySteps, profileId: profile?.id, upsertVisit })
  const legacyApi = useLegacyCompletion({ client, completeLegacyVisits })

  useEffect(() => {
    if (!client || client.primary_store_id || client.store_id) {
      setFallbackStoreId('')
      return
    }

    let active = true
    const resolveStoreByName = async () => {
      const { data, error: storeError } = await supabase
        .from('lojas')
        .select('id,name')
        .eq('active', true)

      if (!active) return
      if (storeError) {
        if (import.meta.env.DEV) console.warn('Store fallback resolution failed:', storeError)
        setFallbackStoreId('')
        return
      }

      const clientNameSlug = slugify(client.name)
      const clientSlugValue = client.slug ? slugify(client.slug) : clientNameSlug
      const matchedStore = (data || []).find((store) => {
        const storeSlug = slugify(store.name || '')
        return storeSlug === clientNameSlug || storeSlug === clientSlugValue
      })

      setFallbackStoreId(matchedStore?.id || '')
    }

    void resolveStoreByName()

    return () => {
      active = false
    }
  }, [client])

  const internalUsers = useMemo(
    () => assignableUsers.filter((user) => isPerfilInternoMx(user.role)),
    [assignableUsers],
  )

  const productSelectOptions = useMemo(() => {
    const values = [
      client?.product_name,
      ...(client?.visits || []).map((visit) => visit.product_name),
    ].filter(Boolean) as string[]
    return Array.from(new Set(values))
  }, [client?.product_name, client?.visits])

  const visitReasonSelectOptions = useMemo(
    () => mergeAgendaOptionLabels(agendaVisitReasonOptions, visitFormApi.visitForm.visit_reason),
    [agendaVisitReasonOptions, visitFormApi.visitForm.visit_reason],
  )

  const targetAudienceSelectOptions = useMemo(
    () => mergeAgendaOptionLabels(agendaTargetAudienceOptions, visitFormApi.visitForm.target_audience),
    [agendaTargetAudienceOptions, visitFormApi.visitForm.target_audience],
  )

  if (loading || modulesLoading) return <div className="p-mx-20 text-center opacity-50">Carregando cockpit...</div>
  if (error || !client) return <div className="p-mx-20 text-center text-status-error">{error || 'Cliente não encontrado'}</div>

  return (
    <main className="w-full h-full flex flex-col gap-mx-lg p-mx-lg overflow-y-auto no-scrollbar bg-gray-50">
      <ClientHeaderSection client={client} />

      <TabNav tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      <section id={`${activeTab}-panel`} role="tabpanel" aria-labelledby={`${activeTab}-tab`}>
        <TabContentRouter
          activeTab={activeTab}
          client={client}
          clientId={clientId!}
          clientSlug={clientSlug}
          resolvedStoreId={resolvedStoreId}
          canManage={canManage}
          methodologySteps={methodologySteps}
          onOpenLegacyCompletion={legacyApi.openLegacyCompletionModal}
          onOpenVisitModal={visitFormApi.openVisitModal}
        />
      </section>

      <LegacyCompletionModal
        open={legacyApi.showLegacyCompletionModal}
        onClose={() => legacyApi.setShowLegacyCompletionModal(false)}
        client={client}
        clientId={clientId}
        methodologySteps={methodologySteps}
        legacyVisitNumbers={legacyApi.legacyVisitNumbers}
        setLegacyVisitNumbers={legacyApi.setLegacyVisitNumbers}
        legacySummary={legacyApi.legacySummary}
        setLegacySummary={legacyApi.setLegacySummary}
        legacyEffectiveDate={legacyApi.legacyEffectiveDate}
        setLegacyEffectiveDate={legacyApi.setLegacyEffectiveDate}
        legacyCompletionSubmitting={legacyApi.legacyCompletionSubmitting}
        toggleLegacyVisit={legacyApi.toggleLegacyVisit}
        handleSubmit={legacyApi.handleSubmitLegacyCompletion}
      />

      <VisitFormModal
        open={visitFormApi.showVisitModal}
        onClose={() => visitFormApi.setShowVisitModal(false)}
        client={client}
        methodologySteps={methodologySteps}
        internalUsers={internalUsers}
        productSelectOptions={productSelectOptions}
        visitReasonSelectOptions={visitReasonSelectOptions}
        targetAudienceSelectOptions={targetAudienceSelectOptions}
        visitForm={visitFormApi.visitForm}
        setVisitForm={visitFormApi.setVisitForm}
        visitSubmitting={visitFormApi.visitSubmitting}
        handleVisitNumberChange={visitFormApi.handleVisitNumberChange}
        handleSubmit={visitFormApi.handleSubmitManualVisit}
      />
    </main>
  )
}

export default ScopedConsultoriaClienteDetalhe
