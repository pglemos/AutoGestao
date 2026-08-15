import { useEffect, useState } from 'react'
import { Check, FileBarChart, Save, X } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxField, MxInput, MxSelect, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { RESPONSIBLE_ROLES, VISIBILITY_LABELS } from '../methodology'
import { archiveEncounterReportRef, fetchReportTemplates, saveEncounterReportRef, type EncounterReportRef, type ReportTemplate } from '../consultoriaMxData'
import type { ConsultoriaMxController } from '../useConsultoriaMx'

export function ReportTab(props: {
  reportRef: EncounterReportRef | null
  versionId: string
  visitNumber: number
  onSaved: () => Promise<void>
  controller: ConsultoriaMxController
}) {
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [form, setForm] = useState({
    report_template_id: props.reportRef?.report_template_id ?? '',
    report_required: props.reportRef?.report_required ?? false,
    default_title: props.reportRef?.default_title ?? '',
    author_role: props.reportRef?.author_role ?? '',
    validator_role: props.reportRef?.validator_role ?? '',
    publication_deadline_days: props.reportRef?.publication_deadline_days ?? 7,
    visibility: props.reportRef?.visibility ?? 'OWNER_AND_TEAM',
    attachment_allowed: props.reportRef?.attachment_allowed ?? true,
    attachment_required: props.reportRef?.attachment_required ?? false,
    action_plan_creation_allowed: props.reportRef?.action_plan_creation_allowed ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchReportTemplates().then(result => setTemplates(result.rows.filter(item => item.status === 'publicado')))
  }, [])

  const update = (field: string, value: string | number | boolean) => {
    setForm(current => ({ ...current, [field]: value }))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const tpl = templates.find(item => item.id === form.report_template_id)
      const result = await saveEncounterReportRef({
        id: props.reportRef?.id,
        methodology_version_id: props.versionId,
        visit_number: props.visitNumber,
        report_template_id: form.report_template_id || null,
        report_template_name: tpl?.name ?? props.reportRef?.report_template_name ?? null,
        report_required: form.report_required,
        default_title: form.default_title,
        author_role: form.author_role || null,
        validator_role: form.validator_role || null,
        publication_deadline_days: form.publication_deadline_days,
        visibility: form.visibility,
        attachment_allowed: form.attachment_allowed,
        attachment_required: form.attachment_required,
        action_plan_creation_allowed: form.action_plan_creation_allowed,
        status: props.reportRef?.status ?? 'rascunho',
      })
      if (result.error) {
        setError(result.error)
        return
      }
      setSaved(true)
      await props.controller.audit('Relatório', props.reportRef ? 'REPORT_REF_UPDATE' : 'REPORT_REF_ADD', tpl?.name ?? `Encontro ${props.visitNumber}`)
      await props.onSaved()
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!confirm('Remover configuração de relatório deste encontro?')) return
    const result = await archiveEncounterReportRef(props.versionId, props.visitNumber)
    if (result.error) {
      setError(result.error)
      return
    }
    await props.controller.audit('Relatório', 'REPORT_REF_REMOVE')
    await props.onSaved()
  }

  return (
    <div className="space-y-4 rounded-xl border border-border p-5">
      {error && <MxStatusBanner tone="danger">{error}</MxStatusBanner>}
      <div className="flex items-center gap-2 rounded-lg border border-status-info/30 bg-status-info-surface px-3 py-2">
        <FileBarChart size={14} className="text-status-info-text" />
        <span className="text-xs font-medium text-status-info-text">O modelo fica disponível ao Consultor na operação — não cria relatório antes da execução.</span>
      </div>

      <label className="flex cursor-pointer items-center gap-2">
        <input type="checkbox" checked={form.report_required} onChange={event => update('report_required', event.target.checked)} className="h-4 w-4 accent-brand-primary" />
        <span className="text-sm font-medium text-foreground">Relatório obrigatório</span>
      </label>

      <MxField label="Modelo de relatório">
        <MxSelect aria-label="Modelo de relatório" value={form.report_template_id} onChange={event => update('report_template_id', event.target.value)}>
          <option value="">Selecione um modelo publicado...</option>
          {templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
        </MxSelect>
      </MxField>

      <MxField label="Título padrão"><MxInput value={form.default_title} onChange={event => update('default_title', event.target.value)} /></MxField>

      <div className="grid grid-cols-2 gap-3">
        <MxField label="Autor recomendado">
          <MxSelect aria-label="Autor recomendado" value={form.author_role} onChange={event => update('author_role', event.target.value)}>
            <option value="">—</option>
            {RESPONSIBLE_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
          </MxSelect>
        </MxField>
        <MxField label="Validador recomendado">
          <MxSelect aria-label="Validador recomendado" value={form.validator_role} onChange={event => update('validator_role', event.target.value)}>
            <option value="">—</option>
            {RESPONSIBLE_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
          </MxSelect>
        </MxField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MxField label="Prazo de publicação (dias)">
          <MxInput type="number" min={0} value={form.publication_deadline_days} onChange={event => update('publication_deadline_days', Number(event.target.value))} />
        </MxField>
        <MxField label="Visibilidade">
          <MxSelect aria-label="Visibilidade do relatório" value={form.visibility} onChange={event => update('visibility', event.target.value)}>
            {Object.entries(VISIBILITY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </MxSelect>
        </MxField>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={form.attachment_allowed} onChange={event => update('attachment_allowed', event.target.checked)} className="h-4 w-4 accent-brand-primary" /><span className="text-sm text-foreground">Anexo permitido</span></label>
        <label className="flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={form.attachment_required} onChange={event => update('attachment_required', event.target.checked)} className="h-4 w-4 accent-brand-primary" /><span className="text-sm text-foreground">Anexo obrigatório</span></label>
        <label className="flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={form.action_plan_creation_allowed} onChange={event => update('action_plan_creation_allowed', event.target.checked)} className="h-4 w-4 accent-brand-primary" /><span className="text-sm text-foreground">Criação de Plano de Ação permitida</span></label>
      </div>

      <div className="flex items-center gap-2 border-t border-border pt-4">
        <Button onClick={() => void save()} disabled={saving}>{saving ? 'Salvando...' : saved ? <><Check size={16} />Salvo</> : <><Save size={16} />Salvar</>}</Button>
        {props.reportRef?.id && <Button variant="outline" onClick={() => void remove()}><X size={16} />Remover</Button>}
        {saved && <span className="text-xs text-status-success-text">Modelo de relatório vinculado.</span>}
      </div>
    </div>
  )
}
