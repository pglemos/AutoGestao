import { useMemo } from 'react'
import {
    calcularAtingimento,
    calcularProjecao,
    calcularFaltaX,
    getDiasInfo,
    somarVendas,
    somarVendasPorCanal
} from '@/lib/calculations'
import type { DailyCheckin, User, RankingEntry } from '@/types/database'
import { resolveCanonicalIndividualGoal } from '@/lib/storeSalesRules'

function getSaoPauloDateOnly(date: Date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

interface SellerGoal {
    user_id: string
    target: number
}

interface StoreGoal {
    target: number
    projection_mode?: 'calendar' | 'business'
}

interface MetricsParams {
    checkins: DailyCheckin[]
    todayCheckin: DailyCheckin | null
    profile: User | null
    sellerGoals: SellerGoal[]
    storeGoal: StoreGoal | null
    ranking: RankingEntry[]
    projectionMode?: 'calendar' | 'business'
}

export function useSellerMetrics({ 
    checkins, 
    todayCheckin, 
    profile, 
    sellerGoals, 
    storeGoal, 
    ranking,
    projectionMode = 'calendar'
}: MetricsParams) {
    return useMemo(() => {
        if (!profile?.id) return null

        const myCheckins = checkins.filter(c => c.seller_user_id === profile.id)
        const vendasMes = somarVendas(myCheckins)
        const porCanal = somarVendasPorCanal(myCheckins)
        const dias = getDiasInfo(undefined, projectionMode)

        const myGoal = sellerGoals.find(g => g.user_id === profile.id)
        const myRank = ranking.find(r => r.user_id === profile.id)
        const eligibleSellerCount = ranking.filter(entry => !entry.is_venda_loja).length
        const meta = resolveCanonicalIndividualGoal({
            // Both sources preserve an explicitly saved zero. The ranking is
            // the official read model; sellerGoals remains a local fallback.
            officialGoal: myGoal?.target ?? myRank?.meta,
            storeMonthlyGoal: storeGoal?.target,
            activeSellersCount: eligibleSellerCount,
            isVendaLoja: myRank?.is_venda_loja,
        })
        
        const atingimento = calcularAtingimento(vendasMes, meta)
        const projecao = calcularProjecao(vendasMes, dias.decorridos, dias.total)
        const faltaX = calcularFaltaX(meta, vendasMes)
        
        const myRankIndex = ranking.findIndex(r => r.user_id === profile.id)
        
        const competitors = {
            above: myRankIndex > 0 ? ranking[myRankIndex - 1] : null,
            below: myRankIndex < ranking.length - 1 ? ranking[myRankIndex + 1] : null
        }

        const yesterdayStr = new Date(); yesterdayStr.setDate(yesterdayStr.getDate() - 1)
        const yesterdayFormatted = getSaoPauloDateOnly(yesterdayStr)
        const checkinOntem = myCheckins.find(c => c.reference_date === yesterdayFormatted)
        
        const vendasOntem = checkinOntem ? (checkinOntem.vnd_porta_prev_day || 0) + (checkinOntem.vnd_cart_prev_day || 0) + (checkinOntem.vnd_net_prev_day || 0) : 0
        const agendamentosHoje = todayCheckin ? (todayCheckin.agd_cart_today || 0) + (todayCheckin.agd_net_today || 0) : 0

        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
        const weekStr = getSaoPauloDateOnly(weekAgo)
        const vendasSemana = somarVendas(myCheckins.filter(c => c.reference_date >= weekStr))

        return { 
            vendasMes, 
            porCanal, 
            meta, 
            atingimento, 
            projecao, 
            faltaX,
            myRank, 
            vendasOntem, 
            agendamentosHoje, 
            vendasSemana, 
            competitors 
        }
    }, [checkins, profile, sellerGoals, storeGoal, ranking, todayCheckin, projectionMode])
}
