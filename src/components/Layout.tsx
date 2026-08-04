import React from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useData'
import { useFeedbacks } from '@/hooks/useFeedbacks'
import {
  Home, CheckSquare, Trophy, GraduationCap, MessageSquare,
  Bell, Settings, Users, Target, Grid, LayoutDashboard, User,
  TrendingUp, ClipboardList, CalendarClock, BarChart3, Bot,
  Filter, FileBarChart, Activity, BookOpen, CalendarCheck,
  BrainCircuit, BriefcaseBusiness,
} from 'lucide-react'
import { slugify } from '@/lib/utils'
import MxSidebarShell, {
  type MxSidebarNavItem,
  type MxSidebarNavSection,
} from './MxSidebarShell'
import { ForcePasswordChange } from '@/features/auth/components/ForcePasswordChange'
import { canAccessPath } from '@/lib/auth/routeAccess'
import { useStoreManagementContext } from '@/hooks/useStoreManagementContext'
import { MotionPage } from '@/design/motion'
import { buildInternalMxNavigation } from '@/design-system/internal-mx/internalMxNavigation'
import { MxRoleVisualScope } from '@/components/module/MxRoleVisualScope'
import {
  OWNER_BASE44_NAVIGATION,
  type OwnerBase44NavigationItem,
  ownerNavigationActivePaths,
  ownerNavigationCanonicalPath,
} from '@/features/dashboard-loja/sections/owner-cockpit/ownerBase44Config'
import { OwnerProvider } from '@/components/owner/OwnerContext'
import ConsultantRequestModal from '@/components/owner/ConsultantRequestModal'
import { Toaster as OwnerToaster } from '@/components/ui/toaster'

type SubItem = {
  key?: string
  label: string
  path: string
  icon?: React.ReactNode
  activePaths?: string[]
  children?: SubItem[]
  defaultExpanded?: boolean
  badge?: string
  badgeTone?: 'default' | 'warning'
}

type NavCategory = {
  category: string
  icon: React.ReactNode
  items: SubItem[]
}

const STORE_DASHBOARD_PATH = '__STORE_DASHBOARD__'
const STORE_TEAM_PATH = '__STORE_TEAM__'
const STORE_CONSULTOR_IA_PATH = '__STORE_CONSULTOR_IA__'
const rotulosPerfil: Record<string, string> = {
  administrador_geral: 'Administrador geral',
  administrador_mx: 'Administrador MX',
  consultor_mx: 'Consultor MX',
  dono: 'Dono',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
}

const rotulosModulo: Record<string, string> = {
  administrador_geral: 'Módulo Administrativo',
  administrador_mx: 'Módulo Admin MX',
  consultor_mx: 'Módulo Consultoria',
  dono: 'Módulo Executivo',
  gerente: 'Módulo Gerencial',
  vendedor: 'Módulo Comercial',
}

const ownerCategoryIcons: Record<string, React.ReactNode> = {
  GESTÃO: <Home size={22} />,
  ESTRATÉGIA: <Target size={22} />,
  NEGÓCIO: <Grid size={22} />,
  DESENVOLVIMENTO: <GraduationCap size={22} />,
  'AÇÃO GLOBAL': <MessageSquare size={22} />,
}

const ownerItemIcons: Record<string, React.ReactNode> = {
  Início: <Home size={16} />,
  'Rotina do Dia': <CalendarClock size={16} />,
  'Central de Decisões': <ClipboardList size={16} />,
  'Plano Estratégico': <Target size={16} />,
  'Plano de Ação': <CheckSquare size={16} />,
  Consultoria: <Users size={16} />,
  Departamentos: <Grid size={16} />,
  'Visão Geral': <LayoutDashboard size={16} />,
  Comercial: <TrendingUp size={16} />,
  Marketing: <Activity size={16} />,
  'Produto e Estoque': <Grid size={16} />,
  'Pessoas — RH': <Users size={16} />,
  Financeiro: <BriefcaseBusiness size={16} />,
  Operações: <Settings size={16} />,
  Mercado: <TrendingUp size={16} />,
  'Universidade MX': <GraduationCap size={16} />,
  'Falar com Consultor': <MessageSquare size={16} />,
}

