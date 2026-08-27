import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
    derivarNivelMaturidadeVendedor,
    MATURIDADE_VENDEDOR_LABEL,
    type NivelMaturidadeVendedor,
    type VendedorExperienciaDeclarada,
} from '@/features/crm/lib/maturidade'
import { atualizarTarefaTreinamento, categoriaDoTreinamento, concluirTreinamento, listarTarefasTreinamento, listarTreinamentosVendedor, type TarefaTreinamento as TarefaServico, type VendedorTreinamento } from '@/features/universidade/services/universidade-service'
import { recomendarTreinamentos, type CompetenciaAvaliada, type EtapaFunilAberta, type SinaisRecomendacao } from '@/features/universidade/services/recomendacao'

/**
 * Dados reais da Universidade MX (aulas do vendedor). Substitui:
 * - base44.entities.Training/TrainingProgress (shim que fabricava
 *   quiz_score/hours_studied/attended_live com valores fixos — P0-03).
 * - CLASS_TASKS hardcoded + localStorage mx-training-tasks (P0-03/UNIV-1).
 * - Nível de maturidade por completedCount/3 (UNIV-3) — agora usa a mesma
 *   função canônica de maturidade usada em Meu Perfil (tempo de mercado,
 *   experiência declarada, cargo).
 */

export { categoriaDoTreinamento }

export interface Treinamento {
    id: string
    title: string
    description: string | null
    type: string
    category: string
    level: string
    duration_minutes: number
    video_url: string
    material_url: string | null
    is_live: boolean
    live_date: string | null
    completed: boolean
    progress_percent: number
    completed_at: string | null
}

export interface ProgressoTreinamento {
    id: string
    training_id: string
    status: string
    progress_percent: number
    completed_at: string | null
    completed: boolean
}

export interface TarefaTreinamento {
    id: string
    training_id: string
    descricao: string
    ordem: number
    concluida: boolean
    respostaId: string | null
}

type AvaliacaoPdiRow = {
    nota_atribuida: number
    alvo: number
    sessao: { colaborador_id: string; created_at: string } | null
    competencia: { nome: string; ordem: number } | null
}

/**
 * Reduz as avaliações à sessão de PDI mais recente do vendedor: recomendar com
 * base num PDI antigo, já substituído, mandaria a pessoa para o treinamento
 * errado.
 */
function competenciasDoPdiVigente(rows: unknown): CompetenciaAvaliada[] | null {
    const avaliacoes = (rows as AvaliacaoPdiRow[] | null) || []
    const validas = avaliacoes.filter(row => row.sessao && row.competencia)
    if (!validas.length) return null

    const maisRecente = validas.reduce((maior, row) =>
        (row.sessao as { created_at: string }).created_at > maior ? (row.sessao as { created_at: string }).created_at : maior,
        '')

    return validas
        .filter(row => (row.sessao as { created_at: string }).created_at === maisRecente)
        .map(row => ({
            ordem: (row.competencia as { ordem: number }).ordem,
            nome: (row.competencia as { nome: string }).nome,
            nota: row.nota_atribuida,
            alvo: row.alvo,
        }))
}

