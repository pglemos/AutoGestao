import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { PDI_ORIGEM_NOTA, type PDIOrigemNota } from '@/lib/pdi-self-assessment'

export interface PDICargo {
    id: string
    nome: string
    nivel: number
    nota_min: number
    nota_max: number
}

export interface PDIFormTemplate {
    escala: { nota: number; descritor: string; ordem: number }[]
    competencias: { id: string; nome: string; tipo: 'tecnica' | 'comportamental'; descricao_completa: string; indicador: string; ordem: number; alvo: number }[]
    frases: string[]
}

export interface PDISuggestedAction {
    id: string
    descricao_acao: string
}

export interface PDIMeta360 {
    id?: string
    sessao_id?: string
    prazo: '6_meses' | '12_meses' | '24_meses' | string
    tipo: 'pessoal' | 'profissional' | string
    descricao: string
}

export interface PDIAvaliacao360 {
    id?: string
    sessao_id?: string
    competencia_id: string
    competencia: string
    tipo?: string
    nota: number
    alvo: number
    gap: number
    origem_nota?: PDIOrigemNota
}

export interface PDIPlanoAcao360 {
  id?: string
  sessao_id?: string
  competencia_id: string
  competencia: string
  descricao_acao: string
  data_conclusao: string
  impacto: string
  custo: string
  status?: string
  justificativa?: string | null
  central_enviada_at?: string | null
}

export interface PDISessionSummary {
    id: string
    colaborador_id: string
    gerente_id: string
    loja_id: string | null
    cargo_id?: string | null
    status: string
    created_at: string
    updated_at?: string | null
    data_realizacao?: string | null
    proxima_revisao_data?: string | null
    due_date?: string | null
    seller_name: string
    seller_avatar_url?: string | null
    manager_name: string
    store_name?: string
    metas: PDIMeta360[]
    avaliacoes: PDIAvaliacao360[]
    plano_acao: PDIPlanoAcao360[]
    top_5_gaps: PDIAvaliacao360[]
    meta_6m: string
    meta_12m: string
    meta_24m: string
    action_1?: string
    action_2?: string
    action_3?: string
    action_4?: string
    action_5?: string
}

export interface PDIPrintBundle {
    sessao: PDISessionSummary & {
        colaborador_nome?: string | null
        gerente_nome?: string | null
        loja_nome?: string | null
    }
    metas: PDIMeta360[]
    avaliacoes: PDIAvaliacao360[]
    plano_acao: PDIPlanoAcao360[]
    top_5_gaps: PDIAvaliacao360[]
}

type PDISessionRow = {
    id: string
    colaborador_id: string
    gerente_id: string
    loja_id: string | null
    cargo_id?: string | null
    status: string
    created_at: string
    updated_at?: string | null
    data_realizacao?: string | null
    proxima_revisao_data?: string | null
}

type PDICompetenciaRelation = {
    id: string
    nome: string
    tipo?: string | null
    ordem?: number | null
} | null

type PDIMetaRow = PDIMeta360 & {
    sessao_id: string
}

type PDIAvaliacaoRow = {
    id: string
    sessao_id: string
    competencia_id: string
    competencia: PDICompetenciaRelation
    nota_atribuida: number
    alvo: number
    origem_nota?: PDIOrigemNota | null
}

type PDIPlanoAcaoRow = {
    id: string
    sessao_id: string
    competencia_id: string
    competencia: PDICompetenciaRelation
    descricao_acao: string
    data_conclusao: string
    impacto: string
  custo: string
  status?: string | null
  justificativa?: string | null
  central_enviada_at?: string | null
}

type PDIUserIdentityRow = {
    id: string
    name: string
    avatar_url: string | null
}

type PDIStoreIdentityRow = {
    id: string
    name: string
}

