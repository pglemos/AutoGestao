import { useMemo, useState } from 'react'
import { Plus, RefreshCw, Users } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import {
  MxEmptyState,
  MxErrorState,
  MxInput,
  MxLoadingState,
  MxMetricCard,
  MxMetricGrid,
  MxModuleHeader,
  MxModulePage,
  MxSectionCard,
  MxSectionHeader,
  MxSelect,
  MxTableSurface,
  MxToolbar,
} from '@/components/module/MxModuleVisualPrimitives'
import { toast } from '@/lib/toast'
import { useConsultingClients } from '@/hooks/useConsultingClients'
import { ConsultantProfileModal } from './equipe/ConsultantProfileModal'
import { SITUATION_LABEL, type ConsultantSituation } from './equipe/consultantProfile'
import { MemberCreateModal } from './equipe/MemberCreateModal'
import { TeamMemberFormModal } from './equipe/TeamMemberFormModal'
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

const ROLE_LABEL: Record<string, string> = {
  administrador_geral: 'Administrador geral',
  administrador_mx: 'Administrador MX',
  consultor_mx: 'Consultor MX',
}

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
      return [member.name, member.email, member.role].some(value => (value ?? '').toLowerCase().includes(term))
    })
  }, [rows, search, situacao])

  const metrics = useMemo(() => {
    const declared = rows
      .map(member => member.capacidade_total)
      .filter((value): value is number => typeof value === 'number')
    const next = {
      total: rows.length,
      ativos: rows.filter(member => member.active !== false).length,
      consultores: rows.filter(member => (member.role ?? '').startsWith('consultor')).length,
      carteiras: rows.reduce((sum, member) => sum + member.assignments, 0),
      capacidade: declared.length ? declared.reduce((sum, value) => sum + value, 0) : null,
      escalaveis: rows.filter(member => (member.situacao ?? 'ativo') === 'ativo' && member.active !== false).length,
    }
    return next
  }, [rows])

  return (
    <MxModulePage id="admin-mx-equipe" width={width} bottomClearance={bottomClearance}>
      <div className="w-full space-y-5">
        <MxModuleHeader
          icon={Users}
          eyebrow="Administração MX"
          title="Equipe MX"
          description="Consultores e administradores internos, papéis e carteiras atribuídas."
          actions={(
            <>
              <Button variant="outline" onClick={() => void refetch()}><RefreshCw size={16} />Atualizar</Button>
              <Button onClick={() => void openCreate()}><Plus size={16} />Adicionar Membro</Button>
            </>
          )}
        />
        {loading ? <MxLoadingState label="Carregando equipe" /> : error ? <MxErrorState description={error} retry={() => void refetch()} /> : (
          <>
            <MxMetricGrid>
              <MxMetricCard title="Pessoas" value={metrics.total} detail="Perfis internos MX" icon={Users} />
              <MxMetricCard title="Ativos" value={metrics.ativos} detail="Com acesso liberado" icon={Users} tone="success" />
              <MxMetricCard title="Consultores" value={metrics.consultores} detail="Atendem clientes" icon={Users} tone="info" />
              <MxMetricCard title="Vínculos" value={metrics.carteiras} detail="Atribuições ativas de clientes" icon={Users} tone="violet" />
              <MxMetricCard title="Capacidade" value={metrics.capacidade == null ? '—' : `${metrics.capacidade}h`} detail="Horas/mês declaradas no perfil do consultor" icon={Users} tone="info" />
              <MxMetricCard title="Disponíveis para escala" value={metrics.escalaveis} detail="Ativos e sem afastamento" icon={Users} tone="success" />
            </MxMetricGrid>
            <MxToolbar>
              <MxInput value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nome, e-mail ou papel" aria-label="Buscar pessoa da equipe MX" />
              <MxSelect value={situacao} onChange={event => setSituacao(event.target.value)} aria-label="Filtrar por situação">
                <option value="todas">Todas as situações</option>
                <option value="ativo">Ativo</option>
                <option value="afastado">Afastado</option>
                <option value="ferias">Férias</option>
                <option value="inativo">Inativo</option>
              </MxSelect>
            </MxToolbar>
            <MxSectionCard>
              <MxSectionHeader title="Equipe interna" description={`${filtered.length} registro(s) visível(is).`} />
              <div className="p-5">
                {filtered.length ? (
                  <MxTableSurface>
                    <Table className="min-w-[760px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pessoa</TableHead>
                          <TableHead>Papel</TableHead>
                          <TableHead>Contato</TableHead>
                          <TableHead>Clientes</TableHead>
                          <TableHead>Capacidade</TableHead>
                          <TableHead>Situação</TableHead>
                          <TableHead>Acesso</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map(member => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="font-semibold text-foreground">{member.name || 'Sem nome'}</div>
                              <div className="text-xs text-muted-foreground">{member.email || 'Sem e-mail'}</div>
                            </TableCell>
                            <TableCell>{ROLE_LABEL[member.role ?? ''] ?? member.role ?? 'Não definido'}</TableCell>
                            <TableCell>{member.phone || '—'}</TableCell>
                            <TableCell>{member.assignments}</TableCell>
                            <TableCell>{member.capacidade_total === null ? '—' : `${member.capacidade_total}h`}</TableCell>
                            <TableCell>{SITUATION_LABEL[(member.situacao ?? 'ativo') as ConsultantSituation] ?? member.situacao}</TableCell>
                            <TableCell>{member.active === false ? 'Inativo' : 'Ativo'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setProfileMember(member)}>Perfil</Button>
                                <Button variant="outline" size="sm" onClick={() => setEditMember(member)}>Editar</Button>
                                <Button variant="outline" size="sm" onClick={() => void openEdit(member)}>Carteira</Button>
                                <Button variant="outline" size="sm" onClick={() => void toggleActive(member)}>{member.active === false ? 'Reativar' : 'Desativar'}</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </MxTableSurface>
                ) : <MxEmptyState variant="filter" title="Nenhuma pessoa encontrada" description="Ajuste a busca para ver outros perfis internos." />}
              </div>
            </MxSectionCard>
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
