import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { canManagePDI } from '@/lib/auth/capabilities'
import type { PDIFormData, PDIStatus } from '@/types/database'
import { parsePDIArray, parsePDIReviewArray, type PDI, type PDIReview } from '@/lib/schemas/pdi.schema'

interface PDIReviewCreateDTO {
  notes?: string
  rating?: number
  pdi_id?: string
  reviewer_id?: string
}

const ALLOWED_REVIEW_KEYS = new Set<string>(['notes', 'rating', 'pdi_id', 'reviewer_id'])
const ALLOWED_PDI_STATUSES: readonly PDIStatus[] = ['aberto', 'em_andamento', 'concluido']
const PDI_SELECT = 'id, store_id, manager_id, seller_id, status, meta_6m, meta_12m, meta_24m, comp_prospeccao, comp_abordagem, comp_demonstracao, comp_fechamento, comp_crm, comp_digital, comp_disciplina, comp_organizacao, comp_negociacao, comp_produto, action_1, action_2, action_3, action_4, action_5, due_date, acknowledged, seller_acknowledged_at, manager_acknowledged_at, created_at, updated_at, seller:usuarios!pdis_seller_id_fkey(name)'
const PDI_BASE_SELECT = PDI_SELECT.replace(', seller:usuarios!pdis_seller_id_fkey(name)', '')
const PDI_REVIEW_SELECT = 'id, pdi_id, reviewer_id, notes, rating, created_at'

function sanitizeReviewPayload(data: Record<string, unknown>): PDIReviewCreateDTO {
  const sanitized: PDIReviewCreateDTO = {}
  for (const key of ALLOWED_REVIEW_KEYS) {
    if (key in data) (sanitized as Record<string, unknown>)[key] = data[key]
  }
  return sanitized
}

function validateReviewPayload(data: PDIReviewCreateDTO): string | null {
  if (data.notes !== undefined && (typeof data.notes !== 'string' || data.notes.trim().length > 2000)) {
    return 'Notas da revisão inválidas.'
  }
  if (data.rating !== undefined && (!Number.isInteger(data.rating) || data.rating < 0 || data.rating > 10)) {
    return 'Nota da revisão deve ser um número inteiro entre 0 e 10.'
  }
  return null
}

