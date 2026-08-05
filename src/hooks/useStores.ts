import { useState, useEffect, useCallback, useRef } from 'react'
import { z } from 'zod'
import { toast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import { isAdministradorMx, isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { calculateReferenceDate } from '@/hooks/useCheckins'
import { isLancamentosViaRpcEnabled } from '@/lib/feature-flags'
import { getSafeUserFacingDataError } from '@/lib/errors/user-facing-error'
import type { User, Store, StorePartner } from '@/types/database'
import { isStoreTeamRole } from './team/types'

const STORES_SELECT =
  'id, name, manager_email, legal_name, cnpj, address, administrative_phone, partners, parent_loja_id, active, source_mode, created_at, updated_at'

export type StoreUpdateFields = Pick<
  Store,
  'name' | 'manager_email' | 'legal_name' | 'cnpj' | 'address' | 'administrative_phone' | 'partners' | 'active'
>

/**
 * Campos aceitos na escrita de loja. Vínculo matriz↔filial fica fora de
 * `StoreUpdateFields` porque o formulário de cadastro não o edita — quem mexe
 * nele é a tela de filiais, que envia só esse campo.
 */
export type StoreWriteFields = StoreUpdateFields & Pick<Store, 'parent_loja_id'>

const normalizeStoreName = (name: string) => name.trim().toLocaleUpperCase('pt-BR')

const DEFAULT_INITIAL_MONTHLY_GOAL = 0

const storeUpdateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Nome da loja deve ter pelo menos 2 caracteres.')
      .max(120, 'Nome da loja muito longo.')
      .optional(),
    manager_email: z
      .union([z.string().trim().email('E-mail do gestor inválido.'), z.literal(''), z.null()])
      .optional(),
    legal_name: z
      .union([z.string().trim().max(180, 'Razão social muito longa.'), z.literal(''), z.null()])
      .optional(),
    cnpj: z.union([z.string().trim().max(32, 'CNPJ muito longo.'), z.literal(''), z.null()]).optional(),
    address: z
      .union([z.string().trim().max(300, 'Endereço muito longo.'), z.literal(''), z.null()])
      .optional(),
    administrative_phone: z
      .union([z.string().trim().max(60, 'Telefone administrativo muito longo.'), z.literal(''), z.null()])
      .optional(),
    partners: z
      .array(
        z.object({
          name: z
            .string()
            .trim()
            .min(1, 'Nome do sócio é obrigatório.')
            .max(160, 'Nome do sócio muito longo.'),
          document: z.union([z.string().trim().max(60), z.literal(''), z.null()]).optional(),
          phone: z.union([z.string().trim().max(60), z.literal(''), z.null()]).optional(),
          email: z
            .union([z.string().trim().email('E-mail do sócio inválido.'), z.literal(''), z.null()])
            .optional(),
        }),
      )
      .max(12, 'Limite de 12 sócios por loja.')
      .optional(),
    active: z.boolean().optional(),
    parent_loja_id: z
      .union([z.string().uuid('Matriz inválida.'), z.literal(''), z.null()])
      .optional(),
  })
  .strict()

const normalizeOptionalText = (value?: string | null) => {
  const trimmed = (value || '').trim()
  return trimmed ? trimmed : null
}

const normalizeOptionalEmail = (value?: string | null) =>
  normalizeOptionalText(value)?.toLowerCase() || null

const normalizePartners = (partners?: StorePartner[]) => {
  return (partners || [])
    .map((partner) => ({
      name: partner.name.trim().toLocaleUpperCase('pt-BR'),
      document: normalizeOptionalText(partner.document),
      phone: normalizeOptionalText(partner.phone),
      email: normalizeOptionalText(partner.email)?.toLowerCase() || null,
    }))
    .filter((partner) => partner.name)
}

