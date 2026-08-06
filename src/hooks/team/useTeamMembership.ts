import { resolveFunctionInvokeDetail, resolveFunctionInvokeError, supabase } from '@/lib/supabase'
import { isAdministradorMx, useAuth } from '@/hooks/useAuth'
import {
  isInternalRole,
  todayISO,
  type SellerTenureUpdateFields,
  type TeamMember,
  type TeamMemberUpdateFields,
} from './types'

export type UseTeamMembershipInput = {
  storeIdOverride?: string
  sellers: TeamMember[]
  refetchMembers: () => Promise<void>
}

export type UseTeamMembershipReturn = {
  updateVigencia: (
    userId: string,
    data: SellerTenureUpdateFields,
  ) => Promise<{ error: string | null }>
  updateTeamMember: (
    userId: string,
    updates: TeamMemberUpdateFields,
    confirmTransfer?: boolean,
  ) => Promise<{
    error: string | null
    code?: string
    existingUser?: {
      id: string
      name: string
      email: string
      current_store_id: string | null
      current_store_name: string
    }
  }>
  deleteTeamMember: (
    userId: string,
    targetStoreId?: string | null,
  ) => Promise<{ error: string | null }>
}

/**
 * Sub-hook: mutations de vínculo (vigência, edição, exclusão).
 *
 * Owna a invalidação via `refetchMembers` (recebido como input) — não usa estado próprio.
 */
export function useTeamMembership({
  storeIdOverride,
  sellers,
  refetchMembers,
}: UseTeamMembershipInput): UseTeamMembershipReturn {
  const { storeId: authStoreId, role } = useAuth()
  const storeId = storeIdOverride || authStoreId

  const updateVigencia = async (userId: string, data: SellerTenureUpdateFields) => {
    if (!isAdministradorMx(role) && role !== 'gerente' && role !== 'dono') {
      return { error: 'Apenas gestores da loja podem alterar vigência.' }
    }
    const scopedStoreId = storeId && storeId !== 'all' ? storeId : null
    if (!scopedStoreId) return { error: 'Selecione uma loja para alterar a vigência.' }
    const target = sellers.find((member) => member.id === userId)
    if (target && target.role !== 'vendedor') {
      return { error: 'Vigência operacional só pode ser alterada para vendedores.' }
    }
    const payload: SellerTenureUpdateFields = {
      started_at: data.started_at || todayISO(),
      ended_at: data.ended_at ?? null,
      is_active: data.is_active ?? true,
      closing_month_grace: data.closing_month_grace ?? false,
    }
    const { data: response, error } = await supabase.functions.invoke('manage-store-team', {
      body: {
        action: 'update',
        user_id: userId,
        store_id: scopedStoreId,
        updates: { role: 'vendedor', ...payload },
      },
    })
    if (!error && response?.success) {
      await refetchMembers()
      return { error: null }
    }
    return { error: await resolveFunctionInvokeError(error, response, 'Erro ao alterar vigência.') }
  }

  const updateTeamMember = async (
    userId: string,
    updates: TeamMemberUpdateFields,
    confirmTransfer = false,
  ) => {
    if (!isAdministradorMx(role) && role !== 'gerente' && role !== 'dono') {
      return { error: 'Apenas gestores da loja podem editar integrantes.' }
    }
    const targetStoreId = updates.store_id || (storeId && storeId !== 'all' ? storeId : null)
    if (!targetStoreId) {
      return { error: 'Selecione a loja do integrante.' }
    }

    if (updates.role && isInternalRole(updates.role)) {
      return { error: 'Papéis internos MX não podem ser geridos pelo painel de equipe da loja.' }
    }

    const { data, error } = await supabase.functions.invoke('manage-store-team', {
      body: {
        action: 'update',
        user_id: userId,
        store_id: targetStoreId,
        previous_store_id:
          updates.previous_store_id || (storeId && storeId !== 'all' ? storeId : targetStoreId),
        confirm_transfer: confirmTransfer,
        updates,
      },
    })
    if (!error && data?.success) {
      await refetchMembers()
      return { error: null }
    }
    const detail = await resolveFunctionInvokeDetail(error, data, 'Erro ao editar integrante.')
    return {
      error: detail.message,
      code: detail.code,
      existingUser: detail.existing_user,
    }
  }

  const deleteTeamMember = async (userId: string, targetStoreId?: string | null) => {
    if (!isAdministradorMx(role) && role !== 'gerente' && role !== 'dono')
      return { error: 'Apenas gestores da loja podem excluir integrantes.' }
    const scopedStoreId = targetStoreId || (storeId && storeId !== 'all' ? storeId : null)
    if (!scopedStoreId) return { error: 'Selecione a loja do integrante.' }

    const { data, error } = await supabase.functions.invoke('manage-store-team', {
      body: {
        action: 'delete',
        user_id: userId,
        store_id: scopedStoreId,
      },
    })
    if (!error && data?.success) {
      await refetchMembers()
      return { error: null }
    }
    return { error: await resolveFunctionInvokeError(error, data, 'Erro ao excluir integrante.') }
  }

  return { updateVigencia, updateTeamMember, deleteTeamMember }
}
