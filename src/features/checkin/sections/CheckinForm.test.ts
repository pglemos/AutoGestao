import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const formSource = readFileSync(new URL('./CheckinForm.tsx', import.meta.url), 'utf8')
const pageHookSource = readFileSync(new URL('../hooks/useCheckinPage.ts', import.meta.url), 'utf8')
const submitCheckinRpcSource = readFileSync(
    new URL('../../../../supabase/migrations/20260710120000_harden_submit_checkin_operational_date.sql', import.meta.url),
    'utf8',
)
const headerSource = readFileSync(new URL('./CheckinHeader.tsx', import.meta.url), 'utf8')
const statusSource = readFileSync(new URL('../autosave/CheckinAutosaveStatus.tsx', import.meta.url), 'utf8')

describe('CheckinForm draft save contract', () => {
    test('wires Salvar rascunho to a draft-only save flow', () => {
        expect(formSource).toContain('handleSaveDraft')
        // A ação vive na barra de status do autosave (CheckinAutosaveStatus),
        // não mais num botão solto no rodapé.
        expect(formSource).toContain('onSaveNow={() => void handleSaveDraft()}')
        expect(pageHookSource).toContain('const handleSaveDraft = async () =>')
        expect(pageHookSource).toContain("toast.success('Rascunho salvo.')")
        expect(pageHookSource).not.toContain('const handleSaveDraft = async () => {\n        await submitCheckin()')
    })

    // O botão existia mas estava escondido em 1 px "para manter contrato de
    // teste": na prática o recurso não existia para o vendedor.
    test('o acionador de rascunho não pode estar escondido', () => {
        expect(formSource).not.toContain('clip: \'rect(0,0,0,0)\'')
        expect(formSource).not.toContain('Hidden Salvar rascunho')
        expect(statusSource).toContain('Salvar rascunho')
        expect(statusSource).toContain('aria-live="polite"')
    })

    test('mostra cada estado do salvamento com texto próprio', () => {
        expect(statusSource).toContain('Alterações não salvas')
        expect(statusSource).toContain('Salvando rascunho...')
        expect(statusSource).toContain('Rascunho salvo às')
        expect(statusSource).toContain('Sem conexão. Salvaremos ao reconectar.')
        expect(statusSource).toContain('Atualizado em outra sessão. Revise os dados.')
        expect(statusSource).toContain('Fechamento concluído às')
    })

    // MX-22.2 (FEV-DATA-05): rascunho grava de verdade (submission_status
    // 'draft'), não mais localStorage — sobrevive a refresh/troca de aba.
    test('persists the draft via saveCheckin(isDraft=true), not localStorage', () => {
        expect(pageHookSource).toMatch(/saveCheckin\(\s*\n?\s*draftPayload,\s*\n?\s*metricScope,\s*\n?\s*selectedDate,\s*\n?\s*activeClosingContext\.mainDate,\s*\n?\s*true,?\s*\n?\s*\)/)
        // Caminho principal do rascunho: o autosave persiste com isDraft=true
        // via coordenador serial.
        expect(pageHookSource).toContain('await autosave.saveNow(draftPayload)')
        expect(pageHookSource).not.toContain('window.localStorage.setItem')
        expect(pageHookSource).not.toContain('CHECKIN_DRAFT_STORAGE_PREFIX')
    })
})

describe('Produção Zero — ação exclusiva no Histórico', () => {
    test('não renderiza card, seletor ou modal de justificativa na tela principal', () => {
        expect(formSource).not.toContain('Produção Zero')
        expect(formSource).not.toContain('zero_reason')
        expect(formSource).not.toContain('id="checkin-zero-reason"')
        expect(formSource).not.toContain('<select')
    })

    test('oferece a marcação no Histórico e mantém a ação independente de Regularizar', () => {
        expect(headerSource).toContain('Marcar Produção Zero')
        expect(headerSource).toContain('CHECKIN_ZERO_REASONS')
        expect(headerSource).toContain('role="radiogroup"')
        expect(headerSource).toContain('Confirmar Produção Zero')
        expect(headerSource).toContain('Regularizar')
        expect(headerSource).toContain('handleSelectRow(row)')
    })
})

describe('Card de observações operacionais', () => {
    test('não renderiza o card, textarea ou contador no fechamento diário', () => {
        expect(formSource).not.toContain('Observações Operacionais')
        expect(formSource).not.toContain('checkin-note')
        expect(formSource).not.toContain('Digite suas observações...')
        expect(formSource).not.toContain('caracteres')
    })
})

// Auditoria 2026-07-10 (P0-01): a reunião de produto de 09/07 decidiu que a
// janela 09h30-12h00 com bloqueio/liberação de gerente é evolução futura —
// a fase atual não pode travar envio nem aplicar penalidade por horário.
// Estes testes de contrato falham se alguém reintroduzir o bloqueio sem uma
// decisão consciente (evita regressão silenciosa, já aconteceu uma vez).
describe('Política de horário do Fechamento Diário — sem bloqueio (P0-01)', () => {
    test('botão de finalizar nunca é desabilitado por prazo/lockStage no client', () => {
        expect(formSource).toContain('const submitBlockedByDeadline = false')
        expect(formSource).toContain('const editLockedWithoutLiberacao = false')
        expect(formSource).not.toMatch(/submitBlockedByDeadline\s*=\s*lockStage/)
        expect(formSource).not.toMatch(/submitBlockedByDeadline\s*=\s*isPastDeadline/)
    })

    test('RPC submit_checkin ativa não chama mais checkin_validation_kit / time_window_closed', () => {
        expect(submitCheckinRpcSource).not.toContain('checkin_validation_kit')
        expect(submitCheckinRpcSource).not.toContain('time_window_closed')
        expect(submitCheckinRpcSource).toContain('trava horária permanece desativada por decisão de produto')
    })

    test('penalidade de disciplina só pode existir se houver liberação explícita registrada (opt-in), nunca automática por horário', () => {
        expect(submitCheckinRpcSource).toContain('v_finalizado_apos_prazo := v_scope_text IN (\'daily\', \'historical\')')
        expect(submitCheckinRpcSource).toMatch(/AND v_liberado;/)
    })
})
