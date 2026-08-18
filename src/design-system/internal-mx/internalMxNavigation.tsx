import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ClipboardList,
  Database,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  MonitorPlay,
  Package,
  Settings,
  Target,
  TrendingUp,
  Trophy,
  User,
} from 'lucide-react'
import type { UserRole } from '@/types/database'
import { canAccessPath } from '@/lib/auth/routeAccess'
import type { MxSidebarNavSection } from '@/components/MxSidebarShell'

export type InternalMxNavigationCounts = {
  unreadNotifications?: number
}

const clampBadge = (value?: number) => {
  if (!value || value <= 0) return undefined
  return value > 99 ? '99+' : String(value)
}

export function buildInternalMxNavigation(
  role: UserRole,
  counts: InternalMxNavigationCounts = {},
): MxSidebarNavSection[] {
  // Cada domínio operacional possui uma única entrada canônica. As antigas
  // rotas permanecem somente como aliases de compatibilidade no AppShell.
  const sections: MxSidebarNavSection[] = [
    {
      key: 'operacao-mx',
      label: 'Operação MX',
      items: [
        { key: 'dashboard', label: 'Início', path: '/painel', icon: LayoutDashboard },
        {
          key: 'admin-clients',
          label: 'Clientes MX',
          path: '/clientes',
          icon: BriefcaseBusiness,
          activePaths: ['/clientes', '/clientes/novo', '/lojas'],
        },
        {
          key: 'admin-consulting',
          label: 'Consultoria MX',
          path: '/consultoria',
          icon: CalendarDays,
          activePaths: ['/consultoria', '/consultoria-mx', '/consultoria/clientes'],
        },
        { key: 'admin-team', label: 'Equipe MX', path: '/equipe', icon: User, activePaths: ['/equipe', '/team'] },
        { key: 'university', label: 'Universidade MX', path: '/universidade-mx', icon: GraduationCap },
        { key: 'agenda', label: 'Agenda', path: '/agenda', icon: CalendarDays },
      ],
    },
    {
      key: 'produto-metodologia',
      label: 'Produto e Metodologia',
      items: [
        { key: 'admin-products', label: 'Produtos de Consultoria', path: '/produtos', icon: Package },
        {
          key: 'strategic-plan',
          label: 'Plano Estratégico',
          path: '/plano-estrategico',
          icon: TrendingUp,
          activePaths: ['/plano-estrategico', '/indicadores'],
        },
        {
          key: 'action-plan',
          label: 'Planos de Ação',
          path: '/plano-acao',
          icon: ClipboardList,
          activePaths: ['/plano-acao', '/planos-acao'],
        },
        { key: 'admin-scores', label: 'Scores e Alertas', path: '/scores', icon: Target, activePaths: ['/scores', '/scores-alertas'] },
        { key: 'ranking', label: 'Ranking', path: '/classificacao', icon: Trophy },
        { key: 'feedback', label: 'Devolutivas e PDI', path: '/devolutivas', icon: MessageSquare },
        { key: 'training', label: 'Desenvolvimento', path: '/treinamentos', icon: GraduationCap },
      ],
    },
    {
      key: 'plataforma-governanca',
      label: 'Plataforma e Governança',
      items: [
        { key: 'notifications', label: 'Notificações', path: '/notificacoes', icon: Bell, badge: clampBadge(counts.unreadNotifications) },
        { key: 'support', label: 'Suporte e Incidentes', path: '/suporte', icon: MessageSquare },
        { key: 'morning-report', label: 'Relatório Matinal', path: '/relatorio-matinal', icon: ClipboardList },
        { key: 'sales-performance', label: 'Performance de Vendas', path: '/relatorios/performance-vendas', icon: TrendingUp },
        { key: 'seller-performance', label: 'Performance por Vendedor', path: '/relatorios/performance-vendedor', icon: User },
        { key: 'diagnostics', label: 'Segurança e Auditoria', path: '/auditoria', icon: Database, activePaths: ['/auditoria', '/seguranca'] },
        { key: 'pmr-settings', label: 'Parâmetros PMR', path: '/configuracoes/consultoria-pmr', icon: Database },
        { key: 'settings', label: 'Configurações da Plataforma', path: '/configuracoes', icon: Settings },
      ],
    },
    {
      key: 'simulation',
      label: 'Simulação',
      items: [
        { key: 'simulation-seller', label: 'Vendedor', path: '/simulacao/vendedor', icon: User, activePaths: ['/simulacao', '/simulacao/vendedor'] },
        { key: 'simulation-manager', label: 'Gerente', path: '/simulacao/gerente', icon: MonitorPlay },
        { key: 'simulation-owner', label: 'Dono', path: '/simulacao/dono', icon: Building2 },
      ],
    },
  ]

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccessPath(item.path, role)),
    }))
    .filter((section) => section.items.length > 0)
}
