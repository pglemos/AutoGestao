import { afterEach, describe, expect, mock, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { createElement, type ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

const saveCheckinMock = mock(async () => ({ error: null, id: 'checkin-id' }))
const requestCorrectionMock = mock(async () => ({ error: null }))
const fetchOwnRequestsMock = mock(async () => [])

mock.module('@/components/seller/SellerPageHeader', () => ({
    SellerPageHeader: ({ title, actions }: { title: ReactNode; actions?: ReactNode }) =>
        createElement('header', null, title, actions),
}))
mock.module('./RegularizarFechamentoDrawer', () => ({
    RegularizarFechamentoDrawer: () => null,
}))
mock.module('@/hooks/useCheckinAuditor', () => ({
    useCheckinAuditor: () => ({
        requestCorrection: requestCorrectionMock,
        fetchOwnRequests: fetchOwnRequestsMock,
        loading: false,
    }),
}))
mock.module('@/hooks/useCheckins', () => ({
    CHECKIN_ZERO_REASONS: ['Folga', 'Treinamento', 'Feriado', 'Dia administrativo', 'Outro'],
}))
mock.module('@/lib/toast', () => ({
    toast: { error: mock(), success: mock() },
}))

const { CheckinHeader } = await import('./CheckinHeader')

const headerSource = readFileSync(new URL('./CheckinHeader.tsx', import.meta.url), 'utf8')
const formSource = readFileSync(new URL('./CheckinForm.tsx', import.meta.url), 'utf8')

function dateInSaoPaulo(offsetDays = 0) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    })
    const today = formatter.format(new Date())
    const date = new Date(`${today}T12:00:00Z`)
    date.setUTCDate(date.getUTCDate() + offsetDays)
    return date.toISOString().slice(0, 10)
}

function renderProductionZeroHeader(activeClosingDate = dateInSaoPaulo()) {
    return render(
        createElement(CheckinHeader, {
            dateStr: activeClosingDate.split('-').reverse().join('/'),
            pillars: [],
            setCustomReferenceDate: mock(),
            handleExit: mock(),
            historyOpen: true,
            setHistoryOpen: mock(),
            checkins: [],
            previousCard: null,
            activeClosingDate,
            saveCheckin: saveCheckinMock,
        }),
    )
}

afterEach(() => {
    cleanup()
    saveCheckinMock.mockClear()
    requestCorrectionMock.mockClear()
    fetchOwnRequestsMock.mockClear()
})

// P0-02/P0-06 (auditoria 2026-07-10): a solicitação de regularização enviava
// agd_cart_prev_day/agd_net_prev_day fixos em 0 — zerando os agendamentos D-1
// do vendedor em toda regularização aprovada, mesmo quando ninguém pretendia
// alterá-los. E a distribuição de leads/visitas por canal era perdida ao
// somar tudo em leads_cart/visitas_porta antes de reabrir o drawer.
describe('CheckinHeader — regularização (P0-02/P0-06)', () => {
    test('histórico usa somente vendas e disciplina persistidas no fechamento', () => {
        expect(headerSource).not.toContain('localStorage')
        expect(headerSource).not.toContain("|| '70'")
        expect(headerSource).toContain('checkin.pontuacao_disciplina_final')
        expect(headerSource).toContain('checkin.vnd_porta_prev_day')
    })

    test('não hardcoda agd_cart_prev_day/agd_net_prev_day em 0 no payload de solicitação (zerava agendamentos D-1 em toda regularização)', () => {
        expect(headerSource).not.toContain('agd_cart_prev_day: 0')
        expect(headerSource).not.toContain('agd_net_prev_day: 0')
    })

    test('pré-preenchimento do drawer não zera leads_net/visitas_cart/visitas_net quando a distribuição por canal foi rastreada', () => {
        expect(headerSource).toContain('hasVisitasCanal')
        expect(headerSource).toContain('leads_net: checkin.leads_net_prev_day || 0')
        expect(headerSource).toContain('visitas_cart: hasVisitasCanal ? (checkin.visitas_cart_prev_day || 0) : 0')
    })

    test('payload de solicitação usa nomes de coluna reais para leads/visitas por canal (não soma tudo em Carteira/Porta)', () => {
        expect(headerSource).toContain('leads_prev_day: Number(formValues.leads_cart)')
        expect(headerSource).toContain('leads_net_prev_day: Number(formValues.leads_net)')
        expect(headerSource).toContain('visitas_porta_prev_day: Number(formValues.visitas_porta)')
        expect(headerSource).toContain('visitas_cart_prev_day: Number(formValues.visitas_cart)')
        expect(headerSource).toContain('visitas_net_prev_day: Number(formValues.visitas_net)')
    })

    test('mantém os textos e as duas ações prescritas nos cards de contexto', () => {
        expect(headerSource).toContain('FECHAMENTO ANTERIOR CONCLUÍDO')
        expect(headerSource).toContain('FECHAMENTO ANTERIOR PENDENTE')
        expect(headerSource).toContain('Fechamento de ${previousCard.date.split')
        expect(headerSource).toContain('pendente. O dia de hoje já está liberado. Para corrigir, use o Histórico e envie uma regularização.')
        expect(headerSource).toContain('Ver histórico')
        expect(headerSource).toContain('Ajustar fechamento')
        expect(headerSource).toContain('Regularizar ${previousCard.date.slice')
        expect(headerSource).toContain('whitespace-normal break-words')
        expect(headerSource).not.toContain('truncate text-[12px] font-semibold')
    })

    test('preserva a hierarquia visual da data, progresso, finalização e histórico', () => {
        expect(headerSource.indexOf('Data operacional principal')).toBeLessThan(headerSource.indexOf('Progresso do Fechamento'))
        expect(formSource.indexOf('FINALIZAR FECHAMENTO DO DIA')).toBeLessThan(formSource.lastIndexOf('Histórico de Fechamentos'))
    })

    test('usa o token de texto de sucesso sobre superfícies claras', () => {
        expect(headerSource).toContain('text-status-success-text')
        expect(headerSource).not.toContain('text-[#00A89D]')
        expect(headerSource).toContain('bg-status-warning text-foreground')
        expect(headerSource).toContain('bg-brand-primary text-white')
    })

    test('não reutiliza observação operacional como motivo de regularização', () => {
        expect(headerSource).not.toContain('formValues.note')
        expect(headerSource).not.toContain('onNoteChange')
        expect(formSource).not.toContain('Observações Operacionais (Justificativa)')
    })

    test('usa razão interna auditável sem exigir motivo no formulário visual', () => {
        expect(headerSource).toContain('Regularização do fechamento diário')
        expect(headerSource).not.toContain('Por favor, selecione o motivo da alteração.')
        expect(formSource).not.toContain('Motivo do Ajuste')
    })
})

