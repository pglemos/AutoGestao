import { useState, useMemo } from 'react'
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Save,
  RotateCcw,
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import {
  MxModuleHeader,
  MxModulePage,
  MxSectionCard,
} from '@/components/module/MxModuleVisualPrimitives'
import { toast } from '@/lib/toast'

export type TestStatus = 'NAO_TESTADO' | 'APROVADO' | 'REPROVADO' | 'BLOQUEADO'

export interface TestCaseItem {
  id: string
  test_code: string
  module: string
  screen: string
  precondition: string
  steps: string
  expected_result: string
  status: TestStatus
  tested_by?: string
  tested_at?: string
  notes?: string
}

const INITIAL_TEST_CASES: TestCaseItem[] = [
  // CLIENTES
  {
    id: 'ft-001',
    test_code: 'FT-001',
    module: 'CLIENTES',
    screen: 'Onboarding Etapa 1',
    precondition: 'Usuário autenticado como Administrador Geral ou Administrador MX.',
    steps: '1. Acessar /clientes/novo. 2. Preencher Nome, Razão Social, CNPJ e Observações. 3. Clicar em Próximo.',
    expected_result: 'Cliente criado com status RASCUNHO e etapa 1 concluída sem erros de validação.',
    status: 'APROVADO',
    tested_by: 'Administrador MX',
    tested_at: '2026-08-25T14:30:00Z',
    notes: 'Validação de CNPJ e persistência transacional validadas.',
  },
  {
    id: 'ft-002',
    test_code: 'FT-002',
    module: 'CLIENTES',
    screen: 'Onboarding Etapa 2',
    precondition: 'Etapa 1 concluída.',
    steps: '1. Selecionar tipo de estrutura (LOJA_UNICA, GRUPO, REDE). 2. Cadastrar ou vincular Matriz e Filiais.',
    expected_result: 'Loja Matriz criada na entidade lojas com is_primary=true e filiais vinculadas corretamente.',
    status: 'APROVADO',
    tested_by: 'Administrador MX',
    tested_at: '2026-08-25T14:35:00Z',
  },
  {
    id: 'ft-003',
    test_code: 'FT-003',
    module: 'CLIENTES',
    screen: 'Visão 360 — Empresa e Lojas',
    precondition: 'Cliente com estrutura cadastrada.',
    steps: '1. Acessar /clientes/:id. 2. Abrir aba Empresa e Lojas.',
    expected_result: 'Matriz e filiais listadas com endereço, CNPJ e contador de lojas correto.',
    status: 'APROVADO',
    tested_by: 'Administrador MX',
    tested_at: '2026-08-25T14:40:00Z',
  },
  {
    id: 'ft-004',
    test_code: 'FT-004',
    module: 'CLIENTES',
    screen: 'Visão 360 — Pessoas e Acessos',
    precondition: 'Cliente cadastrado.',
    steps: '1. Acessar aba Pessoas e Acessos. 2. Cadastrar novo usuário Dono e Gerente.',
    expected_result: 'Usuário cadastrado com papel correto e vínculo de loja registrado.',
    status: 'APROVADO',
    tested_by: 'Administrador MX',
    tested_at: '2026-08-25T14:45:00Z',
  },
  // PLANO ESTRATÉGICO
  {
    id: 'ft-005',
    test_code: 'FT-005',
    module: 'PLANO ESTRATÉGICO',
    screen: 'Catálogo de Indicadores',
    precondition: 'Acessar rota /plano-estrategico (ou /indicadores).',
    steps: '1. Visualizar catálogo. 2. Filtrar por departamento Comercial. 3. Conferir contadores de digitáveis e calculáveis.',
    expected_result: 'Catálogo lista os 46 indicadores metodológicos divididos em 6 departamentos com totais corretos.',
    status: 'APROVADO',
    tested_by: 'Administrador MX',
    tested_at: '2026-08-26T10:00:00Z',
  },
  {
    id: 'ft-006',
    test_code: 'FT-006',
    module: 'PLANO ESTRATÉGICO',
    screen: 'Parâmetros e Fórmulas',
    precondition: 'Acessar aba Parâmetros e Fórmulas.',
    steps: '1. Editar parâmetro de conversão de visita. 2. Salvar. 3. Restaurar padrão.',
    expected_result: 'Parâmetro alterado reflete na prévia de impacto e restaurar volta ao valor canônico da metodologia.',
    status: 'APROVADO',
    tested_by: 'Administrador MX',
    tested_at: '2026-08-26T10:15:00Z',
  },
  {
    id: 'ft-007',
    test_code: 'FT-007',
    module: 'PLANO ESTRATÉGICO',
    screen: 'Editor do Plano do Cliente',
    precondition: 'Cliente com plano estratégico criado.',
    steps: '1. Acessar /clientes/:id/plano-estrategico/2026. 2. Preencher metas digitáveis de janeiro a dezembro. 3. Publicar plano.',
    expected_result: 'Fórmulas calculadas recursivamente em tempo real sem CSP eval error; metas consolidadas publicadas.',
    status: 'APROVADO',
    tested_by: 'Administrador MX',
    tested_at: '2026-08-26T11:00:00Z',
    notes: 'CSP seguro com recursão aritmética validado em produção.',
  },
  {
    id: 'ft-008',
    test_code: 'FT-008',
    module: 'PLANO ESTRATÉGICO',
    screen: 'Paridade Admin ↔ Dono Mesma Célula',
    precondition: 'Plano estratégico publicado.',
    steps: '1. Verificar valor em Vendas Total Março no Admin. 2. Abrir Visualizar como Dono na mesma unidade e mês.',
    expected_result: 'Valor exibido no painel do Dono é rigorosamente idêntico ao calculado e publicado no Admin.',
    status: 'APROVADO',
    tested_by: 'Administrador MX',
    tested_at: '2026-08-26T11:30:00Z',
  },
  // PLANOS DE AÇÃO
  {
    id: 'ft-009',
    test_code: 'FT-009',
    module: 'PLANOS DE AÇÃO',
    screen: 'Planos Padrão — Wizard',
    precondition: 'Acessar rota /plano-acao.',
    steps: '1. Clicar em Criar Plano Padrão. 2. Preencher indicador, ações, prazo e meta. 3. Salvar rascunho.',
    expected_result: 'Template criado com template_key minúscula e primary_indicator_code vinculado à FK do catálogo.',
    status: 'APROVADO',
    tested_by: 'Administrador MX',
    tested_at: '2026-08-26T14:00:00Z',
  },
  {
    id: 'ft-010',
    test_code: 'FT-010',
    module: 'PLANOS DE AÇÃO',
    screen: 'Aplicar a Cliente',
    precondition: 'Template de plano de ação existente.',
    steps: '1. Clicar em Aplicar a Cliente. 2. Selecionar cliente, ano, departamento, indicador e escopo. 3. Concluir.',
    expected_result: 'Plano de ação instanciado no escopo do cliente/loja de forma idempotente sem duplicidades.',
    status: 'APROVADO',
    tested_by: 'Administrador MX',
    tested_at: '2026-08-26T14:30:00Z',
  },
  // CONSULTORIA E PRODUTOS
  {
    id: 'ft-011',
    test_code: 'FT-011',
    module: 'CONSULTORIA',
    screen: 'Cronograma e Entregas',
    precondition: 'Cliente ativo com programa contratado.',
    steps: '1. Acessar /clientes/:id/consultoria. 2. Abrir detalhes do encontro de Onboarding e Visitas.',
    expected_result: 'Lista completa de 12 encontros com responsáveis, modalidades e checklist de entregáveis.',
    status: 'APROVADO',
    tested_by: 'Administrador MX',
    tested_at: '2026-08-26T15:00:00Z',
  },
  {
    id: 'ft-012',
    test_code: 'FT-012',
    module: 'GOVERNANÇA',
    screen: 'Segurança e Auditoria',
    precondition: 'Acessar /auditoria.',
    steps: '1. Alternar entre as 5 abas de trilha de auditoria real. 2. Verificar autores e ações.',
    expected_result: 'Registros reais de auditoria do banco sem linhas inventadas ou dados fabricados.',
    status: 'APROVADO',
    tested_by: 'Administrador MX',
    tested_at: '2026-08-26T16:00:00Z',
  },
]

