import type { OwnerManagementContext } from '@/lib/owner-management-context'

export type OwnerCommercialNavigationItem = {
  label: string
  path: string
}

export type OwnerCommercialNavigation = {
  label: 'GESTÃO COMERCIAL'
  badge: 'RESPONSÁVEL' | 'ACOMPANHAR'
  badgeTone: 'default' | 'warning'
  description: string
  items: OwnerCommercialNavigationItem[]
}

const ITEMS: OwnerCommercialNavigationItem[] = [
  { label: 'Visão Comercial', path: '/gerente/minha-equipe' },
  { label: 'Rotina da Equipe', path: '/gerente/rotina-equipe' },
  { label: 'Fechamento Diário', path: '/fechamento-diario' },
  { label: 'Meta da Loja', path: '/gerente/meta-loja' },
  { label: 'Vendas', path: '/vendas' },
  { label: 'Mentor Gerencial', path: '/gerente/mentor' },
  { label: 'Desenvolvimento', path: '/gerente/feedbacks-pdis' },
  { label: 'Ranking', path: '/gerente/ranking' },
  { label: 'Universidade MX', path: '/gerente/universidade-mx' },
]

export function buildOwnerCommercialNavigation(
  context: OwnerManagementContext,
): OwnerCommercialNavigation {
  if (context.ownerAssumesManagement) {
    return {
      label: 'GESTÃO COMERCIAL',
      badge: 'RESPONSÁVEL',
      badgeTone: 'warning',
      description: context.managerRegistrationPending
        ? 'Você responde pela gestão comercial enquanto o cadastro do gerente está pendente.'
        : 'Você responde pela gestão comercial porque não existe gerente ativo nesta loja.',
      items: ITEMS,
    }
  }

  return {
    label: 'GESTÃO COMERCIAL',
    badge: 'ACOMPANHAR',
    badgeTone: 'default',
    description: context.queryFailed
      ? 'Não foi possível confirmar a estrutura gerencial. O acesso permanece em acompanhamento.'
      : 'Existe gerente ativo na loja. O dono acompanha a operação e pode intervir quando necessário.',
    items: ITEMS,
  }
}
