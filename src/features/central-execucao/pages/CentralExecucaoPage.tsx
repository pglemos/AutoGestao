import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { CentralHeader } from '@/features/central-execucao/components/CentralHeader'
import { CentralTabs, type CentralTab } from '@/features/central-execucao/components/CentralTabs'
import { FichaClienteSheet } from '@/features/central-execucao/components/FichaClienteSheet'
import { PendenciasDrawer } from '@/features/central-execucao/components/PendenciasDrawer'
import { useCentralExecutionActions } from '@/features/central-execucao/hooks/useCentralExecutionActions'
import { useCentralMutations } from '@/features/central-execucao/hooks/useCentralMutations'
import { useWhatsappReturn } from '@/features/central-execucao/hooks/useWhatsappReturn'
import { EscalarAtividadeModal } from '@/features/central-execucao/modals/EscalarAtividadeModal'
import { NovaAtividadeModal, type ClientLookupItem } from '@/features/central-execucao/modals/NovaAtividadeModal'
import { ReagendarAtividadeModal } from '@/features/central-execucao/modals/ReagendarAtividadeModal'
import { ResolverAtividadeModal, type ResolveModalSubmission } from '@/features/central-execucao/modals/ResolverAtividadeModal'
import { HojeTab } from '@/features/central-execucao/tabs/HojeTab'
import { RotinaDiaTab } from '@/features/central-execucao/tabs/RotinaDiaTab'
import type { CentralExecutionAction } from '@/features/central-execucao/types/central-execucao.types'
import { useClientes } from '@/features/crm/hooks/useClientes'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

function dateKeySP(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(date)
}

function normalizeLocalDateTimePayload(payload: Record<string, unknown>) {
  const raw = payload.due_at
  if (typeof raw !== 'string' || !raw) return payload
  if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(raw)) return payload
  return { ...payload, due_at: `${raw.length === 16 ? `${raw}:00` : raw}-03:00` }
}

interface FlashMessage {
  kind: 'success' | 'error'
  text: string
}