const pdiSessionBundleSchema = z.object({
    colaborador_id: z.string().min(1, 'Selecione o colaborador do PDI.'),
    loja_id: z.string().nullable().optional().default(null),
    cargo_id: z.string().min(1, 'Selecione o cargo do PDI.'),
    proxima_revisao_data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida para a próxima revisão.'),
    metas: z.array(z.object({
        prazo: z.string().min(1),
        tipo: z.string().min(1),
        descricao: z.string().trim().min(1),
    })).default([]),
    avaliacoes: z.array(z.object({
        competencia_id: z.string().min(1),
        nota_atribuida: z.number().finite(),
        alvo: z.number().finite(),
        origem_nota: z.enum([PDI_ORIGEM_NOTA.GESTOR, PDI_ORIGEM_NOTA.AUTOAVALIACAO]).optional().default(PDI_ORIGEM_NOTA.GESTOR),
    })).min(1, 'Informe as avaliações por competência.'),
    plano_acao: z.array(z.object({
        competencia_id: z.string().min(1),
        descricao_acao: z.string().trim().min(1),
        data_conclusao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        impacto: z.string().min(1),
        custo: z.string().min(1),
    })).default([]),
})

type PDISessionBundlePayload = z.infer<typeof pdiSessionBundleSchema>

export type PDIVisitaConsultoriaInput = {
  colaboradorId: string
  lojaId: string
  cargoId: string
  competenciaId: string
  meta6m: string
  meta12m?: string
  acaoInicial: string
  prazoAcao: string
  proximaRevisaoData: string
}

export type PDIDocumentUpdateInput = {
  metas?: Array<{ id: string; descricao: string; tipo: string }>
  avaliacoes?: Array<{ id: string; nota: number; alvo: number }>
  acoes?: Array<{
    id: string
    descricaoAcao: string
    dataConclusao: string
    impacto: string
    custo: string
  }>
}

function joinMetas(metas: PDIMeta360[], prazo: string) {
    return metas
        .filter(m => m.prazo === prazo)
        .map(m => m.descricao)
        .filter(Boolean)
        .join(' | ')
}

