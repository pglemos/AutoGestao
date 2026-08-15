import { useTeam, useStores, type TeamMember } from '@/hooks/useTeam'
import { UserCreationModal } from '@/features/equipe/components/UserCreationModal'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Users, UserPlus, Search, Shield, RefreshCw, Zap, Clock, CheckCircle2 } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { cn, getPreRegistrationLink } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { Typography } from '@/components/atoms/Typography'
import { Skeleton } from '@/components/atoms/Skeleton'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { isAdministradorMx, isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { canManageTeam } from '@/lib/auth/capabilities'
import { getSupabaseFunctionUrl, resolveFunctionInvokeError, supabase } from '@/lib/supabase'
import type { MembershipRole, StorePreRegistration } from '@/types/database'
import { TeamStatsGrid, type TeamStat } from './team-panel/TeamStatsGrid'
import { PreRegistrationQueue } from './team-panel/PreRegistrationQueue'
import { TeamListSection } from './team-panel/TeamListSection'
import { EditMemberModal, type EditableTeamMember } from './team-panel/EditMemberModal'
import { ConfirmationDialog, type PendingConfirmation } from './team-panel/ConfirmationDialog'
import { TransferConfirmationDialog, type TransferConfirmationData } from './team-panel/TransferConfirmationDialog'

type StoreTeamPanelProps = {
  storeId: string | null
  storeName?: string
}

const getDeleteMemberConfirmationKey = (member: TeamMember | EditableTeamMember) => `delete-member:${member.id}:${member.store_id || 'sem-loja'}`
const getPreRegistrationConfirmationKey = (item: StorePreRegistration) => `pre-registration:${item.id}`

export function StoreTeamPanel({ storeId, storeName }: StoreTeamPanelProps) {
  const { role } = useAuth()
  const canManageTeamMembers = canManageTeam(role)
  const canApprovePreRegistrations = isAdministradorMx(role)
  const canSharePreRegistrationLink = isAdministradorMx(role)
  const canCreateMembers = canManageTeamMembers
  const { lojas } = useStores()
  const editableStoreRoles = useMemo<MembershipRole[]>(() => {
    if (role === 'gerente') return ['vendedor']
    if (role === 'dono') return ['gerente', 'vendedor']
    return ['dono', 'gerente', 'vendedor']
  }, [role])

  const { team, loading, error: teamError, refetch, updateTeamMember, deleteTeamMember, registerUser } = useTeam(storeId || undefined)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingMember, setEditingMember] = useState<EditableTeamMember | null>(null)
  const [saving, setSaving] = useState(false)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [isRefetching, setIsRefetching] = useState(false)
  const [preRegistrations, setPreRegistrations] = useState<StorePreRegistration[]>([])
  const [loadingPreRegistrations, setLoadingPreRegistrations] = useState(false)
  const [reviewingPreRegistrationId, setReviewingPreRegistrationId] = useState<string | null>(null)
  const [pendingConfirmations, setPendingConfirmations] = useState<Set<string>>(() => new Set())
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null)
  const [transferConfirmation, setTransferConfirmation] = useState<TransferConfirmationData | null>(null)
  const [expandedPreRegistrations, setExpandedPreRegistrations] = useState<Set<string>>(() => new Set())
  // Story 3.12 — Focus traps WCAG 2.1 AA
  const confirmDialogRef = useRef<HTMLDivElement>(null)
  const editMemberDialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(confirmDialogRef, !!pendingConfirmation)
  useFocusTrap(editMemberDialogRef, !!editingMember)
  useEffect(() => {
    if (!pendingConfirmation && !editingMember && !transferConfirmation) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (transferConfirmation) setTransferConfirmation(null)
      else if (pendingConfirmation) setPendingConfirmation(null)
      else if (editingMember) setEditingMember(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [pendingConfirmation, editingMember, transferConfirmation])
  const approvalFunctionUrl = useMemo(() => getSupabaseFunctionUrl('approve-store-registration'), [])

  const registrationLink = useMemo(() => {
    if (!storeName) return ''
    return getPreRegistrationLink(storeName)
  }, [storeName])

  const handleCopyRegistrationLink = useCallback(async () => {
    if (!canSharePreRegistrationLink || !registrationLink) return
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard indisponível.')
      await navigator.clipboard.writeText(registrationLink)
      toast.success('Link de pré-cadastro copiado.')
    } catch {
      toast.error('Não foi possível copiar o link. Copie manualmente pela barra do navegador.')
    }
  }, [canSharePreRegistrationLink, registrationLink])

  const fetchPreRegistrations = useCallback(async () => {
    if (!storeId) return
    setLoadingPreRegistrations(true)
    try {
      const { data, error } = canApprovePreRegistrations
        ? await supabase
          .from('pre_cadastros_loja')
          .select('id, store_id, store_name_snapshot, auth_user_id, full_name, email, phone, role, segment, store_tenure, market_experience, notes, company_legal_name, company_cnpj, company_address, company_administrative_phone, avatar_url, avatar_storage_path, status, submitted_at, reviewed_by, reviewed_at, approved_by, approved_at, rejected_by, rejected_at, approval_note')
          .eq('store_id', storeId)
          .order('submitted_at', { ascending: false })
          .limit(20)
        : { data: [], error: null }

      if (error) throw error
      setPreRegistrations((data || []) as StorePreRegistration[])
    } catch {
      toast.error('Não foi possível carregar os pré-cadastros.')
      setPreRegistrations([])
    } finally {
      setLoadingPreRegistrations(false)
    }
  }, [canApprovePreRegistrations, storeId])

  useEffect(() => {
    fetchPreRegistrations()
  }, [fetchPreRegistrations])

  const clearPendingConfirmation = useCallback((key: string) => {
    setPendingConfirmations((current) => {
      const next = new Set(current)
      next.delete(key)
      return next
    })
    setPendingConfirmation(current => current?.key === key ? null : current)
  }, [])

  const requestConfirmation = useCallback((input: {
    key: string
    title: string
    description: string
    label: string
    onConfirm: () => void
  }) => {
    if (pendingConfirmations.has(input.key)) {
      toast.info('Confirmação já aberta para este item.')
      return
    }

    setPendingConfirmations((current) => new Set(current).add(input.key))
    setPendingConfirmation(input)
  }, [pendingConfirmations])

  useEffect(() => {
    if (!pendingConfirmation) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') clearPendingConfirmation(pendingConfirmation.key)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [clearPendingConfirmation, pendingConfirmation])

  const togglePreRegistrationDetails = useCallback((id: string) => {
    setExpandedPreRegistrations(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const redactEmail = useCallback((email: string) => {
    const [local, domain] = email.split('@')
    if (!local || !domain) return 'e-mail oculto'
    return `${local.slice(0, 2)}***@${domain}`
  }, [])

  const redactPhone = useCallback((phone?: string | null) => {
    const digits = (phone || '').replace(/\D/g, '')
    if (digits.length < 4) return 'telefone oculto'
    return `***${digits.slice(-4)}`
  }, [])

  const filteredTeam = useMemo(() => {
    return (team || []).filter(m =>
      m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.role?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [team, searchTerm])

  const stats = useMemo<TeamStat[]>(() => {
    const total = (team || []).length;
    const leaders = (team || []).filter(m => isPerfilInternoMx(m.role) || m.role === 'dono' || m.role === 'gerente');
    const activeMembers = (team || []).filter(m => m.active !== false && m.is_active !== false);
    const completedCheckin = (team || []).filter(m => m.checkin_today).length;

    return [
        { label: 'Integrantes', shortLabel: 'Int.', value: total, icon: Users, tone: 'brand', color: 'from-brand-primary/20 to-brand-primary/5' },
        { label: 'Fechamentos', shortLabel: 'Fech.', value: completedCheckin, icon: CheckCircle2, tone: 'success', color: 'from-status-success-surface to-transparent' },
        { label: 'Ativos', shortLabel: 'Atv.', value: activeMembers.length, icon: Zap, tone: 'success', color: 'from-status-success-surface to-transparent' },
        { label: 'Líderes', shortLabel: 'Líd.', value: leaders.length, icon: Shield, tone: 'warning', color: 'from-status-warning-surface to-transparent' },
    ];
  }, [team])

  const handleUpdateMember = async (e?: React.FormEvent, confirmTransfer = false) => {
    if (e) e.preventDefault()
    if (!editingMember) return
    const memberStoreId = editingMember.store_id || storeId
    if (!memberStoreId && !isPerfilInternoMx(editingMember.role)) {
      toast.error('Selecione a loja do integrante.')
      return
    }

    setSaving(true)
    try {
      const result = await updateTeamMember(
        editingMember.id,
        {
          name: editingMember.name,
          email: editingMember.email,
          phone: editingMember.phone,
          role: editingMember.role,
          active: editingMember.active,
          store_id: memberStoreId,
          previous_store_id: editingMember.previous_store_id || editingMember.store_id || storeId,
          started_at: editingMember.started_at,
          ended_at: editingMember.ended_at,
          is_active: editingMember.active === false ? false : editingMember.is_active,
          closing_month_grace: editingMember.closing_month_grace,
          is_venda_loja: editingMember.is_venda_loja,
        },
        confirmTransfer,
      )
      if (result.error) {
        if (result.code === 'EXISTS_IN_OTHER_STORE' && result.existingUser) {
          const targetStoreName = lojas.find((l) => l.id === memberStoreId)?.name || storeName
          setTransferConfirmation({
            existingUser: result.existingUser,
            targetStoreName,
            onConfirm: () => handleUpdateMember(undefined, true),
          })
          return
        }
        toast.error(result.error)
        return
      }
      toast.success(confirmTransfer ? 'Integrante transferido e atualizado.' : 'Integrante atualizado.')
      setEditingMember(null)
      setTransferConfirmation(null)
      await refetch()
    } finally {
      setSaving(false)
    }
  }

  const executeDeleteMember = useCallback(async (member: TeamMember | EditableTeamMember) => {
    if (!canManageTeamMembers) return
    const memberStoreId = member.store_id || storeId

    setSaving(true)
    try {
      const { error } = await deleteTeamMember(member.id, memberStoreId)
      if (error) {
        toast.error(error)
        return
      }
      toast.success('Vínculo encerrado.')
      setEditingMember(null)
      await refetch()
    } finally {
      setSaving(false)
    }
  }, [canManageTeamMembers, deleteTeamMember, refetch, storeId])

  const handleDeleteMember = useCallback((member: TeamMember | EditableTeamMember) => {
    if (!canManageTeamMembers) return
    const memberStoreId = member.store_id || storeId
    requestConfirmation({
      key: getDeleteMemberConfirmationKey(member),
      title: `Remover ${member.name} da equipe?`,
      description: `${memberStoreId ? 'O vínculo desta loja será encerrado.' : 'O vínculo selecionado será encerrado.'} O login não será desativado automaticamente.`,
      label: 'Remover',
      onConfirm: () => void executeDeleteMember(member),
    })
  }, [canManageTeamMembers, executeDeleteMember, requestConfirmation, storeId])

  const getVigenciaStatus = (m: TeamMember) => {
    const today = new Date().toISOString().slice(0, 10)
    if (!m.is_active) return { label: 'INATIVO', variant: 'outline' as const, color: 'text-muted-foreground border-border bg-surface-alt' }
    if (m.ended_at && m.ended_at.slice(0, 10) < today) return { label: 'ENCERRADO', variant: 'danger' as const, color: 'text-status-error-text border-status-error/30 bg-status-error-surface' }
    return { label: 'ATIVO', variant: 'success' as const, color: 'text-status-success-text border-status-success/30 bg-status-success-surface' }
  }

  const handleRefresh = useCallback(async () => {
    setIsRefetching(true)
    try {
      await Promise.all([refetch(), fetchPreRegistrations()])
    } catch {
      toast.error('Não foi possível atualizar a equipe.')
    } finally {
      setIsRefetching(false)
    }
  }, [fetchPreRegistrations, refetch])

  const executeReviewPreRegistration = useCallback(async (item: StorePreRegistration, action: 'approve' | 'reject') => {
    if (!canApprovePreRegistrations) return

    setReviewingPreRegistrationId(item.id)
    try {
      const { data: payload, error: invokeError } = await supabase.functions.invoke<{
        success?: boolean
        error?: string
        temporary_password?: string
        email_status?: string
      }>('approve-store-registration', {
        body: {
          pre_registration_id: item.id,
          action,
          role: item.role,
        },
      })

      if (invokeError) {
        const msg = await resolveFunctionInvokeError(invokeError, payload, 'Falha ao revisar login.')
        throw new Error(msg)
      }
      if (!payload?.success) {
        throw new Error(payload?.error || 'Não foi possível revisar o login.')
      }

      const temporaryPassword = typeof payload.temporary_password === 'string' ? payload.temporary_password : ''
      if (action === 'approve' && payload.email_status === 'sent') {
        toast.success('Login aprovado. Link para criação de senha enviado ao e-mail cadastrado.')
      } else if (action === 'approve' && temporaryPassword) {
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(temporaryPassword)
            toast.success('Login aprovado, mas o e-mail não foi entregue. Senha temporária copiada para a área de transferência.')
          } else {
            toast.success('Login aprovado, mas o e-mail não foi entregue. Gere uma nova senha temporária em caso de perda.')
          }
        } catch {
          toast.success('Login aprovado, mas o e-mail não foi entregue. Gere uma nova senha temporária em caso de perda.')
        }
      } else {
        toast.success(action === 'approve' ? 'Login aprovado e sincronizado.' : 'Login rejeitado.')
      }
      await Promise.all([refetch(), fetchPreRegistrations()])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao revisar login.')
    } finally {
      setReviewingPreRegistrationId(null)
    }
  }, [canApprovePreRegistrations, fetchPreRegistrations, refetch])

  const handleReviewPreRegistration = useCallback((item: StorePreRegistration, action: 'approve' | 'reject') => {
    if (!canApprovePreRegistrations) return
    requestConfirmation({
      key: getPreRegistrationConfirmationKey(item),
      title: `${action === 'approve' ? 'Aprovar' : 'Rejeitar'} login de ${item.full_name}?`,
      description: `Solicitação de ${item.role} para ${item.store_name_snapshot}.`,
      label: action === 'approve' ? 'Aprovar' : 'Rejeitar',
      onConfirm: () => void executeReviewPreRegistration(item, action),
    })
  }, [canApprovePreRegistrations, executeReviewPreRegistration, requestConfirmation])

  if (!storeId) return (
    <section className="w-full rounded-2xl border border-border bg-white p-mx-xl text-center shadow-sm">
      <Typography variant="h2" className="tracking-tight">Selecione uma loja</Typography>
      <Typography variant="caption" tone="muted" className="mt-2 block">
        A equipe agora é administrada dentro do dashboard operacional de cada loja.
      </Typography>
    </section>
  )

  if (loading) return (
    <section className="w-full flex flex-col gap-mx-lg animate-in fade-in duration-500 overflow-hidden">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-mx-lg border-b border-border pb-10">
            <div className="space-y-mx-xs">
                <Skeleton className="h-mx-10 w-mx-64" />
                <div className="flex gap-mx-sm">
                  <Skeleton className="h-mx-xs w-mx-48" />
                  <Skeleton className="h-mx-xs w-mx-32 opacity-50" />
                </div>
            </div>
            <div className="flex gap-mx-sm">
                <Skeleton className="h-mx-14 w-mx-14 rounded-2xl" />
                <Skeleton className="h-mx-14 w-mx-48 rounded-2xl" />
            </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-mx-lg shrink-0">
            <Skeleton className="h-mx-24 rounded-mx-4xl" />
            <Skeleton className="h-mx-24 rounded-mx-4xl" />
            <Skeleton className="h-mx-24 rounded-mx-4xl" />
            <Skeleton className="h-mx-24 rounded-mx-4xl" />
        </div>

        <div className="flex-1 mt-mx-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-mx-lg">
                {[1,2,3,4,5,6,7,8].map(i => (
                    <div key={i} className="h-mx-96 rounded-mx-4xl bg-white/50 border-2 border-dashed border-border flex flex-col items-center justify-center p-mx-xl">
                        <Skeleton className="w-mx-24 h-mx-24 rounded-mx-4xl mb-6" />
                        <Skeleton className="h-mx-sm w-full mb-2" />
                        <Skeleton className="h-mx-xs w-1/2" />
                    </div>
                ))}
            </div>
        </div>
    </section>
  )

  return (
    <section className="w-full flex flex-col gap-mx-lg relative">
        <>
          <ConfirmationDialog
            pendingConfirmation={pendingConfirmation}
            confirmDialogRef={confirmDialogRef}
            onDismiss={clearPendingConfirmation}
          />

          <div className="flex flex-col gap-mx-sm rounded-2xl border border-border bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div><Typography variant="h3">Equipe da Loja</Typography><Typography variant="caption" tone="muted">Integrantes vinculados a {storeName || 'esta unidade'}</Typography></div>
              <div className="flex flex-col sm:flex-row items-center gap-mx-sm w-full lg:w-auto">
                <div className="relative group w-full sm:w-mx-96">
                  <label htmlFor="search-specialist" className="sr-only">Buscar integrante da equipe</label>
                  <Search size={16} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-status-success-text transition-colors" />
                  <Input
                    id="search-specialist"
                    name="search-specialist"
                    placeholder="Buscar por nome ou perfil"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-12 h-[var(--mx-input-height-lg)] uppercase font-bold tracking-widest text-mx-tiny"
                  />
                </div>
                <div className="flex w-full sm:w-auto gap-mx-sm">
                  <Button
                      variant="outline"
                      size="icon"
                      type="button"
                      onClick={handleRefresh}
                      aria-label="Atualizar equipe e pré-cadastros"
                      className="w-mx-14 h-mx-14 bg-white shrink-0"
                  >
                    <RefreshCw size={20} aria-hidden="true" className={cn(isRefetching && "animate-spin")} />
                  </Button>
                  {canCreateMembers && (
                    <Button
                      onClick={() => setIsUserModalOpen(true)}
                      className="flex-1 sm:flex-none h-mx-14 px-8 rounded-2xl bg-gray-900 !text-white hover:bg-gray-900/90 font-bold uppercase tracking-widest text-mx-tiny shadow-sm"
                    >
                      <UserPlus size={18} className="mr-2" /> NOVO INTEGRANTE
                    </Button>
                  )}
                </div>
              </div>
          </div>

          <TeamStatsGrid stats={stats} />

          <div className="grid mx-team-layout-grid gap-mx-lg items-start mt-mx-md">

          <PreRegistrationQueue
            canSharePreRegistrationLink={canSharePreRegistrationLink}
            registrationLink={registrationLink}
            onCopyLink={() => void handleCopyRegistrationLink()}
            canApprovePreRegistrations={canApprovePreRegistrations}
            loadingPreRegistrations={loadingPreRegistrations}
            preRegistrations={preRegistrations}
            expandedPreRegistrations={expandedPreRegistrations}
            onToggleDetails={togglePreRegistrationDetails}
            redactEmail={redactEmail}
            redactPhone={redactPhone}
            onReview={handleReviewPreRegistration}
            reviewingPreRegistrationId={reviewingPreRegistrationId}
            pendingConfirmations={pendingConfirmations}
          />

          <TeamListSection
            teamError={teamError}
            onRetry={handleRefresh}
            filteredTeam={filteredTeam}
            getVigenciaStatus={getVigenciaStatus}
            storeId={storeId}
            canManageTeamMembers={canManageTeamMembers}
            onEditMember={(member) => setEditingMember({ ...member, previous_store_id: member.store_id })}
            onDeleteMember={handleDeleteMember}
            pendingConfirmations={pendingConfirmations}
            getDeleteMemberConfirmationKey={getDeleteMemberConfirmationKey}
            canCreateMembers={canCreateMembers}
            onCreateMember={() => setIsUserModalOpen(true)}
          />
          </div>

	          <AnimatePresence>
            {editingMember && (
              <EditMemberModal
                editingMember={editingMember}
                editMemberDialogRef={editMemberDialogRef}
                onClose={() => setEditingMember(null)}
                onSubmit={handleUpdateMember}
                onChange={setEditingMember}
                editableStoreRoles={editableStoreRoles}
                lojas={lojas}
                storeId={storeId}
                saving={saving}
                pendingConfirmations={pendingConfirmations}
                getDeleteMemberConfirmationKey={getDeleteMemberConfirmationKey}
                onDeleteMember={handleDeleteMember}
              />
            )}

            {isUserModalOpen && (
              <UserCreationModal
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                onSuccess={refetch}
                registerUser={registerUser}
                storeId={storeId}
                lojas={lojas}
              />
            )}

            <TransferConfirmationDialog
              data={transferConfirmation}
              isOpen={!!transferConfirmation}
              onClose={() => setTransferConfirmation(null)}
              loading={saving}
            />
          </AnimatePresence>
        </>
    </section>
  )
}

export default StoreTeamPanel