export function useStores() {
  const { role, vinculos_loja, storeId } = useAuth()
  const [lojas, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStores = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase.from('lojas').select(STORES_SELECT).order('name')

      if (role === 'dono' || role === 'gerente') {
        const storeIds = vinculos_loja.map((m) => m.store_id)
        if (!storeIds.length) {
          setStores([])
          return
        }
        query = query.in('id', storeIds)
      } else if (role === 'vendedor' && storeId) {
        query = query.eq('id', storeId)
      }

      if (!isPerfilInternoMx(role)) {
        query = query.eq('active', true)
      }

      let { data, error } = await query

      if (error) {
        const msg = (error.message || '').toLowerCase()
        const isJwt = msg.includes('jwt') || msg.includes('token') || msg.includes('unauthorized')
        if (isJwt) {
          const { error: refreshError } = await supabase.auth.refreshSession()
          if (!refreshError) {
            ;({ data, error } = await query)
          }
        }
      }

      if (error) throw error
      setStores(data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      const isJwt = message.toLowerCase().includes('jwt') || message.toLowerCase().includes('unauthorized')
      if (isJwt) {
        toast.error('Sessão expirada. Faça login novamente.')
        setError('Sessão expirada. Faça login novamente.')
      } else {
        console.error('Audit Error [useStores]: fetchStores fail ->', message)
        toast.error('Não foi possível carregar as lojas.')
        setError(getSafeUserFacingDataError(err, 'Não foi possível carregar as unidades.'))
      }
      setStores([])
    } finally {
      setLoading(false)
    }
  }, [role, vinculos_loja, storeId])

  const createStore = async (
    name: string,
    managerEmail?: string,
    details?: Partial<
      Pick<
        StoreWriteFields,
        'legal_name' | 'cnpj' | 'address' | 'administrative_phone' | 'partners' | 'parent_loja_id'
      >
    >,
  ) => {
    if (!isAdministradorMx(role)) return { error: 'Apenas administradores MX podem criar lojas.' }
    const validation = storeUpdateSchema
      .pick({
        name: true,
        manager_email: true,
        legal_name: true,
        cnpj: true,
        address: true,
        administrative_phone: true,
        partners: true,
        parent_loja_id: true,
      })
      .safeParse({
        name,
        manager_email: managerEmail || null,
        ...details,
      })
    if (!validation.success) {
      const message = validation.error.issues[0]?.message || 'Dados da loja inválidos.'
      toast.error(message)
      return { error: message }
    }
    const normalizedName = normalizeStoreName(name)
    const storePayload = {
      name: normalizedName,
      manager_email: normalizeOptionalEmail(managerEmail),
      legal_name: normalizeOptionalText(details?.legal_name),
      cnpj: normalizeOptionalText(details?.cnpj),
      address: normalizeOptionalText(details?.address),
      administrative_phone: normalizeOptionalText(details?.administrative_phone),
      partners: normalizePartners(details?.partners),
      parent_loja_id: details?.parent_loja_id || null,
      monthly_goal: DEFAULT_INITIAL_MONTHLY_GOAL,
    }

    const isJwtError = (err: unknown) => {
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
      return msg.includes('jwt') || msg.includes('token') || msg.includes('unauthorized') || msg.includes('invalid JWT')
    }

    const callRpc = () =>
      supabase.rpc('admin_create_store', { p_payload: storePayload })

    let { data, error } = await callRpc()

    if (isJwtError(error) || isJwtError(data)) {
      const { error: refreshError } = await supabase.auth.refreshSession()
      if (!refreshError) {
        ;({ data, error } = await callRpc())
      }
    }

    const payload = data as { ok?: boolean; error?: string } | null

    if (error) {
      if (isJwtError(error)) {
        toast.error('Sessão expirada. Faça login novamente.')
        return { error: 'Sessão expirada. Faça login novamente.' }
      }
      return { error: error.message }
    }
    if (!payload?.ok) return { error: payload?.error || 'Não foi possível criar a loja.' }

    await fetchStores()
    return { error: null }
  }

  const updateStore = async (id: string, updates: Partial<StoreWriteFields>) => {
    if (!isAdministradorMx(role)) return { error: 'Apenas administradores MX podem editar lojas.' }

    const validation = storeUpdateSchema.safeParse(updates)
    if (!validation.success) {
      const message = validation.error.issues[0]?.message || 'Dados da loja inválidos.'
      toast.error(message)
      return { error: message }
    }

    const payload: Partial<StoreWriteFields> = {}
    if (typeof validation.data.name !== 'undefined')
      payload.name = normalizeStoreName(validation.data.name)
    if (typeof validation.data.manager_email !== 'undefined') {
      payload.manager_email = normalizeOptionalEmail(validation.data.manager_email)
    }
    if (typeof validation.data.legal_name !== 'undefined')
      payload.legal_name = normalizeOptionalText(validation.data.legal_name)
    if (typeof validation.data.cnpj !== 'undefined')
      payload.cnpj = normalizeOptionalText(validation.data.cnpj)
    if (typeof validation.data.address !== 'undefined')
      payload.address = normalizeOptionalText(validation.data.address)
    if (typeof validation.data.administrative_phone !== 'undefined')
      payload.administrative_phone = normalizeOptionalText(validation.data.administrative_phone)
    if (typeof validation.data.partners !== 'undefined')
      payload.partners = normalizePartners(validation.data.partners)
    if (typeof validation.data.active !== 'undefined') payload.active = validation.data.active
    if (typeof validation.data.parent_loja_id !== 'undefined')
      payload.parent_loja_id = validation.data.parent_loja_id || null

    const isJwtError = (err: unknown) => {
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
      return msg.includes('jwt') || msg.includes('token') || msg.includes('unauthorized') || msg.includes('invalid JWT')
    }

    const callRpc = () =>
      supabase.rpc('admin_update_store', {
        p_store_id: id,
        p_payload: payload,
      })

    let { data, error } = await callRpc()

    if (isJwtError(error) || isJwtError(data)) {
      const { error: refreshError } = await supabase.auth.refreshSession()
      if (!refreshError) {
        ;({ data, error } = await callRpc())
      }
    }

    const result = data as { ok?: boolean; error?: string } | null
    if (error || !result?.ok) {
      const rawMessage = error?.message || result?.error || 'Não foi possível atualizar a loja.'
      if (isJwtError(rawMessage)) {
        toast.error('Sessão expirada. Faça login novamente.')
        return { error: 'Sessão expirada. Faça login novamente.' }
      }
      toast.error(rawMessage)
      return { error: rawMessage }
    }

    await fetchStores()
    toast.success('Loja atualizada com sucesso.')
    return { error: null }
  }

  const deleteStore = async (id: string) => {
    if (!isAdministradorMx(role))
      return { error: 'Apenas administradores MX podem arquivar lojas.' }

    const isJwtError = (err: unknown) => {
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
      return msg.includes('jwt') || msg.includes('token') || msg.includes('unauthorized') || msg.includes('invalid JWT')
    }

    const callRpc = () => supabase.rpc('admin_archive_store', { p_store_id: id })

    let { data, error } = await callRpc()

    if (isJwtError(error) || isJwtError(data)) {
      const { error: refreshError } = await supabase.auth.refreshSession()
      if (!refreshError) {
        ;({ data, error } = await callRpc())
      }
    }

    const result = data as { ok?: boolean; error?: string } | null
    if (error || !result?.ok) {
      const rawMessage = error?.message || result?.error || 'Não foi possível arquivar a loja.'
      if (isJwtError(rawMessage)) {
        toast.error('Sessão expirada. Faça login novamente.')
        return { error: 'Sessão expirada. Faça login novamente.' }
      }
      return { error: rawMessage }
    }
    await fetchStores()
    return { error: null }
  }

  const toggleStoreStatus = async (id: string, active: boolean) => {
    if (!active) return deleteStore(id)
    if (!isAdministradorMx(role))
      return { error: 'Apenas administradores MX podem restaurar lojas.' }

    const isJwtError = (err: unknown) => {
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
      return msg.includes('jwt') || msg.includes('token') || msg.includes('unauthorized') || msg.includes('invalid JWT')
    }

    const callRpc = () => supabase.rpc('admin_restore_store', { p_store_id: id })

    let { data, error } = await callRpc()

    if (isJwtError(error) || isJwtError(data)) {
      const { error: refreshError } = await supabase.auth.refreshSession()
      if (!refreshError) {
        ;({ data, error } = await callRpc())
      }
    }

    const result = data as { ok?: boolean; error?: string } | null
    if (error || !result?.ok) {
      const rawMessage = error?.message || result?.error || 'Não foi possível restaurar a loja.'
      if (isJwtError(rawMessage)) {
        toast.error('Sessão expirada. Faça login novamente.')
        return { error: 'Sessão expirada. Faça login novamente.' }
      }
      return { error: rawMessage }
    }
    await fetchStores()
    return { error: null }
  }

  useEffect(() => {
    fetchStores()
  }, [fetchStores])
  return { lojas, loading, error, createStore, updateStore, deleteStore, toggleStoreStatus, refetch: fetchStores }
}

