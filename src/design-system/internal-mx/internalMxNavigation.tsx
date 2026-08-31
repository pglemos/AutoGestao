import {
  Activity,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ClipboardList,
  Database,
  GraduationCap,
  Headset,
  LayoutDashboard,
  Map,
  MessageSquare,
  MonitorPlay,
  Package,
  Receipt,
  Settings,
  Shield,
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
          label: 'Consultoria',
          path: '/consultoria',
          icon: CalendarDays,
          activePaths: ['/consultoria', '/consultoria/clientes'],
        },
        { key: 'admin-team', label: 'Equipe MX', path: '/equipe', icon: User, activePaths: ['/equipe', '/team'] },
        { key: 'university', label: 'Universidade MX', path: '/universidade-mx', icon: GraduationCap },
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
          icon: Target,
          activePaths: ['/plano-estrategico', '/indicadores'],
        },
        {
          key: 'action-plan',
          label: 'Planos de Ação',
          path: '/plano-acao',
          icon: ClipboardList,
          activePaths: ['/plano-acao', '/planos-acao'],
        },
        {
          key: 'consultoria-mx',
          label: 'Consultoria MX',
          path: '/consultoria-mx',
          icon: MessageSquare,
          activePaths: ['/consultoria-mx'],
        },
        { key: 'admin-scores', label: 'Scores e Alertas', path: '/scores', icon: Target, activePaths: ['/scores', '/scores-alertas'] },
        { key: 'benchmark', label: 'Benchmark e Mercado', path: '/benchmark', icon: TrendingUp, activePaths: ['/benchmark', '/mercado'] },
      ],
    },
    {
      key: 'plataforma-governanca',
      label: 'Plataforma e Governança',
      items: [
        {
          key: 'data-reconciliation',
          label: 'Dados e Conciliação',
          path: '/dados',
          icon: Database,
          activePaths: ['/dados', '/dados-conciliacao'],
        },
        {
          key: 'notifications',
          label: 'Notificações e Agenda',
          path: '/notificacoes',
          icon: Bell,
          badge: clampBadge(counts.unreadNotifications),
        },
        { key: 'support', label: 'Suporte e Incidentes', path: '/suporte', icon: Headset },
        {
          key: 'diagnostics',
          label: 'Segurança e Auditoria',
          path: '/seguranca',
          icon: Shield,
          activePaths: ['/seguranca', '/auditoria'],
        },
        { key: 'observability', label: 'Observabilidade', path: '/observabilidade', icon: Activity },
        { key: 'settings', label: 'Configurações da Plataforma', path: '/configuracoes', icon: Settings },
        { key: 'functional-map', label: 'Mapa Funcional', path: '/mapa-funcional', icon: Map },
        { key: 'test-roadmap', label: 'Roteiro de Testes', path: '/roteiro-testes', icon: ClipboardList },
      ],
    },
    {
      key: 'operacao-comercial',
      label: 'Operação comercial',
      items: [
        { key: 'store-sales', label: 'Vendas', path: '/vendas', icon: Receipt },
        { key: 'agenda', label: 'Agenda', path: '/agenda', icon: CalendarDays },
        { key: 'ranking', label: 'Ranking', path: '/classificacao', icon: Trophy },
        { key: 'feedback', label: 'Devolutivas', path: '/devolutivas', icon: MessageSquare },
        { key: 'morning-report', label: 'Relatório Matinal', path: '/relatorio-matinal', icon: ClipboardList },
        { key: 'sales-performance', label: 'Perf. Vendas', path: '/relatorios/performance-vendas', icon: TrendingUp },
        { key: 'seller-performance', label: 'Por Vendedor', path: '/relatorios/performance-vendedor', icon: User },
        { key: 'pmr-settings', label: 'Parâmetros PMR', path: '/configuracoes/consultoria-pmr', icon: Database },
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