export function CentralExecucaoPage() {
  const { profile } = useAuth()
  const { actions, loading, error, refetch } = useCentralExecutionActions()
  const { clientes } = useClientes()
  const { createManualAction, resolveAction, rescheduleAction, escalateAction } = useCentralMutations()

  const [tab, setTab] = useState<CentralTab>('hoje')
  const [newActivityOpen, setNewActivityOpen] = useState(false)
  const [pendingOpen, setPendingOpen] = useState(false)
  const [resolverAction, setResolverAction] = useState<CentralExecutionAction | null>(null)
  const [resolverFromWhatsapp, setResolverFromWhatsapp] = useState(false)
  const [rescheduleActionItem, setRescheduleActionItem] = useState<CentralExecutionAction | null>(null)
  const [escalateActionItem, setEscalateActionItem] = useState<CentralExecutionAction | null>(null)
  const [clientSheetId, setClientSheetId] = useState<string | null>(null)
  const [flash, setFlash] = useState<FlashMessage | null>(null)

  const todayKey = dateKeySP(new Date())
  const todayActions = useMemo(() => actions.filter(action => dateKeySP(action.dueAt) === todayKey), [actions, todayKey])
  const pendingPrevious = useMemo(() => actions.filter(action => {
    const key = dateKeySP(action.dueAt)
    return Boolean(key && todayKey && key < todayKey)
  }), [actions, todayKey])

  const clientsForLookup = useMemo<ClientLookupItem[]>(() => {
    const latestVehicleByClient = new Map<string, string>()
    const latestOpportunityByClient = new Map<string, string>()
    for (const action of actions) {
      if (!action.clientId) continue
      const vehicle = action.opportunity?.veiculo_interesse || action.snapshots.vehicle
      if (vehicle && !latestVehicleByClient.has(action.clientId)) latestVehicleByClient.set(action.clientId, vehicle)
      if (action.opportunityId && !latestOpportunityByClient.has(action.clientId)) latestOpportunityByClient.set(action.clientId, action.opportunityId)
    }
    return clientes.map(client => ({
      id: client.id,
      name: client.nome,
      phone: client.telefone,
      vehicle: latestVehicleByClient.get(client.id) ?? null,
      opportunityId: latestOpportunityByClient.get(client.id) ?? null,
    }))
  }, [actions, clientes])

  useEffect(() => {
    if (!profile?.id || !todayKey) return
    void supabase.from('central_execucao_aberturas').upsert({
      seller_user_id: profile.id,
      data: todayKey,
    }, { onConflict: 'seller_user_id,data' })
  }, [profile?.id, todayKey])

  useEffect(() => {
    if (!flash) return
    const timeout = window.setTimeout(() => setFlash(null), 4_000)
    return () => window.clearTimeout(timeout)
  }, [flash])

  const handleWhatsappReturn = useCallback((action: CentralExecutionAction) => {
    setResolverAction(action)
    setResolverFromWhatsapp(true)
  }, [])

  const { openWhatsapp } = useWhatsappReturn({ actions, onReturn: handleWhatsappReturn })

  const showError = useCallback((text: string) => setFlash({ kind: 'error', text }), [])
  const showSuccess = useCallback((text: string) => setFlash({ kind: 'success', text }), [])

  const handleWhatsapp = useCallback((action: CentralExecutionAction) => {
    if (!openWhatsapp(action)) showError('Este cliente não possui telefone válido.')
  }, [openWhatsapp, showError])

  const handleResolveOpen = useCallback((action: CentralExecutionAction) => {
    setResolverFromWhatsapp(false)
    setResolverAction(action)
  }, [])

  const handleResolve = useCallback(async (submission: ResolveModalSubmission) => {
    if (!resolverAction) return { error: 'Atividade não identificada.' }
    const response = await resolveAction({
      actionId: resolverAction.id,
      resultCode: submission.resultCode,
      note: submission.note,
      payload: normalizeLocalDateTimePayload(submission.payload),
      idempotencyKey: submission.idempotencyKey,
    })
    if (response.error) return { error: response.error }
    await refetch()
    showSuccess('Resultado registrado com sucesso.')
    return { error: null }
  }, [refetch, resolveAction, resolverAction, showSuccess])

  const handleReschedule = useCallback(async (input: {
    dueAt: string
    note: string | null
    idempotencyKey: string
  }) => {
    if (!rescheduleActionItem) return { error: 'Atividade não identificada.' }
    const response = await rescheduleAction({
      actionId: rescheduleActionItem.id,
      dueAt: input.dueAt,
      note: input.note,
      idempotencyKey: input.idempotencyKey,
    })
    if (response.error) return { error: response.error }
    await refetch()
    showSuccess('Atividade reagendada sem criar duplicidade.')
    return { error: null }
  }, [refetch, rescheduleAction, rescheduleActionItem, showSuccess])

  const handleEscalate = useCallback(async (input: { reason: string; idempotencyKey: string }) => {
    if (!escalateActionItem) return { error: 'Atividade não identificada.' }
    const response = await escalateAction({
      actionId: escalateActionItem.id,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
    })
    if (response.error) return { error: response.error }
    await refetch()
    showSuccess('Gerente notificado. Apoio solicitado com sucesso.')
    return { error: null }
  }, [escalateAction, escalateActionItem, refetch, showSuccess])

  const handleCreate = useCallback(async (input: Parameters<typeof createManualAction>[0]) => {
    const response = await createManualAction(input)
    if (response.error) return { error: response.error }
    await refetch()
    showSuccess('Atividade criada com sucesso.')
    return { error: null }
  }, [createManualAction, refetch, showSuccess])

  return (
    <div className="min-h-full bg-gray-50 text-gray-800">
      <CentralHeader />
      <CentralTabs value={tab} onChange={setTab} />

      <div className="mx-auto w-full max-w-[1440px] p-5 lg:p-6">
        <section
          id={`central-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`central-tab-${tab}`}
        >
          {tab === 'hoje' ? (
            <HojeTab
              actions={todayActions}
              pendingCount={pendingPrevious.length}
              loading={loading}
              error={error}
              onOpenPending={() => setPendingOpen(true)}
              onCreate={() => setNewActivityOpen(true)}
              onOpenRoutine={() => setTab('rotina')}
              onResolve={handleResolveOpen}
              onEscalate={action => setEscalateActionItem(action)}
              onOpenClient={action => setClientSheetId(action.clientId)}
              onWhatsapp={handleWhatsapp}
            />
          ) : (
            <RotinaDiaTab actions={todayActions} />
          )}
        </section>
      </div>

      <NovaAtividadeModal
        open={newActivityOpen}
        clients={clientsForLookup}
        onClose={() => setNewActivityOpen(false)}
        onSubmit={handleCreate}
      />

      <ResolverAtividadeModal
        action={resolverAction}
        open={Boolean(resolverAction)}
        returnFromWhatsapp={resolverFromWhatsapp}
        onClose={() => {
          setResolverAction(null)
          setResolverFromWhatsapp(false)
        }}
        onSubmit={handleResolve}
      />

      <ReagendarAtividadeModal
        action={rescheduleActionItem}
        open={Boolean(rescheduleActionItem)}
        onClose={() => setRescheduleActionItem(null)}
        onSubmit={handleReschedule}
      />

      <EscalarAtividadeModal
        action={escalateActionItem}
        open={Boolean(escalateActionItem)}
        onClose={() => setEscalateActionItem(null)}
        onSubmit={handleEscalate}
      />

      <PendenciasDrawer
        open={pendingOpen}
        actions={pendingPrevious}
        onClose={() => setPendingOpen(false)}
        onResolve={action => {
          setPendingOpen(false)
          handleResolveOpen(action)
        }}
        onReschedule={action => {
          setPendingOpen(false)
          setRescheduleActionItem(action)
        }}
        onEscalate={action => {
          setPendingOpen(false)
          setEscalateActionItem(action)
        }}
        onOpenClient={action => setClientSheetId(action.clientId)}
        onWhatsapp={handleWhatsapp}
      />

      <FichaClienteSheet
        clientId={clientSheetId}
        open={Boolean(clientSheetId)}
        onClose={() => setClientSheetId(null)}
      />

      {flash && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-[150] flex max-w-sm items-center gap-2 rounded-2xl border bg-white px-4 py-3 text-[13px] font-semibold shadow-xl ${flash.kind === 'success' ? 'border-green-200 text-green-700' : 'border-red-200 text-red-700'}`}
        >
          {flash.kind === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
          {flash.text}
        </div>
      )}
    </div>
  )
}