export function useStoresStats() {
  const { role, vinculos_loja, storeId: authStoreId } = useAuth()
  const [stats, setStats] = useState<
    Record<string, { sellers: number; teamMembers: number; checkedIn: number; disciplinePct: number }>
  >({})
  const [loading, setLoading] = useState(true)
  const referenceDate = calculateReferenceDate()

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      let authorizedStoreIds: string[] | null = null
      if (role === 'dono') {
        authorizedStoreIds = vinculos_loja.map((m) => m.store_id)
        if (authorizedStoreIds.length === 0) {
          setStats({})
          return
        }
      } else if ((role === 'gerente' || role === 'vendedor') && authStoreId) {
        authorizedStoreIds = [authStoreId]
      }

      let sellersQuery = supabase
        .from('vendedores_loja')
        .select('store_id, seller_user_id, users:usuarios(id, active, role)')
        .eq('is_active', true)
      let membersQuery = supabase
        .from('vinculos_loja')
        .select('store_id, user_id, role, users:usuarios(id, active, role)')
        .eq('is_active', true)
      if (authorizedStoreIds) {
        sellersQuery = sellersQuery.in('store_id', authorizedStoreIds)
        membersQuery = membersQuery.in('store_id', authorizedStoreIds)
      }

      const canUseRpcRede = isLancamentosViaRpcEnabled() && !authorizedStoreIds
      const canUseRpcSingleStore =
        isLancamentosViaRpcEnabled() && authorizedStoreIds && authorizedStoreIds.length === 1
      const checkinsPromise = canUseRpcRede
        ? supabase.rpc('get_lancamentos_referencia_dia', {
            p_reference_date: referenceDate,
            p_scope: 'daily',
          })
        : canUseRpcSingleStore
          ? supabase.rpc('get_lancamentos_por_loja_periodo', {
              p_store_id: authorizedStoreIds![0],
              p_start_date: referenceDate,
              p_end_date: referenceDate,
              p_scope: 'daily',
            })
          : (() => {
              let q = supabase
                .from('lancamentos_diarios')
                .select('store_id,seller_user_id')
                .eq('reference_date', referenceDate)
                .eq('metric_scope', 'daily')
              if (authorizedStoreIds) q = q.in('store_id', authorizedStoreIds)
              return q
            })()

      const [sellersRes, membersRes, checkinsRes] = await Promise.all([
        sellersQuery,
        membersQuery,
        checkinsPromise,
      ])

      if (sellersRes.error) throw sellersRes.error
      if (membersRes.error) throw membersRes.error
      if (checkinsRes.error) throw checkinsRes.error

      const newStats: Record<
        string,
        { sellers: number; teamMembers: number; checkedIn: number; disciplinePct: number }
      > = {}
      const memberStatsRows = (membersRes.data || []) as unknown as Array<{
        store_id: string
        user_id: string
        role?: string | null
        users?: { active?: boolean | null; role?: string | null } | null
      }>
      const teamMemberKeys = new Set<string>()
      const activeSellerMembershipKeys = new Set<string>()

      if (memberStatsRows.length) {
        memberStatsRows.forEach((m) => {
          const memberRole = m.role || m.users?.role
          if (m.users?.active === false) return
          if (!isStoreTeamRole(memberRole)) return
          if (!newStats[m.store_id])
            newStats[m.store_id] = { sellers: 0, teamMembers: 0, checkedIn: 0, disciplinePct: 0 }
          const key = `${m.store_id}:${m.user_id}`
          if (teamMemberKeys.has(key)) return
          teamMemberKeys.add(key)
          newStats[m.store_id].teamMembers++
          if (memberRole === 'vendedor') activeSellerMembershipKeys.add(key)
        })
      }

      const validSellerKeys = new Set<string>()
      const sellerStatsRows = (sellersRes.data || []) as unknown as Array<{
        store_id: string
        seller_user_id: string
        users?: { active?: boolean | null; role?: string | null } | null
      }>
      if (sellerStatsRows.length) {
        sellerStatsRows.forEach((s) => {
          const key = `${s.store_id}:${s.seller_user_id}`
          if (!activeSellerMembershipKeys.has(key)) return
          if (s.users?.active === false || s.users?.role !== 'vendedor') return
          if (!newStats[s.store_id])
            newStats[s.store_id] = { sellers: 0, teamMembers: 0, checkedIn: 0, disciplinePct: 0 }
          newStats[s.store_id].sellers++
          validSellerKeys.add(key)
        })
      }

      if (checkinsRes.data) {
        const checkinStoreSellerKeys = new Set<string>()
        checkinsRes.data.forEach((c: { store_id: string; seller_user_id?: string }) => {
          const key = `${c.store_id}:${c.seller_user_id || 'unknown'}`
          if (!validSellerKeys.has(key)) return
          if (checkinStoreSellerKeys.has(key)) return
          checkinStoreSellerKeys.add(key)
          if (!newStats[c.store_id])
            newStats[c.store_id] = { sellers: 0, teamMembers: 0, checkedIn: 0, disciplinePct: 0 }
          newStats[c.store_id].checkedIn++
        })
      }

      Object.keys(newStats).forEach((sid) => {
        const s = newStats[sid]
        s.disciplinePct = s.sellers > 0 ? Math.min(100, Math.round((s.checkedIn / s.sellers) * 100)) : 0
      })

      setStats(newStats)
    } catch (err) {
      console.error('Audit Error [useStoresStats]: fetchStats fail ->', err)
      toast.error('Não foi possível carregar as métricas das lojas.')
      setStats({})
    } finally {
      setLoading(false)
    }
  }, [referenceDate, role, vinculos_loja, authStoreId])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, loading, refetch: fetchStats }
}

