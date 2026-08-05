import { useEffect, useState, type FormEvent } from 'react'
import { Building2, Settings2, SlidersHorizontal } from 'lucide-react'
import { toast } from '@/lib/toast'
import { type useOperationalSettings, type StoreSettingsPayload } from '@/hooks/useOperationalSettings'
import type { ProjectionMode, Store } from '@/types/database'
import {
  joinRecipients,
  splitRecipients,
  toBoundedNumber,
  toNumber,
} from '../data/store-settings'
import { AdminSettingsForm, type SettingsFormState } from './AdminSettingsForm'

type OperationalSettings = ReturnType<typeof useOperationalSettings>

type AdminSettingsCardProps = {
  selectedStoreId: string
  selectedStore: Store | null
  operational: Pick<
    OperationalSettings,
    'store' | 'deliveryRules' | 'benchmark' | 'metaRules' | 'loading' | 'fetchSettings' | 'saveSettings'
  >
  storeGoalProjectionMode: ProjectionMode | undefined
  showAdminSettings: boolean
  onToggleAdminSettings: () => void
  onOpenEdit: () => void
  onManageBranches: () => void
  onDelete: () => void
  deletingStore: boolean
  onRefetchAll: () => Promise<void>
}

export function AdminSettingsCard({
  selectedStoreId,
  selectedStore,
  operational,
  storeGoalProjectionMode,
  showAdminSettings,
  onToggleAdminSettings,
  onOpenEdit,
  onManageBranches,
  onDelete,
  deletingStore,
  onRefetchAll,
}: AdminSettingsCardProps) {
  const {
    store: operationalStore,
    deliveryRules,
    benchmark,
    metaRules: operationalMetaRules,
    loading: operationalLoading,
    fetchSettings,
    saveSettings,
  } = operational

  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState<SettingsFormState>({
    source_mode: 'native_app',
    active: true,
    manager_email: '',
    monthly_goal: '0',
    individual_goal_mode: 'even',
    include_venda_loja_in_store_total: true,
    include_venda_loja_in_individual_goal: false,
    bench_lead_agd: '20',
    bench_agd_visita: '60',
    bench_visita_vnd: '33',
    matinal_recipients: '',
    weekly_recipients: '',
    monthly_recipients: '',
    whatsapp_group_ref: '',
    timezone: 'America/Sao_Paulo',
    delivery_active: true,
    projection_mode: 'calendar',
  })

  useEffect(() => {
    setSettingsForm({
      source_mode: operationalStore?.source_mode || selectedStore?.source_mode || 'native_app',
      active: operationalStore?.active ?? selectedStore?.active ?? true,
      manager_email: operationalStore?.manager_email || selectedStore?.manager_email || '',
      monthly_goal: String(operationalMetaRules?.monthly_goal ?? 0),
      individual_goal_mode: operationalMetaRules?.individual_goal_mode || 'even',
      include_venda_loja_in_store_total: operationalMetaRules?.include_venda_loja_in_store_total ?? true,
      include_venda_loja_in_individual_goal: operationalMetaRules?.include_venda_loja_in_individual_goal ?? false,
      bench_lead_agd: String(benchmark?.lead_to_agend ?? operationalMetaRules?.bench_lead_agd ?? 20),
      bench_agd_visita: String(benchmark?.agend_to_visit ?? operationalMetaRules?.bench_agd_visita ?? 60),
      bench_visita_vnd: String(benchmark?.visit_to_sale ?? operationalMetaRules?.bench_visita_vnd ?? 33),
      matinal_recipients: joinRecipients(deliveryRules?.matinal_recipients),
      weekly_recipients: joinRecipients(deliveryRules?.weekly_recipients),
      monthly_recipients: joinRecipients(deliveryRules?.monthly_recipients),
      whatsapp_group_ref: deliveryRules?.whatsapp_group_ref || '',
      timezone: deliveryRules?.timezone || 'America/Sao_Paulo',
      delivery_active: deliveryRules?.active ?? true,
      projection_mode: operationalMetaRules?.projection_mode || storeGoalProjectionMode || 'calendar',
    })
  }, [benchmark, deliveryRules, operationalMetaRules, operationalStore, selectedStore, storeGoalProjectionMode])

  const handleSettingsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const monthlyGoal = toBoundedNumber(settingsForm.monthly_goal, 0, 0, 999999)
    const benchLeadAgd = toBoundedNumber(settingsForm.bench_lead_agd, 20, 0, 100)
    const benchAgdVisita = toBoundedNumber(settingsForm.bench_agd_visita, 60, 0, 100)
    const benchVisitaVnd = toBoundedNumber(settingsForm.bench_visita_vnd, 33, 0, 100)
    if (
      String(monthlyGoal) !== String(toNumber(settingsForm.monthly_goal, 0))
      || String(benchLeadAgd) !== String(toNumber(settingsForm.bench_lead_agd, 20))
      || String(benchAgdVisita) !== String(toNumber(settingsForm.bench_agd_visita, 60))
      || String(benchVisitaVnd) !== String(toNumber(settingsForm.bench_visita_vnd, 33))
    ) {
      toast.error('Revise metas e benchmarks. Use valores entre 0 e 100 para conversões.')
      return
    }

    const payload: StoreSettingsPayload = {
      store: {
        id: selectedStoreId,
        manager_email: settingsForm.manager_email.trim() || null,
        source_mode: settingsForm.source_mode,
        active: settingsForm.active,
      },
      delivery: {
        store_id: selectedStoreId,
        matinal_recipients: splitRecipients(settingsForm.matinal_recipients),
        weekly_recipients: splitRecipients(settingsForm.weekly_recipients),
        monthly_recipients: splitRecipients(settingsForm.monthly_recipients),
        whatsapp_group_ref: settingsForm.whatsapp_group_ref.trim() || null,
        timezone: settingsForm.timezone.trim() || 'America/Sao_Paulo',
        active: settingsForm.delivery_active,
      },
      benchmark: {
        store_id: selectedStoreId,
        lead_to_agend: benchLeadAgd,
        agend_to_visit: benchAgdVisita,
        visit_to_sale: benchVisitaVnd,
      },
      meta: {
        store_id: selectedStoreId,
        monthly_goal: monthlyGoal,
        individual_goal_mode: settingsForm.individual_goal_mode,
        include_venda_loja_in_store_total: settingsForm.include_venda_loja_in_store_total,
        include_venda_loja_in_individual_goal: settingsForm.include_venda_loja_in_individual_goal,
        bench_lead_agd: benchLeadAgd,
        bench_agd_visita: benchAgdVisita,
        bench_visita_vnd: benchVisitaVnd,
        projection_mode: settingsForm.projection_mode,
      },
    }

    setSavingSettings(true)
    try {
      const { error } = await saveSettings(payload)
      if (error) {
        toast.error(error)
        return
      }
      await onRefetchAll()
      toast.success('Dados operacionais da loja atualizados.')
    } finally {
      setSavingSettings(false)
    }
  }

  if (!selectedStore) return null

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <header className="p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <Settings2 size={20} />
            </span>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Administração da loja</h2>
              <p className="mt-1 text-sm text-gray-500">
                {operationalLoading
                  ? 'Carregando cadastro e parâmetros da unidade.'
                  : `${selectedStore.name} · cadastro, metas, benchmarks e entregas.`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenEdit}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              <Building2 size={15} />
              Editar cadastro
            </button>
            <button
              type="button"
              onClick={onManageBranches}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              title="Abre em nova aba"
            >
              <Building2 size={15} />
              Gerenciar filiais
            </button>
            <button
              type="button"
              onClick={onToggleAdminSettings}
              className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${showAdminSettings ? 'bg-gray-100 text-gray-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
            >
              <SlidersHorizontal size={15} />
              {showAdminSettings ? 'Ocultar parâmetros' : 'Configurar parâmetros'}
            </button>
          </div>
        </div>
      </header>

      {showAdminSettings && (
        <div className="border-t border-gray-100 p-5">
          <div className="mb-5 rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-600">
            Estes parâmetros controlam metas, fonte de dados, benchmarks e entregas de relatório. A leitura da equipe permanece separada para evitar que configuração e resultado sejam confundidos.
          </div>
          <AdminSettingsForm
            form={settingsForm}
            setForm={setSettingsForm}
            saving={savingSettings}
            operationalLoading={operationalLoading}
            deletingStore={deletingStore}
            onSubmit={handleSettingsSubmit}
            onReload={fetchSettings}
            onDelete={onDelete}
          />
        </div>
      )}
    </section>
  )
}

export default AdminSettingsCard
