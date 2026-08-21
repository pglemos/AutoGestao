import { useEffect, useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxInput, MxSelect, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { emptyProgramDraft, validateProgramDraft, type ProgramDraft } from './programMutations'
import { resolveVisitVolumeRule } from './visitVolumeRule'

const MODALITIES = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'online', label: 'Online' },
  { value: 'hibrido', label: 'Híbrido' },
]

export function ProgramEditModal(props: {
  open: boolean
  initial: ProgramDraft | null
  submitting: boolean
  products: Array<{
    program_key: string
    name: string | null
    status?: string | null
    modalidade?: string | null
    total_visits?: number | null
    min_presenciais?: number | null
    max_presenciais?: number | null
  }>
  team: Array<{ id: string; name: string | null; email: string | null; role: string | null }>
  onSubmit: (draft: ProgramDraft) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<ProgramDraft>(() => props.initial ?? emptyProgramDraft())

  useEffect(() => {
    if (!props.open) return
    setDraft(props.initial ?? emptyProgramDraft())
  }, [props.open, props.initial])

  const errors = useMemo(() => validateProgramDraft(draft), [draft])
  const selectedProduct = useMemo(
    () => props.products.find(product => product.program_key === draft.program_template_key) ?? null,
    [draft.program_template_key, props.products],
  )
  const visitRule = useMemo(
    () => resolveVisitVolumeRule(selectedProduct, draft.modality),
    [draft.modality, selectedProduct],
  )

  const patch = (values: Partial<ProgramDraft>) => setDraft(current => ({ ...current, ...values }))

  const consultants = useMemo(() => {
    return props.team.filter(member => member.role === 'consultor_mx' || member.role === 'administrador_mx' || member.role === 'administrador_geral')
  }, [props.team])

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Editar programa contratado"
      description="Altere o produto, modalidade, vigência e consultores responsáveis da jornada."
      size="lg"
      closeOnEscape={!props.submitting}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={props.submitting}>
            Cancelar
          </Button>
          <Button
            onClick={() => props.onSubmit(draft)}
            disabled={props.submitting || errors.length > 0}
          >
            <FileText size={16} />
            {props.submitting ? 'Salvando...' : 'Salvar programa'}
          </Button>
        </>
      )}
    >
      <div className="mt-5 space-y-5">
        {errors.length ? (
          <MxStatusBanner tone="warning">{errors[0]}</MxStatusBanner>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <MxField label="Produto contratado" className="sm:col-span-2">
            <MxSelect
              aria-label="Produto contratado"
              value={draft.program_template_key}
              onChange={event => {
                const product = props.products.find(item => item.program_key === event.target.value)
                patch({
                  program_template_key: event.target.value,
                  product_name: product?.name ?? event.target.value,
                  modality: draft.modality || product?.modalidade || '',
                })
              }}
            >
              <option value="">Selecione o produto</option>
              {props.products
                .filter(p => p.status !== 'arquivado' && p.status !== 'rascunho')
                .map(product => (
                  <option key={product.program_key} value={product.program_key}>
                    {product.name || product.program_key}
                  </option>
                ))}
            </MxSelect>
          </MxField>

          <MxField label="Modalidade">
            <MxSelect
              aria-label="Modalidade"
              value={draft.modality}
              onChange={event => patch({ modality: event.target.value })}
            >
              <option value="">Selecione a modalidade</option>
              {MODALITIES.map(item => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </MxSelect>
          </MxField>

          {draft.program_template_key ? (
            <div className="rounded-lg border border-border bg-surface-alt p-3 sm:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Regra de visitas presenciais</div>
              <div className="mt-1 text-sm font-semibold text-foreground">{visitRule.label}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {visitRule.detail}{visitRule.totalVisits != null ? ` Jornada: ${visitRule.totalVisits} encontro(s).` : ''}
              </p>
            </div>
          ) : null}

          <MxField label="Responsável MX pela implantação">
            <MxSelect
              aria-label="Responsável MX pela implantação"
              value={draft.implementation_owner_id}
              onChange={event => patch({ implementation_owner_id: event.target.value })}
            >
              <option value="">Selecione o responsável</option>
              {props.team.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name || member.email || member.id}
                </option>
              ))}
            </MxSelect>
          </MxField>

          <MxField label="Início do contrato">
            <MxInput
              type="date"
              value={draft.contract_start_date}
              onChange={event => patch({ contract_start_date: event.target.value })}
            />
          </MxField>

          <MxField label="Fim do contrato">
            <MxInput
              type="date"
              value={draft.contract_end_date}
              onChange={event => patch({ contract_end_date: event.target.value })}
            />
          </MxField>

          <MxField label="Consultor responsável (carteira)" className="sm:col-span-2">
            <MxSelect
              aria-label="Consultor responsável"
              value={draft.responsible_consultant_id}
              onChange={event => {
                const newResp = event.target.value
                patch({
                  responsible_consultant_id: newResp,
                  auxiliary_consultant_ids: draft.auxiliary_consultant_ids.filter(id => id !== newResp),
                })
              }}
            >
              <option value="">Selecione o consultor responsável</option>
              {consultants.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name || member.email || member.id}
                </option>
              ))}
            </MxSelect>
          </MxField>

          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-foreground">
              Consultores auxiliares / equipe de apoio
            </span>
            <div className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
              {consultants
                .filter(member => member.id !== draft.responsible_consultant_id)
                .map(member => {
                  const isChecked = draft.auxiliary_consultant_ids.includes(member.id)
                  return (
                    <label key={member.id} className="flex items-center gap-2 text-xs text-foreground">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={event => {
                          patch({
                            auxiliary_consultant_ids: event.target.checked
                              ? [...draft.auxiliary_consultant_ids, member.id]
                              : draft.auxiliary_consultant_ids.filter(id => id !== member.id),
                          })
                        }}
                      />
                      <span>{member.name || member.email || member.id}</span>
                    </label>
                  )
                })}
              {consultants.filter(member => member.id !== draft.responsible_consultant_id).length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum outro consultor disponível.</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
