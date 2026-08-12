import { ArrowRight, Building2, Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { slugify } from '@/lib/utils'
import { Badge } from '@/components/atoms/Badge'
import { Typography } from '@/components/atoms/Typography'
import type { Store } from '@/types/database'
import {
  MxEmptyState,
  MxSectionCard,
  MxStatusBanner,
} from '@/components/module/MxModuleVisualPrimitives'

type StoreStat = {
  sellers: number
  teamMembers: number
  checkedIn: number
  disciplinePct: number
}

interface OwnerExecutiveSectionProps {
  ownerActiveStores: Store[]
  ownerAttentionStores: Array<{ store: Store; stat: StoreStat }>
  stats: Record<string, StoreStat>
}

export function OwnerExecutiveSection({
  ownerActiveStores,
  ownerAttentionStores,
  stats,
}: OwnerExecutiveSectionProps) {
  if (ownerActiveStores.length === 0) {
    return (
      <MxSectionCard>
        <MxEmptyState
          icon={Building2}
          title="Nenhuma loja ativa vinculada"
          description="Seu perfil de Dono ainda não possui uma unidade ativa para acompanhamento executivo. Solicite ao Admin MX a revisão dos vínculos da rede."
        />
      </MxSectionCard>
    )
  }

  return (
    <section className="grid grid-cols-1 gap-mx-md xl:grid-cols-12" aria-label="Visão executiva">
      <MxSectionCard className="p-mx-md xl:col-span-4">
        <div className="flex items-start justify-between gap-mx-md">
          <div>
            <Typography as="h2" variant="h3" className="text-lg">
              O que decidir hoje
            </Typography>
            <Typography variant="p" className="mt-mx-xs text-sm">
              Prioridades calculadas a partir da estrutura e da disciplina das lojas.
            </Typography>
          </div>
          <span className="grid h-mx-10 w-mx-10 shrink-0 place-items-center rounded-xl bg-status-success-surface text-emerald-600">
            <Compass size={20} aria-hidden="true" />
          </span>
        </div>

        <div className="mt-mx-md space-y-mx-sm">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-mx-md">
            <Typography variant="caption" className="font-semibold">
              Unidades que exigem atenção
            </Typography>
            <Typography
              variant="h2"
              tone={ownerAttentionStores.length > 0 ? 'warning' : 'success'}
              className="mt-mx-xs tabular-nums"
            >
              {ownerAttentionStores.length}
            </Typography>
            <Typography variant="p" className="mt-mx-xs text-sm">
              {ownerAttentionStores.length > 0
                ? 'Revise unidades sem equipe, sem vendedores ou com disciplina abaixo de 80%.'
                : 'Todas as unidades ativas estão dentro do mínimo operacional esperado.'}
            </Typography>
          </div>

          <MxStatusBanner tone="info">
            Os links de pré-cadastro continuam sob governança do Admin MX.
          </MxStatusBanner>
        </div>
      </MxSectionCard>

      <MxSectionCard className="xl:col-span-8">
        <div className="border-b border-gray-100 p-mx-md">
          <Typography as="h2" variant="h3" className="text-lg">
            Comparativo entre lojas
          </Typography>
          <Typography variant="p" className="mt-mx-xs text-sm">
            Identifique onde cobrar plano de ação e onde apenas acompanhar a execução.
          </Typography>
        </div>

        <div className="grid grid-cols-1 gap-mx-sm p-mx-md md:grid-cols-2">
          {ownerActiveStores.map((store) => {
            const stat = stats[store.id] || {
              sellers: 0,
              teamMembers: 0,
              checkedIn: 0,
              disciplinePct: 0,
            }
            const needsAttention =
              stat.teamMembers === 0 ||
              stat.sellers === 0 ||
              stat.disciplinePct < 80

            return (
              <Link
                key={store.id}
                to={`/lojas/${slugify(store.name)}?id=${store.id}`}
                className="group rounded-xl border border-gray-100 bg-white p-mx-md transition-colors hover:border-brand-primary hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/15"
              >
                <div className="flex items-start justify-between gap-mx-sm">
                  <div className="min-w-0">
                    <Typography variant="p" className="font-semibold group-hover:text-emerald-600">
                      {store.name}
                    </Typography>
                    <Typography variant="tiny" tone="muted" className="mt-mx-xs block">
                      {stat.teamMembers} na equipe · {stat.checkedIn}/{stat.sellers} vendedores com registro
                    </Typography>
                  </div>
                  <Badge variant={needsAttention ? 'warning' : 'success'} className="shrink-0">
                    {needsAttention ? 'Decidir' : 'Acompanhar'}
                  </Badge>
                </div>

                <div className="mt-mx-md flex items-end justify-between gap-mx-sm">
                  <div>
                    <Typography variant="caption" className="">
                      Disciplina
                    </Typography>
                    <Typography
                      variant="h2"
                      tone={stat.disciplinePct < 80 ? 'error' : 'success'}
                      className="mt-mx-xs tabular-nums"
                    >
                      {stat.disciplinePct}%
                    </Typography>
                  </div>
                  <ArrowRight
                    size={18}
                    className="text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-emerald-600"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            )
          })}
        </div>
      </MxSectionCard>
    </section>
  )
}
