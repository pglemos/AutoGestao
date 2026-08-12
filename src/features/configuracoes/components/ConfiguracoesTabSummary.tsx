import { Eye, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Typography } from '@/components/atoms/Typography'
import { MxSectionCard, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import type { ConfigTabDefinition } from '../types'

export function ConfiguracoesTabSummary({ definition, isReadOnly }: { definition: ConfigTabDefinition; isReadOnly: boolean }) {
  const Icon = definition.icon
  return (
    <MxSectionCard>
      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-status-success-surface text-status-success-text">
            <Icon size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <Typography as="h2" variant="h3" className="text-lg font-semibold text-foreground">{definition.label}</Typography>
            <Typography variant="p" className="mt-1 text-sm text-muted-foreground">{definition.description}</Typography>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isReadOnly ? 'outline' : 'success'}>
            {isReadOnly ? <Eye size={12} className="mr-1" /> : <ShieldCheck size={12} className="mr-1" />}
            {isReadOnly ? 'Somente consulta' : 'Alterações habilitadas'}
          </Badge>
        </div>
      </div>
      {isReadOnly ? (
        <div className="px-5 pb-5">
          <MxStatusBanner tone="info" data-testid="settings-read-only-banner">
            Seu perfil pode consultar esta configuração, mas não pode salvar alterações.
          </MxStatusBanner>
        </div>
      ) : null}
    </MxSectionCard>
  )
}
