import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Edit3, Plus, Save, Target, TrendingUp } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { MxEmptyState, MxField, MxLoadingState, MxMetricCard, MxMetricGrid, MxModuleHeader, MxModulePage, MxSectionCard, MxSectionHeader, MxStatusBanner, MxTableSurface, MxTextarea } from '@/components/module/MxModuleVisualPrimitives'
import { MxPageTabs } from '@/components/module/MxPageTabs'
import { strategicPlanRepository } from '@/components/owner/strategic/strategicPlanLiveRepository'
import { REFERENCE_YEAR } from '@/components/owner/strategic/strategicUtils'
import { toast } from '@/lib/toast'
import { InternalMxPlanningShell, useInternalPlanningRealtime, useInternalPlanningStore } from './InternalMxPlanningShell'

const planRepository = strategicPlanRepository as any

type IndicatorSeries = {
  id: string
  code: string
  name: string
  area: string
  direction: string
  displayFormat?: string
  targetValues: Array<number | null>
  currentValues: Array<number | null>
  previousYearValues: Array<number | null>
}

type PlanTab = 'indicadores' | 'metas' | 'acoes'
const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const value = (input: number | null | undefined) => input == null ? '—' : Number.isInteger(input) ? String(input) : input.toFixed(1)

export default function InternalStrategicPlanPage() {
  const store = useInternalPlanningStore()
  const [tab, setTab] = useState<PlanTab>('indicadores')
  const [selectedIndicatorId, setSelectedIndicatorId] = useState('SP-001')
  const [series, setSeries] = useState<IndicatorSeries[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [monthlyGoal, setMonthlyGoal] = useState('')
  const [editingGoal, setEditingGoal] = useState(false)
  const [openAction, setOpenAction] = useState(false)
  const [actionTitle, setActionTitle] = useState('')
  const [actionProblem, setActionProblem] = useState('')
  const [actionDeadline, setActionDeadline] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!store.selectedStoreId) { setSeries([]); return }
    setLoading(true)
    setError(null)
    try {
      await planRepository.load({ storeId: store.selectedStoreId, year: REFERENCE_YEAR })
      setSeries(planRepository.getOverviewData() as IndicatorSeries[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o plano estratégico.')
      setSeries([])
    } finally { setLoading(false) }
  }, [store.selectedStoreId])

  useEffect(() => { void load() }, [load])
  useInternalPlanningRealtime(load)

  const selected = useMemo(() => series.find((item) => item.id === selectedIndicatorId) || series[0] || null, [selectedIndicatorId, series])
  const metrics = useMemo(() => {
    const sales = series.find((item) => item.id === 'SP-001')
    const actual = sales?.currentValues.filter((item): item is number => item != null).reduce((sum, item) => sum + item, 0) || 0
    const target = sales?.targetValues.filter((item): item is number => item != null).reduce((sum, item) => sum + item, 0) || 0
    return { indicators: series.length, actual, target, attainment: target ? Math.round((actual / target) * 100) : 0 }
  }, [series])

  useEffect(() => {
    const target = selected?.targetValues?.[0]
    setMonthlyGoal(target == null ? '' : String(target))
  }, [selected])

  const saveGoal = async () => {
    const parsed = Number(monthlyGoal)
    if (!selected || !Number.isFinite(parsed) || parsed < 0) { toast.error('Informe uma meta mensal válida.'); return }
    setSaving(true)
    try {
      await planRepository.updateTargets(selected.id, REFERENCE_YEAR, Array(12).fill(parsed))
      toast.success('Meta global da loja atualizada.')
      setEditingGoal(false)
      await load()
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Não foi possível salvar a meta.') }
    finally { setSaving(false) }
  }

  const createAction = async () => {
    if (!actionTitle.trim() || !selected) { toast.error('Informe o título da ação e selecione um indicador.'); return }
    setSaving(true)
    try {
      await planRepository.createActionItem({
        action: actionTitle.trim(),
        problem: actionProblem.trim(),
        note: actionProblem.trim(),
        indicatorId: selected.code,
        area: selected.area === 'Comercial' ? 'commercial' : 'general',
        deadline: actionDeadline || null,
        priority: 'high',
        createdBy: 'Administração MX',
      })
      toast.success('Ação criada no Plano de Ação da loja.')
      setOpenAction(false); setActionTitle(''); setActionProblem(''); setActionDeadline('')
      await load()
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Não foi possível criar a ação.') }
    finally { setSaving(false) }
  }

  const exportCsv = () => {
    if (!selected) return
    const csv = planRepository.exportIndicatorData(selected.id, REFERENCE_YEAR)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${selected.code}-plano-estrategico.csv`; anchor.click(); URL.revokeObjectURL(url)
  }

  return (
    <InternalMxPlanningShell
      title="Plano Estratégico"
      description="Administre indicadores, metas, comparativos e ações da loja selecionada no contexto interno MX."
      store={store}
      onRefresh={() => void load()}
      refreshing={loading}
    >
      {error ? <MxStatusBanner tone="danger">{error}</MxStatusBanner> : null}
      {loading ? <MxSectionCard><MxLoadingState label="Carregando indicadores reais da loja" /></MxSectionCard> : !store.selectedStoreId ? null : (
        <>
          <MxMetricGrid>
            <MxMetricCard title="Indicadores" value={metrics.indicators} detail="Catálogo estratégico ativo" icon={Target} />
            <MxMetricCard title="Resultado acumulado" value={metrics.actual} detail="Realizado no ano corrente" icon={TrendingUp} tone="info" />
            <MxMetricCard title="Meta acumulada" value={metrics.target} detail="Meta persistida para a loja" icon={Target} tone="violet" />
            <MxMetricCard title="Atingimento" value={`${metrics.attainment}%`} detail="Resultado versus meta" icon={TrendingUp} tone={metrics.attainment >= 100 ? 'success' : 'warning'} />
          </MxMetricGrid>
          <MxPageTabs
            ariaLabel="Áreas do Plano Estratégico interno"
            activeKey={tab}
            onChange={setTab}
            items={[{ key: 'indicadores', label: 'Indicadores', description: 'Resultados e comparativos reais' }, { key: 'metas', label: 'Metas e histórico', description: 'Editar metas da loja' }, { key: 'acoes', label: 'Ações estratégicas', description: 'Ações criadas a partir dos indicadores' }]}
          />
          {tab === 'indicadores' ? <IndicatorTab series={series} selected={selected} onSelect={setSelectedIndicatorId} onExport={exportCsv} onCreateAction={() => setOpenAction(true)} /> : null}
          {tab === 'metas' ? <TargetTab selected={selected} editing={editingGoal} monthlyGoal={monthlyGoal} onEdit={() => setEditingGoal(true)} onCancel={() => setEditingGoal(false)} onGoal={setMonthlyGoal} onSave={() => void saveGoal()} saving={saving} /> : null}
          {tab === 'acoes' ? <ActionTab actions={(planRepository.getActionItems(selected?.id) || []) as Array<Record<string, unknown>>} onCreate={() => setOpenAction(true)} /> : null}
        </>
      )}
      {openAction && selected ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="internal-strategic-action-title">
        <section className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
          <h2 id="internal-strategic-action-title" className="text-lg font-semibold text-gray-800">Criar ação estratégica</h2>
          <p className="mt-1 text-sm text-gray-500">A ação será criada na loja selecionada e ficará disponível no Plano de Ação interno.</p>
          <div className="mt-5 space-y-4">
            <MxField label="Ação"><Input value={actionTitle} onChange={(event) => setActionTitle(event.target.value)} /></MxField>
            <MxField label="Problema ou oportunidade"><MxTextarea rows={3} value={actionProblem} onChange={(event) => setActionProblem(event.target.value)} /></MxField>
            <MxField label="Prazo"><Input type="date" value={actionDeadline} onChange={(event) => setActionDeadline(event.target.value)} /></MxField>
          </div>
          <div className="mt-6 flex justify-end gap-2"><Button variant="managerSecondary" onClick={() => setOpenAction(false)}>Cancelar</Button><Button onClick={() => void createAction()} loading={saving}><Plus size={16} />Criar ação</Button></div>
        </section>
      </div> : null}
    </InternalMxPlanningShell>
  )
}

function IndicatorTab({ series, selected, onSelect, onExport, onCreateAction }: { series: IndicatorSeries[]; selected: IndicatorSeries | null; onSelect: (id: string) => void; onExport: () => void; onCreateAction: () => void }) {
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]"><MxSectionCard><MxSectionHeader title="Catálogo de indicadores" description={`${series.length} indicador(es) persistido(s).`} actions={<Button variant="managerSecondary" size="sm" onClick={onExport}><Download size={16} />Exportar CSV</Button>} /><MxTableSurface className="rounded-none border-0"><table className="min-w-[720px] w-full text-sm"><thead><tr className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase text-gray-500"><th className="px-4 py-3">Código</th><th className="px-4 py-3">Indicador</th><th className="px-4 py-3">Área</th><th className="px-4 py-3">Meta</th><th className="px-4 py-3">Resultado</th><th className="px-4 py-3">Ação</th></tr></thead><tbody>{series.map((item) => <tr key={item.id} className="border-b border-gray-100 last:border-0"><td className="px-4 py-3 font-semibold text-emerald-700">{item.code}</td><td className="px-4 py-3 font-medium text-gray-800">{item.name}</td><td className="px-4 py-3 text-gray-500">{item.area}</td><td className="px-4 py-3">{value(item.targetValues[item.targetValues.length - 1])}</td><td className="px-4 py-3">{value(item.currentValues[item.currentValues.length - 1])}</td><td className="px-4 py-3"><Button size="sm" variant={selected?.id === item.id ? 'managerPrimary' : 'managerSecondary'} onClick={() => onSelect(item.id)}>Abrir</Button></td></tr>)}</tbody></table></MxTableSurface></MxSectionCard><MxSectionCard><MxSectionHeader title={selected?.name || 'Selecione um indicador'} description={selected ? `${selected.code} · ${selected.area}` : 'Escolha um indicador para ver a leitura.'} actions={selected ? <Button size="sm" onClick={onCreateAction}><Plus size={16} />Criar ação</Button> : null} />{selected ? <div className="p-5"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{months.map((month, index) => <div key={month} className="rounded-xl border border-gray-100 bg-gray-50 p-3"><div className="text-xs text-gray-500">{month}</div><div className="mt-1 text-sm font-semibold text-gray-800">{value(selected.currentValues[index])}</div><div className="text-xs text-gray-500">Meta {value(selected.targetValues[index])}</div></div>)}</div><p className="mt-5 text-sm leading-6 text-gray-600">A leitura considera a direção {selected.direction === 'increase' ? 'de aumento' : selected.direction === 'de redução'} do indicador e dados persistidos da loja selecionada.</p></div> : <MxEmptyState title="Nenhum indicador selecionado" />}</MxSectionCard></div>
}

function TargetTab({ selected, editing, monthlyGoal, onEdit, onCancel, onGoal, onSave, saving }: { selected: IndicatorSeries | null; editing: boolean; monthlyGoal: string; onEdit: () => void; onCancel: () => void; onGoal: (value: string) => void; onSave: () => void; saving: boolean }) {
  return <MxSectionCard><MxSectionHeader title="Metas persistidas" description="A edição global está disponível para Administrador Geral, Administrador MX e Consultor MX." actions={selected?.id === 'SP-001' && !editing ? <Button onClick={onEdit}><Edit3 size={16} />Editar meta</Button> : null} />{!selected ? <MxEmptyState title="Selecione um indicador" /> : <div className="p-5">{selected.id !== 'SP-001' ? <MxStatusBanner tone="info">Este indicador é derivado de dados operacionais. A meta persistida disponível nesta tela é a meta mensal de vendas.</MxStatusBanner> : editing ? <div className="max-w-md space-y-4"><MxField label="Meta mensal de vendas" hint="O mesmo valor será persistido nos 12 meses da loja selecionada."><Input type="number" min="0" value={monthlyGoal} onChange={(event) => onGoal(event.target.value)} /></MxField><div className="flex gap-2"><Button variant="managerSecondary" onClick={onCancel}>Cancelar</Button><Button onClick={onSave} loading={saving}><Save size={16} />Salvar meta</Button></div></div> : <div className="grid gap-3 sm:grid-cols-4">{months.map((month, index) => <div key={month} className="rounded-xl border border-gray-100 p-4"><div className="text-xs text-gray-500">{month}</div><div className="mt-2 text-xl font-bold text-emerald-700">{value(selected.targetValues[index])}</div></div>)}</div>}</div>}</MxSectionCard>
}

function ActionTab({ actions, onCreate }: { actions: Array<Record<string, unknown>>; onCreate: () => void }) {
  return <MxSectionCard><MxSectionHeader title="Ações ligadas ao indicador" description={`${actions.length} ação(ões) criadas a partir deste indicador.`} actions={<Button onClick={onCreate}><Plus size={16} />Nova ação</Button>} />{actions.length ? <div className="divide-y divide-gray-100">{actions.map((action) => <div key={String(action.id)} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-semibold text-gray-800">{String(action.title || action.acao || 'Ação')}</div><div className="text-sm text-gray-500">{String(action.statusLabel || action.status || 'Sem status')} · {String(action.progress ?? action.progresso ?? 0)}%</div></div><span className="text-xs text-gray-500">{String(action.dueDate || action.prazo || 'Sem prazo')}</span></div>)}</div> : <MxEmptyState title="Nenhuma ação vinculada" description="Crie uma ação a partir do indicador selecionado." />}</MxSectionCard>
}