const mapOwnerNavigationItem = (
  sectionLabel: string,
  item: OwnerBase44NavigationItem,
): SubItem => ({
  key: `${sectionLabel}:${item.label}`,
  label: item.label,
  path: ownerNavigationCanonicalPath(item),
  activePaths: ownerNavigationActivePaths(item),
  icon: ownerItemIcons[item.label] ?? <Grid size={16} />,
  defaultExpanded: item.defaultExpanded,
  badge: item.badge,
  badgeTone: item.badgeTone,
  children: item.children?.map(child => mapOwnerNavigationItem(sectionLabel, child)),
})

const ownerNavConfig: NavCategory[] = OWNER_BASE44_NAVIGATION.map(section => ({
  category: section.label,
  icon: ownerCategoryIcons[section.label],
  items: section.items.map(item => mapOwnerNavigationItem(section.label, item)),
}))

/**
 * Consolidado das lojas do dono. Só faz sentido no menu quando ele tem mais de
 * uma unidade — com uma loja só, o cockpit executivo já é a visão total.
 */
const ownerNetworkCategory: NavCategory = {
  category: 'REDE',
  icon: <LayoutDashboard size={22} />,
  items: [
    { label: 'Minhas Lojas', path: '/minhas-lojas', icon: <Grid size={16} /> },
  ],
}

/**
 * Seção "Gestão Comercial" do dono.
 *
 * Sem gerente ativo na loja, o dono acumula a gestão e recebe o módulo gerencial
 * completo expandido. Com gerente ativo, a mesma seção permanece disponível como
 * acompanhamento (recolhida).
 */
const ownerCommercialCategory = (mode: 'gestao' | 'acompanhamento'): NavCategory => ({
  category: mode === 'gestao' ? 'GESTÃO COMERCIAL' : 'ACOMPANHAR OPERAÇÃO COMERCIAL',
  icon: <BriefcaseBusiness size={22} />,
  // Mesma ordem canônica da seção 2.1 da Especificação Funcional do Módulo
  // Gerencial v1.0, acrescida de Vendas e Funil Comercial.
  items: [
    { label: 'Fechamento Diário', path: '/fechamento-diario', icon: <CheckSquare size={16} /> },
    { label: 'Rotina da Equipe', path: '/gerente/rotina-equipe', icon: <CalendarCheck size={16} /> },
    { label: 'Minha Equipe', path: '/gerente/minha-equipe', icon: <Users size={16} /> },
    { label: 'Meta da Loja', path: '/gerente/meta-loja', icon: <Target size={16} /> },
    { label: 'Mentor Gerencial', path: '/gerente/mentor', icon: <BrainCircuit size={16} /> },
    { label: 'Vendas', path: '/gerente/vendas', icon: <TrendingUp size={16} /> },
    { label: 'Funil Comercial', path: '/funil-vendas', icon: <Filter size={16} /> },
    { label: 'Feedbacks e PDI', path: '/gerente/feedbacks-pdis', icon: <BookOpen size={16} /> },
    { label: 'Ranking', path: '/gerente/ranking', icon: <Trophy size={16} /> },
  ],
})

