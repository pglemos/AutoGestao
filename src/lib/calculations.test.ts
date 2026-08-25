import { expect, test, describe } from 'bun:test'
import {
    calcularTotais,
    calcularAtingimento,
    calcularFaltaX,
    calcularProjecao,
    calcularRitmo,
    isBusinessDay,
    calcularFunil,
    gerarDiagnosticoMX,
    MX_BENCHMARKS,
    getBusinessDaysInMonth,
    getBusinessDaysElapsed,
    getDiasInfo,
    validarFunil,
    calcularScoreMX,
    getOperationalStatus,
    formatStructuredWhatsAppFeedback,
    somarVendas,
    somarVendasPorCanal,
} from './calculations'
import type { DailyCheckin, CheckinFormData, FunnelData } from '@/types/database'

describe('Business Calculations (MX Performance)', () => {
    
    test('calcularAtingimento', () => {
        expect(calcularAtingimento(5, 10)).toBe(50)
        expect(calcularAtingimento(0, 10)).toBe(0)
        expect(calcularAtingimento(10, 0)).toBe(0) // Meta zero
        expect(calcularAtingimento(15, 10)).toBe(150)
        expect(calcularAtingimento(3, 7)).toBe(42.9) // Arredondamento 1 casa decimal
    })

    test('calcularFaltaX', () => {
        expect(calcularFaltaX(10, 3)).toBe(7)
        expect(calcularFaltaX(10, 15)).toBe(0) // Não deve ser negativo
        expect(calcularFaltaX(0, 5)).toBe(0)
    })

    test('calcularProjecao', () => {
        expect(calcularProjecao(5, 10, 30)).toBe(15)
        expect(calcularProjecao(0, 10, 30)).toBe(0)
        expect(calcularProjecao(5, 0, 30)).toBe(0) // Dias decorridos zero
    })

    test('calcularRitmo', () => {
        expect(calcularRitmo(20, 5, 15)).toBe(1) // Faltam 15, tem 15 dias -> ritmo 1
        expect(calcularRitmo(20, 20, 10)).toBe(0) // Meta batida -> ritmo 0
        expect(calcularRitmo(20, 25, 10)).toBe(0) // Meta ultrapassada -> ritmo 0
        expect(calcularRitmo(20, 5, 0)).toBe(0) // Sem dias restantes -> ritmo 0
        expect(calcularRitmo(10, 5, 3)).toBe(1.7) // Arredondamento 1 casa decimal
    })

    test('isBusinessDay', () => {
        // 2026-04-12 is Sunday
        expect(isBusinessDay(new Date('2026-04-12T12:00:00Z'))).toBe(false)
        // 2026-04-13 is Monday
        expect(isBusinessDay(new Date('2026-04-13T12:00:00Z'))).toBe(true)
        // 2026-04-18 is Saturday
        expect(isBusinessDay(new Date('2026-04-18T12:00:00Z'))).toBe(true)
    })

    test('calcularTotais from FormData', () => {
        const formData: Partial<CheckinFormData> = {
            leads: 10,
            agd_cart: 2,
            agd_net: 3,
            vnd_porta: 1,
            vnd_cart: 0,
            vnd_net: 1
        }
        const totais = calcularTotais(formData as CheckinFormData)
        expect(totais.agd_total).toBe(5)
        expect(totais.vnd_total).toBe(2)
    })

    test('calcularTotais from DailyCheckin', () => {
        const checkin: Partial<DailyCheckin> = {
            agd_cart_today: 2,
            agd_net_today: 3,
            vnd_porta_prev_day: 1,
            vnd_cart_prev_day: 0,
            vnd_net_prev_day: 1
        }
        const totais = calcularTotais(checkin)
        expect(totais.agd_total).toBe(5)
        expect(totais.vnd_total).toBe(2)
    })

    test('calcularFunil', () => {
        const checkins: Partial<DailyCheckin>[] = [
            { leads_prev_day: 10, agd_cart_prev_day: 1, agd_net_prev_day: 2, visit_prev_day: 2, vnd_net_prev_day: 1 },
            { leads_prev_day: 20, agd_cart_prev_day: 2, agd_net_prev_day: 1, visit_prev_day: 2, vnd_porta_prev_day: 1 }
        ]
        
        const funil = calcularFunil(checkins as DailyCheckin[])
        
        expect(funil.leads).toBe(30)
        expect(funil.agd_total).toBe(6)
        expect(funil.visitas).toBe(4)
        expect(funil.vnd_total).toBe(2)
        
        expect(funil.tx_lead_agd).toBe(20) // 6/30 * 100
        expect(funil.tx_agd_visita).toBe(67) // 4/6 * 100
        expect(funil.tx_visita_vnd).toBe(50) // 2/4 * 100
    })

    test('calcularFunil aceita vendas oficiais sem reintroduzir o fechamento legado', () => {
        const checkins: Partial<DailyCheckin>[] = [
            { leads_prev_day: 19, agd_cart_prev_day: 1, agd_net_prev_day: 1, visit_prev_day: 21, vnd_net_prev_day: 11 },
        ]

        const funil = calcularFunil(checkins as DailyCheckin[], 10)

        expect(funil.leads).toBe(19)
        expect(funil.agd_total).toBe(2)
        expect(funil.visitas).toBe(21)
        expect(funil.vnd_total).toBe(10)
    })

    test('gerarDiagnosticoMX', () => {
        const rules = {
            store_id: '1',
            monthly_goal: 100,
            individual_goal_mode: 'even' as const,
            include_venda_loja_in_store_total: false,
            include_venda_loja_in_individual_goal: false,
            bench_lead_agd: 20,
            bench_agd_visita: 60,
            bench_visita_vnd: 33,
            projection_mode: 'calendar' as const,
            updated_by: null,
            updated_at: ''
        }

        // Cenário 1: Gargalo em Lead -> Agendamento
        const funil1: FunnelData = { leads: 100, agd_total: 10, visitas: 8, vnd_total: 4, tx_lead_agd: 10, tx_agd_visita: 80, tx_visita_vnd: 50 }
        const diag1 = gerarDiagnosticoMX(funil1, false, rules)
        expect(diag1.gargalo).toBe('LEAD_AGD')

        // Cenário 2: Gargalo em Agendamento -> Visita
        const funil2: FunnelData = { leads: 100, agd_total: 30, visitas: 10, vnd_total: 5, tx_lead_agd: 30, tx_agd_visita: 33, tx_visita_vnd: 50 }
        const diag2 = gerarDiagnosticoMX(funil2, false, rules)
        expect(diag2.gargalo).toBe('AGD_VISITA')

        // Cenário 3: Gargalo em Visita -> Venda
        const funil3: FunnelData = { leads: 100, agd_total: 30, visitas: 20, vnd_total: 2, tx_lead_agd: 30, tx_agd_visita: 67, tx_visita_vnd: 10 }
        const diag3 = gerarDiagnosticoMX(funil3, false, rules)
        expect(diag3.gargalo).toBe('VISITA_VND')

        // Cenário 4: Tudo saudável
        const funil4: FunnelData = { leads: 100, agd_total: 25, visitas: 15, vnd_total: 6, tx_lead_agd: 25, tx_agd_visita: 60, tx_visita_vnd: 40 }
        const diag4 = gerarDiagnosticoMX(funil4, false, rules)
        expect(diag4.gargalo).toBe(null)

        // Cenário 5: Venda Loja (SISTEMICO)
        const diag5 = gerarDiagnosticoMX(funil4, true, rules)
        expect(diag5.gargalo).toBe('SISTEMICO')
    })

    test('gerarDiagnosticoMX — funil zerado retorna SEM_DADOS', () => {
        const funilVazio: FunnelData = { leads: 0, agd_total: 0, visitas: 0, vnd_total: 0, tx_lead_agd: 0, tx_agd_visita: 0, tx_visita_vnd: 0 }
        const diag = gerarDiagnosticoMX(funilVazio)
        expect(diag.gargalo).toBe('SEM_DADOS')
    })

    test('formatStructuredWhatsAppFeedback segue o modelo operacional anexado', () => {
        const text = formatStructuredWhatsAppFeedback({
            metrics: { vnd_total: 3, agd_total: 12, visitas: 8, leads: 40 },
            dateLabel: '03/05/2026',
            metaIndividual: 10,
            metaCompromisso: 6,
            actions: ['Aumentar a quantidade de leads em 10'],
            positives: 'Conversao de vendas acima da media',
            attentionPoints: 'Melhorar respostas nos leads',
        })

        expect(text).toContain('FEEDBACK ESTRUTURADO')
        expect(text).toContain('Data: 03/05/2026')
        expect(text).toContain('Meta individual: 10')
        expect(text).toContain('Meta Compromisso: 6')
        expect(text).toContain('Orientação para a Semana')
        expect(text).toContain('Pontos Positivos')
        expect(text).toContain('Pontos de Atenção')
        expect(text).toContain('1) Aumentar a quantidade de leads em 10')
    })

    test('getBusinessDaysInMonth', () => {
        expect(getBusinessDaysInMonth(2026, 0)).toBe(27)
        expect(getBusinessDaysInMonth(2026, 1)).toBe(24)
        expect(getBusinessDaysInMonth(2026, 3)).toBe(26)
    })

    test('getBusinessDaysElapsed', () => {
        expect(getBusinessDaysElapsed(new Date('2026-04-01T12:00:00'))).toBe(1)
        expect(getBusinessDaysElapsed(new Date('2026-04-14T12:00:00'))).toBe(12)
    })

    test('getDiasInfo — modo calendar', () => {
        const info = getDiasInfo('2026-04-14', 'calendar')
        expect(info.total).toBe(30)
        expect(info.decorridos).toBe(14)
        expect(info.restantes).toBe(16)
        expect(info.referencia).toBe('2026-04-14')
    })

    test('getDiasInfo — modo business', () => {
        const info = getDiasInfo('2026-04-14', 'business')
        expect(info.total).toBeGreaterThan(0)
        expect(info.decorridos).toBeGreaterThan(0)
        expect(info.restantes).toBeGreaterThanOrEqual(0)
    })

    test('getDiasInfo — restantes nunca negativo', () => {
        const info = getDiasInfo('2026-04-30', 'calendar')
        expect(info.restantes).toBeGreaterThanOrEqual(0)
    })

    test('validarFunil', () => {
        expect(validarFunil({ agd_cart_prev: 5, agd_net_prev: 5, visitas: 8, vnd_porta: 2, vnd_cart: 1, vnd_net: 1 })).toBeNull()
        expect(validarFunil({ agd_cart_prev: 0, agd_net_prev: 0, visitas: 0, vnd_porta: 10, vnd_cart: 0, vnd_net: 0 })).toBeTruthy()
    })

    test('calcularScoreMX', () => {
        const funil: FunnelData = { leads: 100, agd_total: 25, visitas: 15, vnd_total: 6, tx_lead_agd: 25, tx_agd_visita: 60, tx_visita_vnd: 40 }
        const score = calcularScoreMX(10, 10, funil, 10, 10)
        expect(score).toBeGreaterThan(0)

        const scoreMetaZero = calcularScoreMX(10, 0, funil, 10, 10)
        expect(scoreMetaZero).toBeGreaterThan(0)
    })

    test('getOperationalStatus', () => {
        expect(getOperationalStatus(20, 50).label).toBe('INDISCIPLINA')
        expect(getOperationalStatus(20, 90).label).toBe('CRÍTICO')
        expect(getOperationalStatus(50, 90).label).toBe('ALERTA RITMO')
        expect(getOperationalStatus(90, 90).label).toBe('NO RITMO')
        expect(getOperationalStatus(110, 90).label).toBe('EXCELÊNCIA')
    })

    test('somarVendas', () => {
        const checkins: Partial<DailyCheckin>[] = [
            { vnd_porta_prev_day: 1, vnd_cart_prev_day: 2, vnd_net_prev_day: 3 },
            { vnd_porta_prev_day: 0, vnd_cart_prev_day: 1, vnd_net_prev_day: 0 },
        ]
        expect(somarVendas(checkins as DailyCheckin[])).toBe(7)
        expect(somarVendas([])).toBe(0)
    })

    test('somarVendasPorCanal', () => {
        const checkins: Partial<DailyCheckin>[] = [
            { vnd_porta_prev_day: 1, vnd_cart_prev_day: 2, vnd_net_prev_day: 3 },
        ]
        const canais = somarVendasPorCanal(checkins as DailyCheckin[])
        expect(canais.porta).toBe(1)
        expect(canais.carteira).toBe(2)
        expect(canais.internet).toBe(3)

        const vazio = somarVendasPorCanal([])
        expect(vazio.porta).toBe(0)
        expect(vazio.carteira).toBe(0)
        expect(vazio.internet).toBe(0)
    })
})
