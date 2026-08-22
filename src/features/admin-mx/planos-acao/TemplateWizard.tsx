import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Check, Copy, Eye, FileCheck, GraduationCap, Loader2, Plus, Save, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxSelect, MxStatusBanner, MxTextarea } from '@/components/module/MxModuleVisualPrimitives'
import {
  calculateItemWeights,
  emptyTemplateItem,
  fetchIndicatorCatalog,
  fetchPublishedTrainings,
  RESPONSIBLE_ROLE_OPTIONS,
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
import { departmentLabel } from './departmentTaxonomy'

const STEPS = [
  { id: 1, label: 'Indicador' },
  { id: 2, label: 'Ações' },
  { id: 3, label: 'Prazo e Meta' },
  { id: 4, label: 'Revisão' },
] as const

const PRIORITIES: Array<{ value: TemplateItemPriority; label: string }> = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
]

const DIRECTIONS: Array<{ value: ImprovementDirection; label: string }> = [
  { value: 'aumentar', label: 'Aumentar' },
  { value: 'reduzir', label: 'Reduzir' },
  { value: 'manter', label: 'Manter' },
  { value: 'faixa', label: 'Atingir faixa ideal' },
  { value: 'corrigir_processo', label: 'Corrigir processo' },
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

export function TemplateWizard(props: {
  open: boolean
  editing: boolean
  draft: TemplateDraft
  submitting: boolean
  onDraft: (draft: TemplateDraft | ((current: TemplateDraft) => TemplateDraft)) => void
  onSubmit: () => void
  onPublish?: () => void
  onClose: () => void
}) {
  const [step, setStep] = useState(1)
  const [titleCustomized, setTitleCustomized] = useState(Boolean(props.draft.nome))
  const [indicators, setIndicators] = useState<IndicatorCatalogEntry[]>([])
  const [trainings, setTrainings] = useState<PublishedTraining[]>([])
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (!props.open) return
    setStep(1)
    setTitleCustomized(props.editing || Boolean(props.draft.nome))
    void fetchIndicatorCatalog().then(result => setIndicators(result.rows))
    void fetchPublishedTrainings().then(result => setTrainings(result.rows))
  }, [props.open])

  const departments = useMemo(() => [...new Set(indicators.map(indicator => indicator.category))].sort(), [indicators])
  const deptIndicators = useMemo(
    () => withPersistedIndicatorOption(indicators, props.draft.departamento, props.draft.primary_indicator_code, props.draft.indicador),
    [indicators, props.draft.departamento, props.draft.indicador, props.draft.primary_indicator_code],
  )
  const weights = useMemo(() => calculateItemWeights(props.draft.items.length), [props.draft.items.length])
  const errors = validateTemplateDraft(props.draft)

  if (!props.open) return null

  const patch = (values: Partial<TemplateDraft>) => props.onDraft(current => ({ ...current, ...values }))
  const patchItem = (index: number, values: Partial<ActionPlanTemplateItem>) =>
    patch({ items: props.draft.items.map((item, position) => (position === index ? { ...item, ...values } : item)) })

  const onIndicatorChange = (code: string) => {
    const indicator = indicators.find(entry => entry.code === code)
    const nextTitle = titleCustomized ? props.draft.nome : suggestTitle(props.draft.improvement_direction, indicator?.label ?? '')
    patch({ primary_indicator_code: code, indicador: indicator?.label ?? '', nome: nextTitle })
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

  const stepHasErrors = (target: number) => {
    if (target === 1) return !props.draft.departamento || !props.draft.primary_indicator_code || !props.draft.nome.trim()
    if (target === 2) return props.draft.items.every(item => !item.problema.trim() || !item.acao.trim())
    return false
  }

  const next = () => setStep(current => Math.min(4, current + 1))
  const prev = () => setStep(current => Math.max(1, current - 1))

  return (
    <>
      <Modal
        open={props.open}
        onClose={props.onClose}
        title={props.editing ? 'Editar template de plano de ação' : 'Novo template de plano de ação'}
        size="2xl"
        closeOnEscape={!props.submitting}
        footer={(
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              {step > 1 ? <Button variant="outline" onClick={prev} disabled={props.submitting}>Voltar</Button> : null}
              <Button variant="outline" onClick={props.onSubmit} disabled={props.submitting}>
                {props.submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Salvar rascunho
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {step === 4 ? <Button variant="outline" onClick={() => setShowPreview(true)}><Eye size={16} />Visualizar como Dono</Button> : null}
              {step < 4 ? <Button onClick={next} disabled={stepHasErrors(step)}>Continuar</Button> : null}
              {step === 4 && props.onPublish ? (
                <Button onClick={props.onPublish} disabled={props.submitting || errors.length > 0}>
                  <FileCheck size={16} />{props.submitting ? 'Publicando...' : 'Publicar template'}
                </Button>
              ) : null}
            </div>
          </div>
        )}
      >
        <div className="mt-2 space-y-5">
          <div className="flex items-center">
            {STEPS.map((item, index) => (
              <div key={item.id} className="flex flex-1 items-center">
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

          {errors.length && step === 4 ? <MxStatusBanner tone="warning">{errors[0]}</MxStatusBanner> : null}

          {step === 1 ? (
            <div className="space-y-3">
              <MxField label="Departamento">
                <MxSelect aria-label="Departamento" value={props.draft.departamento} onChange={event => { patch({ departamento: event.target.value, primary_indicator_code: '', indicador: '' }) }}>
                  <option value="">Selecionar...</option>
                  {departments.map(dept => <option key={dept} value={dept}>{departmentLabel(dept)}</option>)}
                </MxSelect>
              </MxField>
              <MxField label="Indicador principal">
                <MxSelect aria-label="Indicador principal" value={props.draft.primary_indicator_code} onChange={event => onIndicatorChange(event.target.value)} disabled={!props.draft.departamento}>
                  <option value="">{props.draft.departamento ? 'Selecione um indicador' : 'Selecione primeiro um departamento'}</option>
                  {deptIndicators.map(indicator => <option key={indicator.code} value={indicator.code}>{indicator.label}</option>)}
                </MxSelect>
              </MxField>
              <MxField label="Título do template" hint={titleCustomized ? undefined : 'Sugerido a partir do indicador — edite se quiser.'}>
                <Input value={props.draft.nome} onChange={event => { setTitleCustomized(true); patch({ nome: event.target.value }) }} placeholder="Título do template" />
              </MxField>
              <MxField label="Chave" hint="Minúsculas, números e underline.">
                <Input value={props.draft.template_key} disabled={props.editing} onChange={event => patch({ template_key: event.target.value.trim().toLowerCase() })} placeholder="ruptura_estoque" />
              </MxField>
              <MxField label="Direção de melhoria">
                <MxSelect aria-label="Direção de melhoria" value={props.draft.improvement_direction} onChange={event => onDirectionChange(event.target.value as ImprovementDirection)}>
                  {DIRECTIONS.map(direction => <option key={direction.value} value={direction.value}>{direction.label}</option>)}
                </MxSelect>
              </MxField>
              <MxField label="Descrição (opcional)">
                <MxTextarea rows={2} value={props.draft.descricao} onChange={event => patch({ descricao: event.target.value })} />
              </MxField>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3">
              {props.draft.items.map((item, index) => (
                <div key={index} className="space-y-2 rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-alt text-xs font-bold text-text-secondary">{index + 1}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-text-secondary">{weights[index]?.weight_percentage_display}</span>
                      <Button variant="ghost" size="icon" aria-label={`Mover item ${index + 1} para cima`} onClick={() => moveItem(index, -1)} disabled={index === 0}><ArrowUp size={14} /></Button>
                      <Button variant="ghost" size="icon" aria-label={`Mover item ${index + 1} para baixo`} onClick={() => moveItem(index, 1)} disabled={index === props.draft.items.length - 1}><ArrowDown size={14} /></Button>
                      <Button variant="ghost" size="icon" aria-label={`Duplicar item ${index + 1}`} onClick={() => duplicateItem(index)}><Copy size={14} /></Button>
                      <Button variant="ghost" size="icon" aria-label={`Remover item ${index + 1}`} onClick={() => removeItem(index)} disabled={props.draft.items.length <= 1}><Trash2 size={14} /></Button>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <MxField label="Problema"><Input value={item.problema} onChange={event => patchItem(index, { problema: event.target.value })} /></MxField>
                    <MxField label="Ação"><Input value={item.acao} onChange={event => patchItem(index, { acao: event.target.value })} /></MxField>
                    <MxField label="Como" className="sm:col-span-2"><MxTextarea rows={2} value={item.como} onChange={event => patchItem(index, { como: event.target.value })} /></MxField>
                    <MxField label="Prioridade">
                      <MxSelect aria-label={`Prioridade do item ${index + 1}`} value={item.prioridade} onChange={event => patchItem(index, { prioridade: event.target.value as TemplateItemPriority })}>
                        {PRIORITIES.map(priority => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
                      </MxSelect>
                    </MxField>
                    <MxField label="Responsável recomendado">
                      <MxSelect aria-label={`Responsável recomendado do item ${index + 1}`} value={item.recommended_responsible_role ?? ''} onChange={event => patchItem(index, { recommended_responsible_role: event.target.value || null })}>
                        <option value="">Usar responsável do template</option>
                        {RESPONSIBLE_ROLE_OPTIONS.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
                      </MxSelect>
                    </MxField>
                    <MxField label="Prazo (dias)">
                      <Input type="number" min={0} value={item.prazo_dias === null ? '' : String(item.prazo_dias)} onChange={event => patchItem(index, { prazo_dias: event.target.value === '' ? null : Number(event.target.value) })} />
                    </MxField>
                    <label className="flex items-center gap-2 text-sm sm:col-span-2">
                      <input type="checkbox" checked={item.evidencia_requerida} onChange={event => patchItem(index, { evidencia_requerida: event.target.checked })} />
                      Exige evidência na conclusão
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
                    <MxSelect
                      aria-label={`Material de apoio do item ${index + 1}`}
                      value={item.support_material_type}
                      onChange={event => patchItem(index, { support_material_type: event.target.value as SupportMaterialType, file_asset_path: null, file_asset_name: null, treinamento_id: null, treinamento_titulo: null })}
                      className="w-auto text-xs"
                    >
                      <option value="nenhum">Sem material de apoio</option>
                      <option value="arquivo">Arquivo</option>
                      <option value="aula">Aula da Universidade</option>
                    </MxSelect>
                    {item.support_material_type === 'arquivo' ? (
                      item.file_asset_name ? (
                        <span className="flex items-center gap-1 text-xs text-text-secondary"><Check size={12} className="text-primary" />{item.file_asset_name}</span>
                      ) : (
                        <label className="flex cursor-pointer items-center gap-1 text-xs text-primary hover:underline">
                          {uploadingIndex === index ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                          Enviar arquivo
                          <input type="file" className="hidden" onChange={event => void handleFileUpload(index, event.target.files?.[0])} />
                        </label>
                      )
                    ) : null}
                    {item.support_material_type === 'aula' ? (
                      <MxSelect
                        aria-label={`Aula vinculada ao item ${index + 1}`}
                        value={item.treinamento_id ?? ''}
                        onChange={event => {
                          const training = trainings.find(entry => entry.id === event.target.value)
                          patchItem(index, { treinamento_id: training?.id ?? null, treinamento_titulo: training?.title ?? null })
                        }}
                        className="w-auto text-xs"
                      >
                        <option value="">{trainings.length ? 'Selecionar aula...' : 'Nenhuma aula publicada'}</option>
                        {trainings.map(training => <option key={training.id} value={training.id}>{training.title}</option>)}
                      </MxSelect>
                    ) : null}
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addItem}><Plus size={16} />Adicionar item</Button>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-3">
              <MxField label="Indicador de eficácia" hint="Mede se o template funcionou depois de aplicado.">
                <MxSelect aria-label="Indicador de eficácia" value={props.draft.effectiveness_indicator_code} onChange={event => patch({ effectiveness_indicator_code: event.target.value })}>
                  <option value="">Selecionar...</option>
                  {deptIndicators.map(indicator => <option key={indicator.code} value={indicator.code}>{indicator.label}</option>)}
                </MxSelect>
              </MxField>
              <MxField label="Problema"><MxTextarea rows={2} value={props.draft.problem} onChange={event => patch({ problem: event.target.value })} /></MxField>
              <MxField label="Objetivo"><MxTextarea rows={2} value={props.draft.objective} onChange={event => patch({ objective: event.target.value })} /></MxField>
              <MxField label="Quando aplicar"><MxTextarea rows={2} value={props.draft.when_to_apply} onChange={event => patch({ when_to_apply: event.target.value })} /></MxField>
              <MxField label="Responsável recomendado para o template">
                <MxSelect aria-label="Responsável recomendado para o template" value={props.draft.default_responsible_role} onChange={event => patch({ default_responsible_role: event.target.value })}>
                  <option value="">Não definido</option>
                  {RESPONSIBLE_ROLE_OPTIONS.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
                </MxSelect>
              </MxField>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={props.draft.manual_application_enabled} disabled={props.submitting} onChange={event => patch({ manual_application_enabled: event.target.checked })} />
                Disponível para aplicação nos clientes
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={props.draft.owner_suggestion_enabled} disabled={props.submitting} onChange={event => patch({ owner_suggestion_enabled: event.target.checked })} />
                Disponível para sugestão ao Dono
              </label>
              {props.draft.owner_suggestion_enabled ? (
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <MxField label="Título da sugestão"><Input value={props.draft.owner_suggestion_title} onChange={event => patch({ owner_suggestion_title: event.target.value })} placeholder={props.draft.nome} /></MxField>
                  <MxField label="Problema (para o Dono)"><MxTextarea rows={2} value={props.draft.owner_suggestion_problem} onChange={event => patch({ owner_suggestion_problem: event.target.value })} /></MxField>
                  <MxField label="Recomendação (para o Dono)"><MxTextarea rows={2} value={props.draft.owner_suggestion_recommendation} onChange={event => patch({ owner_suggestion_recommendation: event.target.value })} /></MxField>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-3 text-sm">
              <div className="space-y-1 rounded-lg bg-surface-alt p-3">
                <h5 className="mb-1 text-xs font-semibold uppercase text-text-secondary">Identificação</h5>
                <div className="flex justify-between"><span className="text-text-secondary">Departamento</span><span className="font-medium">{departmentLabel(props.draft.departamento)}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">Indicador</span><span className="font-medium">{props.draft.indicador || '—'}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">Título</span><span className="font-medium">{props.draft.nome || '—'}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">Responsável recomendado</span><span className="font-medium">{RESPONSIBLE_ROLE_OPTIONS.find(role => role.value === props.draft.default_responsible_role)?.label || '—'}</span></div>
              </div>
              <div className="space-y-2 rounded-lg bg-surface-alt p-3">
                <h5 className="mb-1 text-xs font-semibold uppercase text-text-secondary">Ações ({props.draft.items.length})</h5>
                {props.draft.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className="font-medium">{index + 1}. {item.acao || '—'}</span>
                    <span className="text-text-secondary">{weights[index]?.weight_percentage_display}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      {showPreview ? (
        <PreviewAsOwner draft={props.draft} weights={weights} onClose={() => setShowPreview(false)} />
      ) : null}
    </>
  )
}

function PreviewAsOwner(props: { draft: TemplateDraft; weights: Array<{ weight_percentage_display: string }>; onClose: () => void }) {
  return (
    <Modal
      open
      onClose={props.onClose}
      title="Prévia — como o Dono vai ver"
      description="Visualização somente leitura do template antes da publicação."
      size="md"
      footer={<Button variant="outline" onClick={props.onClose}>Fechar</Button>}
    >
        <div className="space-y-4 p-5">
          <div>
            <h4 className="text-lg font-bold text-text-primary">{props.draft.nome || 'Sem título'}</h4>
            <p className="text-xs text-text-secondary">{props.draft.departamento} · {props.draft.indicador}</p>
          </div>
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
    </Modal>
  )
}
