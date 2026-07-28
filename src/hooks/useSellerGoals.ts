import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type SellerGoalRow = {
  id: string
  store_id: string
  user_id: string
  month: number
  year: number
  target: number
}

type MetasResponse = {
  id: string
  store_id: string
  user_id: string
  month: number
  year: number
  target: number
}

export function useSellerGoals(storeId: string | null, month: number, year: number) {
  const [goals, setGoals] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchGoals = useCallback(async () => {
    if (!storeId) {
      setGoals({})
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('metas')
        .select('id, store_id, user_id, month, year, target')
        .eq('store_id', storeId)
        .eq('month', month)
        .eq('year', year)

      if (error) throw error

      const byUser: Record<string, number> = {}
      for (const row of (data || []) as MetasResponse[]) {
        byUser[row.user_id] = Number(row.target)
      }
      setGoals(byUser)
    } catch {
      setGoals({})
    } finally {
      setLoading(false)
    }
  }, [storeId, month, year])

  const saveGoal = useCallback(async (userId: string, target: number): Promise<string | null> => {
    if (!storeId) return 'Loja não selecionada.'
    setSaving(true)
    try {
      const existing = await supabase
        .from('metas')
        .select('id')
        .eq('store_id', storeId)
        .eq('user_id', userId)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle()

      if (existing.error && existing.error.code !== 'PGRST116') {
        throw existing.error
      }

      if (existing.data) {
        const { error } = await supabase
          .from('metas')
          .update({ target })
          .eq('id', (existing.data as { id: string }).id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('metas')
          .insert({ store_id: storeId, user_id: userId, month, year, target })
        if (error) throw error
      }

      setGoals(prev => ({ ...prev, [userId]: target }))
      return null
    } catch (err) {
      return err instanceof Error ? err.message : 'Erro ao salvar meta.'
    } finally {
      setSaving(false)
    }
  }, [storeId, month, year])

  const saveAll = useCallback(async (updates: Record<string, number>): Promise<string | null> => {
    if (!storeId) return 'Loja não selecionada.'
    setSaving(true)
    try {
      const existing = await supabase
        .from('metas')
        .select('id, user_id')
        .eq('store_id', storeId)
        .eq('month', month)
        .eq('year', year)

      if (existing.error && existing.error.code !== 'PGRST116') {
        throw existing.error
      }

      const existingMap = new Map<string, string>()
      for (const row of (existing.data || []) as { id: string; user_id: string }[]) {
        existingMap.set(row.user_id, row.id)
      }

      const operations = Object.entries(updates).map(([userId, target]) => {
        const existingId = existingMap.get(userId)
        if (existingId) {
          return supabase.from('metas').update({ target }).eq('id', existingId)
        }
        return supabase.from('metas').insert({ store_id: storeId, user_id: userId, month, year, target })
      })

      const results = await Promise.all(operations)
      const firstError = results.find(r => r.error)
      if (firstError?.error) throw firstError.error

      setGoals(prev => ({ ...prev, ...updates }))
      return null
    } catch (err) {
      return err instanceof Error ? err.message : 'Erro ao salvar metas.'
    } finally {
      setSaving(false)
    }
  }, [storeId, month, year])

  const deleteGoal = useCallback(async (userId: string): Promise<string | null> => {
    if (!storeId) return 'Loja não selecionada.'
    setSaving(true)
    try {
      const { error } = await supabase
        .from('metas')
        .delete()
        .eq('store_id', storeId)
        .eq('user_id', userId)
        .eq('month', month)
        .eq('year', year)
      if (error) throw error

      setGoals(prev => {
        const next = { ...prev }
        delete next[userId]
        return next
      })
      return null
    } catch (err) {
      return err instanceof Error ? err.message : 'Erro ao remover meta.'
    } finally {
      setSaving(false)
    }
  }, [storeId, month, year])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  return { goals, loading, saving, fetchGoals, saveGoal, saveAll, deleteGoal }
}
