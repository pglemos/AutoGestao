// ============================================
// MX PERFORMANCE — Business Calculations
// ============================================

import type { DailyCheckin, CheckinTotals, FunnelData, FunnelDiagnostic, Benchmark, CheckinFormData, StoreMetaRules } from '@/types/database'

/** Calcula totais de Fechamento Diário (agd_total, vnd_total) */
export function calcularTotais(c: Partial<DailyCheckin> | CheckinFormData): CheckinTotals {
    // Se for FormData (nomes simples)
    if ('leads' in c) {
        return {
            agd_total: (c.agd_cart || 0) + (c.agd_net || 0),
            vnd_total: (c.vnd_porta || 0) + (c.vnd_cart || 0) + (c.vnd_net || 0),
        }
    }
    // Se for DailyCheckin (nomes canônicos)
    return {
        agd_total: (c.agd_cart_today || 0) + (c.agd_net_today || 0),
        vnd_total: (c.vnd_porta_prev_day || 0) + (c.vnd_cart_prev_day || 0) + (c.vnd_net_prev_day || 0),
    }
}


/** % atingimento = vendas / meta × 100 */
export function calcularAtingimento(vendas: number, meta: number): number {
    if (meta <= 0) return 0
    return Math.round((vendas / meta) * 100 * 10) / 10
}

/** Falta X = max(meta - vendas, 0) */
export function calcularFaltaX(meta: number, vendas: number): number {
    return Math.max(meta - vendas, 0)
}

/** Projeção = (vendas_acum / dias_decorridos) × total_dias */
export function calcularProjecao(vendas: number, diasDecorridos: number, totalDias: number): number {
    if (diasDecorridos <= 0) return 0
    return Math.round((vendas / diasDecorridos) * totalDias)
}

/** Ritmo diário (Necessário para a Meta) = (meta - vendas) / dias_restantes */
export function calcularRitmo(meta: number, vendas: number, diasRestantes: number): number {
    if (diasRestantes <= 0) return 0
    const falta = Math.max(meta - vendas, 0)
    return Math.round(falta / diasRestantes * 10) / 10
}

/** Verifica se é dia útil (Segunda a Sábado) conforme metodologia MX */
export function isBusinessDay(date: Date): boolean {
    const day = date.getDay()
    return day !== 0 // 0 = Domingo (Único dia não útil na operação padrão MX)
}

/** Conta total de dias úteis no mês de uma data */
export function getBusinessDaysInMonth(year: number, month: number): number {
    const totalDays = new Date(year, month + 1, 0).getDate()
    let count = 0
    for (let d = 1; d <= totalDays; d++) {
        if (isBusinessDay(new Date(year, month, d))) count++
    }
    return count
}

/** Conta dias úteis decorridos até uma data (inclusive) */
export function getBusinessDaysElapsed(date: Date): number {
    const year = date.getFullYear()
    const month = date.getMonth()
    const today = date.getDate()
    let count = 0
    for (let d = 1; d <= today; d++) {
        if (isBusinessDay(new Date(year, month, d))) count++
    }
    return count
}

/** Get days info for the current month. Respects ProjectionMode (v1.1) */
export function getDiasInfo(referenceDate?: Date | string, mode: 'calendar' | 'business' = 'calendar'): { total: number; decorridos: number; restantes: number; referencia: string } {
    const ref = typeof referenceDate === 'string' ? new Date(referenceDate + 'T12:00:00') : (referenceDate || new Date())
    const year = ref.getFullYear()
    const month = ref.getMonth()
    
    if (mode === 'business') {
        const total = getBusinessDaysInMonth(year, month)
        const decorridos = getBusinessDaysElapsed(ref)
        const restantes = Math.max(total - decorridos, 0)
        const referencia = ref.toISOString().split('T')[0]
        return { total, decorridos, restantes, referencia }
    }

    const total = new Date(year, month + 1, 0).getDate()
    const decorridos = ref.getDate()
    const restantes = Math.max(total - decorridos, 0)
    const referencia = ref.toISOString().split('T')[0]
    return { total, decorridos, restantes, referencia }
}

