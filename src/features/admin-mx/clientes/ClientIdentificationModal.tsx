import { useEffect, useMemo, useState } from 'react'
import { Building2 } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxInput, MxSelect, MxStatusBanner, MxTextarea } from '@/components/module/MxModuleVisualPrimitives'
import { BRAZILIAN_UFS, maskStoreCnpj } from './storeForm'
import {
  BRAZILIAN_UF_LABELS,
  CLIENT_BUSINESS_PHASES,
  CLIENT_STRUCTURE_LABEL,
  CLIENT_STRUCTURE_TYPES,
  emptyClientIdentificationDraft,
  validateClientIdentificationDraft,
  type ClientIdentificationDraft,
  type ClientStructureType,
} from './clientIdentification'

export function ClientIdentificationModal(props: {
  open: boolean
  submitting: boolean
  initial: ClientIdentificationDraft | null
  requireAddress?: boolean
  onSubmit: (draft: ClientIdentificationDraft) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<ClientIdentificationDraft>(emptyClientIdentificationDraft)
  const requireAddress = props.requireAddress !== false

  useEffect(() => {
    if (!props.open) return
    setDraft(props.initial ?? emptyClientIdentificationDraft())
  }, [props.open, props.initial])

  const errors = useMemo(() => validateClientIdentificationDraft(draft, { requireAddress }), [draft, requireAddress])
  const patch = (values: Partial<ClientIdentificationDraft>) => setDraft(current => ({ ...current, ...values }))

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Editar Identificação do Cliente"
      description="Razão social, CNPJ, nome resumido, cidade, UF, estrutura, fase e vigência."
      size="lg"
      closeOnEscape={!props.submitting}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={props.submitting}>Cancelar</Button>
          <Button
            onClick={() => {
              if (errors.length) return
              props.onSubmit(draft)
            }}
            disabled={props.submitting || errors.length > 0}
          >
            <Building2 size={16} />{props.submitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </>
      )}
    >
      <div className="mt-5 space-y-5">
        {errors.length ? <MxStatusBanner tone="warning">{errors[0]}</MxStatusBanner> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <MxField label="Razão Social *" className="sm:col-span-2">
            <MxInput value={draft.legalName} onChange={event => patch({ legalName: event.target.value })} placeholder="Ex: Weber Motors Ltda." />
          </MxField>
          <MxField label="CNPJ *">
            <MxInput value={draft.cnpj} onChange={event => patch({ cnpj: maskStoreCnpj(event.target.value) })} placeholder="00.000.000/0000-00" />
          </MxField>
          <MxField label="Nome resumido">
            <MxInput value={draft.shortName} onChange={event => patch({ shortName: event.target.value })} placeholder="Ex: Weber" />
          </MxField>
          <MxField label={requireAddress ? 'Cidade *' : 'Cidade'}>
            <MxInput value={draft.city} onChange={event => patch({ city: event.target.value })} />
          </MxField>
          <MxField label={requireAddress ? 'UF *' : 'UF'}>
            <MxSelect aria-label="UF" value={draft.state} onChange={event => patch({ state: event.target.value })}>
              <option value="">Selecionar...</option>
              {BRAZILIAN_UFS.map(uf => <option key={uf} value={uf}>{BRAZILIAN_UF_LABELS[uf]}</option>)}
            </MxSelect>
          </MxField>
          <MxField label="Tipo de estrutura" className="sm:col-span-2">
            <MxSelect
              aria-label="Tipo de estrutura"
              value={draft.structureType}
              onChange={event => patch({ structureType: event.target.value as ClientStructureType | '' })}
            >
              {CLIENT_STRUCTURE_TYPES.map(type => <option key={type} value={type}>{CLIENT_STRUCTURE_LABEL[type]}</option>)}
            </MxSelect>
          </MxField>
          <MxField label="Fase empresarial">
            <MxSelect aria-label="Fase empresarial" value={draft.businessPhase} onChange={event => patch({ businessPhase: event.target.value })}>
              <option value="">Selecionar...</option>
              {CLIENT_BUSINESS_PHASES.map(phase => <option key={phase.value} value={phase.value}>{phase.label}</option>)}
            </MxSelect>
          </MxField>
          <MxField label="Fim do contrato">
            <MxInput type="date" value={draft.contractEndDate} onChange={event => patch({ contractEndDate: event.target.value })} />
          </MxField>
          <MxField label="Observações" className="sm:col-span-2">
            <MxTextarea rows={3} value={draft.notes} onChange={event => patch({ notes: event.target.value })} />
          </MxField>
        </div>
      </div>
    </Modal>
  )
}
