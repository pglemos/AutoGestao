import {
    User as UserIcon,
    Lock,
    Bell,
    Users,
    Building2,
    SlidersHorizontal,
    Wallet,
    Sparkles,
    FolderTree,
    Megaphone,
    Plug,
    Server,
    Palette,
} from 'lucide-react'
import type { ConfigTabDefinition } from './types'
import type { UserRole } from '@/types/database'
import { PerfilTab } from './components/tabs/PerfilTab'
import { SegurancaTab } from './components/tabs/SegurancaTab'
import { NotificacoesTab } from './components/tabs/NotificacoesTab'
import { EquipeUsuariosTabRouter } from './components/tabs/EquipeUsuariosTabRouter'
import { LojasRedeTab } from './components/tabs/LojasRedeTab'
import { OperacionalLojaTab } from './components/tabs/OperacionalLojaTab'
import { ConsultoriaPmrTab } from './components/tabs/ConsultoriaPmrTab'
import { CatalogosTab } from './components/tabs/CatalogosTab'
import { BroadcastsTab } from './components/tabs/BroadcastsTab'
import { IntegracoesTab } from './components/tabs/IntegracoesTab'
import { SistemaMxTab } from './components/tabs/SistemaMxTab'
import { AparenciaTab } from './components/tabs/AparenciaTab'
import RemuneracaoPage from '@/features/remuneracao/RemuneracaoPage'

export const TAB_REGISTRY: ConfigTabDefinition[] = [
    {
        key: 'perfil',
        label: 'Perfil',
        description: 'Dados pessoais e avatar',
        icon: UserIcon,
        component: PerfilTab,
        roles: ['administrador_geral', 'administrador_mx', 'consultor_mx', 'dono', 'gerente', 'vendedor'],
        section: 'pessoal',
    },
    {
        key: 'seguranca',
        label: 'Segurança',
        description: 'Senha e sessões',
        icon: Lock,
        component: SegurancaTab,
        roles: ['administrador_geral', 'administrador_mx', 'consultor_mx', 'dono', 'gerente', 'vendedor'],
        section: 'pessoal',
    },
    {
        key: 'notificacoes',
        label: 'Notificações',
        description: 'Canais e tópicos',
        icon: Bell,
        component: NotificacoesTab,
        roles: ['administrador_geral', 'administrador_mx', 'consultor_mx', 'dono', 'gerente', 'vendedor'],
        section: 'pessoal',
    },
    {
        key: 'equipe-usuarios',
        label: 'Equipe & Usuários',
        description: 'Gerenciar integrantes',
        icon: Users,
        component: EquipeUsuariosTabRouter,
        roles: ['administrador_geral', 'administrador_mx', 'consultor_mx', 'dono', 'gerente'],
        readOnlyRoles: ['dono'],
        section: 'gestao',
    },
    {
        key: 'lojas-rede',
        label: 'Lojas & Rede',
        description: 'Unidades operacionais',
        icon: Building2,
        component: LojasRedeTab,
        roles: ['administrador_geral', 'administrador_mx', 'consultor_mx', 'dono'],
        readOnlyRoles: ['dono'],
        section: 'gestao',
    },
    {
        key: 'operacional-loja',
        label: 'Operacional',
        description: 'Parâmetros por loja',
        icon: SlidersHorizontal,
        component: OperacionalLojaTab,
        roles: ['administrador_geral', 'administrador_mx', 'consultor_mx', 'dono'],
        readOnlyRoles: ['dono'],
        section: 'gestao',
    },
    {
        key: 'remuneracao',
        label: 'Remuneração',
        description: 'Salários, comissão e bônus',
        icon: Wallet,
        component: RemuneracaoPage,
        roles: ['administrador_geral', 'administrador_mx', 'dono', 'gerente'],
        section: 'gestao',
    },
    {
        key: 'consultoria-pmr',
        label: 'Consultoria PMR',
        description: 'Parâmetros, métricas, programas',
        icon: Sparkles,
        component: ConsultoriaPmrTab,
        roles: ['administrador_geral', 'administrador_mx', 'consultor_mx'],
        section: 'mx',
    },
    {
        key: 'catalogos',
        label: 'Governança de Conteúdo',
        description: 'Atalhos e regras de catálogo',
        icon: FolderTree,
        component: CatalogosTab,
        roles: ['administrador_geral', 'administrador_mx', 'consultor_mx'],
        section: 'mx',
    },
    {
        key: 'broadcasts',
        label: 'Comunicados',
        description: 'Broadcasts oficiais MX',
        icon: Megaphone,
        component: BroadcastsTab,
        roles: ['administrador_geral', 'administrador_mx', 'consultor_mx'],
        section: 'mx',
    },
    {
        key: 'integracoes',
        label: 'Integrações',
        description: 'Calendar, webhooks, APIs',
        icon: Plug,
        component: IntegracoesTab,
        roles: ['administrador_geral', 'administrador_mx', 'consultor_mx'],
        section: 'mx',
    },
    {
        key: 'sistema-mx',
        label: 'Sistema MX',
        description: 'Auditoria, logs, operações',
        icon: Server,
        component: SistemaMxTab,
        roles: ['administrador_geral', 'administrador_mx', 'consultor_mx'],
        section: 'sistema',
    },
    {
        key: 'aparencia',
        label: 'Minha Aparência',
        description: 'Tema e densidade da minha sessão',
        icon: Palette,
        component: AparenciaTab,
        roles: ['administrador_geral', 'administrador_mx', 'consultor_mx', 'dono', 'gerente', 'vendedor'],
        section: 'pessoal',
    },
]

export const SECTION_LABELS: Record<ConfigTabDefinition['section'], string> = {
    pessoal: 'Pessoal',
    gestao: 'Rede e Lojas',
    mx: 'Governança MX',
    sistema: 'Saúde do Sistema',
}

export function getVisibleTabs(role: string | null | undefined): ConfigTabDefinition[] {
    if (!role) return TAB_REGISTRY.filter(t => t.roles.includes('vendedor'))
    return TAB_REGISTRY.filter(t => t.roles.includes(role as UserRole))
}
