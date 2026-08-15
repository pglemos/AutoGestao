import { useState } from 'react'
import { Check, Plus, Save, Shield, Trash2 } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxField, MxStatusBanner, MxTextarea } from '@/components/module/MxModuleVisualPrimitives'
import { parsePreparationChecklist } from '../methodology'
import { saveConsultantGuide, type ConsultantGuide } from '../consultoriaMxData'
import type { ConsultoriaMxController } from '../useConsultoriaMx'

type ChecklistItem = { name: string; description: string; required: boolean; order: number; responsible: string }

export function ConsultantGuideTab(props: {
  guide: ConsultantGuide | null
  versionId: string
  visitNumber: number
  onSaved: () => Promise<void>
  controller: ConsultoriaMxController
}) {
  const [form, setForm] = useState<Record<string, string>>({
    internal_objective: props.guide?.internal_objective ?? '',
    preparation_instructions: props.guide?.preparation_instructions ?? '',
    data_to_review: props.guide?.data_to_review ?? '',
    suggested_questions: props.guide?.suggested_questions ?? '',
    facilitation_script: props.guide?.facilitation_script ?? '',
    attention_points: props.guide?.attention_points ?? '',
    required_decisions: props.guide?.required_decisions ?? '',
    completion_criteria: props.guide?.completion_criteria ?? '',
    post_meeting_guidance: props.guide?.post_meeting_guidance ?? '',
    methodological_notes: props.guide?.methodological_notes ?? '',
  })
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => parsePreparationChecklist(props.guide?.preparation_checklist ?? '[]'))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (field: string, value: string) => {
    setForm(current => ({ ...current, [field]: value }))
    setSaved(false)
  }

  const updateChecklist = (items: ChecklistItem[]) => {
    setChecklist(items)
    setSaved(false)
  }

  const addItem = () => updateChecklist([...checklist, { name: '', description: '', required: true, order: checklist.length + 1, responsible: '' }])
  const patchItem = (index: number, field: keyof ChecklistItem, value: string | boolean) => {
    updateChecklist(checklist.map((item, position) => position === index ? { ...item, [field]: value } : item))
  }
  const removeItem = (index: number) => updateChecklist(checklist.filter((_, position) => position !== index))

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const result = await saveConsultantGuide({
        methodology_version_id: props.versionId,
        visit_number: props.visitNumber,
        internal_objective: form.internal_objective,
        preparation_instructions: form.preparation_instructions,
        data_to_review: form.data_to_review,
        suggested_questions: form.suggested_questions,
        facilitation_script: form.facilitation_script,
        attention_points: form.attention_points,
        required_decisions: form.required_decisions,
        completion_criteria: form.completion_criteria,
        post_meeting_guidance: form.post_meeting_guidance,
        methodological_notes: form.methodological_notes,
        preparation_checklist: JSON.stringify(checklist),
      })
      if (result.error) {
        setError(result.error)
        return
      }
      setSaved(true)
      await props.controller.audit('Orientação do Consultor', props.guide?.id ? 'GUIDE_UPDATE' : 'GUIDE_CREATE', `Encontro ${props.visitNumber}`)
      await props.onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border p-5">
      {error && <MxStatusBanner tone="danger">{error}</MxStatusBanner>}
      <div className="flex items-center gap-2 rounded-lg border border-status-warning/30 bg-status-warning-surface px-3 py-2">
        <Shield size={14} className="text-status-warning-text" />
        <span className="text-xs font-medium text-status-warning-text">Uso interno da equipe MX — não exibido ao Dono</span>
      </div>

      {[
        ['internal_objective', 'Objetivo interno'],
        ['preparation_instructions', 'Preparação necessária'],
        ['data_to_review', 'Dados que devem ser analisados antes do encontro'],
        ['suggested_questions', 'Perguntas sugeridas'],
        ['facilitation_script', 'Roteiro de condução'],
        ['attention_points', 'Pontos de atenção'],
        ['required_decisions', 'Decisões que precisam ser tomadas'],
        ['completion_criteria', 'Resultado mínimo para concluir'],
        ['post_meeting_guidance', 'Orientação pós-encontro'],
        ['methodological_notes', 'Observações metodológicas'],
      ].map(([field, label]) => (
        <MxField key={field} label={label}>
          <MxTextarea rows={2} value={form[field] ?? ''} onChange={event => update(field, event.target.value)} />
        </MxField>
      ))}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span id="guia-checklist-label" className="text-xs font-medium text-foreground">Checklist de preparação</span>
          <Button variant="outline" size="sm" onClick={addItem}><Plus size={16} />Adicionar item</Button>
        </div>
        <div className="space-y-2" aria-labelledby="guia-checklist-label">
          {checklist.map((item, index) => (
            <div key={index} className="rounded-lg border border-border p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                  placeholder="Nome"
                  value={item.name}
                  onChange={event => patchItem(index, 'name', event.target.value)}
                  aria-label={`Nome do item ${index + 1} do checklist`}
                />
                <input
                  className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                  placeholder="Responsável recomendado"
                  value={item.responsible}
                  onChange={event => patchItem(index, 'responsible', event.target.value)}
                  aria-label={`Responsável do item ${index + 1}`}
                />
                <input
                  className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground sm:col-span-2"
                  placeholder="Descrição"
                  value={item.description}
                  onChange={event => patchItem(index, 'description', event.target.value)}
                  aria-label={`Descrição do item ${index + 1}`}
                />
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <input type="checkbox" checked={item.required} onChange={event => patchItem(index, 'required', event.target.checked)} className="h-3 w-3" />
                  Obrigatório
                </label>
              </div>
              <div className="mt-2 flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => removeItem(index)} aria-label={`Remover item ${index + 1}`}>
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
          {checklist.length === 0 && <p className="text-xs text-muted-foreground">Nenhum item no checklist.</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-border pt-4">
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? 'Salvando...' : saved ? <><Check size={16} />Salvo</> : <><Save size={16} />Salvar</>}
        </Button>
        {saved && <span className="text-xs text-status-success-text">Conteúdo salvo.</span>}
      </div>
    </div>
  )
}