/** Calculate funnel data from aggregated checkins */
export function calcularFunil(checkins: DailyCheckin[]): FunnelData {
    const leads = checkins.reduce((s, c) => s + (c.leads_prev_day || 0), 0)
    // Para o Funil de Performance (Auditoria), usamos os agendamentos que eram para o dia de referência (ontem)
    const agd_total = checkins.reduce((s, c) => s + (c.agd_cart_prev_day || 0) + (c.agd_net_prev_day || 0), 0)
    const visitas = checkins.reduce((s, c) => s + (c.visit_prev_day || 0), 0)
    const vnd_total = checkins.reduce((s, c) => s + (c.vnd_porta_prev_day || 0) + (c.vnd_cart_prev_day || 0) + (c.vnd_net_prev_day || 0), 0)

    return {
        leads,
        agd_total,
        visitas,
        vnd_total,
        tx_lead_agd: leads > 0 ? Math.round((agd_total / leads) * 100) : 0,
        tx_agd_visita: agd_total > 0 ? Math.round((visitas / agd_total) * 100) : 0,
        tx_visita_vnd: visitas > 0 ? Math.round((vnd_total / visitas) * 100) : 0,
    }
}


/** Benchmarks Oficiais Metodologia MX */
export const MX_BENCHMARKS = {
    lead_agd: 20,    // 20% de Leads devem virar Agendamentos
    agd_visita: 60,  // 60% de Agendamentos devem virar Visitas
    visita_vnd: 33   // 33% de Visitas devem virar Vendas
}

/** Gera diagnóstico rígido baseado no critério 20/60/33 ou configurado por loja */
export function gerarDiagnosticoMX(funil: FunnelData, isVendaLoja = false, rules?: StoreMetaRules): { 
    gargalo: string | null, 
    diagnostico: string, 
    sugestao: string 
} {
    if (isVendaLoja) {
        return {
            gargalo: 'SISTEMICO',
            diagnostico: "Registro de Venda Loja (Saldo da Unidade).",
            sugestao: "Este item não possui funil individual e serve apenas para conciliação do total da loja."
        }
    }

    if (funil.leads === 0 && funil.agd_total === 0 && funil.visitas === 0 && funil.vnd_total === 0) {
        return {
            gargalo: 'SEM_DADOS',
            diagnostico: 'Sem dados suficientes para diagnóstico.',
            sugestao: 'Realizar Fechamento Diário regularmente para gerar dados de funil.'
        }
    }

    const bench = {
        lead_agd: rules?.bench_lead_agd ?? MX_BENCHMARKS.lead_agd,
        agd_visita: rules?.bench_agd_visita ?? MX_BENCHMARKS.agd_visita,
        visita_vnd: rules?.bench_visita_vnd ?? MX_BENCHMARKS.visita_vnd
    }

    if (funil.tx_lead_agd < bench.lead_agd) {
        return {
            gargalo: 'LEAD_AGD',
            diagnostico: `Baixa conversão de Leads para Agendamentos (${funil.tx_lead_agd}% vs ${bench.lead_agd}% ideal).`,
            sugestao: "Focar em velocidade de primeiro contato e qualidade da abordagem inicial (script de agendamento)."
        }
    }
    if (funil.tx_agd_visita < bench.agd_visita) {
        return {
            gargalo: 'AGD_VISITA',
            diagnostico: `Baixa taxa de comparecimento (${funil.tx_agd_visita}% vs ${bench.agd_visita}% ideal).`,
            sugestao: "Melhorar a confirmação de agendamentos e o 'valor percebido' criado durante a ligação."
        }
    }
    if (funil.tx_visita_vnd < bench.visita_vnd) {
        return {
            gargalo: 'VISITA_VND',
            diagnostico: `Baixo fechamento em loja (${funil.tx_visita_vnd}% vs ${bench.visita_vnd}% ideal).`,
            sugestao: "Revisar etapas de demonstração de produto e contorno de objeções no momento do fechamento."
        }
    }

    return {
        gargalo: null,
        diagnostico: "Funil equilibrado e dentro dos padrões de eficiência MX.",
        sugestao: "Manter o ritmo e focar em aumento de volume de leads para escala."
    }
}