const navConfig: Record<string, NavCategory[]> = {
  dono: ownerNavConfig,
  gerente: [
    {
      category: 'GESTÃO',
      icon: <Home size={22} />,
      items: [
        { label: 'Início', path: '/home', icon: <Home size={16} /> },
        { label: 'Rotina do Dia', path: '/rotina', icon: <CalendarClock size={16} /> },
        { label: 'Fechamento Diário', path: '/fechamento-diario', icon: <CheckSquare size={16} /> },
      ],
    },
    {
      // Ordem canônica da Especificação Funcional do Módulo Gerencial v1.0,
      // seção 2.1: Rotina da Equipe e Minha Equipe vêm antes de Meta da Loja e
      // Mentor Gerencial. Plano de Ação não consta na sidebar da especificação,
      // mas a rota existe e continua acessível — mantido até decisão de produto.
      category: 'EQUIPE',
      icon: <Users size={22} />,
      items: [
        { label: 'Rotina da Equipe', path: '/gerente/rotina-equipe', icon: <CalendarCheck size={16} /> },
        { label: 'Minha Equipe', path: '/gerente/minha-equipe', icon: <Users size={16} /> },
      ],
    },
    {
      category: 'ESTRATÉGIA',
      icon: <Target size={22} />,
      items: [
        { label: 'Meta da Loja', path: '/gerente/meta-loja', icon: <Target size={16} /> },
        { label: 'Mentor Gerencial', path: '/gerente/mentor', icon: <BrainCircuit size={16} /> },
        { label: 'Plano de Ação', path: '/plano-acao', icon: <ClipboardList size={16} /> },
      ],
    },
    {
      category: 'DESENVOLVIMENTO DA EQUIPE',
      icon: <BookOpen size={22} />,
      items: [
        { label: 'Desenvolvimento', path: '/gerente/feedbacks-pdis', icon: <BookOpen size={16} /> },
        { label: 'Ranking', path: '/gerente/ranking', icon: <Trophy size={16} /> },
      ],
    },
    {
      category: 'DESENVOLVIMENTO',
      icon: <GraduationCap size={22} />,
      items: [
        { label: 'Universidade MX', path: '/gerente/universidade-mx', icon: <GraduationCap size={16} /> },
      ],
    },
  ],
  vendedor: [
    {
      category: 'GESTÃO',
      icon: <Home size={22} />,
      items: [
        { label: 'Início', path: '/home', icon: <Home size={16} />, activePaths: ['/home'] },
        { label: 'Rotina do Dia', path: '/central-execucao', icon: <CalendarCheck size={16} /> },
        { label: 'Fechamento Diário', path: '/fechamento-diario', icon: <CheckSquare size={16} /> },
      ],
    },
    {
      category: 'COMERCIAL',
      icon: <TrendingUp size={22} />,
      items: [
        { label: 'Mentor Comercial', path: '/carteira-clientes', icon: <Users size={16} /> },
        { label: 'Minha Meta', path: '/meu-funil', icon: <Filter size={16} /> },
      ],
    },
    {
      category: 'DESENVOLVIMENTO',
      icon: <GraduationCap size={22} />,
      items: [
        { label: 'Ranking', path: '/classificacao', icon: <Trophy size={16} /> },
        { label: 'Universidade MX', path: '/universidade-mx', icon: <GraduationCap size={16} /> },
        { label: 'Desenvolvimento', path: '/desenvolvimento', icon: <BookOpen size={16} /> },
      ],
    },
  ],
}

