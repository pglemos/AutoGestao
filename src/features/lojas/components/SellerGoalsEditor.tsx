import { useCallback, useMemo, useState } from 'react'
import { format, parseISO, endOfMonth } from 'date-fns'
import { AlertTriangle, ArrowDown, Minus, RefreshCw, Save, Sparkles, Target, Trash2, TrendingUp, Users, ShoppingCart } from 'lucide-react'
import { toast } from '@/lib/toast'
import { useAuth, isPerfilInternoMx } from '@/hooks/useAuth'
import { useSellersByStore } from '@/hooks/useStores'
import { useStoreMetaRules } from '@/hooks/useGoals'
import { useOfficialSellerPerformance } from '@/hooks/useOfficialSellerPerformance'
import { useSellerGoals } from '@/hooks/useSellerGoals'
import {
  attainmentOf,
  buildSellerGoalRecommendation,
  classifySellerGoal,
  countSellerGoalStatuses,
  sumSellerGoals,
  type SellerGoalRow,
} from './seller-goal-insights'

const STATUS_CARDS = [
  { key: 'acima', label: 'Acima da meta', icon: TrendingUp, surface: 'border-emerald-100 bg-emerald-50', text: 'text-emerald-600', value: 'text-emerald-700' },
  { key: 'no_ritmo', label: 'No ritmo', icon: Minus, surface: 'border-sky-100 bg-sky-50', text: 'text-sky-600', value: 'text-sky-700' },
  { key: 'risco', label: 'Risco', icon: AlertTriangle, surface: 'border-amber-100 bg-amber-50', text: 'text-amber-600', value: 'text-amber-700' },
  { key: 'critico', label: 'Crítico', icon: ArrowDown, surface: 'border-red-100 bg-red-50', text: 'text-red-600', value: 'text-red-700' },
] as const

const RECOMMENDATION_TONE = {
  atencao: 'border-amber-200 bg-amber-50 text-amber-700',
  risco: 'border-red-200 bg-red-50 text-red-700',
  positivo: 'border-emerald-200 bg-emerald-50 text-emerald-700',
} as const

const PROGRESS_TONE = {
  acima: 'bg-emerald-500',
  no_ritmo: 'bg-sky-500',
  risco: 'bg-amber-500',
  critico: 'bg-red-500',
  sem_meta: 'bg-gray-300',
} as const

const ATTAINMENT_TONE = {
  acima: 'text-emerald-600',
  no_ritmo: 'text-sky-600',
  risco: 'text-amber-600',
  critico: 'text-red-600',
  sem_meta: 'text-muted-foreground',
} as const

interface SellerGoalsEditorProps {
  storeId: string | null
  storeName?: string
  /** Dentro do modal da Meta da Loja o título já vem do diálogo — evita repetir. */
  embedded?: boolean
}