/** Validate funnel logic: vnd_total <= visitas <= agd_total (referring to yesterday) */
export function validarFunil(data: CheckinFormData): string | null {
    const agd_prev_total = (data.agd_cart_prev || 0) + (data.agd_net_prev || 0)
    const vnd_total = (data.vnd_porta || 0) + (data.vnd_cart || 0) + (data.vnd_net || 0)

    if (vnd_total > (data.visitas || 0)) {
        return `Total de vendas de ontem (${vnd_total}) não pode ser maior que visitas de ontem (${data.visitas || 0})`
    }
    if ((data.visitas || 0) > agd_prev_total && agd_prev_total > 0) {
        return `Visitas de ontem (${data.visitas || 0}) não podem ser maiores que agendamentos previstos para ontem (${agd_prev_total})`
    }
    return null
}

/** Calculate MX Score (High Performance Indicator) */
export function calcularScoreMX(vendas: number, meta: number, funil: FunnelData, checkinCount: number, daysElapsed: number): number {
    let salesScore: number
    if (meta <= 0) {
        salesScore = Math.min(vendas * 10, 1000)
    } else {
        salesScore = Math.min(calcularAtingimento(vendas, meta) * 10, 1000)
    }
    
    // 2. Conversion Bonuses (up to 500 pts)
    let conversionBonus = 0
    if (funil.tx_lead_agd >= MX_BENCHMARKS.lead_agd) conversionBonus += 150
    if (funil.tx_agd_visita >= MX_BENCHMARKS.agd_visita) conversionBonus += 150
    if (funil.tx_visita_vnd >= MX_BENCHMARKS.visita_vnd) conversionBonus += 200
    
    // 3. Discipline Multiplier (0.5x to 1.2x)
    const disciplineRate = daysElapsed > 0 ? (checkinCount / daysElapsed) : 1
    const disciplineMultiplier = disciplineRate >= 1 ? 1.2 : disciplineRate < 0.8 ? 0.5 : 1.0
    
    return Math.round((salesScore + conversionBonus) * disciplineMultiplier)
}

/** Get status operacional baseado no ritmo e disciplina */
export function getOperationalStatus(pacing: number, disciplinePct: number): { label: string; color: string } {
    if (disciplinePct < 80) return { label: 'INDISCIPLINA', color: 'bg-status-error text-status-error-foreground' }
    if (pacing < 30) return { label: 'CRÍTICO', color: 'bg-status-error text-status-error-foreground' }
    if (pacing < 70) return { label: 'ALERTA RITMO', color: 'bg-status-warning text-status-warning-foreground' }
    if (pacing < 100) return { label: 'NO RITMO', color: 'bg-brand-primary text-white' }
    return { label: 'EXCELÊNCIA', color: 'bg-brand-primary text-white' }
}

/** Sum total vendas from checkins array */
export function somarVendas(checkins: DailyCheckin[]): number {
    return checkins.reduce((s, c) => s + (c.vnd_porta_prev_day || 0) + (c.vnd_cart_prev_day || 0) + (c.vnd_net_prev_day || 0), 0)
}

/** Sum vendas by channel */
export function somarVendasPorCanal(checkins: DailyCheckin[]) {
    return {
        porta: checkins.reduce((s, c) => s + (c.vnd_porta_prev_day || 0), 0),
        carteira: checkins.reduce((s, c) => s + (c.vnd_cart_prev_day || 0), 0),
        internet: checkins.reduce((s, c) => s + (c.vnd_net_prev_day || 0), 0),
    }
}

