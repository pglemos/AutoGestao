import { useEffect, useMemo, useState } from 'react'
import { Building2 } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxInput, MxSelect, MxStatusBanner, MxTextarea } from '@/components/module/MxModuleVisualPrimitives'
import { BRAZILIAN_UFS, emptyStoreDraft, maskStoreCnpj, validateStoreDraft, type StoreDraft, type StoreType } from './storeForm'
import { buildDefaultOperatingHours, validateOperatingHours, type OperatingHoursMap } from './storeOperatingHours'

export function StoreFormModal(props: {
  open: boolean
  clientId: string
  defaultType: StoreType
  initial: StoreDraft | null
  createdBy: string
  submitting: boolean
  onSubmit: (draft: StoreDraft, hours: OperatingHoursMap) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<StoreDraft>(() => props.initial ?? emptyStoreDraft(props.defaultType))
  const [hours, setHours] = useState<OperatingHoursMap>(buildDefaultOperatingHours)

  useEffect(() => {
    if (!props.open) return
    setDraft(props.initial ?? emptyStoreDraft(props.defaultType))
    setHours(buildDefaultOperatingHours())
  }, [props.open, props.initial, props.defaultType])

  const errors = useMemo(() => validateStoreDraft(draft), [draft])
  const hoursError = useMemo(() => validateOperatingHours(hours), [hours])

  const patch = (values: Partial<StoreDraft>) => setDraft(current => ({ ...current, ...values }))

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={props.initial ? 'Editar loja' : props.defaultType === 'matriz' ? 'Cadastrar Matriz' : 'Cadastrar Filial'}
      description="Cadastro estrutural da loja do cliente, com horário de funcionamento padrão MX."
      size="lg"
      closeOnEscape={!props.submitting}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={props.submitting}>Cancelar</Button>
          <Button
            onClick={() => props.onSubmit(draft, hours)}
            disabled={props.submitting || errors.length > 0 || Boolean(hoursError)}
          >
            <Building2 size={16} />{props.submitting ? 'Salvando...' : 'Salvar loja'}
          </Button>
        </>
      )}
    >
      <div className="mt-5 space-y-5">
        {errors.length || hoursError ? (
          <MxStatusBanner tone="warning">{errors[0] ?? hoursError}</MxStatusBanner>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <MxField label="Nome da loja"><MxInput value={draft.name} onChange={event => patch({ name: event.target.value })} placeholder="Filial Centro" /></MxField>
          <MxField label="Tipo">
            <MxSelect aria-label="Tipo da loja" value={draft.store_type} disabled={Boolean(props.initial?.id && props.initial.is_primary)} onChange={event => patch({ store_type: event.target.value as StoreType })}>
              <option value="matriz">Matriz</option>
              <option value="filial">Filial</option>
            </MxSelect>
          </MxField>
          <MxField label="CNPJ"><MxInput value={draft.cnpj} onChange={event => patch({ cnpj: maskStoreCnpj(event.target.value) })} placeholder="00.000.000/0000-00" /></MxField>
          <MxField label="Código interno"><MxInput value={draft.internal_code} onChange={event => patch({ internal_code: event.target.value })} placeholder="002" /></MxField>
          <MxField label="Endereço" className="sm:col-span-2"><MxInput value={draft.address_street} onChange={event => patch({ address_street: event.target.value })} placeholder="Rua, número, complemento" /></MxField>
          <MxField label="CEP"><MxInput value={draft.address_zip} onChange={event => patch({ address_zip: event.target.value })} placeholder="00000-000" /></MxField>
          <MxField label="UF">
            <MxSelect aria-label="UF da loja" value={draft.address_state} onChange={event => patch({ address_state: event.target.value })}>
              <option value="">Selecionar...</option>
              {BRAZILIAN_UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </MxSelect>
          </MxField>
          <MxField label="Data de início"><MxInput type="date" value={draft.opening_date} onChange={event => patch({ opening_date: event.target.value })} /></MxField>
          <MxField label="Status">
            <MxSelect aria-label="Status da loja" value={draft.status} onChange={event => patch({ status: event.target.value as StoreDraft['status'] })}>
              <option value="ativa">Ativa</option>
              <option value="inativa">Inativa</option>
            </MxSelect>
          </MxField>
          <MxField label="Fuso horário"><MxInput value={draft.timezone} onChange={event => patch({ timezone: event.target.value })} /></MxField>
          <MxField label="Observações" className="sm:col-span-2"><MxTextarea rows={2} value={draft.notes} onChange={event => patch({ notes: event.target.value })} /></MxField>
        </div>
      </div>
    </Modal>
  )
}