export function useSellersByStore(storeId: string | null) {
  const [sellers, setSellers] = useState<(User & { checkin_today: boolean })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestSequence = useRef(0)
  const referenceDate = calculateReferenceDate()

  const fetch = useCallback(async () => {
    const requestId = ++requestSequence.current
    const isCurrentRequest = () => requestSequence.current === requestId

    if (!storeId) {
      setSellers([])
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const [sellersRes, membershipsRes] = await Promise.all([
      supabase
        .from('vendedores_loja')
        .select('*, users:usuarios(*)')
        .eq('store_id', storeId)
        .eq('is_active', true),
      supabase
        .from('vinculos_loja')
        .select('user_id, users:usuarios(id, active, role)')
        .eq('store_id', storeId)
        .eq('role', 'vendedor')
        .eq('is_active', true),
    ])

    const sellersData = sellersRes.data
    const sellersError = sellersRes.error
    const membershipsData = membershipsRes.data
    const membershipsError = membershipsRes.error

    if (!isCurrentRequest()) return

    if (sellersError) {
      console.error('Audit Error [useSellersByStore]: sellers fail ->', sellersError.message)
      setSellers([])
      setError(getSafeUserFacingDataError(sellersError, 'Não foi possível carregar os vendedores.'))
      setLoading(false)
      return
    }
    if (membershipsError) {
      console.error('Audit Error [useSellersByStore]: memberships fail ->', membershipsError.message)
      setSellers([])
      setError(getSafeUserFacingDataError(membershipsError, 'Não foi possível carregar os vendedores.'))
      setLoading(false)
      return
    }

    let checkins: { seller_user_id: string; submission_status?: string | null }[] | null = null
    let checkinsError: { message: string } | null = null
    if (isLancamentosViaRpcEnabled()) {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_lancamentos_por_loja_periodo', {
        p_store_id: storeId,
        p_start_date: referenceDate,
        p_end_date: referenceDate,
        p_scope: 'daily',
      })
      checkins = (rpcData as { seller_user_id: string; submission_status?: string | null }[] | null) || []
      checkinsError = rpcErr
    } else {
      const res = await supabase
        .from('lancamentos_diarios')
        .select('seller_user_id, submission_status')
        .eq('store_id', storeId)
        .eq('reference_date', referenceDate)
        .eq('metric_scope', 'daily')
        .neq('submission_status', 'draft')
      checkins = res.data
      checkinsError = res.error
    }

    if (!isCurrentRequest()) return

    if (checkinsError)
      console.error('Audit Error [useSellersByStore]: checkins fail ->', checkinsError.message)

    const checkedIn = new Set((checkins || []).filter(c => c.submission_status !== 'draft').map((c) => c.seller_user_id))
    const activeSellerMemberships = new Set(
      ((membershipsData || []) as unknown as Array<{
        user_id: string
        users?: { active?: boolean | null; role?: string | null } | null
      }>)
        .filter((m) => m.users?.active !== false && m.users?.role === 'vendedor')
        .map((m) => m.user_id),
    )

    if (sellersData) {
      setSellers(
        sellersData
          .filter((s: { seller_user_id: string; users?: User | null }) =>
            Boolean(s.users && activeSellerMemberships.has(s.seller_user_id)),
          )
          .map((s: { seller_user_id: string; users?: User | null }) => ({
            ...(s.users as User),
            checkin_today: checkedIn.has(s.seller_user_id),
          })),
      )
    }
    setLoading(false)
  }, [storeId, referenceDate])

  useEffect(() => {
    void fetch()
    return () => {
      requestSequence.current += 1
    }
  }, [fetch])
  return { sellers, loading, error, refetch: fetch }
}

