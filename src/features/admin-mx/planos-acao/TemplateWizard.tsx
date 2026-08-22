import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, Copy, Eye, FileCheck, GraduationCap, Loader2, Plus, Save, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxSelect, MxStatusBanner, MxTextarea } from '@/components/module/MxModuleVisualPrimitives'
import {
  calculateItemWeights,
  emptyTemplateItem,
  fetchIndicatorCatalog,
  fetchPublishedTrainings,
  formatTemplateWizardEffectivenessOption,
  formatTemplateWizardPrimaryOption,
  validateTemplateDraft,
  type ActionPlanTemplateItem,
  type ImprovementDirection,
  type IndicatorCatalogEntry,
  type PublishedTraining,
  type SupportMaterialType,
  type TemplateDraft,
  type TemplateItemPriority,
  withPersistedIndicatorOption,
} from './actionPlanTemplates'
import { uploadLibraryFile } from '../consultoria-mx/consultoriaMxData'
import { ACTION_PLAN_DEPARTMENT_CARDS, departmentLabel } from './departmentTaxonomy'

const STEPS = [
  { id: 1, label: 'Indicador' },
  { id: 2, label: 'Ações' },
  { id: 3, label: 'Prazo e Meta' },
  { id: 4, label: 'Revisão e Publicação' },
] as const

const DIRECTIONS: Array<{ value: ImprovementDirection; label: string }> = [
  { value: 'aumentar', label: 'Aumentar' },
  { value: 'reduzir', label: 'Reduzir' },
  { value: 'manter', label: 'Manter' },
  { value: 'faixa', label: 'Atingir faixa ideal' },
  { value: 'corrigir_processo', label: 'Corrigir processo' },
]

const TEMPLATE_PRIORITIES: Array<{ value: TemplateItemPriority; label: string }> = [
  { value: 'critica', label: 'Crítica' },
  { value: 'media', label: 'Atenção' },
  { value: 'baixa', label: 'Evolução' },
]

const SUPPORT_MATERIALS: Array<{ value: SupportMaterialType; label: string }> = [
  { value: 'nenhum', label: 'Nenhum material' },
  { value: 'arquivo', label: 'Adicionar arquivo' },
  { value: 'aula', label: 'Vincular aula da Universidade MX' },
]

function suggestTitle(direction: ImprovementDirection, indicatorLabel: string): string {
  if (!indicatorLabel) return ''
  const labels: Record<ImprovementDirection, string> = {
    aumentar: 'Aumentar',
    reduzir: 'Reduzir',
    manter: 'Manter',
    faixa: 'Atingir faixa ideal',
    corrigir_processo: 'Corrigir processo',
  }
  return `${labels[direction]} ${indicatorLabel}`
}

function priorityLabel(value: string): string {
  return TEMPLATE_PRIORITIES.find(item => item.value === value)?.label ?? value
}

