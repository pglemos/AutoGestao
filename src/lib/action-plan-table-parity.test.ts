import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

describe('Plano de Ação canônico e tabela Base44', () => {
  test('persists every field required by the detailed table', () => {
    const migration = read('supabase/migrations/20260725190000_action_plan_table_parity.sql')
    for (const field of ['codigo', 'objetivo', 'progresso', 'iniciado_at']) {
      expect(migration).toContain(`ADD COLUMN IF NOT EXISTS ${field}`)
    }
    expect(migration).toContain('planos_acao_progresso_check')
  })

  test('uses scoped RPCs for creation and updates', () => {
    const migration = read('supabase/migrations/20260725200000_action_plan_scope_rpc.sql')
    const followUp = read('supabase/migrations/20260725210000_action_plan_scope_update_fix.sql')
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.criar_plano_acao_v2')
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.atualizar_plano_acao')
    expect(migration).toContain('can_manage_mx_action_scope')
    expect(followUp).toContain('v_manager := public.can_manage_mx_action_scope')
    expect(followUp).toContain('p_responsavel_id IS NOT NULL')
    const rls = read('supabase/migrations/20260725220000_action_plan_scope_rls.sql')
    expect(rls).toContain('public.can_access_mx_scope(scope_type, scope_id)')
    expect(rls).toContain('public.can_manage_mx_action_scope(scope_type, scope_id)')
    const hardening = read('supabase/migrations/20260725230000_action_plan_hardening.sql')
    expect(hardening).toContain('planos_acao_protect_scope')
    expect(hardening).toContain('trg_planos_acao_touch')
    expect(hardening).toContain("replace(gen_random_uuid()::text, '-', '')")
    expect(hardening).toContain('REVOKE ALL ON FUNCTION public.criar_plano_acao_v2')
  })

  test('preserves the complete Base44 action lifecycle and null-clearing RPC', () => {
    const migration = read('supabase/migrations/20260726010000_action_plan_lifecycle_parity.sql')
    expect(migration).toContain("ADD VALUE IF NOT EXISTS 'bloqueada'")
    expect(migration).toContain("ADD VALUE IF NOT EXISTS 'aguardando_decisao'")
    for (const field of [
      'requires_owner', 'financial_impact', 'budget', 'evidence_required',
      'blocked_reason', 'block_category', 'expected_unblock_date', 'block_note',
      'return_reason', 'return_guidance', 'reopen_reason', 'cancel_reason',
      'impact_status', 'impact_value_before', 'impact_value_after',
      'realized_impact', 'impact_measurement_date', 'progress_note', 'next_step',
      'projected_date',
    ]) {
      expect(migration).toContain(`ADD COLUMN IF NOT EXISTS ${field}`)
    }
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.atualizar_plano_acao_patch')
    expect(migration).toContain('jsonb_populate_record')
    expect(migration).toContain('event_type')
    expect(migration).toContain('event_note')
  })

  test('permite editar o problema ou oportunidade no patch global', () => {
    const fix = read('supabase/migrations/20260726123752_action_plan_patch_problema.sql')
    expect(fix).toContain("'problema'")
    expect(fix).toContain('SET problema = v_after.problema')
    expect(fix).toContain('jsonb_populate_record(v_before, v_patch)')
  })

  test('does not route the owner table through fixture/localStorage data', () => {
    const page = read('src/pages/owner/PlanoDeAcao.jsx')
    const repository = read('src/components/owner/actionplan/actionPlanLiveRepository.js')
    expect(page).toContain('actionPlanLiveRepository')
    expect(page).toContain('mode === "foco"')
    expect(page).not.toContain('actionPlanFixtures')
    expect(page).not.toContain('mx_action_plan_executive_v1')
    expect(repository).toContain('.from("planos_acao")')
    expect(repository).toContain('historico_planos_acao')
    expect(repository).toContain('evidencias_planos_acao')
  })

  test('exposes an explicit detailed table mode with the Base44 columns', () => {
    const toolbar = read('src/components/owner/actionplan/ActionsToolbar.jsx')
    const table = read('src/components/owner/actionplan/board/ListView.jsx')
    expect(toolbar).toContain('{ value: "table", label: "Tabela"')
    for (const label of ['Código', 'Ação', 'Objetivo', 'Indicador', 'Depto', 'Resp.', 'Prio', 'Status', 'Progresso', 'Início', 'Prazo', 'Atraso', 'Atualização']) {
      expect(table).toContain(label)
    }
  })

  test('exposes the responsible person in the global applications table', () => {
    const applications = read('src/features/admin-mx/planos-acao/ApplicationsTab.tsx')
    const repository = read('src/features/admin-mx/planos-acao/actionPlanApplications.ts')
    expect(applications).toContain('<TableHead>Responsável</TableHead>')
    expect(applications).toContain('Filtrar por responsável')
    expect(repository).toContain("from('usuarios').select('id, name')")
    expect(repository).toContain('responsavelName')
  })

  test('create-standard-plan wizard matches Base44 TemplateWizard copy', () => {
    const wizard = read('src/features/admin-mx/planos-acao/TemplateWizard.tsx')
    for (const copy of [
      'Criar Plano Padrão',
      'Editar Plano Padrão',
      'Título do Plano *',
      'Indicador Principal *',
      'Prazo Recomendado em Dias *',
      'Prioridade Padrão *',
      'Revisão e Publicação',
      'Publicar Plano Padrão',
      'Usar título sugerido',
      'Adicionar Ação',
      'Nome da Ação *',
      'Nenhum material',
      'Vincular aula da Universidade MX',
    ]) {
      expect(wizard).toContain(copy)
    }
    expect(wizard).not.toContain('Novo template de plano de ação')
    expect(wizard).not.toContain('Título do template')
    expect(wizard).not.toContain('IndicatorPicker')
    expect(wizard).toContain('formatTemplateWizardPrimaryOption(indicator)')
    expect(wizard).toContain('formatTemplateWizardEffectivenessOption(indicator)')
    const catalog = read('src/features/admin-mx/planos-acao/actionPlanTemplates.ts')
    expect(catalog).toContain('officialActionPlanIndicatorCatalog')
    expect(catalog).toContain('officialDefinitionUnit')
    expect(catalog).not.toContain('catalogo_indicadores_planejamento')
  })

  test('opens the global route on the Base44-equivalent template library', () => {
    const page = read('src/features/admin-mx/AdminPlanosAcaoGlobalPage.tsx')
    expect(page).toContain("useState<PlanTab>('templates')")
    expect(page).toContain("label: 'Planos Padrão'")
    expect(page).not.toContain("label: 'Planos da rede'")
    expect(page).toContain("label: 'Aplicações nos Clientes'")
    expect(page).toContain("useState<'lista' | 'kanban'>('lista')")
    for (const action of ['Aplicar a Cliente', 'Abrir Histórico', 'Criar Plano Padrão', 'Nova ação']) {
      expect(page).toContain(action)
    }
    for (const label of ['Código', 'Ação', 'Objetivo', 'Indicador', 'Depto', 'Resp.', 'Prio', 'Status', 'Progresso', 'Início', 'Prazo', 'Atraso', 'Atualização']) {
      expect(page).toContain(`<TableHead>${label}</TableHead>`)
    }
  })

  test('opens the action plan in the approved Base44 table view by default', () => {
    const page = read('src/pages/owner/PlanoDeAcao.jsx')
    expect(page).toContain('normalizeActionPlanMode(saved)')
    expect(page).toContain('import { normalizeActionPlanMode }')
  })

  test('aplica template como um plano por unidade, não um plano por item', () => {
    const migration = read('supabase/migrations/20260822020000_action_plan_apply_one_plan_per_store.sql')
    expect(migration).toContain('planos_acao_template_application_scope_uidx')
    expect(migration).toContain("NOT (transition_metadata ? 'template_item_id')")
    const apply = read('src/features/admin-mx/planos-acao/templateApplicationIdempotency.ts')
    expect(apply).toContain('template_item_ids')
    expect(apply).toContain('checklist')
  })
})