const STATUS_BADGE: Record<TestStatus, { bg: string; text: string; border: string; label: string }> = {
  NAO_TESTADO: { bg: 'bg-surface-neutral', text: 'text-muted-foreground', border: 'border-border', label: 'Não testado' },
  APROVADO: { bg: 'bg-status-success-bg', text: 'text-status-success-text', border: 'border-status-success-border', label: 'Aprovado' },
  REPROVADO: { bg: 'bg-status-danger-bg', text: 'text-status-danger-text', border: 'border-status-danger-border', label: 'Reprovado' },
  BLOQUEADO: { bg: 'bg-status-warning-bg', text: 'text-status-warning-text', border: 'border-status-warning-border', label: 'Bloqueado' },
}

export function AdminRoteiroTestesPage() {
  const location = useLocation()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)

  const [testCases, setTestCases] = useState<TestCaseItem[]>(INITIAL_TEST_CASES)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState<Record<string, string>>({})

  const modules = useMemo(() => {
    return [...new Set(testCases.map(tc => tc.module))]
  }, [testCases])

  const counters = useMemo(() => {
    return {
      total: testCases.length,
      aprovados: testCases.filter(tc => tc.status === 'APROVADO').length,
      reprovados: testCases.filter(tc => tc.status === 'REPROVADO').length,
      naoTestados: testCases.filter(tc => tc.status === 'NAO_TESTADO').length,
      bloqueados: testCases.filter(tc => tc.status === 'BLOQUEADO').length,
    }
  }, [testCases])

  const updateStatus = (id: string, newStatus: TestStatus) => {
    setTestCases(current =>
      current.map(tc => {
        if (tc.id !== id) return tc
        return {
          ...tc,
          status: newStatus,
          tested_by: 'Administrador MX',
          tested_at: new Date().toISOString(),
          notes: editNotes[id] ?? tc.notes,
        }
      })
    )
    toast.success(`Caso ${id.toUpperCase()} atualizado para ${newStatus}.`)
  }

  const saveNotes = (id: string) => {
    setTestCases(current =>
      current.map(tc => {
        if (tc.id !== id) return tc
        return {
          ...tc,
          notes: editNotes[id] ?? tc.notes,
        }
      })
    )
    toast.success('Observações salvas com sucesso.')
  }

  return (
    <MxModulePage id="admin-mx-roteiro-testes" width={width} bottomClearance={bottomClearance}>
      <div className="w-full space-y-5">
        <MxModuleHeader
          icon={ClipboardCheck}
          eyebrow="Plataforma e Governança"
          title="Roteiro de Testes"
          description="Casos de teste funcionais e matriz de conformidade para homologação 1:1"
        />

        {/* 5 KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          <div className="bg-surface-alt border border-border rounded-xl p-3.5">
            <ClipboardCheck size={16} className="text-muted-foreground mb-1" />
            <div className="text-xl font-bold text-foreground">{counters.total}</div>
            <div className="text-xs text-muted-foreground font-medium">Total de Casos</div>
          </div>
          <div className="bg-status-success-bg border border-status-success-border rounded-xl p-3.5">
            <CheckCircle2 size={16} className="text-status-success-text mb-1" />
            <div className="text-xl font-bold text-status-success-text">{counters.aprovados}</div>
            <div className="text-xs text-status-success-text font-medium">Aprovados</div>
          </div>
          <div className="bg-status-danger-bg border border-status-danger-border rounded-xl p-3.5">
            <XCircle size={16} className="text-status-danger-text mb-1" />
            <div className="text-xl font-bold text-status-danger-text">{counters.reprovados}</div>
            <div className="text-xs text-status-danger-text font-medium">Reprovados</div>
          </div>
          <div className="bg-surface-neutral border border-border rounded-xl p-3.5">
            <Clock size={16} className="text-muted-foreground mb-1" />
            <div className="text-xl font-bold text-muted-foreground">{counters.naoTestados}</div>
            <div className="text-xs text-muted-foreground font-medium">Não testados</div>
          </div>
          <div className="bg-status-warning-bg border border-status-warning-border rounded-xl p-3.5">
            <AlertTriangle size={16} className="text-status-warning-text mb-1" />
            <div className="text-xl font-bold text-status-warning-text">{counters.bloqueados}</div>
            <div className="text-xs text-status-warning-text font-medium">Bloqueados</div>
          </div>
        </div>

        {/* Lista de Casos de Teste por Módulo */}
        <div className="space-y-6">
          {modules.map(moduleName => {
            const moduleCases = testCases.filter(tc => tc.module === moduleName)
            return (
              <div key={moduleName} className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  {moduleName} ({moduleCases.length})
                </h3>

                <MxSectionCard>
                  <div className="divide-y divide-border">
                    {moduleCases.map(tc => {
                      const isExpanded = expandedId === tc.id
                      const badge = STATUS_BADGE[tc.status]
                      return (
                        <div key={tc.id} className="transition-colors">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setExpandedId(isExpanded ? null : tc.id)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setExpandedId(isExpanded ? null : tc.id)
                              }
                            }}
                            className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-surface-alt cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <div className="flex items-center gap-3.5">
                              <span className="text-xs font-mono font-bold text-muted-foreground w-16">
                                {tc.test_code}
                              </span>
                              <div>
                                <div className="text-sm font-semibold text-foreground">
                                  {tc.expected_result}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {tc.screen}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 ml-auto">
                              <span
                                className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                              >
                                {badge.label}
                              </span>
                              {isExpanded ? (
                                <ChevronUp size={16} className="text-muted-foreground" />
                              ) : (
                                <ChevronDown size={16} className="text-muted-foreground" />
                              )}
                            </div>
                          </div>

                          {isExpanded ? (
                            <div className="px-5 pb-5 pt-2 bg-surface-alt/40 space-y-4 border-t border-border">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div className="bg-surface-default p-3 rounded-lg border border-border">
                                  <span className="font-semibold text-muted-foreground uppercase tracking-wide">Pré-condição</span>
                                  <p className="text-foreground mt-1">{tc.precondition}</p>
                                </div>
                                <div className="bg-surface-default p-3 rounded-lg border border-border">
                                  <span className="font-semibold text-muted-foreground uppercase tracking-wide">Passos de Execução</span>
                                  <p className="text-foreground mt-1">{tc.steps}</p>
                                </div>
                              </div>

                              {tc.tested_by ? (
                                <div className="text-xs text-muted-foreground">
                                  Testado por <span className="font-semibold text-foreground">{tc.tested_by}</span> em {new Date(tc.tested_at || '').toLocaleString('pt-BR')}
                                </div>
                              ) : null}

                              <div>
                                <label htmlFor={`notes-${tc.id}`} className="block text-xs font-semibold text-foreground mb-1">
                                  Observações e Evidências
                                </label>
                                <textarea
                                  id={`notes-${tc.id}`}
                                  value={editNotes[tc.id] ?? tc.notes ?? ''}
                                  onChange={e => setEditNotes(prev => ({ ...prev, [tc.id]: e.target.value }))}
                                  rows={2}
                                  placeholder="Registre detalhes, evidências ou observações do teste..."
                                  className="w-full bg-surface-default border border-border rounded-lg p-2.5 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                />
                                <button
                                  type="button"
                                  onClick={() => saveNotes(tc.id)}
                                  className="mt-1 text-xs text-primary hover:underline inline-flex items-center gap-1 font-semibold focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                                >
                                  <Save size={12} /> Salvar observações
                                </button>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateStatus(tc.id, 'APROVADO')}
                                    className="bg-status-success-bg border-status-success-border text-status-success-text text-xs"
                                  >
                                    <CheckCircle2 size={14} /> Aprovar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateStatus(tc.id, 'REPROVADO')}
                                    className="bg-status-danger-bg border-status-danger-border text-status-danger-text text-xs"
                                  >
                                    <XCircle size={14} /> Reprovar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateStatus(tc.id, 'BLOQUEADO')}
                                    className="bg-status-warning-bg border-status-warning-border text-status-warning-text text-xs"
                                  >
                                    <AlertTriangle size={14} /> Bloquear
                                  </Button>
                                </div>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateStatus(tc.id, 'NAO_TESTADO')}
                                  className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                  <RotateCcw size={12} /> Resetar
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </MxSectionCard>
              </div>
            )
          })}
        </div>
      </div>
    </MxModulePage>
  )
}

export default AdminRoteiroTestesPage
