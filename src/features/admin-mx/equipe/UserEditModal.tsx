import { useEffect, useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import { TabNav } from '@/components/molecules/TabNav'
import { MxLoadingState, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { toast } from '@/lib/toast'
import {
  emptyUserPersonal,
  todayIso,
  validateUserPersonal,
  type UserPersonalDraft,
} from './userEdit'
import {
  fetchAvailableStores,
  fetchTeamUserDetail,
  saveDefaultView,
  saveUserAccess,
  saveUserPersonal,
  type AvailableStore,
  type TeamUserDetail,
} from './userEditMutations'
import { UserAccessTab } from './UserAccessTab'
import { UserPersonalTab } from './UserPersonalTab'
import { UserRolesTab } from './UserRolesTab'
import { UserStoresTab } from './UserStoresTab'

type EditTab = 'pessoais' | 'papeis' | 'lojas' | 'acesso'

const TABS: Array<{ key: EditTab; label: string }> = [
  { key: 'pessoais', label: 'Dados Pessoais' },
  { key: 'papeis', label: 'Papéis e Visões' },
  { key: 'lojas', label: 'Lojas e Equipes' },
  { key: 'acesso', label: 'Acesso e Situação' },
]

export function UserEditModal(props: {
  member: { id: string; name: string | null; email: string | null } | null
  onClose: () => void
  onSaved: () => void
}) {
  const { member } = props
  const [tab, setTab] = useState<EditTab>('pessoais')
  const [detail, setDetail] = useState<TeamUserDetail | null>(null)
  const [stores, setStores] = useState<AvailableStore[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [personal, setPersonal] = useState<UserPersonalDraft>(emptyUserPersonal())

  useEffect(() => {
    if (!member) return
    setTab('pessoais')
    setLoading(true)
    void Promise.all([fetchTeamUserDetail(member.id), fetchAvailableStores()]).then(([nextDetail, nextStores]) => {
      setDetail(nextDetail)
      setStores(nextStores)
      setPersonal({
        full_name: nextDetail.name ?? '',
        preferred_name: nextDetail.preferred_name ?? '',
        birth_date: nextDetail.birth_date ?? '',
        email: nextDetail.email ?? '',
        phone: nextDetail.phone ?? '',
        declared_function: nextDetail.declared_function ?? '',
        entry_date: nextDetail.entry_date ?? '',
        photo: nextDetail.avatar_url ?? '',
        notes: nextDetail.notes ?? '',
        relationship_consent: nextDetail.relationship_consent,
      })
      setLoading(false)
    }).catch((cause: unknown) => {
      toast.error(cause instanceof Error ? cause.message : 'Não foi possível carregar o usuário.')
      setLoading(false)
    })
  }, [member])

  if (!member) return null

  const personalErrors = validateUserPersonal(personal)
  const updatePersonal = (field: keyof UserPersonalDraft, value: string | boolean) =>
    setPersonal(current => ({ ...current, [field]: value }))

  const submit = async () => {
    if (!detail || saving) return
    const errors = validateUserPersonal(personal)
    if (errors.length) {
      setTab('pessoais')
      toast.error(errors[0])
      return
    }
    setSaving(true)
    try {
      const saved = await saveUserPersonal(detail.id, personal)
      if (saved.error) {
        toast.error(saved.error)
        return
      }
      toast.success('Dados pessoais atualizados.')
      props.onSaved()
      props.onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={props.onClose}
      title={`Editar Usuário — ${member.name || member.email || 'Equipe MX'}`}
      description={member.email ?? undefined}
      size="xl"
      closeOnEscape={!saving}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={() => void submit()} disabled={saving || personalErrors.length > 0 || !detail}>{saving ? 'Salvando...' : 'Salvar alterações'}</Button>
        </>
      )}
    >
      <div className="mt-5 space-y-5">
        <TabNav tabs={TABS} activeTab={tab} onTabChange={setTab} />
        {loading || !detail ? <MxLoadingState label="Carregando usuário" /> : null}
        {!loading && detail && tab === 'pessoais' ? (
          <UserPersonalTab form={personal} update={updatePersonal} />
        ) : null}
        {!loading && detail && tab === 'papeis' ? (
          <UserRolesTab
            userId={detail.id}
            roleGrants={detail.roleGrants}
            defaultView={detail.default_view ?? ''}
            onRoleGrants={grants => setDetail({ ...detail, roleGrants: grants })}
            onDefaultView={view => {
              setDetail({ ...detail, default_view: view })
              void saveDefaultViewQuiet(detail.id, view)
            }}
          />
        ) : null}
        {!loading && detail && tab === 'lojas' ? (
          <UserStoresTab
            userId={detail.id}
            stores={stores}
            storeAssignments={detail.storeAssignments}
            roleGrants={detail.roleGrants}
            onStoreAssignments={assignments => setDetail({ ...detail, storeAssignments: assignments })}
          />
        ) : null}
        {!loading && detail && tab === 'acesso' ? (
          <UserAccessTab
            userId={detail.id}
            form={{ status: detail.active === false ? 'DESATIVADO' : 'ATIVO', activated_at: '' }}
            delegations={detail.delegations}
            stores={stores}
            onDelegations={delegations => setDetail({ ...detail, delegations: delegations })}
            onStatus={status => {
              setDetail({ ...detail, active: status !== 'DESATIVADO' && status !== 'SUSPENSO' })
              void saveAccessQuiet(detail.id, status)
            }}
          />
        ) : null}
        {!loading && personalErrors.length ? <MxStatusBanner tone="warning">{personalErrors[0]}</MxStatusBanner> : null}
      </div>
    </Modal>
  )
}

async function saveDefaultViewQuiet(userId: string, view: string) {
  const result = await saveDefaultView(userId, view)
  if (result.error) toast.error(result.error)
}

async function saveAccessQuiet(userId: string, status: string) {
  const result = await saveUserAccess(userId, status, '')
  if (result.error) toast.error(result.error)
}

export default UserEditModal
