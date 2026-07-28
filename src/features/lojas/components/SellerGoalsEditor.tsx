import { useCallback, useMemo, useState } from 'react'
import { format, parseISO, endOfMonth } from 'date-fns'
import { RefreshCw, Save, Target, Trash2, TrendingUp, Users, ShoppingCart } from 'lucide-react'
import { toast } from '@/lib/toast'
import { useAuth, isPerfilInternoMx } from '@/hooks/useAuth'
import { useSellersByStore } from '@/hooks/useStores'
import { useStoreMetaRules } from '@/hooks/useGoals'
import { useOfficialSellerPerformance } from '@/hooks/useOfficialSellerPerformance'
import { useSellerGoals } from '@/hooks/useSellerGoals'

interface SellerGoalsEditorProps {
  storeId: string | null
  storeName?: string
}

export function SellerGoalsEditor({ storeId, storeName }: SellerGoalsEditorProps) {
  const { role, profile } = useAuth()
  const now = new Date()
  const [monthStr, setMonthStr] = useState(format(now, 'yyyy-MM'))

  const month = Number(monthStr.slice(5, 7))
  const year = Number(monthStr.slice(0, 4))

  const periodStart = `${monthStr}-01`
  const periodEnd = format(endOfMonth(parseISO(periodStart)), 'yyyy-MM-dd')

  const { sellers, loading: sellersLoading } = useSellersByStore(storeId)
  const { metaRules, loading: rulesLoading } = useStoreMetaRules(storeId || undefined)
  const { goals, loading: goalsLoading, saving, saveAll, fetchGoals } = useSellerGoals(storeId, month, year)
  const { rows: performanceRows, loading: perfLoading, refetch: refetchPerformance } = useOfficialSellerPerformance(periodStart, periodEnd, null, storeId)

  const canEdit = isPerfilInternoMx(role) || role === 'dono' || role === 'gerente'
  const storeGoal = metaRules?.monthly_goal || 0
  const sellerCount = sellers.length
  const evenShare = sellerCount > 0 ? Math.floor(storeGoal / sellerCount) : 0

  const [edits, setEdits] = useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = useState(false)

  const sellerPerformances = useMemo(() => {
    const map: Record<string, { realized: number; meta: number }> = {}
    for (const row of performanceRows || []) {
      map[row.seller_user_id] = {
        realized: row.vendas_realizadas,
        meta: row.meta,
      }
    }
    return map
  }, [performanceRows])

  const resetEdits = useCallback(() => {
    const reset: Record<string, string> = {}
    for (const seller of sellers) {
      const current = goals[seller.id] ?? evenShare
      reset[seller.id] = String(current)
    }
    setEdits(reset)
    setHasChanges(false)
  }, [sellers, goals, evenShare])

  const handleConfirmSave = useCallback(async () => {
    if (!storeId) return
    const updates: Record<string, number> = {}
    for (const [userId, value] of Object.entries(edits)) {
      const parsed = Number(value.replace(/\D/g, ''))
      if (Number.isFinite(parsed) && parsed >= 0) {
        updates[userId] = parsed
      }
    }
    if (Object.keys(updates).length === 0) return

    const error = await saveAll(updates)
    if (error) {
      toast.error(error)
      return
    }
    await refetchPerformance()
    setHasChanges(false)
    toast.success('Metas individuais salvas.')
  }, [storeId, edits, saveAll, refetchPerformance])

  const handleResetToEven = useCallback(async () => {
    if (!storeId) return
    const updates: Record<string, number> = {}
    for (const seller of sellers) {
      updates[seller.id] = evenShare
    }
    const error = await saveAll(updates)
    if (error) {
      toast.error(error)
      return
    }
    await refetchPerformance()
    await fetchGoals()
    resetEdits()
    toast.success('Metas resetadas para rateio igual.')
  }, [storeId, sellers, evenShare, saveAll, refetchPerformance])

  const handleValueChange = useCallback((userId: string, value: string) => {
    setEdits(prev => ({ ...prev, [userId]: value }))
    setHasChanges(true)
  }, [])

  const isLoading = sellersLoading || rulesLoading || goalsLoading || perfLoading

  if (!storeId) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
        <Target size={48} className="mb-4 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">Selecione uma loja</p>
        <p className="mt-1 text-xs text-slate-400">A edição de metas individuais precisa de uma loja ativa.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center">
        <RefreshCw className="mb-4 h-6 w-6 animate-spin text-emerald-600" />
        <p className="text-sm text-slate-500 animate-pulse">Carregando...</p>
      </div>
    )
  }

  return (
    <section className="pb-24 md:pb-32" aria-label="Metas individuais dos vendedores">
      <div className="space-y-5">
        {/* Cabeçalho */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-800">Metas Individuais</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                {storeName || 'Unidade MX'} · Meta da loja: <strong>{storeGoal} vendas</strong>
                {sellerCount > 0 && ` · ${sellerCount} vendedor${sellerCount !== 1 ? 'es' : ''} ativos`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-slate-500">
                Mês
                <input
                  type="month"
                  value={monthStr}
                  onChange={(e) => { setMonthStr(e.target.value); setHasChanges(false) }}
                  className="ml-2 block rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </label>
              {canEdit && (
                <>
                  {hasChanges && (
                    <button
                      type="button"
                      onClick={handleConfirmSave}
                      disabled={saving}
                      className="inline-flex h-[38px] items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                      Salvar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleResetToEven}
                    disabled={saving}
                    className="inline-flex h-[38px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  >
                    <Trash2 size={15} />
                    Ratear igual
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => { fetchGoals(); refetchPerformance(); resetEdits() }}
                className="inline-flex h-[38px] w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50"
                aria-label="Atualizar"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabela de metas */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Vendedor</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Realizado</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Meta Atual</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">% Ating.</th>
                  {canEdit && (
                    <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Nova Meta</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sellers.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 5 : 4} className="px-4 py-8 text-center text-sm text-slate-400">
                      Nenhum vendedor ativo nesta loja.
                    </td>
                  </tr>
                ) : (
                  sellers.map((seller) => {
                    const perf = sellerPerformances[seller.id]
                    const realized = perf?.realized ?? 0
                    const currentGoal = goals[seller.id] ?? evenShare
                    const attainment = currentGoal > 0 ? Math.round((realized / currentGoal) * 100) : 0
                    const editValue = edits[seller.id] !== undefined ? edits[seller.id] : String(currentGoal)

                    return (
                      <tr key={seller.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">
                          {seller.name || 'Vendedor'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-emerald-600">
                          {realized}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-slate-700">
                          {currentGoal}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <span className={`inline-block rounded-lg px-2 py-1 text-xs font-medium ${
                            attainment >= 100 ? 'bg-emerald-100 text-emerald-700'
                            : attainment >= 50 ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                          }`}>
                            {attainment}%
                          </span>
                        </td>
                        {canEdit && (
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={editValue}
                              onChange={(e) => handleValueChange(seller.id, e.target.value)}
                              className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-right font-mono text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                              aria-label={`Nova meta para ${seller.name}`}
                            />
                          </td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info: modo da meta */}
        {metaRules?.individual_goal_mode && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-500">
            Modo de meta individual: <strong>{metaRules.individual_goal_mode === 'custom' ? 'Customizada' : metaRules.individual_goal_mode === 'even' ? 'Rateio igual' : 'Proporcional'}</strong>
            {metaRules.individual_goal_mode !== 'custom' && (
              <span className="ml-1"> — as metas salvas aqui só surtirão efeito quando o modo for alterado para "Customizada".</span>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export default SellerGoalsEditor
