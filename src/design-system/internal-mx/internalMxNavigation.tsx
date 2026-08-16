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
  // Três grupos da especificação do módulo Administrador (Operação MX,
  // Produto e Metodologia, Plataforma e Governança). Os itens de rede e
  // conteúdo continuam acessíveis dentro do grupo a que pertencem — o consultor
  // MX usa essas telas todo dia e tirá-las do menu seria regressão.
  const sections: MxSidebarNavSection[] = [
    {
      key: 'operacao-mx',
      label: 'Operação MX',
      items: [
        { key: 'dashboard', label: 'Início', path: '/painel', icon: LayoutDashboard },
        { key: 'admin-clients', label: 'Clientes MX', path: '/clientes', icon: BriefcaseBusiness, activePaths: ['/clientes', '/clientes/novo'] },
        { key: 'admin-consulting', label: 'Consultoria MX', path: '/consultoria-mx', icon: CalendarDays },
        { key: 'consulting', label: 'Carteira consultiva', path: '/consultoria/clientes', icon: BriefcaseBusiness, activePaths: ['/consultoria', '/consultoria/clientes'] },
        { key: 'admin-team', label: 'Equipe MX', path: '/equipe', icon: User },
        { key: 'university', label: 'Universidade MX', path: '/universidade-mx', icon: GraduationCap },
        { key: 'stores', label: 'Lojas', path: '/lojas', icon: Building2 },
        { key: 'agenda', label: 'Agenda', path: '/agenda', icon: CalendarDays },
      ],
    },
    {
      key: 'produto-metodologia',
      label: 'Produto e Metodologia',
      items: [
        { key: 'admin-products', label: 'Produtos de Consultoria', path: '/produtos', icon: Package },
        { key: 'admin-indicators', label: 'Indicadores e Parâmetros', path: '/indicadores', icon: Gauge },
        { key: 'admin-action-plans', label: 'Planos de Ação e Playbooks', path: '/planos-acao', icon: ClipboardList },
        { key: 'strategic-plan', label: 'Plano Estratégico', path: '/plano-estrategico', icon: TrendingUp },
        { key: 'action-plan', label: 'Plano de Ação do Cliente', path: '/plano-acao', icon: ClipboardList },
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
        { key: 'morning-report', label: 'Relatório Matinal', path: '/relatorio-matinal', icon: ClipboardList },
        { key: 'sales-performance', label: 'Performance de Vendas', path: '/relatorios/performance-vendas', icon: TrendingUp },
        { key: 'seller-performance', label: 'Performance por Vendedor', path: '/relatorios/performance-vendedor', icon: User },
        { key: 'diagnostics', label: 'Segurança e Auditoria', path: '/auditoria', icon: Database },
        { key: 'reprocessing', label: 'Dados e Conciliação', path: '/configuracoes/reprocessamento', icon: Database },
        { key: 'operational-settings', label: 'Configuração Operacional', path: '/configuracoes/operacional', icon: SlidersHorizontal },
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
