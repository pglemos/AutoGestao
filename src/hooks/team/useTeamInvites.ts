import { resolveFunctionInvokeDetail, supabase } from '@/lib/supabase'
import { isAdministradorMx, useAuth } from '@/hooks/useAuth'
import type { RegisterUserInput } from './types'

export type UseTeamInvitesInput = {
  refetchMembers: () => Promise<void>
}

export type UseTeamInvitesReturn = {
  registerUser: (
    userData: RegisterUserInput,
  ) => Promise<{
    success?: boolean
    error?: string
    code?: string
    existingUser?: {
      id: string
      name: string
      email: string
      current_store_id: string | null
      current_store_name: string
    }
  }>
}

/**
 * Sub-hook: criação de integrantes (pré-cadastro + onboarding via edge function).
 */
export function useTeamInvites({ refetchMembers }: UseTeamInvitesInput): UseTeamInvitesReturn {
  const { role } = useAuth()

  const registerUser = async (userData: RegisterUserInput) => {
    if (!isAdministradorMx(role) && role !== 'gerente' && role !== 'dono')
      return { error: 'Apenas Admin MX, dono ou gerente podem criar integrantes.' }
    const { data, error } = await supabase.functions.invoke('register-user', {
      body: userData,
    })
    if (!error && data?.success) {
      await refetchMembers()
      return { success: true }
    }
    const detail = await resolveFunctionInvokeDetail(error, data, 'Erro ao criar integrante.')
    return {
      error: detail.message,
      code: detail.code,
      existingUser: detail.existing_user,
    }
  }

  return { registerUser }
}
