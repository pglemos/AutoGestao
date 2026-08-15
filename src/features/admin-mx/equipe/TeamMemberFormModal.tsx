import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxSelect, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { validateTeamMemberDraft, type TeamMemberDraft } from './teamMutations'

const ROLE_OPTIONS = [
  { value: 'administrador_geral', label: 'Administrador geral' },
  { value: 'administrador_mx', label: 'Administrador MX' },
  { value: 'consultor_mx', label: 'Consultor MX' },
]

export function TeamMemberFormModal(props: {
  open: boolean
  draft: TeamMemberDraft
  submitting: boolean
  clients: Array<{ id: string; name: string }>
  assignedClientIds: string[]
  onDraft: (draft: TeamMemberDraft) => void
  onAssigned: (clientIds: string[]) => void
  onSubmit: () => void
  onClose: () => void
}) {
  const errors = validateTeamMemberDraft(props.draft)

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Editar pessoa da equipe MX"
      size="lg"
      closeOnEscape={!props.submitting}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={props.submitting}>Cancelar</Button>
          <Button onClick={props.onSubmit} disabled={props.submitting || errors.length > 0}>{props.submitting ? 'Salvando...' : 'Salvar'}</Button>
        </>
      )}
    >
      <div className="mt-5 space-y-5">
        {errors.length ? <MxStatusBanner tone="warning">{errors[0]}</MxStatusBanner> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <MxField label="Nome"><Input value={props.draft.name} onChange={event => props.onDraft({ ...props.draft, name: event.target.value })} /></MxField>
          <MxField label="E-mail"><Input type="email" value={props.draft.email} onChange={event => props.onDraft({ ...props.draft, email: event.target.value })} /></MxField>
          <MxField label="Telefone"><Input value={props.draft.phone} onChange={event => props.onDraft({ ...props.draft, phone: event.target.value })} /></MxField>
          <MxField label="Papel">
            <MxSelect value={props.draft.role} onChange={event => props.onDraft({ ...props.draft, role: event.target.value })}>
              {ROLE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </MxSelect>
          </MxField>
          <MxField label="Status">
            <MxSelect value={props.draft.active ? 'ativo' : 'inativo'} onChange={event => props.onDraft({ ...props.draft, active: event.target.value === 'ativo' })}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </MxSelect>
          </MxField>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-foreground">Carteira de clientes</legend>
          <p className="text-xs text-muted-foreground">Desmarcar não apaga o vínculo: ele fica inativo e o histórico continua rastreável.</p>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-3">
            {props.clients.length ? props.clients.map(client => (
              <label key={client.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={props.assignedClientIds.includes(client.id)}
                  onChange={event => props.onAssigned(
                    event.target.checked
                      ? [...props.assignedClientIds, client.id]
                      : props.assignedClientIds.filter(id => id !== client.id),
                  )}
                />
                <span>{client.name}</span>
              </label>
            )) : <p className="text-sm text-muted-foreground">Nenhum cliente disponível.</p>}
          </div>
        </fieldset>
      </div>
    </Modal>
  )
}
