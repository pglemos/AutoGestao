import { useState, useMemo } from 'react'
import {
  Layers,
  Search,
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import {
  MxModuleHeader,
  MxModulePage,
  MxSectionCard,
} from '@/components/module/MxModuleVisualPrimitives'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

export type ImplementationStatus = 'FUNCIONAL' | 'SIMULADO' | 'BLOQUEADO' | 'FUTURO' | 'COM_ERRO'
export type ActionType = 'NAVIGATE' | 'OPEN_MODAL' | 'MUTATE_DATA' | 'APPLY_FILTER' | 'DOWNLOAD_OR_EXPORT' | 'SIMULATE' | 'DISABLED'

export interface InteractionItem {
  id: string
  screen_code: string
  screen_label: string
  element_code: string
  element_label: string
  element_type: string
  action_type: ActionType
  source_route: string
  destination_route?: string
  modal_name?: string
  entity_name?: string
  required_permission?: string
  expected_result: string
  audit_event?: string
  implementation_status: ImplementationStatus
  prototype_behavior?: string
  notes?: string
}

const DEFAULT_INTERACTIONS: InteractionItem[] = [
  {
    id: 'int-01',
    screen_code: 'CLIENTES_LISTA',
    screen_label: 'Clientes MX',
    element_code: 'BTN_NOVO_CLIENTE',
    element_label: '+ Novo Cliente',
    element_type: 'BUTTON',
    action_type: 'NAVIGATE',
    source_route: '/clientes',
    destination_route: '/clientes/novo',
    entity_name: 'clientes_consultoria',
    required_permission: 'administrador_mx',
    expected_result: 'Abre o wizard de 7 etapas para cadastro e onboarding de novo cliente.',
    audit_event: 'NEW_CLIENT_WIZARD_OPEN',
    implementation_status: 'FUNCIONAL',
    prototype_behavior: 'Navega para a rota canônica /clientes/novo com draft transacional.',
  },
  {
    id: 'int-02',
    screen_code: 'CLIENTES_LISTA',
    screen_label: 'Clientes MX',
    element_code: 'ROW_CLIENTE_CLICK',
    element_label: 'Linha do Cliente (Ficha 360)',
    element_type: 'ROW',
    action_type: 'NAVIGATE',
    source_route: '/clientes',
    destination_route: '/clientes/:slug',
    entity_name: 'clientes_consultoria',
    required_permission: 'administrador_mx',
    expected_result: 'Abre a Visão 360 do cliente selecionado com 8 abas de governança e dados.',
    audit_event: 'CLIENT_360_VIEW',
    implementation_status: 'FUNCIONAL',
  },
  {
    id: 'int-03',
    screen_code: 'CLIENTE_DETALHE',
    screen_label: 'Visão 360 do Cliente',
    element_code: 'BTN_VALIDAR_ATIVAR',
    element_label: 'Validar e Ativar',
    element_type: 'BUTTON',
    action_type: 'OPEN_MODAL',
    source_route: '/clientes/:slug',
    modal_name: 'ClientActivationModal',
    entity_name: 'clientes_consultoria',
    required_permission: 'administrador_mx',
    expected_result: 'Executa o motor de prontidão (12 checks) e ativa o cliente na consultoria.',
    audit_event: 'CLIENT_ACTIVATION',
    implementation_status: 'FUNCIONAL',
  },
  {
    id: 'int-04',
    screen_code: 'CLIENTE_DETALHE',
    screen_label: 'Visão 360 do Cliente',
    element_code: 'BTN_ABRIR_PLANO_ESTRATEGICO',
    element_label: 'Abrir Plano Estratégico',
    element_type: 'BUTTON',
    action_type: 'NAVIGATE',
    source_route: '/clientes/:slug',
    destination_route: '/clientes/:slug/plano-estrategico/2026',
    entity_name: 'planejamentos_estrategicos',
    required_permission: 'administrador_mx',
    expected_result: 'Abre a matriz de cadastro rápido, revisão de metas e consolidação anual.',
    audit_event: 'STRATEGIC_PLAN_OPEN',
    implementation_status: 'FUNCIONAL',
  },
  {
    id: 'int-05',
    screen_code: 'CLIENTE_DETALHE',
    screen_label: 'Visão 360 do Cliente',
    element_code: 'BTN_ABRIR_PLANO_ACAO',
    element_label: 'Abrir Plano de Ação',
    element_type: 'BUTTON',
    action_type: 'NAVIGATE',
    source_route: '/clientes/:slug',
    destination_route: '/clientes/:slug/plano-acao',
    entity_name: 'planos_acao',
    required_permission: 'administrador_mx',
    expected_result: 'Abre o quadro Kanban e lista de planos de ação específicos do cliente.',
    audit_event: 'ACTION_PLAN_OPEN',
    implementation_status: 'FUNCIONAL',
  },
  {
    id: 'int-06',
    screen_code: 'CLIENTE_DETALHE',
    screen_label: 'Visão 360 do Cliente',
    element_code: 'BTN_ABRIR_CONSULTORIA',
    element_label: 'Abrir Consultoria e Entregas',
    element_type: 'BUTTON',
    action_type: 'NAVIGATE',
    source_route: '/clientes/:slug',
    destination_route: '/clientes/:slug/consultoria',
    entity_name: 'programas_visita_consultoria',
    required_permission: 'administrador_mx',
    expected_result: 'Abre o cronograma de encontros, vídeos, arquivos e atas da consultoria.',
    audit_event: 'CONSULTING_DELIVERIES_OPEN',
    implementation_status: 'FUNCIONAL',
  },
  {
    id: 'int-07',
    screen_code: 'PLANO_ESTRATEGICO_EDITOR',
    screen_label: 'Editor de Plano Estratégico',
    element_code: 'BTN_PUBLICAR_PLANO',
    element_label: 'Publicar Plano',
    element_type: 'BUTTON',
    action_type: 'MUTATE_DATA',
    source_route: '/clientes/:slug/plano-estrategico/:year',
    entity_name: 'planejamentos_estrategicos',
    required_permission: 'administrador_mx',
    expected_result: 'Valida preenchimento, calcula fórmulas e publica metas visíveis para o Dono.',
    audit_event: 'STRATEGIC_PLAN_PUBLISH',
    implementation_status: 'FUNCIONAL',
  },
  {
    id: 'int-08',
    screen_code: 'PLANO_ESTRATEGICO_EDITOR',
    screen_label: 'Editor de Plano Estratégico',
    element_code: 'BTN_VISUALIZAR_DONO',
    element_label: 'Visualizar como Dono',
    element_type: 'BUTTON',
    action_type: 'NAVIGATE',
    source_route: '/clientes/:slug/plano-estrategico/:year',
    destination_route: '/plano-estrategico?viewAs=dono',
    entity_name: 'planejamentos_estrategicos',
    required_permission: 'administrador_mx',
    expected_result: 'Renderiza a experiência exata do painel executivo do Dono para a mesma célula.',
    audit_event: 'OWNER_PREVIEW_SIMULATION',
    implementation_status: 'FUNCIONAL',
  },
  {
    id: 'int-09',
    screen_code: 'PLANOS_ACAO_GLOBAL',
    screen_label: 'Planos de Ação e Playbooks',
    element_code: 'BTN_CRIAR_PLANO_PADRAO',
    element_label: 'Criar Plano Padrão',
    element_type: 'BUTTON',
    action_type: 'OPEN_MODAL',
    source_route: '/plano-acao',
    modal_name: 'ActionPlanWizardModal',
    entity_name: 'planos_acao_templates',
    required_permission: 'administrador_mx',
    expected_result: 'Cria modelo metodológico padrão de plano de ação para aplicação nos clientes.',
    audit_event: 'ACTION_PLAN_TEMPLATE_CREATE',
    implementation_status: 'FUNCIONAL',
  },
  {
    id: 'int-10',
    screen_code: 'PLANOS_ACAO_GLOBAL',
    screen_label: 'Planos de Ação e Playbooks',
    element_code: 'BTN_APLICAR_CLIENTE',
    element_label: 'Aplicar a Cliente',
    element_type: 'BUTTON',
    action_type: 'OPEN_MODAL',
    source_route: '/plano-acao',
    modal_name: 'ApplyTemplateModal',
    entity_name: 'planos_acao',
    required_permission: 'administrador_mx',
    expected_result: 'Aplica modelo de plano de ação diretamente ao escopo do cliente/loja de forma idempotente.',
    audit_event: 'ACTION_PLAN_APPLY',
    implementation_status: 'FUNCIONAL',
  },
  {
    id: 'int-11',
    screen_code: 'EQUIPE_MX',
    screen_label: 'Equipe MX',
    element_code: 'BTN_ADICIONAR_MEMBRO',
    element_label: 'Adicionar Membro',
    element_type: 'BUTTON',
    action_type: 'OPEN_MODAL',
    source_route: '/equipe',
    modal_name: 'MemberAddModal',
    entity_name: 'perfil_consultor_mx',
    required_permission: 'administrador_geral',
    expected_result: 'Cadastra novo consultor ou membro administrativo com qualificações e capacidade.',
    audit_event: 'TEAM_MEMBER_CREATE',
    implementation_status: 'FUNCIONAL',
  },
  {
    id: 'int-12',
    screen_code: 'PRODUTOS_CONSULTORIA',
    screen_label: 'Produtos de Consultoria',
    element_code: 'BTN_NOVO_PRODUTO',
    element_label: 'Novo Produto',
    element_type: 'BUTTON',
    action_type: 'OPEN_MODAL',
    source_route: '/produtos',
    modal_name: 'ProductFormModal',
    entity_name: 'versoes_metodologia_produto',
    required_permission: 'administrador_geral',
    expected_result: 'Cadastra novo programa metodológico de consultoria com cronograma e entregas.',
    audit_event: 'CONSULTING_PRODUCT_CREATE',
    implementation_status: 'FUNCIONAL',
  },
  {
    id: 'int-13',
    screen_code: 'BENCHMARK',
    screen_label: 'Benchmark e Mercado',
    element_code: 'TABLE_BENCHMARK_COHORT',
    element_label: 'Tabela de Comparação de Mercado',
    element_type: 'ROW',
    action_type: 'APPLY_FILTER',
    source_route: '/benchmark',
    entity_name: 'benchmark_snapshots',
    required_permission: 'administrador_mx',
    expected_result: 'Exibe médias de faturamento, margem e giro com dados anonimizados de 5+ lojas.',
    audit_event: 'BENCHMARK_VIEW',
    implementation_status: 'FUNCIONAL',
  },
  {
    id: 'int-14',
    screen_code: 'DADOS_CONCILIACAO',
    screen_label: 'Dados e Conciliação',
    element_code: 'BTN_CONCILIAR_BASE',
    element_label: 'Conciliar Base',
    element_type: 'BUTTON',
    action_type: 'MUTATE_DATA',
    source_route: '/dados',
    entity_name: 'data_correction_audit',
    required_permission: 'administrador_mx',
    expected_result: 'Aplica correções auditadas em valores divergentes de vendas ou estoques.',
    audit_event: 'DATA_RECONCILIATION_APPLY',
    implementation_status: 'FUNCIONAL',
  },
  {
    id: 'int-15',
    screen_code: 'SEGURANCA_AUDITORIA',
    screen_label: 'Segurança e Auditoria',
    element_code: 'TAB_AUDIT_TRAILS',
    element_label: 'Abas de Trilhas Reais',
    element_type: 'TAB',
    action_type: 'APPLY_FILTER',
    source_route: '/auditoria',
    entity_name: 'internal_mx_admin_audit',
    required_permission: 'administrador_geral',
    expected_result: 'Alterna entre as 5 trilhas oficiais de auditoria do banco sem fabricação de dados.',
    audit_event: 'AUDIT_LOG_INSPECT',
    implementation_status: 'FUNCIONAL',
  },
  {
    id: 'int-16',
    screen_code: 'CONFIGURACOES',
    screen_label: 'Configurações da Plataforma',
    element_code: 'TOGGLE_FEATURE_FLAG',
    element_label: 'Chave de Feature Flag',
    element_type: 'CHECKBOX',
    action_type: 'MUTATE_DATA',
    source_route: '/configuracoes',
    entity_name: 'client_capabilities',
    required_permission: 'administrador_geral',
    expected_result: 'Habilita ou desabilita capacidades globais com log de auditoria transacional.',
    audit_event: 'FEATURE_FLAG_TOGGLE',
    implementation_status: 'FUNCIONAL',
  },
]

const STATUS_CONFIG: Record<ImplementationStatus, { bg: string; text: string; border: string; label: string }> = {
  FUNCIONAL: { bg: 'bg-status-success-bg', text: 'text-status-success-text', border: 'border-status-success-border', label: 'Funcional' },
  SIMULADO: { bg: 'bg-status-info-bg', text: 'text-status-info-text', border: 'border-status-info-border', label: 'Simulado' },
  BLOQUEADO: { bg: 'bg-surface-neutral', text: 'text-muted-foreground', border: 'border-border', label: 'Bloqueado' },
  FUTURO: { bg: 'bg-surface-neutral', text: 'text-foreground', border: 'border-border', label: 'Futuro' },
  COM_ERRO: { bg: 'bg-status-danger-bg', text: 'text-status-danger-text', border: 'border-status-danger-border', label: 'Com erro' },
}

export function AdminMapaFuncionalPage() {
  const location = useLocation()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [onlyErrors, setOnlyErrors] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InteractionItem | null>(null)

  const filtered = useMemo(() => {
    return DEFAULT_INTERACTIONS.filter(item => {
      const matchSearch =
        !search ||
        item.element_label.toLowerCase().includes(search.toLowerCase()) ||
        item.screen_label.toLowerCase().includes(search.toLowerCase()) ||
        item.element_code.toLowerCase().includes(search.toLowerCase())

      const matchStatus = !statusFilter || item.implementation_status === statusFilter
      const matchType = !typeFilter || item.action_type === typeFilter
      const matchErrors = !onlyErrors || item.implementation_status === 'COM_ERRO'

      return matchSearch && matchStatus && matchType && matchErrors
    })
  }, [search, statusFilter, typeFilter, onlyErrors])

  const counters = useMemo(() => {
    return {
      total: DEFAULT_INTERACTIONS.length,
      funcional: DEFAULT_INTERACTIONS.filter(i => i.implementation_status === 'FUNCIONAL').length,
      simulado: DEFAULT_INTERACTIONS.filter(i => i.implementation_status === 'SIMULADO').length,
      bloqueado: DEFAULT_INTERACTIONS.filter(i => i.implementation_status === 'BLOQUEADO').length,
      comErro: DEFAULT_INTERACTIONS.filter(i => i.implementation_status === 'COM_ERRO').length,
      futuro: DEFAULT_INTERACTIONS.filter(i => i.implementation_status === 'FUTURO').length,
    }
  }, [])

  return (
    <MxModulePage id="admin-mx-mapa-funcional" width={width} bottomClearance={bottomClearance}>
      <div className="w-full space-y-5">
        <MxModuleHeader
          icon={Layers}
          eyebrow="Plataforma e Governança"
          title="Mapa Funcional"
          description="Inventário executável de todas as interações, fluxos e botões do sistema"
        />

        {/* 6 Metric Status Cards */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
          {[
            { label: 'Total', value: counters.total, status: '', color: 'text-foreground', bg: 'bg-surface-alt' },
            { label: 'Funcionais', value: counters.funcional, status: 'FUNCIONAL', color: 'text-status-success-text', bg: 'bg-status-success-bg' },
            { label: 'Simuladas', value: counters.simulado, status: 'SIMULADO', color: 'text-status-info-text', bg: 'bg-status-info-bg' },
            { label: 'Bloqueadas', value: counters.bloqueado, status: 'BLOQUEADO', color: 'text-muted-foreground', bg: 'bg-surface-neutral' },
            { label: 'Com erro', value: counters.comErro, status: 'COM_ERRO', color: 'text-status-danger-text', bg: 'bg-status-danger-bg' },
            { label: 'Futuras', value: counters.futuro, status: 'FUTURO', color: 'text-foreground', bg: 'bg-surface-alt' },
          ].map(card => (
            <button
              key={card.label}
              type="button"
              onClick={() => setStatusFilter(card.status)}
              className={`${card.bg} rounded-xl p-3.5 text-left border border-border hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary transition-all cursor-pointer`}
            >
              <div className={`text-xl font-bold ${card.color}`}>{card.value}</div>
              <div className="text-xs text-muted-foreground font-medium mt-0.5">{card.label}</div>
            </button>
          ))}
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-surface-default rounded-lg border border-border px-3 py-2 flex-1 min-w-[240px]">
            <Search size={14} className="text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por elemento, tela ou código..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="text-sm outline-none flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary rounded"
            />
          </div>

          <select
            aria-label="Filtrar por status"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-surface-default border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="">Todos os status</option>
            <option value="FUNCIONAL">Funcional</option>
            <option value="SIMULADO">Simulado</option>
            <option value="BLOQUEADO">Bloqueado</option>
            <option value="FUTURO">Futuro</option>
            <option value="COM_ERRO">Com erro</option>
          </select>

          <select
            aria-label="Filtrar por tipo"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-surface-default border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="">Todos os tipos</option>
            <option value="NAVIGATE">Navegação</option>
            <option value="OPEN_MODAL">Abrir modal</option>
            <option value="MUTATE_DATA">Modificar dados</option>
            <option value="APPLY_FILTER">Aplicar filtro</option>
            <option value="SIMULATE">Simular</option>
            <option value="DISABLED">Desabilitado</option>
          </select>

          <button
            type="button"
            onClick={() => setOnlyErrors(!onlyErrors)}
            className={`px-3 py-2 rounded-lg text-sm border transition-colors focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
              onlyErrors
                ? 'bg-status-danger-bg border-status-danger-border text-status-danger-text font-semibold'
                : 'bg-surface-default border-border text-muted-foreground'
            }`}
          >
            Somente com erro
          </button>

          {(search || statusFilter || typeFilter || onlyErrors) ? (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setStatusFilter('')
                setTypeFilter('')
                setOnlyErrors(false)
              }}
              className="text-xs text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary px-2 cursor-pointer font-medium"
            >
              Limpar filtros
            </button>
          ) : null}
        </div>

        {/* Tabela de Interações */}
        <MxSectionCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Tela
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Elemento
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase font-mono">
                    Código
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Tipo
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Entidade
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(item => {
                  const statusInfo = STATUS_CONFIG[item.implementation_status]
                  return (
                    <tr
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedItem(item)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedItem(item)
                        }
                      }}
                      className="hover:bg-surface-alt cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <td className="px-4 py-3 text-xs text-muted-foreground font-medium">
                        {item.screen_label}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {item.element_label}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {item.element_code}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <span className="px-2 py-0.5 rounded bg-surface-alt font-mono text-[11px]">
                          {item.action_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {item.entity_name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </MxSectionCard>

        {/* Modal de Detalhes da Interação (Canonical Dialog) */}
        <Dialog open={Boolean(selectedItem)} onOpenChange={open => { if (!open) setSelectedItem(null) }}>
          {selectedItem ? (
            <DialogContent className="max-w-lg rounded-2xl p-6">
              <DialogHeader>
                <div className="text-xs font-semibold text-primary uppercase tracking-wide">
                  {selectedItem.screen_label}
                </div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  {selectedItem.element_label}
                </DialogTitle>
                <DialogDescription className="text-xs font-mono text-muted-foreground">
                  {selectedItem.element_code}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 text-xs border-y border-border py-3 my-2">
                <div>
                  <span className="text-muted-foreground font-medium">Ação:</span>
                  <p className="font-semibold text-foreground mt-0.5">{selectedItem.action_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Status:</span>
                  <p className="font-semibold text-foreground mt-0.5">{selectedItem.implementation_status}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Rota Origem:</span>
                  <p className="font-mono text-muted-foreground mt-0.5">{selectedItem.source_route}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Rota Destino:</span>
                  <p className="font-mono text-muted-foreground mt-0.5">{selectedItem.destination_route || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Permissão:</span>
                  <p className="text-foreground mt-0.5">{selectedItem.required_permission || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Evento Auditoria:</span>
                  <p className="font-mono text-muted-foreground mt-0.5">{selectedItem.audit_event || '—'}</p>
                </div>
              </div>

              <div>
                <span className="text-xs text-muted-foreground font-medium">Resultado Esperado:</span>
                <p className="text-sm text-foreground mt-1 leading-relaxed">{selectedItem.expected_result}</p>
              </div>

              {selectedItem.prototype_behavior ? (
                <div className="bg-status-info-bg border border-status-info-border rounded-lg p-3 my-2">
                  <span className="text-xs text-status-info-text font-medium">Comportamento no Sistema:</span>
                  <p className="text-xs text-status-info-text mt-1">{selectedItem.prototype_behavior}</p>
                </div>
              ) : null}

              <div className="flex justify-end pt-3">
                <Button variant="primary" size="sm" onClick={() => setSelectedItem(null)}>
                  Fechar
                </Button>
              </div>
            </DialogContent>
          ) : null}
        </Dialog>
      </div>
    </MxModulePage>
  )
}

export default AdminMapaFuncionalPage
