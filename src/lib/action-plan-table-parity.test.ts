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

  test('opens the action plan in the approved Base44 focus view by default', () => {
    const page = read('src/pages/owner/PlanoDeAcao.jsx')
    expect(page).toContain('return saved === "list" ? "table" : saved || "foco"')
    expect(page).not.toContain('return saved === "list" ? "table" : saved || "table"')
  })
})
