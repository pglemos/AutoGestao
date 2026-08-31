import { MapPin } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { SITUATION_LABEL, type ConsultantSituation } from '../equipe/consultantProfile'
import type { AdminTeamMember } from '../hooks/useAdminMxLists'

const ROLE_DISPLAY: Record<string, string> = {
  administrador_geral: 'Administrador Principal',
  administrador_mx: 'Administrador MX',
  consultor_mx: 'Consultor MX',
  consultor_especialista: 'Consultor Especialista',
  coordenador_consultoria: 'Coordenador de Consultoria',
  administrador_implantacao: 'Adm. Implantação',
  administrador_produto: 'Administrador de Produto',
  administrador_dados: 'Administrador de Dados',
  suporte_mx: 'Suporte MX',
  gestao_mx: 'Gestão MX',
}

function roleLabel(member: AdminTeamMember): string {
  if (member.papel_interno && ROLE_DISPLAY[member.papel_interno]) return ROLE_DISPLAY[member.papel_interno]
  if (member.role && ROLE_DISPLAY[member.role]) return ROLE_DISPLAY[member.role]
  return member.role ?? 'Sem papel'
}

function capacityLabel(member: AdminTeamMember): string {
  if (member.capacidade_total == null) return '—'
  const pct = Math.min(100, Math.round((member.assignments / Math.max(member.capacidade_total, 1)) * 100))
  const available = Math.max(0, 100 - pct)
  return `Disponível (${available}%)`
}

export function TeamMemberCard(props: {
  member: AdminTeamMember
  city?: string | null
  specialties?: string[]
  onOpen: () => void
}) {
  const { member } = props
  const situation = (member.situacao ?? 'ativo') as ConsultantSituation
  const specialties = props.specialties?.filter(Boolean) ?? []

  return (
    <button
      type="button"
      className="flex h-full w-full flex-col rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-colors hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      onClick={props.onOpen}
      data-testid="team-member-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {(member.name ?? member.email ?? '?').charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="truncate font-semibold text-foreground">{member.name || 'Sem nome'}</div>
            <div className="truncate text-sm text-muted-foreground">{roleLabel(member)}</div>
            {props.city ? (
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin size={12} aria-hidden="true" />
                <span className="truncate">{props.city}</span>
              </div>
            ) : null}
          </div>
        </div>
        <Badge variant={situation === 'ativo' ? 'success' : 'outline'}>{SITUATION_LABEL[situation] ?? situation}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Clientes ativos</div>
          <div className="font-semibold text-foreground">{member.assignments}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Capacidade</div>
          <div className="font-semibold text-status-success-text">{capacityLabel(member)}</div>
        </div>
      </div>

      {specialties.length ? (
        <p className="mt-4 line-clamp-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Especialidades:</span> {specialties.join(', ')}
        </p>
      ) : null}
    </button>
  )
}

export { roleLabel as teamMemberRoleLabel }
