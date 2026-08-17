/**
 * P0-02 (auditoria 2026-07-10): round-trip salvar → reabrir → comparar.
 * Antes desta correção, todo leads_prev_day ia para leads_cart (zerando
 * leads_net) e todo visit_prev_day ia para visitas_porta (zerando
 * visitas_cart/visitas_net) — a distribuição por canal do vendedor era
 * destruída ao reabrir um fechamento salvo.
 */
import { describe, expect, test } from 'bun:test'
import type { DailyCheckin } from '@/types/database'
import { reconstructCheckinFormFromHistorical } from './reconstruct-checkin-form'

const baseCheckin = (overrides: Partial<DailyCheckin> = {}): DailyCheckin => ({
    id: 'checkin-1',
    seller_user_id: 'seller-1',
    store_id: 'store-1',
    reference_date: '2026-07-09',
    submitted_at: '2026-07-09T11:00:00.000Z',
    metric_scope: 'daily',
    submission_status: 'on_time',
    is_venda_loja: false,
    leads_prev_day: 0,
    leads_net_prev_day: 0,
    agd_cart_prev_day: 0,
    agd_net_prev_day: 0,
    agd_cart_today: 0,
    agd_net_today: 0,
    vnd_porta_prev_day: 0,
    vnd_cart_prev_day: 0,
    vnd_net_prev_day: 0,
    visit_prev_day: 0,
    visitas_porta_prev_day: null,
    visitas_cart_prev_day: null,
    visitas_net_prev_day: null,
    zero_reason: null,
    note: null,
    updated_at: '2026-07-09T11:00:00.000Z',
    ...overrides,
})

describe('reconstructCheckinFormFromHistorical (P0-02)', () => {
    test('round-trip: distribuição por canal salva é a mesma reconstruída (não zera net/cart)', () => {
        const saved = baseCheckin({
            leads_prev_day: 6,
            leads_net_prev_day: 4,
            visit_prev_day: 9,
            visitas_porta_prev_day: 2,
            visitas_cart_prev_day: 3,
            visitas_net_prev_day: 4,
        })

        const { form, visitasCanalIndisponivel } = reconstructCheckinFormFromHistorical(saved)

        expect(form.leads_cart).toBe(6)
        expect(form.leads_net).toBe(4)
        expect(form.leads).toBe(10)
        expect(form.visitas_porta).toBe(2)
        expect(form.visitas_cart).toBe(3)
        expect(form.visitas_net).toBe(4)
        expect(visitasCanalIndisponivel).toBe(false)
    })

    test('registro anterior à migração (colunas de canal NULL): preserva o total, não inventa distribuição, e sinaliza indisponível', () => {
        const legacy = baseCheckin({
            leads_prev_day: 6,
            leads_net_prev_day: 0, // coluna existe mas nunca foi escrita por este registro
            visit_prev_day: 9,
            visitas_porta_prev_day: null,
            visitas_cart_prev_day: null,
            visitas_net_prev_day: null,
        })

        const { form, visitasCanalIndisponivel } = reconstructCheckinFormFromHistorical(legacy)

        // Soma preservada (não perde dado), mas sem inventar canal: tudo cai em
        // "porta" só porque é onde o total histórico sempre morou, e o sinal
        // visitasCanalIndisponivel avisa que não é uma leitura real do canal.
        expect(form.visitas_porta + form.visitas_cart + form.visitas_net).toBe(9)
        expect(form.visitas_cart).toBe(0)
        expect(form.visitas_net).toBe(0)
        expect(visitasCanalIndisponivel).toBe(true)
    })

    test('zero real por canal (vendedor não teve visita de um canal) não é confundido com "indisponível"', () => {
        const saved = baseCheckin({
            visit_prev_day: 5,
            visitas_porta_prev_day: 5,
            visitas_cart_prev_day: 0,
            visitas_net_prev_day: 0,
        })

        const { form, visitasCanalIndisponivel } = reconstructCheckinFormFromHistorical(saved)

        expect(form.visitas_porta).toBe(5)
        expect(form.visitas_cart).toBe(0)
        expect(form.visitas_net).toBe(0)
        expect(visitasCanalIndisponivel).toBe(false)
    })
})