type MorningReportMetrics = {
    reaching: number
    teamGoal: number
    currentSales: number
    projection: number
    gap: number
    vnd_total?: number
    leads?: number
    visitas?: number
    agd_total?: number
    pendingSellers?: string[]
}

type MorningReportRankingRow = {
    user_name: string
    vnd_total: number
    agd_total: number
}

/** Formata o texto do WhatsApp para o Matinal Oficial */
export function formatWhatsAppMorningReport(storeName: string, dateLabel: string, metrics: MorningReportMetrics, ranking: MorningReportRankingRow[]): string {
    const statusEmoji = metrics.reaching >= 100 ? '✅' : metrics.reaching >= 70 ? '⚠️' : '🚨';
    const pendingSellers = metrics.pendingSellers || [];
    
    return `*📊 MATINAL OFICIAL MX — ${storeName.toUpperCase()}*
*Ref:* ${dateLabel}

*${statusEmoji} STATUS ATUAL:*
🎯 *META MENSAL:* ${metrics.teamGoal}
📈 *REALIZADO:* ${metrics.currentSales} (${metrics.reaching}%)
🚀 *PROJEÇÃO:* ${metrics.projection}
🔎 *FALTA POUCO:* ${metrics.gap} CARROS

*📊 GRADE OPERACIONAL:*
${ranking.map(r => `• ${r.user_name}: ${r.vnd_total}v | ${r.agd_total} agd`).join('\n')}

${pendingSellers.length > 0 ? `*⚠️ SEM REGISTRO HOJE:* \n${pendingSellers.join(', ')}` : '*✅ Time 100% ativo hoje.*'}

*FOCO DO DIA:* Validar agenda digital D-0.
_Sistema Automático MX_`
}

type StructuredFeedbackMetrics = {
    vnd_total?: number
    agd_total?: number
    visitas?: number
    leads?: number
}

type StructuredFeedbackDiagnostic = {
    diagnostico?: string
    sugestao?: string
}

/** Formata o feedback estruturado para envio via WhatsApp */
export function formatStructuredWhatsAppFeedback(data: {
    sellerName?: string;
    metrics: StructuredFeedbackMetrics;
    diagnostic?: StructuredFeedbackDiagnostic;
    actions?: string[];
    periodLabel?: string;
    dateLabel?: string;
    metaIndividual?: number | string;
    metaCompromisso?: number | string;
    positives?: string | string[];
    attentionPoints?: string | string[];
}): string {
    const toLines = (value?: string | string[]) => {
        if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean)
        return String(value || '')
            .split(/\n+/)
            .map(v => v.replace(/^\d+[).]\s*/, '').trim())
            .filter(Boolean)
    }

    const numbered = (items: string[], fallback: string) => {
        const lines = items.length ? items : [fallback]
        return lines.map((item, index) => `${index + 1}) ${item}`).join('\n')
    }

    const orientation = toLines(data.actions)
    const positives = toLines(data.positives)
    const attention = toLines(data.attentionPoints)
    const diagnosticText = data.diagnostic?.diagnostico || 'Acompanhar indicadores da semana e corrigir o principal gargalo do funil.'
    const suggestionText = data.diagnostic?.sugestao || 'Definir uma acao objetiva para a semana.'

    return `🚗 *FEEDBACK ESTRUTURADO*

Data: ${data.dateLabel || data.periodLabel || 'XX/XX/XXXX'}
Meta individual: ${data.metaIndividual ?? data.metrics?.vnd_total ?? 'X'}
Meta Compromisso: ${data.metaCompromisso ?? 'Y'}

📝 *Orientação para a Semana:*

${numbered(orientation, suggestionText)}

✅ *Pontos Positivos*

${numbered(positives, `Vendas: ${data.metrics?.vnd_total ?? 0}; agendamentos: ${data.metrics?.agd_total ?? 0}; visitas: ${data.metrics?.visitas ?? 0}.`)}

🔴 *Pontos de Atenção*

${numbered(attention, diagnosticText)}`
}
