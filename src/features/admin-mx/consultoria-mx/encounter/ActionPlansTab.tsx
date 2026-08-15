import { useEffect, useState } from 'react'
import { Plus, Star, Trash2, Zap } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import { MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { fetchPublishedPlanTemplates, linkActionPlanTemplate, toggleActionPlanRecommendation, unlinkActionPlanTemplate, type EncounterActionPlanRef } from '../consultoriaMxData'
import type { ConsultoriaMxController } from '../useConsultoriaMx'

export function ActionPlansTab(props: {
  actionPlans: EncounterActionPlanRef[]
  versionId: string
  visitNumber: number
  onSaved: () => Promise<void>
  controller: ConsultoriaMxController
}) {
  const [templates, setTemplates] = useState<Array<{ id: string; title: string; department: string | null }>>([])
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    if (showPicker) {
      void fetchPublishedPlanTemplates().then(result => setTemplates(result.rows))
    }
  }, [showPicker])

  const remove = async (ref: EncounterActionPlanRef) => {
    if (!confirm(`Remover vínculo com "${ref.action_plan_template_name}"?`)) return
    const result = await unlinkActionPlanTemplate(ref.id)
    if (result.error) {
      await props.controller.audit('Planos de Ação', 'ACTION_PLAN_UNLINK', '', ref.action_plan_template_name ?? undefined)
      return
    }
    await props.controller.audit('Planos de Ação', 'ACTION_PLAN_UNLINK', '', ref.action_plan_template_name ?? undefined)
    await props.onSaved()
  }

  const toggleRecommendation = async (ref: EncounterActionPlanRef) => {
    const next = !ref.recommendation_enabled
    const result = await toggleActionPlanRecommendation(ref.id, next)
    if (result.error) {
      await props.controller.audit('Planos de Ação', 'ACTION_PLAN_RECOMMENDATION', `${ref.action_plan_template_name}: ${next ? 'recomendação' : 'padrão'}`)
      return
    }
    await props.controller.audit('Planos de Ação', 'ACTION_PLAN_RECOMMENDATION', `${ref.action_plan_template_name}: ${next ? 'recomendação' : 'padrão'}`)
    await props.onSaved()
  }

  const sorted = [...props.actionPlans].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))

  return (
    <div className="space-y-3 rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 rounded-lg border border-status-info/30 bg-status-info-surface px-3 py-2">
        <Zap size={14} className="text-status-info-text" />
        <span className="text-xs text-status-info-text">O vínculo não cria um Plano de Ação real — apenas disponibiliza o modelo ao Consultor na operação.</span>
      </div>
      <Button size="sm" onClick={() => setShowPicker(true)}><Plus size={16} />Vincular Plano Padrão</Button>
      {sorted.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">Nenhum Plano Padrão vinculado a este encontro.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map(ref => (
            <div key={ref.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-status-warning-surface"><Zap size={14} className="text-status-warning-text" /></div>
                <div>
                  <div className="text-sm font-medium text-foreground">{ref.action_plan_template_name}</div>
                  <div className="text-xs text-muted-foreground">Ordem {ref.display_order}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={ref.recommendation_enabled ? 'outline' : 'ghost'}
                  onClick={() => void toggleRecommendation(ref)}
                >
                  <Star size={16} />{ref.recommendation_enabled ? 'Recomendação' : 'Padrão'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void remove(ref)} aria-label={`Remover ${ref.action_plan_template_name}`}><Trash2 size={16} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showPicker && (
        <TemplatePickerModal
          templates={templates}
          existing={props.actionPlans}
          versionId={props.versionId}
          visitNumber={props.visitNumber}
          onClose={() => setShowPicker(false)}
          onSaved={() => { setShowPicker(false); void props.onSaved() }}
          controller={props.controller}
        />
      )}
    </div>
  )
}

function TemplatePickerModal(props: {
  templates: Array<{ id: string; title: string; department: string | null }>
  existing: EncounterActionPlanRef[]
  versionId: string
  visitNumber: number
  onClose: () => void
  onSaved: () => void
  controller: ConsultoriaMxController
}) {
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const available = props.templates.filter(template => !props.existing.some(existing => existing.action_plan_template_version_id === template.id))

  const link = async (template: { id: string; title: string }) => {
    setSaving(template.id)
    try {
      const result = await linkActionPlanTemplate({
        methodology_version_id: props.versionId,
        visit_number: props.visitNumber,
        action_plan_template_version_id: template.id,
        action_plan_template_name: template.title,
        display_order: props.existing.length + 1,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      await props.controller.audit('Planos de Ação', 'ACTION_PLAN_LINK', template.title)
      props.onSaved()
    } finally {
      setSaving(null)
    }
  }

  return (
    <Modal open onClose={props.onClose} title="Vincular Plano Padrão" size="lg" footer={<Button variant="outline" onClick={props.onClose}>Fechar</Button>}>
      <div className="space-y-2">
        {error && <MxStatusBanner tone="danger">{error}</MxStatusBanner>}
        {available.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nenhum Plano Padrão publicado disponível.</p> : (
          <div className="space-y-2">
            {available.map(template => (
              <div key={template.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <div className="text-sm font-medium text-foreground">{template.title}</div>
                  <div className="text-xs text-muted-foreground">{template.department || '—'}</div>
                </div>
                <Button size="sm" onClick={() => void link(template)} disabled={saving === template.id}>{saving === template.id ? 'Vinculando...' : 'Vincular'}</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