async function fetchPDISessions360(params: {
    profileId?: string
    role?: string | null
    storeId?: string | null
    storeIdOverride?: string
    ownerStoreIds?: string[]
}) {
    const { profileId, role, storeId, storeIdOverride, ownerStoreIds = [] } = params
    if (!profileId) return [] as PDISessionSummary[]
    if (!isPerfilInternoMx(role) && role !== 'vendedor' && role !== 'dono' && !storeId) return [] as PDISessionSummary[]

    const effectiveStoreId = storeIdOverride || (role === 'dono' ? null : storeId)
    let query = supabase
        .from('pdi_sessoes')
        .select('id, colaborador_id, gerente_id, loja_id, cargo_id, status, created_at, updated_at, data_realizacao, proxima_revisao_data')
        .order('created_at', { ascending: false })

    if (role === 'vendedor') {
        query = query.eq('colaborador_id', profileId)
    } else if (role === 'gerente' && effectiveStoreId) {
        query = query.eq('loja_id', effectiveStoreId).eq('gerente_id', profileId)
    } else if (role === 'dono' && effectiveStoreId) {
        query = query.eq('loja_id', effectiveStoreId)
    } else if (role === 'dono' && ownerStoreIds.length) {
        query = query.in('loja_id', ownerStoreIds)
    } else if (isPerfilInternoMx(role) && effectiveStoreId && effectiveStoreId !== 'all') {
        query = query.eq('loja_id', effectiveStoreId)
    }

    const { data: sessoes, error: sessoesError } = await query
    if (sessoesError) throw sessoesError
    if (!sessoes?.length) return [] as PDISessionSummary[]

    const sessionRows = sessoes as PDISessionRow[]
    const sessionIds = sessionRows.map(s => s.id)
    const userIds = Array.from(new Set(sessionRows.flatMap(s => [s.colaborador_id, s.gerente_id]).filter((id): id is string => Boolean(id))))
    const storeIds = Array.from(new Set(sessionRows.map(s => s.loja_id).filter((id): id is string => Boolean(id))))

    const [metasResp, avaliacoesResp, planoResp, usuariosResp, lojasResp] = await Promise.all([
        supabase.from('pdi_metas').select('id, sessao_id, prazo, tipo, descricao').in('sessao_id', sessionIds).order('created_at', { ascending: true }),
        supabase
            .from('pdi_avaliacoes_competencia')
            .select('id, sessao_id, competencia_id, nota_atribuida, alvo, origem_nota, competencia:pdi_competencias(id,nome,tipo,ordem)')
            .in('sessao_id', sessionIds),
        supabase
            .from('pdi_plano_acao')
            .select('id, sessao_id, competencia_id, descricao_acao, data_conclusao, impacto, custo, status, justificativa, central_enviada_at, competencia:pdi_competencias(id,nome,tipo,ordem)')
            .in('sessao_id', sessionIds)
            .order('data_conclusao', { ascending: true }),
        userIds.length ? supabase.from('usuarios').select('id,name,avatar_url').in('id', userIds) : Promise.resolve({ data: [], error: null }),
        storeIds.length ? supabase.from('lojas').select('id,name').in('id', storeIds) : Promise.resolve({ data: [], error: null }),
    ])

    if (metasResp.error) throw metasResp.error
    if (avaliacoesResp.error) throw avaliacoesResp.error
    if (planoResp.error) throw planoResp.error
    if (usuariosResp.error) throw usuariosResp.error
    if (lojasResp.error) throw lojasResp.error

    const metasBySession = new Map<string, PDIMeta360[]>()
    ;((metasResp.data || []) as PDIMetaRow[]).forEach(meta => {
        const list = metasBySession.get(meta.sessao_id) || []
        list.push(meta)
        metasBySession.set(meta.sessao_id, list)
    })

    const avaliacoesBySession = new Map<string, PDIAvaliacao360[]>()
    ;((avaliacoesResp.data || []) as unknown as PDIAvaliacaoRow[]).forEach(av => {
        const list = avaliacoesBySession.get(av.sessao_id) || []
        list.push({
            id: av.id,
            sessao_id: av.sessao_id,
            competencia_id: av.competencia_id,
            competencia: av.competencia?.nome || 'Competencia',
            tipo: av.competencia?.tipo ?? undefined,
            nota: av.nota_atribuida,
            alvo: av.alvo,
            gap: av.alvo - av.nota_atribuida,
            origem_nota: av.origem_nota || PDI_ORIGEM_NOTA.GESTOR,
        })
        avaliacoesBySession.set(av.sessao_id, list)
    })

    const planoBySession = new Map<string, PDIPlanoAcao360[]>()
    ;((planoResp.data || []) as unknown as PDIPlanoAcaoRow[]).forEach(acao => {
        const list = planoBySession.get(acao.sessao_id) || []
        list.push({
            id: acao.id,
            sessao_id: acao.sessao_id,
            competencia_id: acao.competencia_id,
            competencia: acao.competencia?.nome || 'Competencia',
            descricao_acao: acao.descricao_acao,
            data_conclusao: acao.data_conclusao,
            impacto: acao.impacto,
            custo: acao.custo,
            status: acao.status ?? undefined,
            justificativa: acao.justificativa ?? null,
            central_enviada_at: acao.central_enviada_at ?? null,
        })
        planoBySession.set(acao.sessao_id, list)
    })

    const userNameById = new Map(((usuariosResp.data || []) as PDIUserIdentityRow[]).map(u => [u.id, u.name]))
    const userAvatarById = new Map(((usuariosResp.data || []) as PDIUserIdentityRow[]).map(u => [u.id, u.avatar_url || null]))
    const storeNameById = new Map(((lojasResp.data || []) as PDIStoreIdentityRow[]).map(l => [l.id, l.name]))

    return sessionRows.map(sessao => {
        const metas = metasBySession.get(sessao.id) || []
        const avaliacoes = avaliacoesBySession.get(sessao.id) || []
        const plano = planoBySession.get(sessao.id) || []
        const actions = plano.map(a => a.descricao_acao)

        return {
            id: sessao.id,
            colaborador_id: sessao.colaborador_id,
            gerente_id: sessao.gerente_id,
            loja_id: sessao.loja_id,
            cargo_id: sessao.cargo_id,
            status: sessao.status,
            created_at: sessao.created_at,
            updated_at: sessao.updated_at,
            data_realizacao: sessao.data_realizacao,
            proxima_revisao_data: sessao.proxima_revisao_data,
            due_date: sessao.proxima_revisao_data,
            seller_name: userNameById.get(sessao.colaborador_id) || 'Nome não informado',
            seller_avatar_url: userAvatarById.get(sessao.colaborador_id) || null,
            manager_name: userNameById.get(sessao.gerente_id) || 'Gestor',
            store_name: sessao.loja_id ? storeNameById.get(sessao.loja_id) : undefined,
            metas,
            avaliacoes,
            plano_acao: plano,
            top_5_gaps: [...avaliacoes].sort((a, b) => b.gap - a.gap).slice(0, 5),
            meta_6m: joinMetas(metas, '6_meses'),
            meta_12m: joinMetas(metas, '12_meses'),
            meta_24m: joinMetas(metas, '24_meses'),
            action_1: actions[0],
            action_2: actions[1],
            action_3: actions[2],
            action_4: actions[3],
            action_5: actions[4],
        } satisfies PDISessionSummary
    })
}