export function usePDIs(storeIdOverride?: string) {
  const { profile, storeId: authStoreId, role } = useAuth()
  const queryClient = useQueryClient()
  const storeId = storeIdOverride || authStoreId

  const { data: pdis, isLoading: loading, refetch } = useQuery({
    queryKey: ['pdis', storeId, role, profile?.id],
    queryFn: async () => {
      if (!profile || (!storeId && !isPerfilInternoMx(role))) return [] as (PDI & { seller_name?: string })[]

      let query = supabase.from('pdis').select(PDI_SELECT)
      if (role === 'vendedor') query = query.eq('seller_id', profile.id)
      else if (role === 'gerente') query = query.eq('store_id', storeId).eq('manager_id', profile.id)
      else if (role === 'dono') query = query.eq('store_id', storeId)
      else if (isPerfilInternoMx(role) && storeIdOverride) query = query.eq('store_id', storeId)

      const { data } = await query.order('created_at', { ascending: false })
      if (data) {
        const validated = parsePDIArray(data.map(({ seller, ...rest }: Record<string, unknown>) => rest))
        return (data as (PDI & { seller?: { name?: string } })[]).map((p, i) => ({
          ...validated[i],
          seller_name: p.seller?.name,
        }))
      }
      return [] as (PDI & { seller_name?: string })[]
    },
    enabled: !!profile,
  })

  const fetchReviews = (pdiId: string) => {
    queryClient.invalidateQueries({ queryKey: ['pdi-reviews', pdiId] })
  }

  const acknowledgeMut = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'seller' | 'manager' }) => {
      const target = pdis?.find(item => item.id === id)
      if (!profile || !target) return { error: 'PDI não encontrado para confirmação.' }
      if (type === 'seller' && target.seller_id !== profile.id) {
        return { error: 'Apenas o vendedor destinatário pode assinar este PDI.' }
      }
      if (type === 'manager' && !canManagePDI(role)) {
        return { error: 'Apenas gestor ou equipe MX pode assinar este PDI.' }
      }

      const field = type === 'seller' ? 'seller_acknowledged_at' : 'manager_acknowledged_at'
      let query = supabase.from('pdis').update({
        [field]: new Date().toISOString(),
        acknowledged: type === 'seller' ? true : undefined
      }).eq('id', id)

      if (type === 'seller') query = query.eq('seller_id', profile.id)
      if (type === 'manager' && role === 'gerente' && storeId) query = query.eq('store_id', storeId).eq('manager_id', profile.id)
      else if (type === 'manager' && !isPerfilInternoMx(role) && storeId) query = query.eq('store_id', storeId)

      const { error } = await query
      return { error: error?.message || null }
    },
    onSuccess: (result) => {
      if (!result.error) queryClient.invalidateQueries({ queryKey: ['pdis'] })
    },
  })

  const updateStatusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PDIStatus }) => {
      const target = pdis?.find(item => item.id === id)
      if (!profile || !target) return { error: 'PDI não encontrado para atualização.' }
      if (!ALLOWED_PDI_STATUSES.includes(status)) return { error: 'Status de PDI inválido.' }
      if (!canManagePDI(role)) return { error: 'Seu papel permite acompanhar PDIs, mas não alterar status.' }

      let query = supabase.from('pdis').update({ status }).eq('id', id)
      if (role === 'gerente' && storeId) query = query.eq('store_id', storeId).eq('manager_id', profile.id)
      else if (!isPerfilInternoMx(role) && storeId) query = query.eq('store_id', storeId)

      const { error } = await query
      return { error: error?.message || null }
    },
    onSuccess: (result) => {
      if (!result?.error) queryClient.invalidateQueries({ queryKey: ['pdis'] })
    },
  })

  const createReviewMut = useMutation({
    mutationFn: async ({ pdiId, data }: { pdiId: string; data: Record<string, unknown> }) => {
      const target = pdis?.find(item => item.id === pdiId)
      if (!profile || !target) return { error: 'PDI não encontrado para revisão.' }
      if (!canManagePDI(role)) return { error: 'Seu papel permite acompanhar PDIs, mas não revisar.' }
      if (role === 'gerente' && target.manager_id !== profile.id) return { error: 'Apenas o gerente responsável pode revisar este PDI.' }
      const sanitized = sanitizeReviewPayload(data)
      const validationError = validateReviewPayload(sanitized)
      if (validationError) return { error: validationError }

      const { error } = await supabase.from('pdi_reviews').insert({ ...sanitized, pdi_id: pdiId, reviewer_id: profile.id })
      return { error: error?.message || null }
    },
    onSuccess: (result, variables) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['pdis'] })
        queryClient.invalidateQueries({ queryKey: ['pdi-reviews', variables.pdiId] })
      }
    },
  })

  return {
    pdis: pdis || [],
    usePDIReviews,
    loading,
    updateStatus: (id: string, status: PDIStatus) => updateStatusMut.mutateAsync({ id, status }),
    acknowledge: (id: string, type: 'seller' | 'manager') => acknowledgeMut.mutateAsync({ id, type }),
    createReview: (pdiId: string, data: Record<string, unknown>) => createReviewMut.mutateAsync({ pdiId, data }),
    fetchReviews,
    refetch,
  }
}

export function useMyPDIs() {
  const { profile, storeId: authStoreId } = useAuth()

  const { data: pdis, isLoading: loading, refetch } = useQuery({
    queryKey: ['my-pdis', profile?.id],
    queryFn: async () => {
      if (!profile || !authStoreId) return []
      const { data } = await supabase.from('pdis').select(PDI_BASE_SELECT).eq('seller_id', profile.id).order('created_at', { ascending: false })
      return parsePDIArray(data || []) as (PDI & { seller_name?: string })[]
    },
    enabled: !!profile && !!authStoreId,
  })

  return {
    pdis: pdis || [],
    loading,
    refetch,
  }
}

export function usePDIReviews(pdiId: string) {
  const { data } = useQuery({
    queryKey: ['pdi-reviews', pdiId],
    queryFn: async () => {
      const { data } = await supabase.from('pdi_reviews').select(PDI_REVIEW_SELECT).eq('pdi_id', pdiId).order('created_at', { ascending: false })
      return parsePDIReviewArray(data || [])
    },
    enabled: !!pdiId,
  })
  return data || []
}
