import type { DailyCheckin, CheckinWithTotals } from '@/types/database'
import { calcularTotais } from '@/lib/calculations'

export const CHECKIN_DEADLINE_MINUTES = 9 * 60 + 30
// Fim da janela de liberação do gerente (dia operacional rola às 12h00 —
// ver calculateReferenceDate). Mantido com o nome antigo por compatibilidade
// de import, mas o valor agora é 12h00, não mais 09h45.
export const CHECKIN_EDIT_LIMIT_MINUTES = 12 * 60
export const CHECKIN_DEADLINE_LABEL = '09:30'
export const CHECKIN_EDIT_LIMIT_LABEL = '12:00'
export const MX_TIMEZONE = 'America/Sao_Paulo'
export const CHECKIN_ZERO_REASONS = ['Folga', 'Treinamento', 'Feriado', 'Dia administrativo', 'Outro'] as const
export const CHECKIN_MAX_INPUT_VALUE = 999

export const CHECKIN_SELECT = 'id, seller_user_id, store_id, reference_date, submitted_at, metric_scope, submission_status, leads_prev_day, leads_net_prev_day, agd_cart_prev_day, agd_net_prev_day, agd_cart_today, agd_net_today, vnd_porta_prev_day, vnd_cart_prev_day, vnd_net_prev_day, visit_prev_day, visitas_porta_prev_day, visitas_cart_prev_day, visitas_net_prev_day, zero_reason, note, submitted_late, edit_locked_at, created_by, updated_at, pontuacao_disciplina_base, pontuacao_disciplina_final, finalizado_apos_prazo, penalizacao_atraso_aplicada, percentual_penalizacao_atraso, fechamento_liberado, liberado_por_id, liberado_por_nome, data_hora_liberacao, draft_revision, last_draft_saved_at'

export function withCheckinTotals(checkin: DailyCheckin): CheckinWithTotals {
    const normalized = { ...checkin, is_venda_loja: checkin.is_venda_loja ?? false }
    return { ...normalized, ...calcularTotais(normalized) }
}

function getSaoPauloParts(date: Date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: MX_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(date)

    const byType = new Map(parts.map(part => [part.type, part.value]))
    return {
        year: Number(byType.get('year')),
        month: Number(byType.get('month')),
        day: Number(byType.get('day')),
        hour: Number(byType.get('hour')),
        minute: Number(byType.get('minute')),
    }
}

function minutesSinceSaoPauloStartOfDay(date: Date) {
    const parts = getSaoPauloParts(date)
    return parts.hour * 60 + parts.minute
}

// MX-22.5 (AC-7/AC-8; Spec §11.2 "às 09:31 é criado o snapshot oficial da
// agenda e da Disciplina"): mesma régua de 09:30 já usada para o fechamento
// (CHECKIN_DEADLINE_MINUTES), sem introduzir um segundo corte de horário —
// "depois de 09:30" (09:31 em diante) é quando a Agenda D+1 deixa de poder
// ser ajustada livremente.
export function isAfterAgendaD1SnapshotCutoff(now = new Date()): boolean {
    return minutesSinceSaoPauloStartOfDay(now) > CHECKIN_DEADLINE_MINUTES
}

// Regra MX (dia operacional): o fechamento de um dia D fica aberto de
// D 12h00 até D+1 09h30 (com liberação do gerente até D+1 12h00). O dia
// operacional avança às 12h00 — não à meia-noite. Antes das 12h00 ainda é
// o fechamento do dia anterior; a partir das 12h00 já é o novo dia.
export function calculateReferenceDate(baseDate = new Date()): string {
    const parts = getSaoPauloParts(baseDate)
    const saoPauloCalendarDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
    if (parts.hour < 12) {
        saoPauloCalendarDate.setUTCDate(saoPauloCalendarDate.getUTCDate() - 1)
    }
    return saoPauloCalendarDate.toISOString().split('T')[0]
}

export function isCheckinLate(baseDate = new Date()): boolean {
    // Atraso começa depois de 09:30; exatamente 09:30 ainda é no prazo.
    return minutesSinceSaoPauloStartOfDay(baseDate) > CHECKIN_DEADLINE_MINUTES
}

// Regra MX-22 (spec v2.0 §3/§14 FEV-DATA-09): o fechamento de uma data
// operacional fica tardio somente depois das 12h00 de D+1 — não às 09h30 do
// próprio dia, que é exclusiva do snapshot da Agenda D+1 (§11). Diferente de
// isCheckinLate (horário do relógio agora), esta função avalia o envio de um
// `reference_date` específico contra o próprio prazo dele.
export function isCheckinLateForReferenceDate(referenceDate: string, submittedAt = new Date()): boolean {
    const [year, month, day] = referenceDate.split('-').map(Number)
    const deadline = Date.UTC(year, month - 1, day + 1, 12, 0, 0, 0)
    const submittedParts = getSaoPauloParts(submittedAt)
    const submittedNaiveInstant = Date.UTC(
        submittedParts.year,
        submittedParts.month - 1,
        submittedParts.day,
        submittedParts.hour,
        submittedParts.minute,
        0,
        0,
    )
    return submittedNaiveInstant > deadline
}

export function canEditCurrentCheckin(baseDate = new Date()): boolean {
    // Só bloqueia dentro da janela 09h31-12h00 (fechamento do dia anterior
    // ainda em aberto, atrasado, aguardando liberação do gerente). Antes das
    // 09h30 está livre; a partir das 12h00 o dia operacional já rolou
    // (calculateReferenceDate) e a edição passa a ser a de um dia novo —
    // não pode continuar bloqueada só por causa da hora do relógio.
    const minutes = minutesSinceSaoPauloStartOfDay(baseDate)
    return !(minutes > CHECKIN_DEADLINE_MINUTES && minutes < CHECKIN_EDIT_LIMIT_MINUTES)
}

export function getCheckinEditLockedAt(baseDate = new Date()): string {
    const parts = getSaoPauloParts(baseDate)
    const lockDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 45, 0, 0))
    return lockDate.toISOString()
}

export function validateCheckinSubmissionDate(
    finalDate: string,
    officialReferenceDate: string,
scope: import('@/types/database').CheckinScope,
maxDailyDate = officialReferenceDate,
): string | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(finalDate)) {
        return 'Data de referência inválida.'
    }

if (finalDate > maxDailyDate) {
return 'Lançamentos não podem usar data futura.'
    }

    if (scope === 'daily' && finalDate !== officialReferenceDate) {
        return 'Registro diário aceita somente a data operacional ativa. Use o histórico para datas retroativas.'
    }

    return null
}