export function usePDI_MX() {
    const queryClient = useQueryClient()
    const [cargos, setCargos] = useState<PDICargo[]>([])
    const [template, setTemplate] = useState<PDIFormTemplate | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchCargos = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase.from('pdi_niveis_cargo').select('id, nome, nivel, nota_min, nota_max').order('nivel', { ascending: true })
        if (error) setError(error.message)
        else setCargos(data || [])
        setLoading(false)
        return data
    }, [])

    const fetchTemplate = useCallback(async (cargoId: string) => {
        setLoading(true)
        const { data, error } = await supabase.rpc('get_pdi_form_template', { p_cargo_id: cargoId })
        if (error) setError(error.message)
        else setTemplate(data as PDIFormTemplate)
        setLoading(false)
        return data as PDIFormTemplate
    }, [])

    const fetchSuggestedActions = useCallback(async (competenciaId: string) => {
        const { data, error } = await supabase.rpc('get_suggested_actions', { p_competencia_id: competenciaId })
        if (error) {
            setError(error.message)
            return []
        }
        return data as PDISuggestedAction[]
    }, [])

const saveSessionBundle = useCallback(async (payload: PDISessionBundlePayload) => {
        const parsed = pdiSessionBundleSchema.safeParse(payload)
        if (!parsed.success) {
            throw new Error(parsed.error.issues[0]?.message || 'Bundle de PDI inválido.')
        }

        setLoading(true)
        setError(null)
        const { data, error } = await supabase.rpc('create_pdi_session_bundle', { p_payload: parsed.data })
        setLoading(false)
        if (error) throw error
        if (data) {
            const { error: recommendationsError } = await supabase.rpc('gerar_recomendacoes_desenvolvimento_pdi', { p_sessao_id: data })
            if (recommendationsError) {
                setError('PDI salvo, mas recomendações automáticas não foram geradas.')
            }
        }
        queryClient.invalidateQueries({ queryKey: ['pdi-sessions'] })
        queryClient.invalidateQueries({ queryKey: ['development-recommendations'] })
return data // Returns session UUID
}, [queryClient])

const linkSellerPDIActionContent = useCallback(async (actionId: string) => {
setLoading(true)
setError(null)
const { data, error } = await supabase.rpc('vendedor_vincular_conteudo_pdi_acao', {
p_acao_id: actionId,
})
setLoading(false)
if (error) {
setError(error.message)
return { id: null, error: error.message }
}
queryClient.invalidateQueries({ queryKey: ['development-recommendations'] })
return { id: data as string, error: null }
}, [queryClient])

