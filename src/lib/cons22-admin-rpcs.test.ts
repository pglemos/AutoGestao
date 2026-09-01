import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const migration = readFileSync(
  new URL('../../supabase/migrations/20260829000000_fix_admin_rpcs_and_plan_patch.sql', import.meta.url),
  'utf8',
)

describe('CONS-22 RPCs administrativas', () => {
  test('publica admin_update_usuario para a área interna MX', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.admin_update_usuario')
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.admin_update_usuario(uuid, jsonb) TO authenticated, service_role')
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.admin_update_usuario(uuid, jsonb) FROM PUBLIC, anon')
  })

  test('o patch do plano aceita checklist, participantes e indicador de eficácia', () => {
    expect(migration).toContain("'participants'")
    expect(migration).toContain("'efficacy_indicator'")
    expect(migration).toContain("'checklist'")
  })

  test('a ficha do cliente usa as RPCs de loja já publicadas no remoto', () => {
    const storeMutations = readFileSync(
      new URL('../features/admin-mx/clientes/storeMutations.ts', import.meta.url),
      'utf8',
    )
    expect(storeMutations).toContain("rpc('admin_create_store'")
    expect(storeMutations).toContain("rpc('admin_update_store'")
  })

  test('o onboarding de cliente reusa as mesmas RPCs de loja', () => {
    const createClientProgram = readFileSync(
      new URL('../features/admin-mx/novo-cliente/createClientProgram.ts', import.meta.url),
      'utf8',
    )
    expect(createClientProgram).toContain('createOperationalStore')
    expect(createClientProgram).toContain('deactivateOperationalStores')
    expect(createClientProgram).not.toMatch(/from\('lojas'\)[\s\S]{0,80}\.insert/)
  })

  test('a equipe MX cria usuários pela edge function, não por insert em usuarios', () => {
    const memberCreate = readFileSync(
      new URL('../features/admin-mx/equipe/memberCreateMutations.ts', import.meta.url),
      'utf8',
    )
    expect(memberCreate).toContain("functions.invoke<RegisterUserResponse>('register-user'")
    expect(memberCreate).not.toContain(".from('usuarios').insert")
  })

  test('Visão 360 embute o Cadastro Rápido no mesmo ciclo, sem navegar', () => {
    const panel = readFileSync(
      new URL('../features/admin-mx/clientes/ClientPlanningContextPanel.tsx', import.meta.url),
      'utf8',
    )
    const editor = readFileSync(
      new URL('../features/admin-mx/indicadores/AdminStrategicPlanEditor.tsx', import.meta.url),
      'utf8',
    )
    expect(panel).toContain('<AdminStrategicPlanEditor cycleId={cycleId} embedded onCycleChange={props.onCycleChange} />')
    expect(editor).toContain("useState<EditorTab>('rapido')")
  })

  test('a Visão 360 replica as abas e CTAs de Pessoas do Base44', () => {
    const page = readFileSync(
      new URL('../features/admin-mx/AdminClienteDetalhePage.tsx', import.meta.url),
      'utf8',
    )
    const headerActions = readFileSync(
      new URL('../features/admin-mx/clientes/ClientDetailHeaderActions.tsx', import.meta.url),
      'utf8',
    )
    for (const label of ['Visão Geral', 'Empresa e Lojas', 'Pessoas e Acessos', 'Programa e Jornada', 'Configurações', 'Implantação', 'Histórico e Auditoria']) {
      expect(page).toContain(label)
    }
    expect(page).not.toContain('Planejamento e ações')
    expect(page).toContain('Abrir Plano')
    expect(page).toContain('Validar e Ativar')
    expect(page).toContain('Cadastrar Usuário')
    expect(page).toContain('Gerar Link')
    expect(page).toMatch(/Cadastre usuários manualmente com papel, Loja e visão\s+padrão\./)
    expect(page).toContain('Adicionar Loja')
    expect(page).toContain('Editar Loja')
    expect(page).toContain('Configurar Horário')
    expect(page).toContain('Abrir Plano de Ação')
    expect(page).toContain('Abrir Consultoria')
    expect(page).toMatch(/<ClientDetailHeaderActions\b/)
    expect(headerActions).toContain('Editar identificação')
    expect(page).toContain('clientStructureDisplay')
    expect(page).toContain('title="Informações Gerais"')
    expect(page).toContain('title="Contato Principal"')
    expect(page).toContain('title="Entrega da Consultoria"')
  })

  test('Editar Identificação replica o modal Base44 e audita a alteração', () => {
    const modal = readFileSync(
      new URL('../features/admin-mx/clientes/ClientIdentificationModal.tsx', import.meta.url),
      'utf8',
    )
    const identification = readFileSync(
      new URL('../features/admin-mx/clientes/clientIdentification.ts', import.meta.url),
      'utf8',
    )
    const mutations = readFileSync(
      new URL('../features/admin-mx/clientes/clientIdentificationMutations.ts', import.meta.url),
      'utf8',
    )
    expect(modal).toContain('Editar Identificação do Cliente')
    expect(modal).toContain('Razão Social *')
    expect(modal).toContain('CNPJ *')
    expect(modal).toContain('Nome resumido')
    expect(modal).toContain('Cidade *')
    expect(modal).toContain('UF *')
    expect(modal).toContain('Tipo de estrutura')
    expect(modal).toContain('Observações')
    expect(identification).toContain("'GRUPO'")
    expect(identification).toContain("'LOJA_UNICA'")
    expect(identification).toContain("'REDE'")
    expect(mutations).toContain(".from('clientes_consultoria')")
    expect(mutations).toContain(".from('unidades_cliente_consultoria')")
    expect(mutations).toContain("action: 'editar_identificacao_cliente'")
    expect(mutations).toContain(".from('logs_auditoria').insert")
  })

  test('Cadastro Rápido distingue vazio, zero e LIMPAR na célula', () => {
    const tab = readFileSync(
      new URL('../features/admin-mx/components/MetasRealizadosTab.tsx', import.meta.url),
      'utf8',
    )
    const input = readFileSync(
      new URL('../features/admin-mx/components/PlanningMonthInput.tsx', import.meta.url),
      'utf8',
    )
    expect(tab).toContain('decideStrategicCellInput')
    expect(tab).toContain('persistIndicatorYearValues')
    expect(tab).toContain('Meta aplicada nos 12 meses')
    expect(input).toContain('planningYearDraftKey')
    expect(input).toContain('Vazio preserva o valor atual. 0 é zero. LIMPAR apaga a meta.')
  })

  test('Cadastro Rápido alimenta só os indicadores digitáveis, não o roster de 46', () => {
    const editor = readFileSync(
      new URL('../features/admin-mx/indicadores/AdminStrategicPlanEditor.tsx', import.meta.url),
      'utf8',
    )
    expect(editor).toContain('indicators={digitaveisIndicators.map')
    expect(editor).toContain('importIndicators={gridIndicators.map')
    expect(editor).not.toContain('indicators={gridIndicators.map')
    expect(editor).toContain('recalculateAndPersistCycle')
    expect(editor).toContain("onNavigateToParams={() => setParametersOpen(true)}")
    expect(editor).toContain('setHistoryOpen(true)')
    expect(editor).toContain('Histórico de Importações — Metas')
    expect(editor).toContain("label: 'Metas'")
    expect(editor).toContain("label: 'Revisão Completa'")
    expect(editor).toContain("label: 'Realizado'")
    expect(editor).toContain("label: 'Ano Anterior'")
    expect(editor).toContain('variant="quick"')
    expect(editor).toContain('activeField={quickField}')
    const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
    expect(app).toContain('clientes/:clientSlug/plano-estrategico/:year')
    const access = readFileSync(new URL('../lib/auth/routeAccess.ts', import.meta.url), 'utf8')
    expect(access).toContain("pattern: '/clientes/:clientSlug/plano-estrategico/:year'")
    const quick = readFileSync(
      new URL('../features/admin-mx/components/StrategicPlanQuickEntry.tsx', import.meta.url),
      'utf8',
    )
    expect(quick).toContain('Personalizar por mês')
    expect(quick).toContain('Voltar para valor único')
    expect(quick).toContain('aplicado a jan–dez')
    expect(quick).not.toContain('Aplicar em todos')
    expect(quick).toContain('Meta mensal (aplicado a jan–dez)')
    expect(quick).toContain('Resumo Calculado')
    const tab = readFileSync(
      new URL('../features/admin-mx/components/MetasRealizadosTab.tsx', import.meta.url),
      'utf8',
    )
    expect(tab).toContain('Mês de conferência do cadastro rápido')
    expect(tab).toContain('planStatusLabel')
    expect(tab).toContain('onQuickProgress')
    expect(tab).toContain('resolvePlanningPersistenceCode')
    expect(tab).toContain('persistIndicatorYearValues')
    expect(editor).toContain('Expandir todos')
    expect(editor).toContain('Voltar para Cadastro')
    expect(editor).toContain('Dono verá estado vazio (não publicado)')
    expect(editor).toContain('ADMIN_PLAN_CYCLE_STATUS_CODE')
    expect(editor).toContain('CLIENT_EDITOR_TAB_KEYS')
    expect(editor).toContain("['rapido', 'revisao', 'realizado', 'ano_anterior']")
    expect(editor).toContain('saveDraft')
    expect(editor).toContain('>Salvar rascunho</Button>')
    expect(editor).toContain('>Visualizar como Dono</Button>')
  })

  test('a rota admin /produtos é o catálogo de consultoria, não Produtos Digitais', () => {
    const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
    const page = readFileSync(
      new URL('../features/admin-mx/AdminProdutosConsultoriaPage.tsx', import.meta.url),
      'utf8',
    )
    const nav = readFileSync(
      new URL('../design-system/internal-mx/internalMxNavigation.tsx', import.meta.url),
      'utf8',
    )
    const catalog = readFileSync(
      new URL('../features/admin-mx/produtos/officialConsultingCatalog.ts', import.meta.url),
      'utf8',
    )
    expect(app).toContain('admin={<AdminProdutosConsultoriaPage />}')
    expect(page).toContain('title="Produtos de Consultoria"')
    expect(page).toContain('Catálogo oficial')
    expect(page).toContain('ConsultingProductCard')
    expect(page).toContain('Novo Produto')
    expect(page).not.toContain('Produtos Digitais')
    expect(catalog).toContain("'pmr_online'")
    expect(catalog).toContain("'pmr_hibrido'")
    expect(catalog).toContain("'pmr_plus'")
    expect(catalog).toContain("'ppa'")
    expect(nav).toContain("label: 'Produto e Metodologia'")
    expect(nav).toContain("label: 'Produtos de Consultoria'")
    expect(nav).toContain("path: '/produtos'")
  })

  test('patch de plano usa departamento text, não department_type inexistente', () => {
    const fix = readFileSync(
      new URL('../../supabase/migrations/20260831160000_fix_plan_patch_departamento_text.sql', import.meta.url),
      'utf8',
    )
    const upSection = fix.split('-- DOWN')[0]
    expect(upSection).toContain('NULLIF(BTRIM(v_patch ->> \'departamento\'), \'\')')
    expect(upSection).not.toMatch(/::public\.department_type/)
  })

  test('a rota admin /plano-acao abre a biblioteca Base44, não o board da loja', () => {
    const page = readFileSync(
      new URL('../features/admin-mx/AdminPlanosAcaoGlobalPage.tsx', import.meta.url),
      'utf8',
    )
    const action = readFileSync(
      new URL('../features/internal-mx-planning/InternalActionPlanPage.tsx', import.meta.url),
      'utf8',
    )
    expect(action).toContain('return <AdminPlanosAcaoGlobalPage />')
    expect(page).toContain('title="Planos de Ação e Playbooks"')
    expect(page).toContain('Aplicar a Cliente')
    expect(page).toContain('Criar Plano Padrão')
    expect(page).toContain('Abrir Histórico')
    expect(page).not.toContain('Aplicar a cliente')
  })

  test('a ficha bloqueia demover o único Dono Master na UI, não só na mutação', () => {
    const modal = readFileSync(
      new URL('../features/admin-mx/clientes/PersonCreateModal.tsx', import.meta.url),
      'utf8',
    )
    expect(modal).toContain('uniqueMasterChangeGuard')
    expect(modal).toContain('masterDemoteBlock')
  })

  test('Aplicar a Cliente materializa via RPC, não por insert direto em planos_acao', () => {
    const apply = readFileSync(
      new URL('../features/admin-mx/planos-acao/templateApplicationIdempotency.ts', import.meta.url),
      'utf8',
    )
    expect(apply).toContain("rpc('criar_plano_acao_v2'")
    expect(apply).toContain('p_checklist:')
    expect(apply).not.toContain("rpc('atualizar_plano_acao_patch'")
    expect(apply).not.toMatch(/from\('planos_acao'\)[\s\S]{0,120}\.insert/)
  })

  test('o onboarding de cliente aceita Loja Única, Grupo e Rede como no Base44', () => {
    const draft = readFileSync(
      new URL('../features/admin-mx/novo-cliente/newClientDraft.ts', import.meta.url),
      'utf8',
    )
    const page = readFileSync(
      new URL('../features/admin-mx/AdminNovoClientePage.tsx', import.meta.url),
      'utf8',
    )
    const create = readFileSync(
      new URL('../features/admin-mx/novo-cliente/createClientProgram.ts', import.meta.url),
      'utf8',
    )
    expect(draft).toContain("'LOJA_UNICA' | 'GRUPO' | 'REDE'")
    expect(page).toContain('<option value="GRUPO">Grupo</option>')
    expect(create).toContain('clientAllowsBranches(draft.structure_type)')
  })

  test('criação atômica de plano de ação grava checklist na mesma RPC', () => {
    const atomic = readFileSync(
      new URL('../../supabase/migrations/20260831120000_atomic_action_plan_create.sql', import.meta.url),
      'utf8',
    )
    const wizard = readFileSync(
      new URL('../features/admin-mx/planos-acao/actionPlanWizardLogic.ts', import.meta.url),
      'utf8',
    )
    expect(atomic).toContain('p_checklist jsonb')
    expect(atomic).toContain('Campo obrigatório inválido: indicador')
    expect(wizard).toContain('p_checklist: createdPatch.checklist')
    expect(wizard).toContain('needsLegacyActionPlanCreate')
    expect(wizard).toContain("rpc('atualizar_plano_acao_patch'")
  })

  test('o editor do cliente não aborta o Cadastro Rápido quando o gate remoto recusa VOLUME', () => {
    const repository = readFileSync(
      new URL('../features/admin-mx/indicadores/strategicPlanEditorRepository.ts', import.meta.url),
      'utf8',
    )
    const volumeSql = readFileSync(
      new URL('../../supabase/migrations/20260829120000_allow_volume_de_leads_por_venda.sql', import.meta.url),
      'utf8',
    )
    expect(repository).toContain('isOfficialRosterGateError')
    expect(repository).toContain('for (const item of missing)')
    expect(volumeSql).toContain("'volume_de_leads_por_venda'")
    expect(volumeSql).toContain("'leads_per_sale'")
  })
})
