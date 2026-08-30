import { useEffect, useState } from 'react'
import { Archive, Clock, FileCheck, GraduationCap, ListChecks, Paperclip, Pencil, Power, PowerOff, RefreshCw, Send, Target, X, Zap } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { fetchTemplateItems, RESPONSIBLE_ROLE_OPTIONS, type ActionPlanTemplate, type ActionPlanTemplateItem } from './actionPlanTemplates'

const VERSION_STATUS_LABEL: Record<string, string> = { rascunho: 'Rascunho', publicada: 'Publicada', arquivada: 'Arquivada' }

/** Drawer read-only de um template: identidade, versão ativa (problema/objetivo/ações/peso), sugestão ao dono e histórico de versões — mais as ações de ciclo de vida do template. */
export function TemplateDetailDrawer(props: {
  template: ActionPlanTemplate | null
  submitting: boolean
  onClose: () => void
  onEdit: (template: ActionPlanTemplate) => void
  onPublish: (template: ActionPlanTemplate) => void
  onCreateVersion: (template: ActionPlanTemplate) => void
  onToggleActive: (template: ActionPlanTemplate) => void
  onArchive: (template: ActionPlanTemplate) => void
  onApply: (template: ActionPlanTemplate) => void
  onSuggest: (template: ActionPlanTemplate) => void
}) {
  const [items, setItems] = useState<ActionPlanTemplateItem[]>([])
  const template = props.template
  const version = template ? (template.versions.find(entry => entry.status === 'publicada') ?? template.versions[0] ?? null) : null

  useEffect(() => {
    if (!version) { setItems([]); return }
    void fetchTemplateItems(version.id).then(setItems)
  }, [version?.id])

  if (!template) return null

  const hasDraft = template.versions.some(entry => entry.status === 'rascunho')
  const hasPublished = template.versions.some(entry => entry.status === 'publicada')
  const allArchived = template.versions.length > 0 && template.versions.every(entry => entry.status === 'arquivada')

  return (
    <div className="fixed inset-0 z-[var(--mx-z-overlay)] flex justify-end">
      <button type="button" aria-label="Fechar detalhes do template" className="fixed inset-0 bg-surface-overlay/30" onClick={props.onClose} />
      <div data-mx-scroll-region="vertical" className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-surface-default shadow-xl">
        <div className="sticky top-0 z-[var(--mx-z-sticky)] border-b border-border bg-surface-default px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-primary" />
              <h3 className="font-semibold text-text-primary">{template.nome}</h3>
            </div>
            <Button variant="ghost" size="icon" aria-label="Fechar" onClick={props.onClose}><X size={16} /></Button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs font-medium text-text-secondary">{template.departamento}</span>
            {version ? <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs font-medium text-text-secondary">{VERSION_STATUS_LABEL[version.status]}</span> : null}
            {!template.active ? <span className="rounded-full bg-status-warning-surface px-2 py-0.5 text-xs font-medium text-status-warning-text">Inativo</span> : null}
            {version ? <span className="text-xs text-text-disabled">v{version.versao}</span> : null}
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2"><Target size={14} className="text-text-disabled" /><span className="text-text-secondary">Indicador:</span><span className="font-medium">{template.indicador || '—'}</span></div>
            <div className="flex items-center gap-2"><span className="text-text-secondary">Responsável recomendado:</span><span className="font-medium">{RESPONSIBLE_ROLE_OPTIONS.find(role => role.value === template.default_responsible_role)?.label || '—'}</span></div>
            {template.descricao ? <p className="text-text-secondary">{template.descricao}</p> : null}
          </div>

          {version?.problem ? (
            <div className="rounded-lg bg-status-error-surface p-3">
              <h4 className="mb-1 text-xs font-semibold uppercase text-status-error-text">Problema</h4>
              <p className="text-sm text-status-error-text">{version.problem}</p>
            </div>
          ) : null}
          {version?.objective ? (
            <div className="rounded-lg bg-status-success-surface p-3">
              <h4 className="mb-1 text-xs font-semibold uppercase text-status-success-text">Objetivo</h4>
              <p className="text-sm text-status-success-text">{version.objective}</p>
            </div>
          ) : null}
          {version?.when_to_apply ? (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-text-secondary">Quando aplicar</h4>
              <p className="text-sm text-text-secondary">{version.when_to_apply}</p>
            </div>
          ) : null}

          <div>
            <h4 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase text-text-secondary"><ListChecks size={12} />Ações ({items.length})</h4>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={item.id ?? index} className="rounded-lg border border-border p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{index + 1}</span>
                    <span className="flex-1 text-sm font-medium text-text-primary">{item.acao}</span>
                    <span className="text-xs font-medium text-text-secondary">{item.peso_bp !== null ? `${(item.peso_bp / 100).toFixed(2)}%` : '—'}</span>
                  </div>
                  {item.como ? <p className="ml-7 text-xs text-text-secondary">{item.como}</p> : null}
                  {item.recommended_responsible_role ? <p className="ml-7 mt-1 text-xs text-text-secondary">Responsável: {RESPONSIBLE_ROLE_OPTIONS.find(role => role.value === item.recommended_responsible_role)?.label ?? item.recommended_responsible_role}</p> : null}
                  {item.support_material_type === 'arquivo' && item.file_asset_name ? (
                    <p className="ml-7 mt-1 flex items-center gap-1 text-xs text-primary"><Paperclip size={12} />{item.file_asset_name}</p>
                  ) : null}
                  {item.support_material_type === 'aula' && item.treinamento_titulo ? (
                    <p className="ml-7 mt-1 flex items-center gap-1 text-xs text-primary"><GraduationCap size={12} />{item.treinamento_titulo}</p>
                  ) : null}
                </div>
              ))}
              {!items.length ? <p className="text-xs text-text-disabled">Sem itens nesta versão.</p> : null}
            </div>
          </div>

          {template.owner_suggestion_enabled && version ? (
            <div className="rounded-lg bg-status-info-surface p-3">
              <h4 className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase text-status-info-text"><Send size={12} />Sugestão ao Dono</h4>
              <p className="text-sm font-medium text-status-info-text">{version.owner_suggestion_title || template.nome}</p>
              {version.owner_suggestion_problem ? <p className="mt-1 text-xs text-status-info-text">{version.owner_suggestion_problem}</p> : null}
              {version.owner_suggestion_recommendation ? <p className="mt-1 text-xs text-status-info-text">{version.owner_suggestion_recommendation}</p> : null}
            </div>
          ) : null}

          <div className="flex items-center gap-1 text-xs text-text-secondary"><Clock size={12} />Prazo médio dos itens: {items.length ? Math.round(items.reduce((sum, item) => sum + (item.prazo_dias ?? 0), 0) / items.length) : 0} dias</div>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase text-text-secondary">Versões</h4>
            <div className="space-y-1">
              {template.versions.map(entry => (
                <div key={entry.id} className="flex items-center justify-between rounded-lg bg-surface-alt px-3 py-2 text-xs">
                  <span className="font-medium text-text-primary">v{entry.versao}</span>
                  <span className="text-text-secondary">{VERSION_STATUS_LABEL[entry.status] ?? entry.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-border bg-surface-default px-5 py-3">
          {hasDraft ? (
            <>
              <Button variant="outline" size="sm" disabled={props.submitting} onClick={() => props.onEdit(template)}><Pencil size={14} />Editar rascunho</Button>
              <Button size="sm" disabled={props.submitting} onClick={() => props.onPublish(template)}><FileCheck size={14} />Publicar</Button>
            </>
          ) : null}
          {hasPublished && !hasDraft && template.active ? (
            <>
              <Button variant="outline" size="sm" disabled={props.submitting} onClick={() => props.onCreateVersion(template)}><RefreshCw size={14} />Nova versão</Button>
              {template.manual_application_enabled ? <Button size="sm" disabled={props.submitting} onClick={() => props.onApply(template)}><Zap size={14} />Aplicar a Cliente</Button> : null}
              {template.owner_suggestion_enabled ? <Button variant="outline" size="sm" disabled={props.submitting} onClick={() => props.onSuggest(template)}><Send size={14} />Sugerir ao Dono</Button> : null}
            </>
          ) : null}
          {!allArchived ? (
            <Button variant="outline" size="sm" disabled={props.submitting} onClick={() => props.onToggleActive(template)}>
              {template.active ? <PowerOff size={14} /> : <Power size={14} />}{template.active ? 'Desativar' : 'Reativar'}
            </Button>
          ) : null}
          {!allArchived ? (
            <Button variant="outline" size="sm" disabled={props.submitting} onClick={() => props.onArchive(template)}><Archive size={14} />Arquivar</Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
