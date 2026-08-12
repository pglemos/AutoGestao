import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { RefreshCw, Save, ShieldCheck, Mail, Target, Archive } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Typography } from '@/components/atoms/Typography'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import type { ProjectionMode, StoreSourceMode } from '@/types/database'
import type { StoreSettingsPayload } from '@/hooks/useOperationalSettings'
import { SOURCE_MODE_DESCRIPTIONS } from '../data/store-settings'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { RecipientPreview } from '../components/RecipientPreview'

export type SettingsFormState = {
  source_mode: StoreSourceMode
  active: boolean
  manager_email: string
  monthly_goal: string
  individual_goal_mode: StoreSettingsPayload['meta']['individual_goal_mode']
  include_venda_loja_in_store_total: boolean
  include_venda_loja_in_individual_goal: boolean
  bench_lead_agd: string
  bench_agd_visita: string
  bench_visita_vnd: string
  matinal_recipients: string
  weekly_recipients: string
  monthly_recipients: string
  whatsapp_group_ref: string
  timezone: string
  delivery_active: boolean
  projection_mode: ProjectionMode
}

type AdminSettingsFormProps = {
  form: SettingsFormState
  setForm: Dispatch<SetStateAction<SettingsFormState>>
  saving: boolean
  operationalLoading: boolean
  deletingStore: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
  onReload: () => void
  onDelete: () => void
}

/**
 * Formulário interno do AdminSettingsCard — 3 colunas (Meta/Benchmarks/Relatórios)
 * + footer com zona de risco. Mantido visualmente idêntico ao original.
 */