const sendSellerPDIActionToCentral = useCallback(async (actionId: string) => {
setLoading(true)
setError(null)
const { data, error } = await supabase.rpc('vendedor_enviar_pdi_acao_central', {
p_acao_id: actionId,
})
setLoading(false)
if (error) {
setError(error.message)
return { id: null, error: error.message }
}
queryClient.invalidateQueries({ queryKey: ['pdi-sessions'] })
queryClient.invalidateQueries({ queryKey: ['execution-actions'] })
return { id: data as string, error: null }
}, [queryClient])

    /**
     * PDI acordado na visita 5 da consultoria.
     *
     * Grava em `pdi_sessoes` — a mesma sessão que o gestor abre, corrige e
     * imprime. Antes isto ia para a tabela `pdis`, que ninguém lê: o PDI
     * combinado com o consultor simplesmente não existia para a loja.
     *
     * Vai sem avaliações de competência de propósito. A visita acorda metas e a
     * primeira ação; medir as 18 competências é trabalho do gestor no wizard, e
     * preencher nota por padrão (o legado gravava 3 em tudo) põe número
     * inventado num documento que é impresso e assinado.
     */
    const createConsultingVisitPDI = useCallback(async (input: PDIVisitaConsultoriaInput) => {
        setLoading(true)
        setError(null)

        const { data, error } = await supabase.rpc('create_pdi_session_bundle', {
            p_payload: {
                colaborador_id: input.colaboradorId,
                loja_id: input.lojaId,
                cargo_id: input.cargoId,
                proxima_revisao_data: input.proximaRevisaoData,
                metas: [
                    { prazo: '6_meses', tipo: 'profissional', descricao: input.meta6m.trim() },
                    ...(input.meta12m?.trim()
                        ? [{ prazo: '12_meses', tipo: 'profissional', descricao: input.meta12m.trim() }]
                        : []),
                ],
                avaliacoes: [],
                plano_acao: [{
                    competencia_id: input.competenciaId,
                    descricao_acao: input.acaoInicial.trim(),
                    data_conclusao: input.prazoAcao,
                    // Classificação inicial; o gestor ajusta no modo de correção.
                    impacto: 'medio',
                    custo: 'baixo',
                }],
            },
        })

        setLoading(false)
        if (error) {
            setError(error.message)
            return { id: null, error: error.message }
        }

        queryClient.invalidateQueries({ queryKey: ['pdi-sessions'] })
        return { id: data as string, error: null }
    }, [queryClient])

    /**
     * Correção do documento de PDI pela liderança (gerente, dono e Admin MX).
     *
     * Vai direto nas tabelas em vez de reusar `vendedor_atualizar_pdi_*`: aquelas
     * RPCs tiveram o EXECUTE revogado de `authenticated` em
     * `20260714182104_lock_seller_pdi_structural_edits.sql`. A mesma migration
     * deixou as policies `pdi_*_write_operacional` abertas para
     * is_admin/is_owner_of/is_manager_of/gerente_id — a autorização é do banco,
     * não desta função.
     */
    const updatePDIDocument = useCallback(async (input: PDIDocumentUpdateInput) => {
        setLoading(true)
        setError(null)

        const writes: Array<PromiseLike<{ error: { message: string } | null }>> = []

        for (const meta of input.metas || []) {
            writes.push(supabase.from('pdi_metas')
                .update({ descricao: meta.descricao, tipo: meta.tipo })
                .eq('id', meta.id))
        }
        for (const avaliacao of input.avaliacoes || []) {
            writes.push(supabase.from('pdi_avaliacoes_competencia')
                .update({ nota_atribuida: avaliacao.nota, alvo: avaliacao.alvo })
                .eq('id', avaliacao.id))
        }
        for (const acao of input.acoes || []) {
            writes.push(supabase.from('pdi_plano_acao')
                .update({
                    descricao_acao: acao.descricaoAcao,
                    data_conclusao: acao.dataConclusao,
                    impacto: acao.impacto,
                    custo: acao.custo,
                })
                .eq('id', acao.id))
        }

        const results = await Promise.all(writes)
        setLoading(false)

        const failure = results.find(result => result.error)
        if (failure?.error) {
            setError(failure.error.message)
            return { count: 0, error: failure.error.message }
        }

        queryClient.invalidateQueries({ queryKey: ['pdi-sessions'] })
        return { count: results.length, error: null }
    }, [queryClient])

const fetchPrintBundle = useCallback(async (sessaoId: string) => {
        setLoading(true)
        const { data, error } = await supabase.rpc('get_pdi_print_bundle', { p_sessao_id: sessaoId })
        setLoading(false)
        if (error) throw error
        return data as PDIPrintBundle | null
    }, [])

    return {
        cargos,
        template,
        loading,
        error,
        fetchCargos,
        fetchTemplate,
        fetchSuggestedActions,
        saveSessionBundle,
        linkSellerPDIActionContent,
        sendSellerPDIActionToCentral,
        createConsultingVisitPDI,
        updatePDIDocument,
        fetchPrintBundle
    }
}

export function usePDISessions(storeIdOverride?: string) {
    const { profile, storeId, role, vinculos_loja } = useAuth()
    const ownerStoreIds = role === 'dono' ? vinculos_loja.map(m => m.store_id) : []

    const { data, isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey: ['pdi-sessions', storeIdOverride || (role === 'dono' ? ownerStoreIds.join(',') : storeId) || 'all', role, profile?.id],
        queryFn: () => fetchPDISessions360({
            profileId: profile?.id,
            role,
            storeId,
            storeIdOverride,
            ownerStoreIds,
        }),
        enabled: !!profile,
    })

    return {
        pdis: data || [],
        sessions: data || [],
        loading,
        error: queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null,
        refetch,
    }
}

export function useMyPDISessions() {
    return usePDISessions()
}