export function TemplateWizard(props: {
  open: boolean
  editing: boolean
  draft: TemplateDraft
  submitting: boolean
  onDraft: (draft: TemplateDraft | ((current: TemplateDraft) => TemplateDraft)) => void
  onSubmit: () => Promise<boolean> | boolean | void
  onPublish?: () => void
  onClose: () => void
}) {
  const [step, setStep] = useState(1)
  const [titleCustomized, setTitleCustomized] = useState(Boolean(props.draft.nome))
  const [indicators, setIndicators] = useState<IndicatorCatalogEntry[]>([])
  const [trainings, setTrainings] = useState<PublishedTraining[]>([])
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!props.open) return
    setStep(1)
    setTitleCustomized(props.editing || Boolean(props.draft.nome))
    setLastSaved(null)
    setStepErrors({})
    void fetchIndicatorCatalog().then(result => setIndicators(result.rows))
    void fetchPublishedTrainings().then(result => setTrainings(result.rows))
  }, [props.open])

  const deptIndicators = useMemo(
    () => withPersistedIndicatorOption(indicators, props.draft.departamento, props.draft.primary_indicator_code, props.draft.indicador),
    [indicators, props.draft.departamento, props.draft.indicador, props.draft.primary_indicator_code],
  )
  const weights = useMemo(() => calculateItemWeights(props.draft.items.length), [props.draft.items.length])
  const errors = validateTemplateDraft({ ...props.draft, template_key: props.draft.template_key || 'plano_padrao', items: props.draft.items.map(item => ({ ...item, problema: item.problema || item.acao })) })

  if (!props.open) return null

  const patch = (values: Partial<TemplateDraft>) => props.onDraft(current => ({ ...current, ...values }))
  const patchItem = (index: number, values: Partial<ActionPlanTemplateItem>) =>
    patch({ items: props.draft.items.map((item, position) => (position === index ? { ...item, ...values } : item)) })

  const onIndicatorChange = (code: string) => {
    const indicator = indicators.find(entry => entry.code === code) ?? deptIndicators.find(entry => entry.code === code)
    const nextDirection: ImprovementDirection = indicator?.direction === 'DIMINUIR' ? 'reduzir' : indicator?.direction === 'AUMENTAR' ? 'aumentar' : props.draft.improvement_direction
    const nextTitle = titleCustomized ? props.draft.nome : suggestTitle(nextDirection, indicator?.label ?? '')
    patch({
      primary_indicator_code: code,
      indicador: indicator?.label ?? '',
      nome: nextTitle,
      improvement_direction: nextDirection,
      effectiveness_indicator_code: props.draft.effectiveness_indicator_code || code,
    })
  }

  const onDirectionChange = (direction: ImprovementDirection) => {
    const indicator = indicators.find(entry => entry.code === props.draft.primary_indicator_code)
    const nextTitle = titleCustomized ? props.draft.nome : suggestTitle(direction, indicator?.label ?? '')
    patch({ improvement_direction: direction, nome: nextTitle })
  }

  const addItem = () => patch({ items: [...props.draft.items, emptyTemplateItem(props.draft.items.length + 1)] })
  const removeItem = (index: number) => patch({ items: props.draft.items.filter((_, position) => position !== index) })
  const duplicateItem = (index: number) => {
    const items = [...props.draft.items]
    items.splice(index + 1, 0, { ...items[index] })
    patch({ items })
  }
  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= props.draft.items.length) return
    const items = [...props.draft.items]
    ;[items[index], items[target]] = [items[target], items[index]]
    patch({ items })
  }

  const handleFileUpload = async (index: number, file: File | undefined) => {
    if (!file) return
    setUploadingIndex(index)
    const result = await uploadLibraryFile(file, 'planos-acao-templates')
    setUploadingIndex(null)
    if (result.error || !result.path) return
    patchItem(index, { file_asset_path: result.path, file_asset_name: file.name })
  }

  const validateStep = (target: number) => {
    const nextErrors: Record<string, string> = {}
    if (target === 1) {
      if (!props.draft.departamento) nextErrors.departamento = 'Selecione um departamento.'
      if (!props.draft.primary_indicator_code) nextErrors.indicador = 'Selecione um indicador principal.'
      if (!props.draft.nome.trim()) nextErrors.nome = 'Informe o título do Plano de Ação.'
    }
    if (target === 2) {
      if (!props.draft.items.length || props.draft.items.some(item => !item.acao.trim())) nextErrors.acoes = 'Informe o nome de todas as ações.'
    }
    if (target === 3) {
      const days = props.draft.items[0]?.prazo_dias
      if (!days || days <= 0) nextErrors.prazo = 'Informe o prazo recomendado.'
      if (!props.draft.items[0]?.prioridade) nextErrors.prioridade = 'Selecione a prioridade padrão.'
      if (!props.draft.effectiveness_indicator_code) nextErrors.eficacia = 'Selecione o indicador de eficácia.'
    }
    setStepErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const persistDraft = async () => {
    const saved = await props.onSubmit()
    if (saved) setLastSaved(new Date())
    return saved !== false
  }

  const next = async () => {
    if (!validateStep(step)) return
    await persistDraft()
    setStep(current => Math.min(4, current + 1))
  }
  const prev = () => setStep(current => Math.max(1, current - 1))

  const recommendedDays = props.draft.items[0]?.prazo_dias ?? 30
  const defaultPriority = props.draft.items[0]?.prioridade ?? 'media'

  return (
    <>
      <Modal
        open={props.open}
        onClose={props.onClose}
        title={props.editing ? 'Editar Plano Padrão' : 'Criar Plano Padrão'}
        description={lastSaved ? `Última gravação: ${lastSaved.toLocaleTimeString('pt-BR')}` : undefined}
        size="2xl"
        closeOnEscape={!props.submitting}
        footer={(
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              {step > 1 ? <Button variant="outline" onClick={prev} disabled={props.submitting}><ChevronLeft size={14} />Voltar</Button> : null}
              <Button variant="outline" onClick={() => void persistDraft()} disabled={props.submitting}>
                {props.submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Salvar rascunho
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {step === 4 ? <Button variant="outline" onClick={() => setShowPreview(true)}><Eye size={16} />Visualizar como Dono</Button> : null}
              {step < 4 ? <Button onClick={() => void next()} disabled={props.submitting}>Continuar<ChevronRight size={14} /></Button> : null}
              {step === 4 && props.onPublish ? (
                <Button onClick={props.onPublish} disabled={props.submitting || errors.length > 0}>
                  <FileCheck size={16} />{props.submitting ? 'Publicando...' : 'Publicar Plano Padrão'}
                </Button>
              ) : null}
            </div>
          </div>
        )}
      >
        <div className="mt-2 space-y-5">
          <div>
            <div className="flex items-center">
              {STEPS.map((item, index) => (
                <div key={item.id} className="flex min-w-0 flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold ${
                      step === item.id ? 'border-primary bg-primary text-primary-foreground'
                        : step > item.id ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-surface-default text-text-disabled'
                    }`}
                    >
                      {step > item.id ? <Check size={12} /> : item.id}
                    </div>
                    <span className={`mt-1 whitespace-nowrap text-[10px] ${step === item.id ? 'font-medium text-primary' : 'text-text-disabled'}`}>{item.label}</span>
                  </div>
                  {index < STEPS.length - 1 ? <div className={`mx-1 h-0.5 flex-1 ${step > item.id ? 'bg-primary' : 'bg-border'}`} /> : null}
                </div>
              ))}
            </div>
            <p className="mt-1 text-xs text-text-secondary md:hidden">Passo {step} de 4</p>
          </div>

          {errors.length && step === 4 ? <MxStatusBanner tone="warning">{errors[0]}</MxStatusBanner> : null}

          {step === 1 ? (
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-text-primary">Indicador</h4>
                <p className="mt-0.5 text-xs text-text-secondary">Selecione o departamento e o indicador que este Plano de Ação pretende melhorar.</p>
              </div>
              <MxField label="Departamento *">
                <MxSelect aria-label="Departamento" value={props.draft.departamento} onChange={event => { patch({ departamento: event.target.value, primary_indicator_code: '', indicador: '', effectiveness_indicator_code: '' }) }}>
                  <option value="">Selecionar...</option>
                  {ACTION_PLAN_DEPARTMENT_CARDS.map(dept => <option key={dept.code} value={dept.code}>{dept.label}</option>)}
                </MxSelect>
                {stepErrors.departamento ? <p className="mt-1 text-xs text-status-danger-text">{stepErrors.departamento}</p> : null}
              </MxField>
              <MxField label="Indicador Principal *">
                <MxSelect aria-label="Indicador principal" value={props.draft.primary_indicator_code} onChange={event => onIndicatorChange(event.target.value)} disabled={!props.draft.departamento}>
                  <option value="">{props.draft.departamento ? 'Selecione um indicador' : 'Selecione primeiro um departamento'}</option>
                  {deptIndicators.map(indicator => (
                    <option key={indicator.code} value={indicator.code}>{formatTemplateWizardPrimaryOption(indicator)}</option>
                  ))}
                </MxSelect>
                {stepErrors.indicador ? <p className="mt-1 text-xs text-status-danger-text">{stepErrors.indicador}</p> : null}
              </MxField>
              <MxField label="Título do Plano *">
                <Input value={props.draft.nome} onChange={event => { setTitleCustomized(true); patch({ nome: event.target.value }) }} placeholder="Título do Plano de Ação" />
                {titleCustomized && props.draft.indicador ? (
                  <button type="button" className="mt-1 text-xs text-primary hover:underline focus-visible:underline" onClick={() => { setTitleCustomized(false); patch({ nome: suggestTitle(props.draft.improvement_direction, props.draft.indicador) }) }}>
                    Usar título sugerido
                  </button>
                ) : null}
                {stepErrors.nome ? <p className="mt-1 text-xs text-status-danger-text">{stepErrors.nome}</p> : null}
              </MxField>
              <MxField label="Direção de Melhoria *">
                <MxSelect aria-label="Direção de melhoria" value={props.draft.improvement_direction} onChange={event => onDirectionChange(event.target.value as ImprovementDirection)}>
                  {DIRECTIONS.map(direction => <option key={direction.value} value={direction.value}>{direction.label}</option>)}
                </MxSelect>
              </MxField>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-text-primary">Ações</h4>
                <p className="mt-0.5 text-xs text-text-secondary">Crie as ações que deverão ser executadas quando este Plano for aplicado a um cliente.</p>
              </div>
              {stepErrors.acoes ? <p className="text-xs text-status-danger-text">{stepErrors.acoes}</p> : null}
              {props.draft.items.map((item, index) => (
                <ActionCard
                  key={`${item.id ?? 'new'}-${index}`}
                  item={item}
                  index={index}
                  total={props.draft.items.length}
                  weight={weights[index]?.weight_percentage_display}
                  trainings={trainings}
                  uploading={uploadingIndex === index}
                  onChange={values => patchItem(index, values)}
                  onDuplicate={() => duplicateItem(index)}
                  onRemove={() => removeItem(index)}
                  onMove={direction => moveItem(index, direction)}
                  onFileUpload={file => void handleFileUpload(index, file)}
                />
              ))}
              <Button onClick={addItem}><Plus size={14} />Adicionar Ação</Button>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-text-primary">Prazo e Meta</h4>
                <p className="mt-0.5 text-xs text-text-secondary">Defina o prazo recomendado, a prioridade e o indicador que medirá a eficácia deste Plano.</p>
              </div>
              <MxField label="Prazo Recomendado em Dias *">
                <Input
                  type="number"
                  min={1}
                  value={String(recommendedDays)}
                  onChange={event => {
                    const prazo_dias = Number(event.target.value) || 0
                    patch({ items: props.draft.items.map(item => ({ ...item, prazo_dias })) })
                  }}
                />
                {stepErrors.prazo ? <p className="mt-1 text-xs text-status-danger-text">{stepErrors.prazo}</p> : null}
              </MxField>
              <MxField label="Prioridade Padrão *">
                <MxSelect
                  aria-label="Prioridade padrão"
                  value={defaultPriority}
                  onChange={event => {
                    const prioridade = event.target.value as TemplateItemPriority
                    patch({ items: props.draft.items.map(item => ({ ...item, prioridade })) })
                  }}
                >
                  {TEMPLATE_PRIORITIES.map(priority => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
                </MxSelect>
                {stepErrors.prioridade ? <p className="mt-1 text-xs text-status-danger-text">{stepErrors.prioridade}</p> : null}
              </MxField>
              <MxField label="Indicador de Eficácia *">
                <MxSelect aria-label="Indicador de eficácia" value={props.draft.effectiveness_indicator_code} onChange={event => patch({ effectiveness_indicator_code: event.target.value })}>
                  <option value="">Selecionar...</option>
                  {deptIndicators.map(indicator => <option key={indicator.code} value={indicator.code}>{formatTemplateWizardEffectivenessOption(indicator)}</option>)}
                </MxSelect>
                {stepErrors.eficacia ? <p className="mt-1 text-xs text-status-danger-text">{stepErrors.eficacia}</p> : null}
              </MxField>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-3 text-sm">
              <div>
                <h4 className="text-sm font-semibold text-text-primary">Revisão e Publicação</h4>
                <p className="mt-0.5 text-xs text-text-secondary">Revise o Plano Padrão antes de disponibilizá-lo para aplicação nos clientes.</p>
              </div>
              <div className="space-y-1 rounded-lg bg-surface-alt p-3">
                <h5 className="mb-1 text-xs font-semibold uppercase text-text-secondary">Identificação</h5>
                <div className="flex justify-between"><span className="text-text-secondary">Departamento:</span><span className="font-medium">{departmentLabel(props.draft.departamento)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">Indicador Principal:</span><span className="text-right font-medium">{props.draft.indicador || '—'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">Título:</span><span className="text-right font-medium">{props.draft.nome || '—'}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">Direção:</span><span className="font-medium">{DIRECTIONS.find(item => item.value === props.draft.improvement_direction)?.label || '—'}</span></div>
              </div>
              <div className="space-y-2 rounded-lg bg-surface-alt p-3">
                <h5 className="mb-1 text-xs font-semibold uppercase text-text-secondary">Ações ({props.draft.items.length})</h5>
                {props.draft.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className="font-medium">{index + 1}. {item.acao || '—'}</span>
                    <span className="text-text-secondary">{weights[index]?.weight_percentage_display}</span>
                  </div>
                ))}
                <div className="mt-2 flex justify-between border-t border-border pt-2">
                  <span className="font-medium text-text-secondary">Peso total:</span>
                  <span className="font-bold text-primary">100.00%</span>
                </div>
              </div>
              <div className="space-y-1 rounded-lg bg-surface-alt p-3">
                <h5 className="mb-1 text-xs font-semibold uppercase text-text-secondary">Prazo e Meta</h5>
                <div className="flex justify-between"><span className="text-text-secondary">Prazo recomendado:</span><span className="font-medium">{recommendedDays} dias</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">Prioridade:</span><span className="font-medium">{priorityLabel(defaultPriority)}</span></div>
                <div className="flex justify-between gap-4"><span className="text-text-secondary">Indicador de Eficácia:</span><span className="text-right font-medium">{deptIndicators.find(item => item.code === props.draft.effectiveness_indicator_code)?.label || props.draft.indicador || '—'}</span></div>
              </div>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={props.draft.manual_application_enabled} disabled={props.submitting} onChange={event => patch({ manual_application_enabled: event.target.checked })} />
                  Disponível para aplicação nos clientes
                </label>
                <p className="ml-6 text-xs text-text-disabled">Permite que a equipe MX utilize este modelo na área dos clientes.</p>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={props.draft.owner_suggestion_enabled} disabled={props.submitting} onChange={event => patch({ owner_suggestion_enabled: event.target.checked })} />
                  Disponível para sugestão ao Dono
                </label>
                <p className="ml-6 text-xs text-text-disabled">Permite que o Plano seja apresentado como recomendação no Módulo Dono.</p>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      {showPreview ? (
        <PreviewAsOwner
          draft={props.draft}
          weights={weights}
          recommendedDays={recommendedDays}
          priority={priorityLabel(defaultPriority)}
          efficacy={deptIndicators.find(item => item.code === props.draft.effectiveness_indicator_code)?.label || props.draft.indicador}
          onClose={() => setShowPreview(false)}
        />
      ) : null}
    </>
  )
}

function ActionCard(props: {
  item: ActionPlanTemplateItem
  index: number
  total: number
  weight?: string
  trainings: PublishedTraining[]
  uploading: boolean
  onChange: (values: Partial<ActionPlanTemplateItem>) => void
  onDuplicate: () => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
  onFileUpload: (file: File | undefined) => void
}) {
  const [expanded, setExpanded] = useState(Boolean(props.item.como))
  const [lessonSearch, setLessonSearch] = useState('')
  const filtered = props.trainings.filter(training => !lessonSearch || training.title.toLowerCase().includes(lessonSearch.toLowerCase()))

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-start gap-2">
        <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-alt text-xs font-bold text-text-secondary">{props.index + 1}</span>
        <div className="min-w-0 flex-1 space-y-2">
          <Input value={props.item.acao} onChange={event => props.onChange({ acao: event.target.value, problema: event.target.value })} placeholder="Nome da Ação *" />
          {expanded ? (
            <MxTextarea rows={2} value={props.item.como} onChange={event => props.onChange({ como: event.target.value })} placeholder="Descreva de forma objetiva como esta ação deve ser realizada." />
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <MxSelect
              aria-label={`Material de apoio do item ${props.index + 1}`}
              value={props.item.support_material_type}
              onChange={event => props.onChange({ support_material_type: event.target.value as SupportMaterialType, file_asset_path: null, file_asset_name: null, treinamento_id: null, treinamento_titulo: null })}
              className="w-auto text-xs"
            >
              {SUPPORT_MATERIALS.map(material => <option key={material.value} value={material.value}>{material.label}</option>)}
            </MxSelect>
            {props.item.support_material_type === 'arquivo' ? (
              props.item.file_asset_name ? (
                <span className="flex items-center gap-1 text-xs text-text-secondary"><Check size={12} className="text-primary" />{props.item.file_asset_name}</span>
              ) : (
                <label className="flex cursor-pointer items-center gap-1 text-xs text-primary hover:underline focus-visible:underline">
                  {props.uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  Enviar arquivo
                  <input type="file" className="hidden" onChange={event => props.onFileUpload(event.target.files?.[0])} />
                </label>
              )
            ) : null}
            {props.item.support_material_type === 'aula' ? (
              props.item.treinamento_titulo ? (
                <span className="flex items-center gap-1 text-xs text-text-secondary"><GraduationCap size={12} className="text-primary" />{props.item.treinamento_titulo}</span>
              ) : (
                <MxSelect
                  aria-label={`Aula vinculada ao item ${props.index + 1}`}
                  value={props.item.treinamento_id ?? ''}
                  onChange={event => {
                    const training = props.trainings.find(entry => entry.id === event.target.value)
                    props.onChange({ treinamento_id: training?.id ?? null, treinamento_titulo: training?.title ?? null })
                  }}
                  className="w-auto text-xs"
                >
                  <option value="">{filtered.length ? 'Vincular aula' : 'Nenhuma aula publicada'}</option>
                  {filtered.map(training => <option key={training.id} value={training.id}>{training.title}</option>)}
                </MxSelect>
              )
            ) : null}
          </div>
          {props.item.support_material_type === 'aula' && !props.item.treinamento_titulo ? (
            <Input value={lessonSearch} onChange={event => setLessonSearch(event.target.value)} placeholder="Buscar aula..." className="text-xs" />
          ) : null}
          <p className="text-xs text-text-secondary">Peso: <span className="font-medium">{props.weight || '—'}</span></p>
        </div>
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="icon" aria-label={expanded ? 'Recolher instrução' : 'Expandir instrução'} onClick={() => setExpanded(open => !open)}><ChevronRight size={14} className={expanded ? 'rotate-90' : ''} /></Button>
          <Button variant="ghost" size="icon" aria-label="Mover para cima" onClick={() => props.onMove(-1)} disabled={props.index === 0}><ArrowUp size={14} /></Button>
          <Button variant="ghost" size="icon" aria-label="Mover para baixo" onClick={() => props.onMove(1)} disabled={props.index === props.total - 1}><ArrowDown size={14} /></Button>
          <Button variant="ghost" size="icon" aria-label="Duplicar ação" onClick={props.onDuplicate}><Copy size={14} /></Button>
          <Button variant="ghost" size="icon" aria-label="Excluir ação" onClick={props.onRemove} disabled={props.total <= 1}><Trash2 size={14} /></Button>
        </div>
      </div>
    </div>
  )
}

function PreviewAsOwner(props: {
  draft: TemplateDraft
  weights: Array<{ weight_percentage_display: string }>
  recommendedDays: number
  priority: string
  efficacy: string
  onClose: () => void
}) {
  return (
    <Modal
      open
      onClose={props.onClose}
      title="Prévia do Plano Padrão — Ainda não publicado"
      size="md"
      footer={<Button variant="outline" onClick={props.onClose}>Fechar</Button>}
    >
      <div className="space-y-4 p-1">
        <div>
          <h4 className="text-lg font-bold text-text-primary">{props.draft.nome || 'Sem título'}</h4>
          <p className="mt-1 text-xs text-text-secondary">{departmentLabel(props.draft.departamento)} · {props.draft.indicador} · {DIRECTIONS.find(item => item.value === props.draft.improvement_direction)?.label}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-surface-alt p-2"><div className="text-xs text-text-secondary">Prazo</div><div className="text-sm font-bold">{props.recommendedDays} dias</div></div>
          <div className="rounded-lg bg-surface-alt p-2"><div className="text-xs text-text-secondary">Prioridade</div><div className="text-sm font-bold">{props.priority}</div></div>
          <div className="rounded-lg bg-surface-alt p-2"><div className="text-xs text-text-secondary">Eficácia</div><div className="truncate text-sm font-bold">{props.efficacy || '—'}</div></div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h5 className="text-sm font-semibold">Checklist ({props.draft.items.length})</h5>
            <span className="text-xs text-text-secondary">Progresso: 0%</span>
          </div>
          <div className="mb-3 h-2 w-full rounded-full bg-surface-alt"><div className="h-full w-0 rounded-full bg-primary" /></div>
          <div className="space-y-2">
            {props.draft.items.map((item, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <div className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-border" />
                <div className="flex-1">
                  <span className="font-medium">{item.acao}</span>
                  {item.como ? <p className="mt-0.5 text-xs text-text-secondary">{item.como}</p> : null}
                  {item.support_material_type === 'arquivo' && item.file_asset_name ? <p className="mt-0.5 text-xs text-primary">📎 {item.file_asset_name}</p> : null}
                  {item.support_material_type === 'aula' && item.treinamento_titulo ? <p className="mt-0.5 flex items-center gap-1 text-xs text-primary"><GraduationCap size={12} />{item.treinamento_titulo}</p> : null}
                </div>
                <span className="shrink-0 text-xs text-text-disabled">{props.weights[index]?.weight_percentage_display}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
