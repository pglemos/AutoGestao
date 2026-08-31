import { useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { TabNav } from '@/components/molecules/TabNav'
import {
  MxEmptyState,
  MxField,
  MxLoadingState,
  MxMetricCard,
  MxMetricGrid,
  MxSelect,
  MxStatusBanner,
  MxTextarea,
} from '@/components/module/MxModuleVisualPrimitives'
import { toast } from '@/lib/toast'
import {
  CONSULTANT_ROLES,
  CONSULTANT_SITUATIONS,
  ROLE_LABEL,
  SITUATION_LABEL,
  fetchConsultantClients,
  fetchConsultantProfile,
  fetchConsultantQualifications,
  resolveEncounterScope,
  saveConsultantProfile,
  saveConsultantQualifications,
  summarizeCapacity,
  validateConsultantProfile,
  type ConsultantClient,
  type ConsultantProfile,
  type ProductQualification,
} from './consultantProfile'

type ProfileTab = 'visao' | 'clientes' | 'programas' | 'capacidade' | 'historico'

const TABS = [
  { key: 'visao' as const, label: 'Visão Geral' },
  { key: 'clientes' as const, label: 'Clientes' },
  { key: 'programas' as const, label: 'Programas e Especialidades' },
  { key: 'capacidade' as const, label: 'Capacidade' },
  { key: 'historico' as const, label: 'Histórico' },
]

export function ConsultantProfileModal(props: {
  member: { id: string; name: string | null; email: string | null } | null
  onClose: () => void
  onSaved: () => void
}) {
  const { member } = props
  const [tab, setTab] = useState<ProfileTab>('visao')
  const [profile, setProfile] = useState<ConsultantProfile | null>(null)
  const [qualifications, setQualifications] = useState<ProductQualification[]>([])
  const [clients, setClients] = useState<ConsultantClient[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!member) return
    setTab('visao')
    setLoading(true)
    void Promise.all([
      fetchConsultantProfile(member.id),
      fetchConsultantQualifications(member.id),
      fetchConsultantClients(member.id),
    ]).then(([nextProfile, nextQualifications, nextClients]) => {
      setProfile(nextProfile)
      setQualifications(nextQualifications)
      setClients(nextClients)
      setLoading(false)
    })
  }, [member])

  const capacity = useMemo(() => (profile ? summarizeCapacity(profile) : { online: 0, presencial: 0, total: 0 }), [profile])
  const habilitados = qualifications.filter(item => item.enabled)
  const error = profile ? validateConsultantProfile(profile) : null

  if (!member) return null

  const patchQualification = (key: string, values: Partial<ProductQualification>) =>
    setQualifications(current => current.map(item => (item.program_key === key ? { ...item, ...values } : item)))

  const toggleEncounter = (key: string, visit: number) =>
    setQualifications(current => current.map(item => {
      if (item.program_key !== key) return item
      const has = item.encounters.includes(visit)
      return { ...item, encounters: has ? item.encounters.filter(value => value !== visit) : [...item.encounters, visit] }
    }))

  const submit = async () => {
    if (!profile || saving) return
    setSaving(true)
    try {
      const saved = await saveConsultantProfile(profile)
      if (saved.error) {
        toast.error(saved.error)
        return
      }
      const qualified = await saveConsultantQualifications(member.id, qualifications)
      if (qualified.error) {
        toast.error(qualified.error)
        return
      }
      toast.success('Perfil do consultor atualizado.')
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
      title={`Perfil — ${member.name || member.email || 'Consultor MX'}`}
      size="xl"
      closeOnEscape={!saving}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={saving}>Fechar</Button>
          <Button onClick={() => void submit()} disabled={saving || Boolean(error) || !profile}>{saving ? 'Salvando...' : 'Salvar perfil'}</Button>
        </>
      )}
    >
      <div className="mt-5 space-y-5">
        <TabNav tabs={TABS} activeTab={tab} onTabChange={setTab} />
        {error ? <MxStatusBanner tone="warning">{error}</MxStatusBanner> : null}
        {loading || !profile ? <MxLoadingState label="Carregando perfil" /> : null}

        {!loading && profile && tab === 'visao' ? (
          <div className="space-y-4">
            <MxMetricGrid>
              <MxMetricCard title="Clientes ativos" value={clients.length} detail="Carteira atual" icon={Users} />
              <MxMetricCard title="Programas" value={habilitados.length} detail="Produtos habilitados" icon={Users} tone="info" />
              <MxMetricCard title="Capacidade" value={`${capacity.total}h`} detail={`${capacity.online}h online · ${capacity.presencial}h presencial`} icon={Users} tone="violet" />
              <MxMetricCard title="Situação" value={SITUATION_LABEL[profile.situacao]} detail="Disponibilidade para escala" icon={Users} tone={profile.situacao === 'ativo' ? 'success' : 'warning'} />
            </MxMetricGrid>
            <div className="grid gap-4 sm:grid-cols-2">
              <MxField label="Papel interno">
                <MxSelect aria-label="Papel interno" value={profile.papel_interno} onChange={event => setProfile({ ...profile, papel_interno: event.target.value as ConsultantProfile['papel_interno'] })}>
                  {CONSULTANT_ROLES.map(role => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}
                </MxSelect>
              </MxField>
              <MxField label="Situação">
                <MxSelect aria-label="Situação do consultor" value={profile.situacao} onChange={event => setProfile({ ...profile, situacao: event.target.value as ConsultantProfile['situacao'] })}>
                  {CONSULTANT_SITUATIONS.map(situation => <option key={situation} value={situation}>{SITUATION_LABEL[situation]}</option>)}
                </MxSelect>
              </MxField>
              <MxField label="Cidade"><Input value={profile.cidade} onChange={event => setProfile({ ...profile, cidade: event.target.value })} /></MxField>
              <MxField label="Observações" className="sm:col-span-2">
                <MxTextarea rows={3} value={profile.observacoes} onChange={event => setProfile({ ...profile, observacoes: event.target.value })} />
              </MxField>
            </div>
          </div>
        ) : null}

        {!loading && profile && tab === 'capacidade' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <MxField label="Capacidade online (h/mês)">
              <Input type="number" min={0} step="0.5" value={profile.capacidade_online === null ? '' : String(profile.capacidade_online)} onChange={event => setProfile({ ...profile, capacidade_online: event.target.value === '' ? null : Number(event.target.value) })} />
            </MxField>
            <MxField label="Capacidade presencial (h/mês)">
              <Input type="number" min={0} step="0.5" value={profile.capacidade_presencial === null ? '' : String(profile.capacidade_presencial)} onChange={event => setProfile({ ...profile, capacidade_presencial: event.target.value === '' ? null : Number(event.target.value) })} />
            </MxField>
            <div className="sm:col-span-2 rounded-lg border border-border bg-surface-alt p-4 text-sm text-muted-foreground">
              Total declarado: <strong className="text-foreground">{capacity.total}h/mês</strong>
            </div>
          </div>
        ) : null}

        {!loading && tab === 'programas' ? (
          qualifications.length ? (
            <div className="space-y-3">
              <MxStatusBanner tone="info">Sem encontro marcado, o consultor conduz o produto inteiro. Marque encontros para restringir a especialidade.</MxStatusBanner>
              {qualifications.map(item => (
                <div key={item.program_key} className="space-y-3 rounded-lg border border-border p-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <input type="checkbox" checked={item.enabled} onChange={event => patchQualification(item.program_key, { enabled: event.target.checked, encounters: event.target.checked ? item.encounters : [] })} />
                    <span>{item.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">{item.total_visits} encontro(s)</span>
                  </label>
                  {item.enabled ? (
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: item.total_visits }, (_, index) => index + 1).map(visit => {
                        const active = item.encounters.includes(visit)
                        return (
                          <button
                            key={visit}
                            type="button"
                            aria-pressed={active}
                            onClick={() => toggleEncounter(item.program_key, visit)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'}`}
                          >
                            Encontro {visit}
                          </button>
                        )
                      })}
                      <span className="self-center text-xs text-muted-foreground">
                        Conduz: {resolveEncounterScope(item).join(', ') || '—'}
                      </span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : <MxEmptyState title="Nenhum produto disponível" description="Cadastre e publique produtos de consultoria para habilitar consultores." />
        ) : null}

        {!loading && tab === 'clientes' ? (
          clients.length ? (
            <ul className="space-y-2">
              {clients.map(client => (
                <li key={client.client_id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                  <span className="font-semibold text-foreground">{client.name}</span>
                  <span className="text-xs text-muted-foreground">{client.assignment_role || 'responsável'}</span>
                </li>
              ))}
            </ul>
          ) : <MxEmptyState title="Nenhum cliente alocado no momento" description="Use a edição da equipe para vincular clientes a este consultor." />
        ) : null}

        {!loading && tab === 'historico' ? (
          <MxEmptyState title="Histórico em breve" description="Alterações de papel, capacidade e carteira aparecerão aqui conforme forem registradas na auditoria MX." />
        ) : null}
      </div>
    </Modal>
  )
}
