import { Building2, Copy, Link2, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { canManageStore } from '@/lib/auth/capabilities'
import { cn, slugify } from '@/lib/utils'
import { Badge } from '@/components/atoms/Badge'
import { Typography } from '@/components/atoms/Typography'
import { Button } from '@/components/atoms/Button'
import type { Column } from '@/components/organisms/DataGrid'
import { OPERATIONAL_ACTION_LABELS } from '@/lib/ui/actionLabels'
import type { Store } from '@/types/database'

type StoreStat = {
  sellers: number
  teamMembers: number
  checkedIn: number
  disciplinePct: number
}

interface BuildColumnsParams {
  stats: Record<string, StoreStat>
  role: string | null | undefined
  isOwner: boolean
  copyRegistrationLink: (storeName: string) => void
  getRegistrationLink: (storeName: string) => string
  handleArchiveStore: (store: Store) => void
  handleHardDeleteStore: (store: Store) => void | Promise<void>
  toggleStoreStatus: (storeId: string, active: boolean) => Promise<{ error?: string | null }>
}

export function buildStoreColumns({
  stats,
  role,
  isOwner,
  copyRegistrationLink,
  getRegistrationLink,
  handleArchiveStore,
  handleHardDeleteStore,
  toggleStoreStatus,
}: BuildColumnsParams): Column<Store>[] {
  const canManageNetwork = canManageStore(role)

  return [
    {
      key: 'name',
      header: 'Unidade',
      render: (store) => (
        <div className="flex min-w-0 items-center gap-mx-sm">
          <span
            className="grid h-mx-10 w-mx-10 shrink-0 place-items-center rounded-mx-lg bg-status-success-surface text-brand-primary"
            aria-hidden="true"
          >
            <Building2 size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <Typography variant="p" className="font-semibold">
              {store.name}
            </Typography>
            <Typography variant="tiny" tone="muted" className="mt-mx-tiny block">
              ID {store.id.split('-')[0]}
            </Typography>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      desktopOnly: true,
      render: (store) => {
        const stat = stats[store.id] || {
          sellers: 0,
          teamMembers: 0,
          checkedIn: 0,
          disciplinePct: 0,
        }
        return (
          <Badge variant={store.active ? 'success' : 'outline'}>
            {store.active
              ? stat.teamMembers > 0
                ? 'Operando'
                : 'Sem equipe'
              : 'Inativa'}
          </Badge>
        )
      },
    },
    {
      key: 'metrics',
      header: 'Operacional',
      align: 'center',
      render: (store) => {
        const stat = stats[store.id] || {
          sellers: 0,
          teamMembers: 0,
          checkedIn: 0,
          disciplinePct: 0,
        }
        return (
          <div className="flex items-center justify-center gap-mx-md">
            <div className="text-center">
              <Typography variant="tiny" tone="muted">
                Equipe
              </Typography>
              <Typography variant="p" className="mt-mx-tiny font-semibold tabular-nums">
                {stat.teamMembers}
              </Typography>
            </div>
            <span className="h-mx-8 w-px bg-border-subtle" aria-hidden="true" />
            <div className="text-center">
              <Typography variant="tiny" tone="muted">
                Disciplina
              </Typography>
              <Typography
                variant="p"
                tone={stat.disciplinePct < 80 ? 'error' : 'success'}
                className="mt-mx-tiny font-semibold tabular-nums"
              >
                {stat.disciplinePct}%
              </Typography>
            </div>
          </div>
        )
      },
    },
    {
      key: 'registration',
      header: 'Pré-cadastro',
      desktopOnly: true,
      render: (store) => (
        <div className="flex min-w-0 flex-col gap-mx-xs">
          <div className="flex min-w-0 items-center gap-mx-xs">
            <Link2
              size={14}
              className={cn(
                'shrink-0',
                canManageNetwork ? 'text-brand-primary' : 'text-text-tertiary',
              )}
              aria-hidden="true"
            />
            <Typography variant="tiny" tone="muted" className="truncate">
              {canManageNetwork
                ? 'Disponível para a área interna MX'
                : isOwner
                  ? 'Operado pela área interna MX'
                  : 'Restrito à área interna MX'}
            </Typography>
          </div>
          {canManageNetwork ? (
            <Typography
              variant="tiny"
              className="block max-w-mx-64 truncate bg-surface-alt px-mx-xs py-mx-tiny font-mono"
              title={getRegistrationLink(store.name)}
            >
              {getRegistrationLink(store.name)}
            </Typography>
          ) : null}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'right',
      render: (store) => (
        <div
          role="presentation"
          className="flex items-center justify-end gap-mx-xs"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {store.active ? (
            <>
              <Button asChild variant="secondary" size="sm">
                <Link to={`/lojas/${slugify(store.name)}?id=${store.id}`}>
                  {isOwner ? 'Abrir unidade' : OPERATIONAL_ACTION_LABELS.openDashboard}
                </Link>
              </Button>
              {!isOwner ? (
                <Button asChild variant="outline" size="sm">
                  <Link to={`/lojas/${slugify(store.name)}?id=${store.id}&tab=equipe`}>
                    {OPERATIONAL_ACTION_LABELS.openTeam}
                  </Link>
                </Button>
              ) : null}
              {canManageNetwork ? (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyRegistrationLink(store.name)}
                    aria-label={`Copiar link de pré-cadastro de ${store.name}`}
                  >
                    <Copy size={16} aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleArchiveStore(store)}
                    className="text-text-tertiary hover:bg-status-error-surface hover:text-status-error"
                    aria-label={`Desativar ${store.name}`}
                  >
                    <X size={16} aria-hidden="true" />
                  </Button>
                </>
              ) : null}
            </>
          ) : canManageNetwork ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => toggleStoreStatus(store.id, true)}
              >
                Restaurar
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { void handleHardDeleteStore(store) }}
                className="text-status-error hover:bg-status-error-surface"
                aria-label={`Excluir definitivamente ${store.name}`}
                title="Excluir definitivamente"
              >
                <Trash2 size={16} aria-hidden="true" />
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
  ]
}