export function AdminSettingsForm({
  form,
  setForm,
  saving,
  operationalLoading,
  deletingStore,
  onSubmit,
  onReload,
  onDelete,
}: AdminSettingsFormProps) {
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 xl:grid-cols-12 gap-mx-lg">
      <section className="xl:col-span-4 space-y-mx-md">
        <div className="flex items-center gap-mx-xs">
          <Target size={16} className="text-status-success-text" />
          <Typography variant="caption" className="">Meta e Regras</Typography>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-mx-md">
          <label className="space-y-mx-xs">
            <span className="text-mx-tiny font-bold uppercase tracking-widest text-muted-foreground">Meta Mensal</span>
            <Input aria-label="Meta Mensal" type="number" min="0" value={form.monthly_goal} onChange={e => setForm(prev => ({ ...prev, monthly_goal: e.target.value }))} className="font-mono-numbers font-bold" />
          </label>
          <label className="space-y-mx-xs">
            <span className="text-mx-tiny font-bold uppercase tracking-widest text-muted-foreground">Modo de Projeção</span>
            <select aria-label="Modo de Projeção" value={form.projection_mode} onChange={e => setForm(prev => ({ ...prev, projection_mode: e.target.value as ProjectionMode }))} className="w-full h-mx-14 sm:h-12 rounded-xl border border-border bg-white px-5 text-sm font-bold uppercase shadow-none outline-none focus:border-brand-primary/30 focus:ring-4 focus:ring-brand-primary/5">
              <option value="calendar">Calendário</option>
              <option value="business">Dias úteis</option>
            </select>
          </label>
          <label className="space-y-mx-xs">
            <span className="text-mx-tiny font-bold uppercase tracking-widest text-muted-foreground">Meta Individual</span>
            <select aria-label="Meta Individual" value={form.individual_goal_mode} onChange={e => setForm(prev => ({ ...prev, individual_goal_mode: e.target.value as StoreSettingsPayload['meta']['individual_goal_mode'] }))} className="w-full h-mx-14 sm:h-12 rounded-xl border border-border bg-white px-5 text-sm font-bold uppercase shadow-none outline-none focus:border-brand-primary/30 focus:ring-4 focus:ring-brand-primary/5">
              <option value="even">Igual</option>
              <option value="custom">Customizada</option>
              <option value="proportional">Proporcional</option>
            </select>
          </label>
          <label className="space-y-mx-xs">
            <span className="text-mx-tiny font-bold uppercase tracking-widest text-muted-foreground">Fonte</span>
            <select aria-label="Fonte" value={form.source_mode} onChange={e => setForm(prev => ({ ...prev, source_mode: e.target.value as StoreSourceMode }))} className="w-full h-mx-14 sm:h-12 rounded-xl border border-border bg-white px-5 text-sm font-bold uppercase shadow-none outline-none focus:border-brand-primary/30 focus:ring-4 focus:ring-brand-primary/5">
              <option value="native_app">App nativo</option>
              <option value="legacy_forms">Forms legado</option>
              <option value="hybrid">Híbrido</option>
            </select>
            <Typography variant="tiny" tone="muted" className="block normal-case tracking-normal">
              {SOURCE_MODE_DESCRIPTIONS[form.source_mode]}
            </Typography>
          </label>
        </div>
        <div className="grid grid-cols-1 gap-mx-sm">
          <label className="flex items-center gap-mx-sm rounded-2xl border border-border bg-gray-50 p-mx-sm cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={e => setForm(prev => ({ ...prev, active: e.target.checked }))} className="h-mx-sm w-mx-sm accent-brand-primary" />
            <span className="text-mx-tiny font-bold uppercase tracking-widest">Loja ativa</span>
          </label>
          <label className="flex items-center justify-between gap-mx-sm rounded-2xl border border-border bg-gray-50 p-mx-sm cursor-pointer">
            <div className="flex items-center gap-mx-sm">
              <input type="checkbox" checked={form.include_venda_loja_in_store_total} onChange={e => setForm(prev => ({ ...prev, include_venda_loja_in_store_total: e.target.checked }))} className="h-mx-sm w-mx-sm accent-brand-primary" />
              <span className="text-mx-tiny font-bold uppercase tracking-widest">Vendas da Gestão/Apoio no Total da Loja</span>
            </div>
            <HelpTooltip text="Ative para incluir as vendas efetuadas por Gerentes, Donos e Apoio no faturamento total da loja em tempo real." />
          </label>
          <label className="flex items-center justify-between gap-mx-sm rounded-2xl border border-border bg-gray-50 p-mx-sm cursor-pointer">
            <div className="flex items-center gap-mx-sm">
              <input type="checkbox" checked={form.include_venda_loja_in_individual_goal} onChange={e => setForm(prev => ({ ...prev, include_venda_loja_in_individual_goal: e.target.checked }))} className="h-mx-sm w-mx-sm accent-brand-primary" />
              <span className="text-mx-tiny font-bold uppercase tracking-widest">Vendas da Gestão/Apoio na Meta da Equipe</span>
            </div>
            <HelpTooltip text="Se ativado, as vendas da gestão abatem a meta proporcional dos vendedores (mantido desativado por padrão)." />
          </label>
        </div>
      </section>

      <section className="xl:col-span-4 space-y-mx-md">
        <div className="flex items-center gap-mx-xs">
          <ShieldCheck size={16} className="text-status-success-text" />
          <Typography variant="caption" className="">Benchmarks</Typography>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-mx-md">
          <label className="space-y-mx-xs">
            <span className="text-mx-tiny font-bold uppercase tracking-widest text-muted-foreground">Lead / Agendamento (%)</span>
            <Input aria-label="Lead / Agendamento (%)" type="number" min="0" step="0.01" value={form.bench_lead_agd} onChange={e => setForm(prev => ({ ...prev, bench_lead_agd: e.target.value }))} className="font-mono-numbers font-bold" />
            <Typography variant="tiny" tone="muted" className="block normal-case tracking-normal">Impacta a régua visual Lead → Agendamento.</Typography>
          </label>
          <label className="space-y-mx-xs">
            <span className="text-mx-tiny font-bold uppercase tracking-widest text-muted-foreground">Agendamento / Visita (%)</span>
            <Input aria-label="Agendamento / Visita (%)" type="number" min="0" step="0.01" value={form.bench_agd_visita} onChange={e => setForm(prev => ({ ...prev, bench_agd_visita: e.target.value }))} className="font-mono-numbers font-bold" />
            <Typography variant="tiny" tone="muted" className="block normal-case tracking-normal">Impacta a régua visual Agendamento → Visita.</Typography>
          </label>
          <label className="space-y-mx-xs">
            <span className="text-mx-tiny font-bold uppercase tracking-widest text-muted-foreground">Visita / Venda (%)</span>
            <Input aria-label="Visita / Venda (%)" type="number" min="0" step="0.01" value={form.bench_visita_vnd} onChange={e => setForm(prev => ({ ...prev, bench_visita_vnd: e.target.value }))} className="font-mono-numbers font-bold" />
            <Typography variant="tiny" tone="muted" className="block normal-case tracking-normal">Impacta a régua visual Visita → Venda.</Typography>
          </label>
        </div>
      </section>

      <section className="xl:col-span-4 space-y-mx-md">
        <div className="flex items-center gap-mx-xs">
          <Mail size={16} className="text-status-success-text" />
          <Typography variant="caption" className="">Relatórios</Typography>
        </div>
        <div className="grid grid-cols-1 gap-mx-md">
          <label className="space-y-mx-xs">
            <span className="text-mx-tiny font-bold uppercase tracking-widest text-muted-foreground">E-mail do gestor</span>
            <Input type="email" value={form.manager_email} onChange={e => setForm(prev => ({ ...prev, manager_email: e.target.value }))} placeholder="gestor@loja.com.br" />
          </label>
          <label className="space-y-mx-xs">
            <span className="text-mx-tiny font-bold uppercase tracking-widest text-muted-foreground">Matinal</span>
            <Input value={form.matinal_recipients} onChange={e => setForm(prev => ({ ...prev, matinal_recipients: e.target.value }))} placeholder="email1@loja.com.br, email2@loja.com.br" />
            <RecipientPreview value={form.matinal_recipients} />
          </label>
          <label className="space-y-mx-xs">
            <span className="text-mx-tiny font-bold uppercase tracking-widest text-muted-foreground">Semanal</span>
            <Input value={form.weekly_recipients} onChange={e => setForm(prev => ({ ...prev, weekly_recipients: e.target.value }))} placeholder="email1@loja.com.br, email2@loja.com.br" />
            <RecipientPreview value={form.weekly_recipients} />
          </label>
          <label className="space-y-mx-xs">
            <span className="text-mx-tiny font-bold uppercase tracking-widest text-muted-foreground">Mensal</span>
            <Input value={form.monthly_recipients} onChange={e => setForm(prev => ({ ...prev, monthly_recipients: e.target.value }))} placeholder="email1@loja.com.br, email2@loja.com.br" />
            <RecipientPreview value={form.monthly_recipients} />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
            <label className="space-y-mx-xs">
              <span className="text-mx-tiny font-bold uppercase tracking-widest text-muted-foreground">WhatsApp</span>
              <Input value={form.whatsapp_group_ref} onChange={e => setForm(prev => ({ ...prev, whatsapp_group_ref: e.target.value }))} placeholder="grupo ou link" />
            </label>
            <label className="space-y-mx-xs">
              <span className="text-mx-tiny font-bold uppercase tracking-widest text-muted-foreground">Timezone</span>
              <Input aria-label="Timezone" value={form.timezone} onChange={e => setForm(prev => ({ ...prev, timezone: e.target.value }))} />
            </label>
          </div>
          <label className="flex items-center gap-mx-sm rounded-2xl border border-border bg-gray-50 p-mx-sm cursor-pointer">
            <input type="checkbox" checked={form.delivery_active} onChange={e => setForm(prev => ({ ...prev, delivery_active: e.target.checked }))} className="h-mx-sm w-mx-sm accent-brand-primary" />
            <span className="text-mx-tiny font-bold uppercase tracking-widest">Envios ativos</span>
          </label>
        </div>
      </section>

      <footer className="xl:col-span-12 flex flex-col gap-mx-md pt-mx-md border-t border-border">
        <div className="rounded-2xl border border-status-error/20 bg-status-error-surface p-mx-md">
          <div className="flex flex-col gap-mx-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Typography variant="caption" className="text-status-error">Zona de risco</Typography>
              <Typography variant="p" className="mt-mx-tiny text-sm text-status-error">Arquivar preserva histórico, mas remove a loja da operação ativa.</Typography>
            </div>
            <Button type="button" variant="danger" onClick={onDelete} disabled={deletingStore} className="h-mx-10">
              {deletingStore ? <RefreshCw size={16} className="mr-2 animate-spin" /> : <Archive size={16} className="mr-2" />}
              Arquivar loja
            </Button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-mx-sm">
          <Button type="button" variant="ghost" onClick={onReload} disabled={operationalLoading || saving} className="h-mx-10">
            <RefreshCw size={16} className={cn('mr-2', operationalLoading && 'animate-spin')} /> Recarregar
          </Button>
          <Button type="submit" disabled={saving || operationalLoading} className="h-mx-10">
            {saving ? <RefreshCw size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
            Salvar dados
          </Button>
        </div>
      </footer>
    </form>
  )
}

export default AdminSettingsForm
