import { useEffect, useState } from 'react'
import { Crown, UserPlus } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxInput, MxSelect, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import {
  emptyPersonAccessDraft,
  PERSON_DEFAULT_VIEWS,
  PERSON_PROFILES,
  PERSON_STATUSES,
  PERSON_STATUS_LABELS,
  uniqueMasterChangeGuard,
  validatePersonAccessDraft,
  type PersonAccessDraft,
  type PersonDefaultView,
  type PersonProfile,
  type PersonStatus,
} from './personAccess'

export type PersonStoreOption = { id: string; name: string }
export type PersonMasterPeer = { id: string; is_dono_master: boolean; status: string }

export function PersonCreateModal(props: {
  open: boolean
  submitting: boolean
  stores: PersonStoreOption[]
  persons?: PersonMasterPeer[]
  personId?: string | null
  initial?: Partial<PersonAccessDraft>
  editing?: boolean
  onSubmit: (draft: PersonAccessDraft) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<PersonAccessDraft>(emptyPersonAccessDraft)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!props.open) return
    setDraft({ ...emptyPersonAccessDraft(), ...props.initial })
    setError('')
  }, [props.open, props.initial])

  const errors = validatePersonAccessDraft(draft)
  const hasDono = draft.papeis.includes('DONO')
  const peers = props.persons ?? []
  const personId = props.personId ?? ''
  const masterDemoteBlock = uniqueMasterChangeGuard({
    persons: peers,
    targetId: personId,
    nextMaster: false,
  })
  const patch = (values: Partial<PersonAccessDraft>) => setDraft(current => ({ ...current, ...values }))

  const blockMasterChange = (nextMaster?: boolean, nextStatus?: string) => {
    const blocked = uniqueMasterChangeGuard({
      persons: peers,
      targetId: personId,
      nextMaster,
      nextStatus,
    })
    if (blocked) {
      setError(blocked)
      return true
    }
    return false
  }

  const toggleRole = (role: PersonProfile) => {
    const removingDono = role === 'DONO' && draft.papeis.includes('DONO')
    if (removingDono && blockMasterChange(false)) return
    setError('')
    setDraft(current => {
      const next = current.papeis.includes(role)
        ? current.papeis.filter(item => item !== role)
        : [...current.papeis, role]
      let nextVisao = current.visao_padrao
      if (role === 'GERENTE_COMERCIAL' && next.includes('GERENTE_COMERCIAL') && (!current.visao_padrao || current.visao_padrao === 'VENDEDOR')) {
        nextVisao = 'GERENCIAL'
      } else if (role === 'DONO' && next.includes('DONO') && (!current.visao_padrao || current.visao_padrao === 'VENDEDOR')) {
        nextVisao = 'DONO'
      } else if (next.length === 1 && next[0] === 'VENDEDOR' && (!current.visao_padrao || current.visao_padrao === 'GERENCIAL' || current.visao_padrao === 'DONO')) {
        nextVisao = 'VENDEDOR'
      }
      // Remover Dono desfaz Dono Master e escopo global.
      if (role === 'DONO' && !next.includes('DONO')) {
        return { ...current, papeis: next, is_dono_master: false, lojas_autorizadas: [], visao_padrao: nextVisao }
      }
      // Marcar Dono + Master atribui todas as lojas.
      if (role === 'DONO' && next.includes('DONO') && current.is_dono_master) {
        return { ...current, papeis: next, lojas_autorizadas: props.stores.map(store => store.id), visao_padrao: nextVisao }
      }
      return { ...current, papeis: next, visao_padrao: nextVisao }
    })
  }

  const toggleMaster = () => {
    if (draft.is_dono_master && blockMasterChange(false)) return
    setError('')
    setDraft(current => {
      const next = !current.is_dono_master
      return {
        ...current,
        is_dono_master: next,
        lojas_autorizadas: next ? props.stores.map(store => store.id) : current.lojas_autorizadas,
        visao_padrao: next && !current.visao_padrao ? 'DONO' : current.visao_padrao,
      }
    })
  }

  const toggleStore = (storeId: string) => {
    if (draft.is_dono_master) return
    setDraft(current => ({
      ...current,
      lojas_autorizadas: current.lojas_autorizadas.includes(storeId)
        ? current.lojas_autorizadas.filter(id => id !== storeId)
        : [...current.lojas_autorizadas, storeId],
    }))
  }

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={props.editing ? 'Editar usuário' : 'Cadastrar Usuário'}
      description="Dados pessoais, perfis de acesso, Dono Master e lojas autorizadas."
      size="lg"
      closeOnEscape={!props.submitting}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={props.submitting}>Cancelar</Button>
          <Button
            onClick={() => {
              const invalid = validatePersonAccessDraft(draft)
              if (invalid.length) {
                setError(invalid[0])
                return
              }
              setError('')
              props.onSubmit(draft)
            }}
            disabled={props.submitting || errors.length > 0}
          >
            <UserPlus size={16} />{props.submitting ? 'Salvando...' : props.editing ? 'Salvar alterações' : 'Salvar usuário'}
          </Button>
        </>
      )}
    >
      <div className="mt-5 space-y-5">
        {error ? <MxStatusBanner tone="warning">{error}</MxStatusBanner> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <MxField label="Nome completo"><MxInput value={draft.nome} onChange={event => patch({ nome: event.target.value })} /></MxField>
          <MxField label="E-mail"><MxInput type="email" value={draft.email} onChange={event => patch({ email: event.target.value })} /></MxField>
          <MxField label="Telefone"><MxInput value={draft.telefone} onChange={event => patch({ telefone: event.target.value })} placeholder="(00) 00000-0000" /></MxField>
          <MxField label="Função declarada" hint="A função declarada não concede permissão."><MxInput value={draft.funcao_declarada} onChange={event => patch({ funcao_declarada: event.target.value })} placeholder="Sócio" /></MxField>
        </div>

        {props.editing ? (
          <MxField label="Status">
            <MxSelect aria-label="Status do usuário" value={draft.status} onChange={event => {
              const nextStatus = event.target.value as PersonStatus
              if (blockMasterChange(undefined, nextStatus)) return
              setError('')
              patch({ status: nextStatus })
            }}>
              {PERSON_STATUSES.map(status => (
                <option
                  key={status}
                  value={status}
                  disabled={status === 'inativo' && Boolean(uniqueMasterChangeGuard({
                    persons: peers,
                    targetId: personId,
                    nextStatus: 'inativo',
                  }))}
                >
                  {PERSON_STATUS_LABELS[status]}
                </option>
              ))}
            </MxSelect>
          </MxField>
        ) : null}

        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Perfis de acesso</h3>
          <p className="mb-2 text-xs text-muted-foreground">Selecione um ou mais perfis. A função declarada não concede acesso automaticamente.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PERSON_PROFILES.map(profile => {
              const checked = draft.papeis.includes(profile.value)
              return (
                <label key={profile.value} className={`flex items-start gap-2 rounded-lg border p-2.5 ${checked ? 'border-primary/50 bg-status-success-bg' : 'border-border'}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleRole(profile.value)}
                    disabled={profile.value === 'DONO' && checked && Boolean(masterDemoteBlock)}
                    className="mt-0.5 rounded"
                  />
                  <div>
                    <div className="text-sm font-medium text-foreground">{profile.label}</div>
                    <div className="text-xs text-muted-foreground">{profile.description}</div>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        {hasDono ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={draft.is_dono_master}
                onChange={toggleMaster}
                disabled={Boolean(masterDemoteBlock) && draft.is_dono_master}
                className="mt-0.5 rounded"
              />
              <div>
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground"><Crown size={14} className="text-status-warning" />Definir como Dono Master desta empresa</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {masterDemoteBlock && draft.is_dono_master
                    ? masterDemoteBlock
                    : 'Governança principal da conta, acesso global às unidades e autorização para administrar usuários, metas e configurações.'}
                </div>
              </div>
            </label>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <MxField label="Visão padrão">
            <MxSelect aria-label="Visão padrão do usuário" value={draft.visao_padrao} disabled={draft.papeis.length === 0} onChange={event => patch({ visao_padrao: event.target.value as PersonDefaultView })}>
              <option value="">Selecionar...</option>
              {PERSON_DEFAULT_VIEWS.map(view => <option key={view} value={view}>{view === 'DONO' ? 'Visão do Dono' : view === 'GERENCIAL' ? 'Visão Gerencial' : view === 'VENDEDOR' ? 'Visão do Vendedor' : 'Visão Departamental'}</option>)}
            </MxSelect>
          </MxField>
          <MxField label="Lojas autorizadas" hint={draft.is_dono_master ? 'Todas as lojas (escopo global).' : 'Selecione as lojas com acesso.'}>
            <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-border p-2.5">
              {props.stores.length === 0 ? <span className="text-xs text-muted-foreground">Nenhuma loja cadastrada</span> : null}
              {props.stores.map(store => (
                <label key={store.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.lojas_autorizadas.includes(store.id) || draft.is_dono_master} disabled={draft.is_dono_master} onChange={() => toggleStore(store.id)} className="rounded" />
                  <span className="text-foreground">{store.name}</span>
                </label>
              ))}
            </div>
          </MxField>
        </div>
      </div>
    </Modal>
  )
}
