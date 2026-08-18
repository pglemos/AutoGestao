import { useEffect, useState } from 'react'
import { Archive, Check, Copy, Pencil, Eye, FileBarChart, Plus } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import { MxEmptyState, MxField, MxInput, MxLoadingState, MxSelect, MxStatusBanner, MxTextarea } from '@/components/module/MxModuleVisualPrimitives'
import { REPORT_SECTIONS, validateReportTemplateName } from './methodology'
import { archiveReportTemplate, duplicateReportTemplate, fetchReportTemplates, publishReportTemplate, saveReportTemplate, type ReportTemplate } from './consultoriaMxData'
import type { ProductWithMethodology } from './consultoriaMxData'
import type { ConsultoriaMxController } from './useConsultoriaMx'

export function ReportTemplatesTab(props: {
  controller: ConsultoriaMxController
  products: ProductWithMethodology[]
}) {
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [edit, setEdit] = useState<ReportTemplate | 'new' | null>(null)
  const [view, setView] = useState<ReportTemplate | null>(null)

  const load = async () => {
    setLoading(true)
    const result = await fetchReportTemplates()
    setTemplates(result.rows)
    setError(result.error)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  useEffect(() => {
    if (props.controller.openCreateReportTemplate) {
      setEdit('new')
      props.controller.setOpenCreateReportTemplate(false)
    }
  }, [props.controller])

  const publish = async (template: ReportTemplate) => {
    if (!props.controller.userId) return
    const result = await publishReportTemplate(template.id, props.controller.userId)
    if (result.error) {
      await props.controller.audit('Modelos de Relatório', 'REPORT_TEMPLATE_PUBLISH', template.name)
      return
    }
    await props.controller.audit('Modelos de Relatório', 'REPORT_TEMPLATE_PUBLISH', template.name)
    await load()
  }

  const archive = async (template: ReportTemplate) => {
    if (!confirm(`Arquivar "${template.name}"?`)) return
    const result = await archiveReportTemplate(template.id)
    if (result.error) {
      await props.controller.audit('Modelos de Relatório', 'REPORT_TEMPLATE_ARCHIVE', template.name)
      return
    }
    await props.controller.audit('Modelos de Relatório', 'REPORT_TEMPLATE_ARCHIVE', template.name)
    await load()
  }

  const duplicate = async (template: ReportTemplate) => {
    const result = await duplicateReportTemplate(template)
    if (result.error) {
      await props.controller.audit('Modelos de Relatório', 'REPORT_TEMPLATE_DUPLICATE', `${template.name} (cópia)`)
      return
    }
    await props.controller.audit('Modelos de Relatório', 'REPORT_TEMPLATE_DUPLICATE', `${template.name} (cópia)`)
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{templates.length} modelos de relatório</p>
        <Button size="sm" onClick={() => setEdit('new')}><Plus size={16} />Criar Modelo</Button>
      </div>

      {loading ? <MxLoadingState label="Carregando modelos de relatório" /> : error ? <MxStatusBanner tone="danger">{error}</MxStatusBanner> : templates.length === 0 ? (
        <MxEmptyState title="Nenhum modelo de relatório" description="Crie modelos reutilizáveis para os encontros da consultoria." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {templates.map(template => {
            const product = props.products.find(item => item.program_key === template.product_key)
            return (
              <div key={template.id} className="rounded-xl border border-border bg-surface-alt/40 p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-info-surface"><FileBarChart size={16} className="text-status-info-text" /></div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{template.name}</h4>
                      <div className="text-xs text-muted-foreground">v{template.version_number} {product ? `· ${product.name}` : ''}</div>
                    </div>
                  </div>
                  <TemplateStatusBadge status={template.status} />
                </div>
                {template.description && <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{template.description}</p>}
                <div className="mb-3 text-xs text-muted-foreground">{template.sections.length} seções</div>
                <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setEdit(template)}><Pencil size={16} />Editar</Button>
                  <Button variant="ghost" size="sm" onClick={() => setView(template)}><Eye size={16} />Visualizar</Button>
                  <Button variant="ghost" size="sm" onClick={() => void duplicate(template)}><Copy size={16} />Duplicar</Button>
                  {template.status === 'rascunho' && <Button variant="ghost" size="sm" onClick={() => void publish(template)}><Check size={16} />Publicar</Button>}
                  {template.status !== 'arquivado' && <Button variant="ghost" size="sm" className="ml-auto" onClick={() => void archive(template)}><Archive size={16} />Arquivar</Button>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {edit !== null && (
        <ReportTemplateModal
          template={edit === 'new' ? null : edit}
          products={props.products}
          onClose={() => setEdit(null)}
          onSaved={() => { setEdit(null); void load() }}
          controller={props.controller}
        />
      )}
      {view && <ReportTemplateViewModal template={view} product={props.products.find(item => item.program_key === view.product_key)} onClose={() => setView(null)} />}
    </div>
  )
}

function TemplateStatusBadge({ status }: { status: string }) {
  if (status === 'publicado') return <span className="rounded-full bg-status-success-surface px-2 py-0.5 text-xs font-medium text-status-success-text">Publicado</span>
  if (status === 'arquivado') return <span className="rounded-full bg-status-error-surface px-2 py-0.5 text-xs font-medium text-status-error-text">Arquivado</span>
  return <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs font-medium text-muted-foreground">Rascunho</span>
}

function ReportTemplateModal(props: {
  template: ReportTemplate | null
  products: ProductWithMethodology[]
  onClose: () => void
  onSaved: () => void
  controller: ConsultoriaMxController
}) {
  const [form, setForm] = useState({
    name: props.template?.name ?? '',
    description: props.template?.description ?? '',
    product_key: props.template?.product_key ?? '',
    instructions: props.template?.instructions ?? '',
    version_number: props.template?.version_number ?? '1.0',
  })
  const [sections, setSections] = useState<string[]>(props.template?.sections ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (field: string, value: string) => setForm(current => ({ ...current, [field]: value }))

  const toggleSection = (section: string) => {
    setSections(current => current.includes(section) ? current.filter(item => item !== section) : [...current, section])
  }

  const save = async () => {
    const invalid = validateReportTemplateName(form.name)
    if (invalid) {
      setError(invalid)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const result = await saveReportTemplate({
        id: props.template?.id,
        name: form.name,
        description: form.description,
        product_key: form.product_key || null,
        sections,
        instructions: form.instructions,
        version_number: props.template?.version_number ?? '1.0',
        status: props.template?.status ?? 'rascunho',
      })
      if (result.error) {
        setError(result.error)
        return
      }
      await props.controller.audit('Modelos de Relatório', props.template ? 'REPORT_TEMPLATE_UPDATE' : 'REPORT_TEMPLATE_CREATE', form.name)
      props.onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={props.onClose} title={props.template ? 'Editar Modelo' : 'Criar Modelo de Relatório'} size="lg" footer={(
      <>
        <Button variant="outline" onClick={props.onClose} disabled={saving}>Cancelar</Button>
        <Button onClick={() => void save()} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
      </>
    )}>
      <div className="space-y-3">
        {error && <MxStatusBanner tone="danger">{error}</MxStatusBanner>}
        <MxField label="Nome *"><MxInput value={form.name} onChange={event => update('name', event.target.value)} /></MxField>
        <MxField label="Descrição"><MxTextarea rows={2} value={form.description} onChange={event => update('description', event.target.value)} /></MxField>
        <MxField label="Produto (opcional)">
          <MxSelect aria-label="Produto do modelo" value={form.product_key} onChange={event => update('product_key', event.target.value)}>
            <option value="">Todos os produtos</option>
            {props.products.map(product => <option key={product.program_key} value={product.program_key}>{product.name ?? product.program_key}</option>)}
          </MxSelect>
        </MxField>
        <MxField label="Instruções"><MxTextarea rows={2} value={form.instructions} onChange={event => update('instructions', event.target.value)} /></MxField>
        <div>
          <div className="mb-2 text-xs font-medium text-foreground">Seções do relatório</div>
          <div className="grid grid-cols-2 gap-1.5">
            {REPORT_SECTIONS.map(section => (
              <button
                key={section}
                onClick={() => toggleSection(section)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-all ${sections.includes(section) ? 'border-brand-primary bg-brand-primary/5 text-status-success-text' : 'border-border text-muted-foreground hover:bg-surface-alt'}`}
              >
                {sections.includes(section) ? <Check size={12} /> : <Plus size={12} />} {section}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function ReportTemplateViewModal(props: { template: ReportTemplate; product: ProductWithMethodology | undefined; onClose: () => void }) {
  return (
    <Modal open onClose={props.onClose} title={props.template.name} description={props.product ? `Produto: ${props.product.name}` : 'Modelo geral'} size="lg" footer={<Button variant="outline" onClick={props.onClose}>Fechar</Button>}>
      <div className="space-y-3">
        {props.template.description && <p className="text-sm text-muted-foreground">{props.template.description}</p>}
        {props.template.instructions && (
          <div className="rounded-lg bg-surface-alt p-3">
            <div className="mb-1 text-xs font-medium text-muted-foreground">Instruções</div>
            <p className="text-sm text-foreground">{props.template.instructions}</p>
          </div>
        )}
        <div>
          <div className="mb-2 text-xs font-medium text-muted-foreground">Seções ({props.template.sections.length})</div>
          <div className="space-y-1">
            {props.template.sections.map((section, index) => (
              <div key={index} className="flex items-center gap-2 rounded-lg bg-surface-alt p-2 text-sm text-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-white">{index + 1}</span>
                {section}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
