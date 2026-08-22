import { Crown, Mail, Phone, UserPlus } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxLoadingState } from '@/components/module/MxModuleVisualPrimitives'
import { PERSON_STATUS_LABELS, resolveOwnerMaster, type OwnerMasterResolution } from './personAccess'

export function DonoMasterCard(props: {
  loading: boolean
  resolution: OwnerMasterResolution
  onDefine: () => void
  onEdit: () => void
}) {
  if (props.loading) {
    return <MxLoadingState label="Carregando Dono Master" />
  }

  if (props.resolution.status === 'NOT_CONFIGURED' || props.resolution.status === 'OWNER_WITHOUT_MASTER') {
    return (
      <div className="flex items-center justify-between rounded-xl bg-surface-alt p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Crown size={16} /></div>
          <div>
            <div className="text-sm font-bold text-foreground">DONO MASTER</div>
            <div className="text-xs text-muted-foreground">
              {props.resolution.status === 'OWNER_WITHOUT_MASTER'
                ? 'Existem usuários com acesso de Dono, mas nenhum foi definido como Dono Master.'
                : 'Nenhum Dono Master configurado'}
            </div>
          </div>
        </div>
        <Button size="sm" onClick={props.onDefine}><UserPlus size={14} />Definir Dono Master</Button>
      </div>
    )
  }

  if (props.resolution.status === 'DUPLICATE_MASTER') {
    return (
      <div className="flex items-center justify-between rounded-xl bg-status-error-bg p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-error-text/10 text-status-error-text"><Crown size={16} /></div>
          <div>
            <div className="text-sm font-bold text-foreground">DONO MASTER — VÍNCULO INCONSISTENTE</div>
            <div className="text-xs text-muted-foreground">{props.resolution.count} usuários marcados como Master. Regularize a designação antes de ativar.</div>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={props.onDefine}>Corrigir</Button>
      </div>
    )
  }

  if (props.resolution.status === 'INACTIVE' || !props.resolution.person) {
    const person = props.resolution.person
    return (
      <div className="flex items-center justify-between rounded-xl bg-status-error-bg p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-error-text/10 text-status-error-text"><Crown size={16} /></div>
          <div>
            <div className="text-sm font-bold text-foreground">DONO MASTER — VÍNCULO INCONSISTENTE</div>
            <div className="text-xs text-muted-foreground">
              {person
                ? `${person.nome} possui designação Master, mas seu status é ${PERSON_STATUS_LABELS[person.status] ?? person.status}.`
                : 'Vínculo do Dono Master inconsistente.'}
            </div>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={props.onDefine}>Corrigir</Button>
      </div>
    )
  }

  const person = props.resolution.person
  return (
    <div className="flex items-center justify-between rounded-xl bg-surface-alt p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Crown size={16} /></div>
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            DONO MASTER <span className="rounded-full bg-status-warning/20 px-1.5 py-0.5 text-caption text-status-warning-text">Master</span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{person.nome}</div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {person.email ? <span className="flex items-center gap-1"><Mail size={12} />{person.email}</span> : null}
            {person.telefone ? <span className="flex items-center gap-1"><Phone size={12} />{person.telefone}</span> : null}
            <span>Status: {PERSON_STATUS_LABELS[person.status] ?? person.status}</span>
          </div>
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={props.onEdit}>Editar</Button>
    </div>
  )
}