// MX-22.3 (AC-1/2/4; Spec §8.1/§8.2/§8.3) — 7 estados do Histórico +
// regra do botão Ajustar/Regularizar sempre sobre a data exata da linha.
describe('CheckinHeader — Histórico com 7 estados e ações por estado (MX-22.3)', () => {
    test('combina lancamentos_diarios com solicitacoes_correcao_lancamento via resolveHistoryRowState (não mais binário Finalizado/Pendente)', () => {
        expect(headerSource).toContain('resolveHistoryRowState')
        expect(headerSource).toContain('latestRequestForCheckin')
        expect(headerSource).toContain('fetchOwnRequests')
    })

    test('inclui hoje no loop do Histórico (i=0), viabilizando o estado "Em andamento"', () => {
        expect(headerSource).toContain('for (let i = 0; i <= 7; i++)')
    })

    test('Aguardando aprovação nunca reabre Ajustar/Regularizar — evita colisão com o guard de pending do servidor', () => {
        expect(headerSource).toContain("action === 'ajustar' || action === 'regularizar' || action === 'criar_nova_versao'")
    })

    test('handleSelectRow/handleAdjustPrevious carregam exatamente a data da linha/card selecionado (§8.3)', () => {
        expect(headerSource).toContain('const date = previousCard.date')
        expect(headerSource).toContain('checkins.find(c => c.reference_date === date && c.metric_scope')
    })

    test('historyRows inclui leads_net_prev_day e visitas por canal na exibição do histórico', () => {
        expect(headerSource).toContain('(checkin.leads_prev_day || 0) + (checkin.leads_net_prev_day || 0)')
        expect(headerSource).toContain('checkin.visitas_porta_prev_day != null')
    })
})

// Produção Zero (2026-08-10): o modal aceita escolher a data do fechamento
// nos últimos 7 dias — não só a data operacional ativa. Datas retroativas
// são gravadas com escopo 'historical' (único aceito pelo submit_checkin
// fora da data operacional ativa); a ativa segue 'daily'.
describe('CheckinHeader — Produção Zero com seletor de data', () => {
    test('modal exibe seletor de data derivado do histórico (últimos 7 dias)', () => {
        expect(headerSource).toContain('Data do fechamento')
        expect(headerSource).toContain('historyRows.map(row')
        expect(headerSource).toContain('productionZeroDate === row.date')
    })

    test('abre com a data operacional ativa pré-selecionada', () => {
        expect(headerSource).toContain('setProductionZeroDate(activeClosingDate)')
    })

    test('trocar a data re-carrega o motivo já salvo daquele fechamento', () => {
        expect(headerSource).toContain('handleSelectProductionZeroDate')
        expect(headerSource).toContain("existing?.zero_reason || ''")
    })

    test('data retroativa usa escopo historical; data ativa usa daily', () => {
        expect(headerSource).toContain('if (isActiveDate)')
        expect(headerSource).toContain("saveCheckin(placeholderPayload, 'historical', productionZeroDate)")
        expect(headerSource).toContain("          'daily',\n          productionZeroDate,")
        expect(headerSource).toContain('isActiveDate = productionZeroDate === activeClosingDate')
        expect(headerSource).not.toContain("saveCheckin(placeholderPayload, 'daily', productionZeroDate)")
    })

    test('fechamentos concluídos ficam indisponíveis no seletor (regularização é o caminho)', () => {
        expect(headerSource).toContain('disabled={row.finalized}')
    })

    test('confirmação exige motivo e data selecionados', () => {
        expect(headerSource).toContain('Selecione a data da produção zero.')
        expect(headerSource).toContain('disabled={!productionZeroReason || !productionZeroDate || productionZeroSaving}')
    })

    test('descrição do modal acompanha a data selecionada', () => {
        expect(headerSource).toContain('Escolha o motivo para {productionZeroDate.split')
    })

    test('seletor de data usa a escala tipográfica canônica', () => {
        const selectorSource = headerSource.slice(
            headerSource.indexOf('<div className="grid grid-cols-4 gap-2"'),
            headerSource.indexOf('<div className="space-y-3" role="radiogroup" aria-label="Motivo da Produção Zero">'),
        )
        expect(selectorSource).not.toMatch(/text-\[(?:10|11)px\]/)
        expect(selectorSource).toContain('text-caption font-extrabold uppercase leading-none">{weekdayFormatted}')
        expect(selectorSource).toContain('text-caption font-bold leading-none">{formattedDate}')
    })

    test('datas retroativas só reusam checkin se ele for concluído (isSubmittedClosing), criando placeholder caso contrário', () => {
        expect(headerSource).toContain('c => c.reference_date === productionZeroDate && isSubmittedClosing(c)')
    })
})