export function useAllSellers() {
  const [sellers, setSellers] = useState<(User & { store_id: string; store_name: string })[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const [tenuresRes, lojasRes] = await Promise.all([
        supabase
          .from('vendedores_loja')
          .select('seller_user_id, store_id, users:usuarios(id, name, email, role)')
          .eq('is_active', true),
        supabase.from('lojas').select('id, name').eq('active', true),
      ])
      if (tenuresRes.error) throw tenuresRes.error
      if (lojasRes.error) throw lojasRes.error

      const storeMap = new Map((lojasRes.data || []).map((s) => [s.id, s.name]))
      const storeIds = (lojasRes.data || []).map((s) => s.id)
      const { data: membershipsData, error: membershipsError } = storeIds.length
        ? await supabase
            .from('vinculos_loja')
            .select('store_id, user_id, users:usuarios(id, active, role)')
            .in('store_id', storeIds)
            .eq('role', 'vendedor')
            .eq('is_active', true)
        : { data: [], error: null }
      if (membershipsError) throw membershipsError

      const activeSellerMemberships = new Set(
        ((membershipsData || []) as unknown as Array<{
          store_id: string
          user_id: string
          users?: { active?: boolean | null; role?: string | null } | null
        }>)
          .filter((m) => m.users?.active !== false && m.users?.role === 'vendedor')
          .map((m) => `${m.store_id}:${m.user_id}`),
      )
      const typedTenures = (tenuresRes.data || []) as unknown as Array<{
        store_id: string
        users?: User | null
      }>
      setSellers(
        typedTenures
          .filter(
            (t) => t.users?.role === 'vendedor' && activeSellerMemberships.has(`${t.store_id}:${t.users.id}`),
          )
          .map((t) => ({
            ...(t.users as User),
            store_id: t.store_id,
            store_name: storeMap.get(t.store_id) || '',
          })),
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('Audit Error [useAllSellers]: fetch fail ->', message)
      setSellers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])
  return { sellers, loading, refetch: fetch }
}
