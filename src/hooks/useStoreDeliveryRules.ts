import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  canManageInternalMxArea,
  getInternalMxAccessMode,
  getInternalMxReadOnlyMessage,
} from '@/design-system/internal-mx/internalMxAccessPolicy'
import type { StoreDeliveryRules } from '@/types/database'

const DELIVERY_RULES_SELECT = 'store_id, matinal_recipients, weekly_recipients, monthly_recipients, whatsapp_group_ref, timezone, active, updated_by, updated_at'

export function useStoreDeliveryRules(storeIdOverride?: string) {
  const { storeId: authStoreId, role } = useAuth()
  const queryClient = useQueryClient()
  const storeId = storeIdOverride || authStoreId
  const accessMode = getInternalMxAccessMode('operational-settings', role)
  const canManage = canManageInternalMxArea('operational-settings', role)
  const readOnlyMessage = getInternalMxReadOnlyMessage('operational-settings')

  const { data: deliveryRules, isLoading: loading, refetch } = useQuery({
    queryKey: ['delivery-rules', storeId],
    queryFn: async () => {
      if (!storeId) return null
      const { data } = await supabase.from('regras_entrega_loja').select(DELIVERY_RULES_SELECT).eq('store_id', storeId).maybeSingle()
      return data as StoreDeliveryRules | null
    },
    enabled: Boolean(storeId),
  })

  const updateDeliveryRulesMut = useMutation({
    mutationFn: async (data: Partial<StoreDeliveryRules>) => {
      if (!storeId) return { error: 'Loja não identificada' }
      if (!canManage) return { error: readOnlyMessage }
      const { error } = await supabase.from('regras_entrega_loja').upsert({
        store_id: storeId,
        ...data,
      }, { onConflict: 'store_id' })
      return { error: error?.message || null }
    },
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['delivery-rules'] })
      }
    },
  })

  return {
    deliveryRules: deliveryRules ?? null,
    loading,
    refetch,
    accessMode,
    canManage,
    readOnlyMessage,
    updateDeliveryRules: (data: Partial<StoreDeliveryRules>) => updateDeliveryRulesMut.mutateAsync(data),
  }
}