export function useVendedorTreinamentos() {
    const { supabaseUser } = useAuth()
    const [trainings, setTrainings] = useState<Treinamento[]>([])
    const [progress, setProgress] = useState<ProgressoTreinamento[]>([])
    const [tarefas, setTarefas] = useState<TarefaTreinamento[]>([])
    const [nivelMaturidade, setNivelMaturidade] = useState<NivelMaturidadeVendedor>('N1')
    const [sinais, setSinais] = useState<Omit<SinaisRecomendacao, 'nivelMaturidade'>>({ etapasAbertas: {}, devolutivaAcoesPendentes: 0, competenciasPdi: null })
    const [loading, setLoading] = useState(true)

    const fetchAll = useCallback(async () => {
        if (!supabaseUser?.id) { setLoading(false); return }
        setLoading(true)

        try {
            const [trainingsResult, perfilRes, oportunidadesRes, devolutivasRes, pdiRes] = await Promise.all([
                listarTreinamentosVendedor(supabase, supabaseUser.id).catch(() => []),
                supabase
                    .from('vendedor_perfil')
                    .select('tempo_mercado_anos, experiencia_declarada, cargo_atual')
                    .eq('seller_user_id', supabaseUser.id)
                    .maybeSingle(),
                supabase
                    .from('clientes_oportunidades')
                    .select('etapa')
                    .eq('seller_user_id', supabaseUser.id)
                    .is('data_venda', null)
                    // 'cancelada' é terminal como 'ganho'/'perdido' — sem ela,
                    // a venda revertida voltava a contar como pipeline aberto.
                    .not('etapa', 'in', '("ganho","perdido","cancelada")'),
                supabase
                    .from('devolutiva_acoes')
                    .select('id', { count: 'exact', head: true })
                    .eq('seller_id', supabaseUser.id)
                    .eq('status', 'pendente'),
                // Competências do PDI vigente. Antes lia `pdis`, tabela vazia em
                // produção: lacuna de PDI nunca chegava a pesar na recomendação.
                supabase
                    .from('pdi_avaliacoes_competencia')
                    .select('nota_atribuida, alvo, sessao:pdi_sessoes!inner(colaborador_id, created_at), competencia:pdi_competencias!inner(nome, ordem)')
                    .eq('sessao.colaborador_id', supabaseUser.id)
                    .order('created_at', { referencedTable: 'pdi_sessoes', ascending: false }),
            ])

            const mappedTrainings: Treinamento[] = Array.isArray(trainingsResult) ? trainingsResult : []
            setTrainings(mappedTrainings)
            setProgress(mappedTrainings.map(p => ({ id: p.id, training_id: p.id, status: p.completed ? 'concluido' : 'pendente', progress_percent: p.progress_percent, completed_at: p.completed_at, completed: p.completed })))

            const perfil = perfilRes.data as {
                tempo_mercado_anos: number | null
                experiencia_declarada: VendedorExperienciaDeclarada | null
                cargo_atual: string | null
            } | null
            setNivelMaturidade(derivarNivelMaturidadeVendedor({
                tempo_mercado_anos: perfil?.tempo_mercado_anos ?? null,
                experiencia_declarada: perfil?.experiencia_declarada ?? null,
                cargo_atual: perfil?.cargo_atual ?? null,
            }))

            const etapasAbertas: Partial<Record<EtapaFunilAberta, number>> = {}
            for (const row of oportunidadesRes.data ?? []) {
                const etapa = row.etapa as EtapaFunilAberta | null
                if (!etapa) continue
                etapasAbertas[etapa] = (etapasAbertas[etapa] ?? 0) + 1
            }
            setSinais({
                etapasAbertas,
                devolutivaAcoesPendentes: devolutivasRes.count ?? 0,
                competenciasPdi: competenciasDoPdiVigente(pdiRes.data),
            })

            if (mappedTrainings.length > 0) {
                const tarefasResult = await listarTarefasTreinamento(supabase, supabaseUser.id, mappedTrainings.map(t => t.id)).catch(() => [])
                setTarefas(Array.isArray(tarefasResult) ? tarefasResult as TarefaServico[] : [])
            } else {
                setTarefas([])
            }
        } catch {
            setTrainings([])
            setProgress([])
            setTarefas([])
        } finally {
            setLoading(false)
        }
    }, [supabaseUser?.id])

    useEffect(() => { fetchAll() }, [fetchAll])

    const toggleTarefa = useCallback(async (tarefa: TarefaTreinamento, concluida: boolean) => {
        if (!supabaseUser?.id) return { error: 'Sessão inválida.' }
        try { await atualizarTarefaTreinamento(supabase, supabaseUser.id, tarefa, concluida) } catch (error) { return { error: error instanceof Error ? error.message : 'Falha ao atualizar tarefa.' } }
        setTarefas(current => current.map(t => t.id === tarefa.id ? { ...t, concluida } : t))
        return { error: null }
    }, [supabaseUser?.id])

    const markCompleted = useCallback(async (trainingId: string) => {
        if (!supabaseUser?.id) return { error: 'Sessão inválida.' }
        try {
            const now = await concluirTreinamento(supabase, supabaseUser.id, trainingId)
            setProgress(current => [
                ...current.filter(p => p.training_id !== trainingId),
                { id: '', training_id: trainingId, status: 'concluido', progress_percent: 100, completed_at: now, completed: true },
            ])
        } catch (error) { return { error: error instanceof Error ? error.message : 'Falha ao concluir treinamento.' } }
        return { error: null }
    }, [supabaseUser?.id])

    const completedIds = useMemo(() => new Set(progress.filter(p => p.completed).map(p => p.training_id)), [progress])
    const completedCount = completedIds.size

    // UNIV-4: recomendações explicáveis (lacuna PDI + gargalo do funil + devolutiva
    // pendente + maturidade). Sem sinal real, lista vazia — nada de "primeiros 4".
    const recomendacoes = useMemo(() => {
        const porId = new Map(trainings.map(t => [t.id, t]))
        return recomendarTreinamentos(
            trainings.map(t => ({ id: t.id, title: t.title, category: t.category, level: t.level, completed: completedIds.has(t.id) })),
            { ...sinais, nivelMaturidade },
        ).map(rec => ({ ...rec, training: porId.get(rec.id) })).filter(rec => rec.training !== undefined)
    }, [trainings, completedIds, sinais, nivelMaturidade])

    return {
        trainings,
        progress,
        tarefas,
        loading,
        completedIds,
        completedCount,
        nivelMaturidade,
        nivelMaturidadeLabel: MATURIDADE_VENDEDOR_LABEL[nivelMaturidade],
        recomendacoes,
        toggleTarefa,
        markCompleted,
        refetch: fetchAll,
    }
}
