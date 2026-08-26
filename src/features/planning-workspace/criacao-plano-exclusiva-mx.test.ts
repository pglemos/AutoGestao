import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolvePlanningCapabilities } from './planningCapabilities'

/**
 * Regra de produto: Dono, Gerente e Vendedor **não criam** plano de ação nem
 * plano estratégico. Quem cria é a área interna MX (administrador geral,
 * administrador MX, consultor MX). Esses papéis EXECUTAM o plano que a MX criou
 * — atualizam status, progresso, checklist e evidência.
 *
 * O bloqueio real vive no banco (`can_create_mx_action_scope`, usada por
 * `criar_plano_acao_v2`). Estes testes protegem a camada de UI, para o produto
 * não voltar a oferecer um caminho que o servidor recusa.
 */
describe('criação de plano é exclusiva da área interna MX', () => {
  test('só os papéis internos podem criar ações e gerenciar o ciclo estratégico', () => {
    for (const role of ['administrador_geral', 'administrador_mx', 'consultor_mx'] as const) {
      const cap = resolvePlanningCapabilities(role)
      expect(cap.canCreateActions).toBe(true)
      expect(cap.canManageStrategicCycle).toBe(true)
    }
  })

  test('dono, gerente e vendedor não criam plano de ação nem ciclo estratégico', () => {
    for (const role of ['dono', 'gerente', 'vendedor'] as const) {
      const cap = resolvePlanningCapabilities(role)
      expect(cap.canCreateActions).toBe(false)
      expect(cap.canManageStrategicCycle).toBe(false)
      // Meta é compromisso do ciclo publicado, que a MX define e o editor trata
      // como imutável — nenhum desses papéis edita.
      expect(cap.canEditTargets).toBe(false)
    }
  })

  test('o Dono mantém a execução do plano que a MX criou', () => {
    const dono = resolvePlanningCapabilities('dono')
    // Revisar/acompanhar continua sendo dele — o bloqueio é só de criação.
    expect(dono.canReviewActions).toBe(true)
    expect(dono.canViewStrategicPpa).toBe(true)
  })

  test('a tela de Plano de Ação do Dono não oferece criação', () => {
    const page = readFileSync('src/pages/owner/PlanoDeAcao.jsx', 'utf8')
    expect(page).not.toContain('NewActionModal')
    expect(page).not.toContain('handleNewActionConfirm')
    expect(page).not.toContain('createAction')
  })

  test('o painel segmentado só mostra "Novo plano" para a área interna', () => {
    const panel = readFileSync('src/features/dashboard-loja/sections/CentralMxPlanoSegmentadoPanel.tsx', 'utf8')
    expect(panel).toContain('const podeCriarPlano = isPerfilInternoMx(role)')
    expect(panel).toContain('{!readOnly && podeCriarPlano && (')
  })

  test('os botões de nova ação somem quando não há handler', () => {
    for (const file of [
      'src/components/owner/actionplan/ActionPlanHeader.jsx',
      'src/components/owner/actionplan/ActionsToolbar.jsx',
      'src/components/owner/actionplan/calendar/DayDetails.jsx',
    ]) {
      expect(readFileSync(file, 'utf8')).toContain('onNewAction ?')
    }
  })
})
