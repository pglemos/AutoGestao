import type { DailyCheckin } from '@/types/database'
import type { CheckinForm } from '../hooks/useCheckinPage'

// Reconstrói o formulário do Fechamento Diário a partir de um lançamento
// salvo (Histórico/Regularização). Extraída de useCheckinPage.ts (P0-02,
// auditoria 2026-07-10) para ser testável isoladamente.
//
// Antes desta correção, todo `leads_prev_day` ia para `leads_cart` (zerando
// `leads_net`) e todo `visit_prev_day` ia para `visitas_porta` (zerando
// `visitas_cart`/`visitas_net`) — a distribuição por canal digitada pelo
// vendedor era perdida ao reabrir o fechamento (round-trip quebrado).
//
// Quando `visitas_porta_prev_day` é NULL (registro anterior a esta migração,
// sem essa granularidade gravada), não inventa uma distribuição por canal —
// preserva o total em `visitas_porta` e sinaliza via `visitasCanalIndisponivel`
// que a origem exata daquele total não é conhecida (Artigo IV — No Invention).
export interface ReconstructedCheckinForm {
    form: CheckinForm
    visitasCanalIndisponivel: boolean
}

export function reconstructCheckinFormFromHistorical(historicalCheckin: DailyCheckin): ReconstructedCheckinForm {
    const hasVisitasCanal = historicalCheckin.visitas_porta_prev_day !== null
        && historicalCheckin.visitas_porta_prev_day !== undefined

    const form: CheckinForm = {
        leads: (historicalCheckin.leads_prev_day || 0) + (historicalCheckin.leads_net_prev_day || 0),
        leads_cart: historicalCheckin.leads_prev_day || 0,
        leads_net: historicalCheckin.leads_net_prev_day || 0,
        agd_cart_prev: historicalCheckin.agd_cart_prev_day || 0,
        agd_net_prev: historicalCheckin.agd_net_prev_day || 0,
        agd_cart: historicalCheckin.agd_cart_today || 0,
        agd_net: historicalCheckin.agd_net_today || 0,
        vnd_porta: historicalCheckin.vnd_porta_prev_day || 0,
        vnd_cart: historicalCheckin.vnd_cart_prev_day || 0,
        vnd_net: historicalCheckin.vnd_net_prev_day || 0,
        visitas: historicalCheckin.visit_prev_day || 0,
        visitas_porta: hasVisitasCanal
            ? (historicalCheckin.visitas_porta_prev_day || 0)
            : (historicalCheckin.visit_prev_day || 0),
        visitas_cart: hasVisitasCanal ? (historicalCheckin.visitas_cart_prev_day || 0) : 0,
        visitas_net: hasVisitasCanal ? (historicalCheckin.visitas_net_prev_day || 0) : 0,
        note: historicalCheckin.note || '',
        zero_reason: historicalCheckin.zero_reason || '',
    }

    return { form, visitasCanalIndisponivel: !hasVisitasCanal }
}