function LayoutContent() {
  const {
    profile,
    role,
    signOut,
    membership,
    isSimulating,
    simulationRole,
    stopSimulation,
    baseProfile,
    vinculos_loja,
  } = useAuth()
  const { unreadCount } = useNotifications()
  const { devolutivas } = useFeedbacks()
  const pendingFeedbackCount = role === 'vendedor'
    ? devolutivas.filter((feedback) => !feedback.acknowledged).length
    : 0
  const navigate = useNavigate()
  const location = useLocation()
  const [ownerLastUpdated, setOwnerLastUpdated] = React.useState(() => new Date())
  const { commercialAccessMode } = useStoreManagementContext()

  const storeDashboardPath = membership?.store?.name
    ? `/lojas/${slugify(membership.store.name)}`
    : role === 'gerente' ? '/classificacao' : '/lojas'
  const storeTeamPath = role === 'gerente'
    ? '/equipe'
    : storeDashboardPath === '/lojas'
      ? '/lojas'
      : `${storeDashboardPath}${storeDashboardPath.includes('?') ? '&' : '?'}tab=equipe`
  const storeConsultorIaPath = storeDashboardPath.startsWith('/lojas/')
    ? `${storeDashboardPath}/consultor-ia`
    : '/lojas'
  const categories = React.useMemo(() => {
    const baseCategories = role ? (navConfig[role] || []) : []
    const ownerStoreCount = role === 'dono' ? vinculos_loja.length : 0
    const withCommercial = role === 'dono'
      ? [
          ...baseCategories,
          ...(ownerStoreCount > 1 ? [ownerNetworkCategory] : []),
          ownerCommercialCategory(commercialAccessMode),
        ]
      : baseCategories
    return withCommercial
      .map((category) => {
        const items = category.items
          .map((item) => {
            if (item.path === STORE_DASHBOARD_PATH) return { ...item, path: storeDashboardPath }
            if (item.path === STORE_TEAM_PATH) return { ...item, path: storeTeamPath }
            if (item.path === STORE_CONSULTOR_IA_PATH) {
              if (!storeDashboardPath.startsWith('/lojas/')) return null
              return { ...item, path: storeConsultorIaPath }
            }
            return item
          })
          .filter((item): item is SubItem => item !== null && canAccessPath(item.path, role))
        return { ...category, items }
      })
      .filter((category) => category.items.length > 0)
  }, [commercialAccessMode, role, storeConsultorIaPath, storeDashboardPath, storeTeamPath, vinculos_loja])

  const perfilVisivel = role
    ? rotulosPerfil[role] || 'Perfil autorizado'
    : 'Perfil autorizado'
  const moduloVisivel = role
    ? rotulosModulo[role] || 'Módulo MX'
    : 'Módulo MX'
  const perfilBaseVisivel = baseProfile?.name || 'Admin MX'

  const sidebarSections = React.useMemo<MxSidebarNavSection[]>(() => {
    if (role && isPerfilInternoMx(role)) {
      return buildInternalMxNavigation(role, { unreadNotifications: unreadCount })
    }

    const badgeForPath = (path: string) => {
      const pathname = path.split('?')[0]
      const count = pathname === '/devolutivas' || pathname === '/feedbacks'
        ? pendingFeedbackCount
        : pathname === '/notificacoes' ? unreadCount : 0
      if (count <= 0) return undefined
      return count > 99 ? '99+' : String(count)
    }

    const toSidebarItem = (item: SubItem): MxSidebarNavItem => {
      const label = item.label.toLowerCase()
      return {
        key: item.key,
        label: item.label,
        path: item.path,
        icon: item.icon,
        badge: item.badge ?? badgeForPath(item.path),
        badgeTone: item.badgeTone,
        activePaths: item.activePaths ?? [item.path],
        children: item.children?.map(toSidebarItem),
        defaultExpanded: item.defaultExpanded,
        special: item.path.includes('/consultor-ia') ||
          label.includes('consultor ia') ||
          label.includes('consultor mx ia') ||
          label.includes('falar com consultor'),
      }
    }

    return categories.map((category): MxSidebarNavSection => ({
      label: category.category,
      items: category.items.map(toSidebarItem),
    }))
  }, [categories, pendingFeedbackCount, role, unreadCount])

  if (!profile || !role) return null

  if (profile.must_change_password) {
    // Este retorno antecipado escapa do MxRoleVisualScope aplicado abaixo, de
    // modo que a troca obrigatória de senha renderizava campos legados para
    // todos os perfis — inclusive os que já veem o visual aprovado no resto do
    // produto. O modo é fornecido aqui explicitamente.
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-mx-lg">
          <ForcePasswordChange />
        </div>
    )
  }

  const pageOutlet = (
    <MotionPage key={location.pathname} className="h-full">
      <Outlet
        context={role === 'dono'
          ? { setLastUpdated: setOwnerLastUpdated, lastUpdated: ownerLastUpdated }
          : undefined}
      />
    </MotionPage>
  )
  const isOwnerRoute = location.pathname === '/dono' || location.pathname.startsWith('/dono/')
  const pageContent = role === 'dono' && isOwnerRoute
    ? pageOutlet
    : (
      <MxRoleVisualScope manager={role !== 'vendedor'}>
        {pageOutlet}
      </MxRoleVisualScope>
      )
  const stopCurrentSimulation = () => {
    stopSimulation()
    navigate('/painel', { replace: true })
  }

  return (
    <MxSidebarShell
      profileName={profile.name}
      profileRoleLabel={perfilVisivel}
      moduleLabel={moduloVisivel}
      avatarUrl={profile.avatar_url}
      navSections={sidebarSections}
      onSignOut={signOut}
      profilePath="/perfil"
      settingsPath="/configuracoes"
      notificationsPath="/notificacoes"
      sidebarLabel={`Menu principal do ${perfilVisivel}`}
      isSimulating={isSimulating}
      simulationLabel={simulationRole ? rotulosPerfil[simulationRole] : 'MX'}
      simulationBase={perfilBaseVisivel}
      simulationStore={membership?.store?.name || 'Sandbox MX'}
      onStopSimulation={stopCurrentSimulation}
      cta={role === 'gerente'
        ? { label: 'Falar com Consultor', icon: MessageSquare, path: '/falar-consultor' }
        : undefined}
    >
      {pageContent}
    </MxSidebarShell>
  )
}

/**
 * Único shell autenticado. Providers e tokens específicos de domínio podem
 * variar por perfil, mas sidebar, drawer, landmark e área de conteúdo não.
 */
export default function Layout() {
  const { role } = useAuth()

  if (role !== 'dono') return <LayoutContent />

  return (
    <OwnerProvider>
      <div className="h-dvh min-h-0 overflow-hidden">
        <LayoutContent />
        <ConsultantRequestModal />
        <OwnerToaster />
      </div>
    </OwnerProvider>
  )
}
