import { useMemo, useState } from 'react'
import { Plus, RefreshCw, Search, Users } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import {
  MxEmptyState,
  MxErrorState,
  MxInput,
  MxLoadingState,
  MxModuleHeader,
  MxModulePage,
  MxSelect,
  MxToolbar,
} from '@/components/module/MxModuleVisualPrimitives'
import { toast } from '@/lib/toast'
import { useConsultingClients } from '@/hooks/useConsultingClients'
import { ConsultantProfileModal } from './equipe/ConsultantProfileModal'
import { MemberCreateModal } from './equipe/MemberCreateModal'
import { TeamMemberFormModal } from './equipe/TeamMemberFormModal'
import { TeamMemberCard } from './equipe/TeamMemberCard'
import { UserEditModal } from './equipe/UserEditModal'
import {
  deactivateTeamMember,
  fetchMemberAssignments,
  reactivateTeamMember,
  saveTeamMember,
  syncMemberAssignments,
  type TeamMemberDraft,
} from './equipe/teamMutations'
import { fetchAvailableStores } from './equipe/userEditMutations'
import { useAdminTeam, type AdminTeamMember } from './hooks/useAdminMxLists'

export function AdminEquipeMxPage() {
  const { rows, loading, error, refetch } = useAdminTeam()
  const [search, setSearch] = useState('')
  const { clients } = useConsultingClients()
  const [draft, setDraft] = useState<TeamMemberDraft | null>(null)
  const [assignedClientIds, setAssignedClientIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [profileMember, setProfileMember] = useState<AdminTeamMember | null>(null)
  const [editMember, setEditMember] = useState<AdminTeamMember | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([])
  const [situacao, setSituacao] = useState('todas')
  const location = useLocation()

  const openCreate = async () => {
    setShowCreate(true)
    try {
      setStores(await fetchAvailableStores())
    } catch {
      setStores([])
    }
  }

  const openEdit = async (member: AdminTeamMember) => {
    setDraft({
      id: member.id,
      name: member.name ?? '',
      email: member.email ?? '',
      phone: member.phone ?? '',
      role: member.role ?? 'consultor_mx',
      active: member.active !== false,
    })
    const assignments = await fetchMemberAssignments(member.id)
    setAssignedClientIds(assignments.filter(item => item.active !== false && item.client_id).map(item => item.client_id as string))
  }

  const submit = async () => {
    if (submitting || !draft) return
    setSubmitting(true)
    try {
      const saved = await saveTeamMember(draft)
      if (saved.error) {
        toast.error(saved.error)
        return
      }
      const synced = await syncMemberAssignments(draft.id, assignedClientIds)
      if (synced.error) {
        toast.error(synced.error)
        return
      }
      toast.success('Pessoa da equipe atualizada.')
      setDraft(null)
      await refetch()
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (member: AdminTeamMember) => {
    const result = member.active === false
      ? await reactivateTeamMember(member.id)
      : await deactivateTeamMember(member.id, 'Desativado pela administração MX.')
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(member.active === false ? 'Acesso reativado.' : 'Acesso desativado e carteira liberada.')
    await refetch()
  }

  const { width, bottomClearance } = resolveRouteLayout(location.pathname)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter(member => {
      if (situacao !== 'todas' && (member.situacao ?? 'ativo') !== situacao) return false
      if (!term) return true
      return [member.name, member.email, member.role, member.papel_interno, member.cidade, ...(member.specialties ?? [])]
        .some(value => (value ?? '').toLowerCase().includes(term))
    })
  }, [rows, search, situacao])

  return (
    <MxModulePage id="admin-mx-equipe" width={width} bottomClearance={bottomClearance}>
      <div className="w-full space-y-5">
        <MxModuleHeader
          icon={Users}
          eyebrow="Administração MX"
          title="Equipe MX"
          description={`${rows.length} pessoa${rows.length === 1 ? '' : 's'} na equipe`}
          actions={(
            <>
              <Button variant="outline" onClick={() => void refetch()}><RefreshCw size={16} />Atualizar</Button>
              <Button onClick={() => void openCreate()}><Plus size={16} />Adicionar Membro</Button>
            </>
          )}
        />
        {loading ? <MxLoadingState label="Carregando equipe" /> : error ? <MxErrorState description={error} retry={() => void refetch()} /> : (
          <>
            <MxToolbar>
              <div className="relative min-w-0 flex-1">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <MxInput
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Buscar por nome ou papel..."
                  aria-label="Buscar pessoa da equipe MX"
                  className="pl-9"
                />
              </div>
              <MxSelect value={situacao} onChange={event => setSituacao(event.target.value)} aria-label="Filtrar por situação">
                <option value="todas">Todas as situações</option>
                <option value="ativo">Ativo</option>
                <option value="afastado">Afastado</option>
                <option value="ferias">Férias</option>
                <option value="inativo">Inativo</option>
              </MxSelect>
            </MxToolbar>

            {filtered.length ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="team-member-grid">
                {filtered.map(member => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    city={member.cidade}
                    specialties={member.specialties}
                    onOpen={() => setProfileMember(member)}
                  />
                ))}
              </div>
            ) : (
              <MxEmptyState variant="filter" title="Nenhuma pessoa encontrada" description="Ajuste a busca para ver outros perfis internos." />
            )}
          </>
        )}
        {draft ? (
          <TeamMemberFormModal
            open
            draft={draft}
            submitting={submitting}
            clients={clients.map(client => ({ id: client.id, name: client.name }))}
            assignedClientIds={assignedClientIds}
            onDraft={setDraft}
            onAssigned={setAssignedClientIds}
            onSubmit={() => void submit()}
            onClose={() => setDraft(null)}
          />
        ) : null}
        <ConsultantProfileModal member={profileMember} onClose={() => setProfileMember(null)} onSaved={() => void refetch()} />
        <UserEditModal member={editMember} onClose={() => setEditMember(null)} onSaved={() => void refetch()} />
        <MemberCreateModal
          open={showCreate}
          stores={stores}
          onClose={() => setShowCreate(false)}
          onSaved={() => void refetch()}
        />
      </div>
    </MxModulePage>
  )
}

export default AdminEquipeMxPage
