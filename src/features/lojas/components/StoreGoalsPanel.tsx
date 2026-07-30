import { useEffect, useState } from 'react'
import { Calendar, RefreshCw, Save, Target, Trash2, TrendingUp, Users, Zap } from 'lucide-react'
import { toast } from '@/lib/toast'

import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { isAdministradorMx, useAuth } from '@/hooks/useAuth'
import { useStoreGoal, useStoreMetaRules } from '@/hooks/useGoals'
import { cn } from '@/lib/utils'
import { requestToastConfirmation } from '@/lib/ui/confirmAction'

type StoreBenchmarks = {
  lead_to_agend: number
  agend_to_visit: number
  visit_to_sale: number
}

interface StoreGoalsPanelProps {
  storeId: string | null
  storeName?: string
}

const DEFAULT_BENCHMARKS: StoreBenchmarks = {
  lead_to_agend: 20,
  agend_to_visit: 60,
  visit_to_sale: 33,
}

export function StoreGoalsPanel({ storeId, storeName }: StoreGoalsPanelProps) {
  const { role } = useAuth()
  const { refetch: refetchGoal } = useStoreGoal(storeId)
  const { metaRules, loading, updateMetaRules, deleteMetaRules } = useStoreMetaRules(storeId || undefined)

  const [storeMeta, setStoreMeta] = useState(0)
  const [storeBench, setStoreBench] = useState<StoreBenchmarks>(DEFAULT_BENCHMARKS)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const canManageGoals = isAdministradorMx(role)
  const hasPersistedRules = Boolean(metaRules)

  useEffect(() => {
    setStoreMeta(metaRules?.monthly_goal || 0)
    setStoreBench({
      lead_to_agend: metaRules?.bench_lead_agd || DEFAULT_BENCHMARKS.lead_to_agend,
      agend_to_visit: metaRules?.bench_agd_visita || DEFAULT_BENCHMARKS.agend_to_visit,
      visit_to_sale: metaRules?.bench_visita_vnd || DEFAULT_BENCHMARKS.visit_to_sale,
    })
    setHasChanges(false)
  }, [metaRules, storeId])

  const handleSave = async () => {
    if (!storeId || !canManageGoals) return
    setSaving(true)
    try {
      const { error } = await updateMetaRules({
        monthly_goal: storeMeta,
        bench_lead_agd: storeBench.lead_to_agend,
        bench_agd_visita: storeBench.agend_to_visit,
        bench_visita_vnd: storeBench.visit_to_sale,
      })
      if (error) {
        toast.error(error)
        return
      }
      await refetchGoal()
      toast.success('Metas da loja salvas.')
      setHasChanges(false)
    } finally {
      setSaving(false)
    }
  }

  const executeDelete = async () => {
    if (!storeId || !canManageGoals) return

    setDeleting(true)
    try {
      const { error } = await deleteMetaRules()
      if (error) {
        toast.error(error)
        return
      }
      await refetchGoal()
      toast.success('Configuração de metas excluída.')
      setStoreMeta(0)
      setStoreBench(DEFAULT_BENCHMARKS)
      setHasChanges(false)
    } finally {
      setDeleting(false)
    }
  }

  const handleDelete = () => {
    if (!storeId || !canManageGoals) return
    requestToastConfirmation({
      key: `delete-store-goals:${storeId}`,
      title: `Excluir metas de ${storeName || 'loja'}?`,
      description: 'A loja voltará aos padrões até uma nova configuração ser salva.',
      label: 'Excluir',
      onConfirm: executeDelete,
    })
  }

  const updateBenchmark = (field: keyof StoreBenchmarks, value: string) => {
    if (!canManageGoals) return
    setStoreBench(prev => ({ ...prev, [field]: Number(value.replace(/\D/g, '')) || 0 }))
    setHasChanges(true)
  }

  if (!storeId) {
    return (
      <div className="min-h-mx-section-lg bg-white border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center p-mx-14">
        <Target size={48} className="text-gray-500 mb-6" />
        <Typography variant="h2" className="mb-3">Selecione uma loja</Typography>
        <Typography variant="p" tone="muted" className="max-w-sm tracking-tight">A aba de metas precisa de uma unidade ativa para carregar as regras oficiais.</Typography>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-mx-section-lg bg-white rounded-2xl flex flex-col items-center justify-center">
        <RefreshCw className="w-mx-xl h-mx-xl animate-spin text-emerald-600 mb-6" />
        <Typography variant="caption" tone="muted" className="animate-pulse">Carregando metas da loja...</Typography>
      </div>
    )
  }

  return (
    <section className="pb-24 md:pb-32" aria-label="Metas da loja">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <header className="mb-5 flex flex-col gap-mx-sm border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Typography variant="tiny" tone="muted" className="font-bold tracking-wider">Status da meta</Typography>
            <Typography variant="p" tone="muted" className="mt-1 text-sm">Meta mensal e benchmarks oficiais de {storeName || 'Unidade MX'}.</Typography>
          </div>
        {canManageGoals ? (
          <div className="grid w-full grid-cols-2 gap-mx-xs sm:flex sm:w-auto sm:items-center sm:gap-mx-sm">
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleting || saving || !hasPersistedRules}
              className="h-mx-10 w-full text-mx-tiny sm:h-mx-11 sm:w-auto"
            >
              {deleting ? <RefreshCw className="animate-spin mr-2" /> : <Trash2 size={16} className="mr-2" />}
              Excluir
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || deleting || !hasChanges}
              className="h-mx-10 w-full text-mx-tiny sm:h-mx-11 sm:w-auto"
            >
              {saving ? <RefreshCw className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
              Salvar
            </Button>
          </div>
        ) : (
          <Typography variant="caption" tone="muted" className="font-bold tracking-wider">Somente leitura</Typography>
        )}
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <div className="flex min-w-0 items-center gap-4 rounded-xl bg-slate-50 p-4 sm:p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-teal-400">
              <Target size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <Typography variant="tiny" tone="muted" className="font-bold tracking-wider">Meta mensal de vendas</Typography>
                <input
                  type="text"
                  inputMode="numeric"
                  value={storeMeta}
                  onChange={(event) => {
                    if (!canManageGoals) return
                    setStoreMeta(Number(event.target.value.replace(/\D/g, '')) || 0)
                    setHasChanges(true)
                  }}
                  disabled={!canManageGoals}
                  aria-label="Meta mensal de vendas"
                  className="mt-1 w-full bg-transparent text-left font-mono-numbers text-3xl font-bold leading-none text-slate-900 focus:outline-none disabled:opacity-100 sm:text-4xl"
                />
              <Typography variant="caption" tone="muted">unidades comerciais</Typography>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: 'Lead -> Agd', field: 'lead_to_agend' as const, icon: Users, tone: 'brand' },
              { label: 'Agd -> Visita', field: 'agend_to_visit' as const, icon: Calendar, tone: 'warning' },
              { label: 'Visita -> Vnd', field: 'visit_to_sale' as const, icon: TrendingUp, tone: 'success' },
            ].map((benchmark) => (
              <div key={benchmark.field} className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    benchmark.tone === 'brand' ? 'bg-mx-indigo-50 border-mx-indigo-100 text-emerald-600' :
                      benchmark.tone === 'success' ? 'bg-status-success-surface border-mx-emerald-100 text-status-success' :
                        'bg-status-warning-surface border-mx-amber-100 text-status-warning'
                  )}>
                    <benchmark.icon size={18} strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Typography variant="tiny" tone="muted" className="block font-bold tracking-wide">{benchmark.label}</Typography>
                    <div className="flex items-baseline gap-mx-xs">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={storeBench[benchmark.field]}
                        onChange={(event) => updateBenchmark(benchmark.field, event.target.value)}
                        disabled={!canManageGoals}
                        aria-label={`Benchmark ${benchmark.label}`}
                        className="w-mx-20 bg-transparent font-mono-numbers text-2xl font-bold text-slate-900 outline-none disabled:opacity-100"
                      />
                      <Typography variant="h1" tone="muted" className="text-2xl">%</Typography>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