export function SellerGoalsEditor({ storeId, storeName, embedded = false }: SellerGoalsEditorProps) {
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

  /** "Aplicar a todos" do Base44: preenche o campo de todos sem salvar sozinho. */
  const handleApplyToAll = useCallback((value: string) => {
    const parsed = Number(value.replace(/\D/g, ''))
    if (!Number.isFinite(parsed) || parsed < 0) return
    const next: Record<string, string> = {}
    for (const seller of sellers) next[seller.id] = String(parsed)
    setEdits(next)
    setHasChanges(true)
  }, [sellers])

  /**
   * As linhas dos insights usam a meta que está no campo (edição em andamento),
   * não a salva — é o que o gerente enxerga enquanto simula o rateio.
   */
  const insightRows: SellerGoalRow[] = useMemo(() => sellers.map(seller => {
    const currentGoal = goals[seller.id] ?? evenShare
    const editValue = edits[seller.id]
    const parsed = editValue === undefined ? currentGoal : Number(editValue.replace(/\D/g, ''))
    return {
      id: seller.id,
      name: seller.name || 'Vendedor',
      realized: sellerPerformances[seller.id]?.realized ?? 0,
      goal: Number.isFinite(parsed) ? parsed : 0,
    }
  }), [sellers, goals, evenShare, edits, sellerPerformances])

  const statusCounts = useMemo(() => countSellerGoalStatuses(insightRows), [insightRows])
  const recommendation = useMemo(() => buildSellerGoalRecommendation(insightRows), [insightRows])
  const totals = useMemo(() => sumSellerGoals(insightRows), [insightRows])

  const isLoading = sellersLoading || rulesLoading || goalsLoading || perfLoading

  if (!storeId) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
        <Target size={48} className="mb-4 text-text-disabled" />
        <p className="text-sm font-medium text-muted-foreground">Selecione uma loja</p>
        <p className="mt-1 text-xs text-muted-foreground">A edição de metas individuais precisa de uma loja ativa.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center">
        <RefreshCw className="mb-4 h-6 w-6 animate-spin text-emerald-600" />
        <p className="text-sm text-muted-foreground animate-pulse">Carregando...</p>
      </div>
    )
  }

  return (
    <section className={embedded ? '' : 'pb-24 md:pb-32'} aria-label="Metas individuais dos vendedores">
      <div className="space-y-5">
        {/* Cabeçalho */}
        <div className={embedded ? '' : 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {embedded ? (
              <p className="text-sm text-muted-foreground">
                {storeName || 'Unidade MX'} · Meta da loja: <strong>{storeGoal} vendas</strong>
                {sellerCount > 0 && ` · ${sellerCount} vendedor${sellerCount !== 1 ? 'es' : ''} ativos`}
              </p>
            ) : (
              <div>
                <h1 className="text-lg font-bold text-foreground">Metas Individuais</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {storeName || 'Unidade MX'} · Meta da loja: <strong>{storeGoal} vendas</strong>
                  {sellerCount > 0 && ` · ${sellerCount} vendedor${sellerCount !== 1 ? 'es' : ''} ativos`}
                </p>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-muted-foreground">
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
                      className="inline-flex h-[36px] items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                      Salvar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleResetToEven}
                    disabled={saving}
                    className="inline-flex h-[36px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-muted-foreground hover:bg-slate-50 disabled:opacity-60"
                  >
                    <Trash2 size={15} />
                    Ratear igual
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => { fetchGoals(); refetchPerformance(); resetEdits() }}
                className="inline-flex h-[36px] w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-slate-50"
                aria-label="Atualizar"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>
        </div>

        {sellers.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Situação das metas individuais">
              {STATUS_CARDS.map(card => {
                const Icon = card.icon
                return (
                  <div key={card.key} className={`rounded-xl border px-3 py-3 ${card.surface}`}>
                    <div className="flex items-center gap-1.5">
                      <Icon size={14} className={card.text} />
                      <span className={`text-xs font-medium ${card.text}`}>{card.label}</span>
                    </div>
                    <p className={`mt-1 text-2xl font-bold ${card.value}`}>{statusCounts[card.key]}</p>
                  </div>
                )
              })}
            </div>

            {recommendation && (
              <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 ${RECOMMENDATION_TONE[recommendation.tone]}`}>
                <Sparkles size={16} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">{recommendation.title}</p>
                  <p className="mt-0.5 text-xs opacity-90">{recommendation.text}</p>
                </div>
              </div>
            )}

            {canEdit && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5">
                <label htmlFor="seller-goals-apply-all" className="text-xs font-medium text-emerald-700">Aplicar a todos:</label>
                <input
                  id="seller-goals-apply-all"
                  type="number"
                  min={0}
                  placeholder="Ex: 8"
                  onKeyDown={event => {
                    if (event.key !== 'Enter') return
                    event.preventDefault()
                    handleApplyToAll((event.target as HTMLInputElement).value)
                  }}
                  className="w-24 rounded-lg border border-emerald-200 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-xs text-emerald-600">vendas/mês e pressione Enter</span>
              </div>
            )}
          </>
        )}

        {/* Tabela de metas */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vendedor</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Realizado</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Meta Atual</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">% Ating.</th>
                  {canEdit && (
                    <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nova Meta</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sellers.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 5 : 4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Nenhum vendedor ativo nesta loja.
                    </td>
                  </tr>
                ) : (
                  sellers.map((seller, index) => {
                    const perf = sellerPerformances[seller.id]
                    const realized = perf?.realized ?? 0
                    const currentGoal = goals[seller.id] ?? evenShare
                    const insightRow = insightRows[index]
                    const attainment = attainmentOf(insightRow)
                    const status = classifySellerGoal(insightRow)
                    const editValue = edits[seller.id] !== undefined ? edits[seller.id] : String(currentGoal)

                    return (
                      <tr key={seller.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                          {seller.name || 'Vendedor'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-emerald-600">
                          {realized}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-foreground">
                          {currentGoal}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          {attainment === null ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-xs font-semibold ${ATTAINMENT_TONE[status]}`}>{attainment}%</span>
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                                <div className={`h-full rounded-full ${PROGRESS_TONE[status]}`} style={{ width: `${Math.min(100, attainment)}%` }} />
                              </div>
                            </div>
                          )}
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
              {sellers.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-100 bg-slate-50 font-semibold text-foreground">
                    <td className="px-4 py-3">Total da equipe</td>
                    <td className="px-4 py-3 text-right">{totals.realized}</td>
                    <td className="px-4 py-3 text-right">{totals.goal}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={
                        totals.attainment === null ? 'text-muted-foreground'
                          : totals.attainment >= 100 ? 'text-emerald-600'
                            : totals.attainment >= 80 ? 'text-amber-600'
                              : 'text-red-600'
                      }>
                        {totals.attainment === null ? '—' : `${totals.attainment}%`}
                      </span>
                    </td>
                    {canEdit && <td />}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Info: modo da meta */}
        {metaRules?.individual_goal_mode && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-muted-foreground">
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
