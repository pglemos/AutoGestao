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
  Gauge,
  Package,
  Settings,
  SlidersHorizontal,
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
      key: 'network',
      label: 'Rede e Gestão',
      items: [
        { key: 'dashboard', label: 'Painel Geral', path: '/painel', icon: LayoutDashboard },
        { key: 'stores', label: 'Lojas', path: '/lojas', icon: Building2 },
        { key: 'strategic-plan', label: 'Plano Estratégico', path: '/plano-estrategico', icon: TrendingUp },
        { key: 'action-plan', label: 'Plano de Ação', path: '/plano-acao', icon: ClipboardList },
        { key: 'consulting', label: 'Consultoria', path: '/consultoria/clientes', icon: BriefcaseBusiness, activePaths: ['/consultoria', '/consultoria/clientes'] },
        { key: 'agenda', label: 'Agenda', path: '/agenda', icon: CalendarDays },
      ],
    },
    {
      key: 'admin-mx',
      label: 'Administração MX',
      items: [
        { key: 'admin-clients', label: 'Clientes', path: '/clientes', icon: BriefcaseBusiness, activePaths: ['/clientes', '/clientes/novo'] },
        { key: 'admin-team', label: 'Equipe MX', path: '/equipe', icon: User },
        { key: 'admin-products', label: 'Produtos de Consultoria', path: '/produtos', icon: Package },
        { key: 'admin-indicators', label: 'Indicadores', path: '/indicadores', icon: Gauge },
        { key: 'admin-action-plans', label: 'Planos de Ação', path: '/planos-acao', icon: ClipboardList },
        { key: 'admin-consulting', label: 'Consultoria MX', path: '/consultoria-mx', icon: CalendarDays },
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
    {
      key: 'content',
      label: 'Rotina e Conteúdo',
      items: [
        { key: 'ranking', label: 'Ranking', path: '/classificacao', icon: Trophy },
        { key: 'feedback', label: 'Devolutivas/PDI', path: '/devolutivas', icon: MessageSquare },
        { key: 'training', label: 'Desenvolvimento', path: '/treinamentos', icon: GraduationCap },
        { key: 'notifications', label: 'Notificações', path: '/notificacoes', icon: Bell, badge: clampBadge(counts.unreadNotifications) },
      ],
    },
    {
      key: 'reports',
      label: 'Relatórios e Diagnóstico',
      items: [
        { key: 'morning-report', label: 'Relatório Matinal', path: '/relatorio-matinal', icon: ClipboardList },
        { key: 'sales-performance', label: 'Performance de Vendas', path: '/relatorios/performance-vendas', icon: TrendingUp },
        { key: 'seller-performance', label: 'Performance por Vendedor', path: '/relatorios/performance-vendedor', icon: User },
        { key: 'diagnostics', label: 'Diagnóstico Operacional', path: '/auditoria', icon: Database },
      ],
    },
    {
      key: 'settings',
      label: 'Configurações',
      items: [
        { key: 'operational-settings', label: 'Configuração Operacional', path: '/configuracoes/operacional', icon: SlidersHorizontal },
        { key: 'pmr-settings', label: 'Parâmetros PMR', path: '/configuracoes/consultoria-pmr', icon: Database },
        { key: 'reprocessing', label: 'Reprocessamento', path: '/configuracoes/reprocessamento', icon: TrendingUp },
        { key: 'settings', label: 'Configurações', path: '/configuracoes', icon: Settings },
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
