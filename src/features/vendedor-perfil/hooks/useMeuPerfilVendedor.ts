import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useOfficialSellerPerformance } from '@/hooks/useOfficialSellerPerformance'
import {
    carreiraInteresseFromLabel,
    carreiraInteresseToLabel,
    montarOpcoesJornada,
    montarPlanosDisponiveis,
    selecionarPlano,
    type CarreiraInteresseLabel,
    type JornadaOption,
    type PlanoDisponivel,
} from '../lib/perfil-mapper'

/**
 * Dados reais do Meu Perfil do vendedor. Substitui o protótipo Base44
 * (base44.entities.UserProfile/PDI), que fabricava monthly_goal=10 e
 * avg_sales_year=0 — agora meta e média vêm da RPC oficial de performance.
 */

export interface PerfilVendedor {
    full_name: string
    phone: string
    avatar_url: string
    dealership: string
    dealership_name: string
    role: string
    remuneracao_plano_id: string
    available_plans: PlanoDisponivel[]
    experience_years: number
    work_schedule_options: JornadaOption[]
    work_start: string
    work_end: string
    commission_per_unit: number
    salary_goal: number
    job_interest: CarreiraInteresseLabel
    entry_date: string
    academic_education: string
    previous_experience: string
    courses_certifications: string
    career_plan: string
    pdi_history_count: number
}

const PERFIL_VAZIO: PerfilVendedor = {
    full_name: '',
    phone: '',
    avatar_url: '',
    dealership: '',
    dealership_name: '',
    role: 'Vendedor',
    remuneracao_plano_id: '',
    available_plans: [],
    experience_years: 0,
    work_schedule_options: [],
    work_start: '',
    work_end: '',
    commission_per_unit: 0,
    salary_goal: 0,
    job_interest: 'Não',
    entry_date: '',
    academic_education: '',
    previous_experience: '',
    courses_certifications: '',
    career_plan: '',
    pdi_history_count: 0,
}

function hojeSaoPaulo(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export function useMeuPerfilVendedor() {
    const { supabaseUser, storeId: authStoreId } = useAuth()
    const [perfil, setPerfil] = useState<PerfilVendedor>(PERFIL_VAZIO)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const today = hojeSaoPaulo()
    const yearStart = `${today.slice(0, 4)}-01-01`
    const { performance: officialPerformance } = useOfficialSellerPerformance(yearStart, today, supabaseUser?.id, authStoreId)

    const carregar = useCallback(async () => {
        if (!supabaseUser?.id) { setLoading(false); return }
        setLoading(true)
        try {
            const userId = supabaseUser.id
            const [{ data: usuario }, { data: vendedorPerfil }, { data: vinculos }, { count: pdiCount }] = await Promise.all([
                supabase.from('usuarios').select('name,phone,avatar_url').eq('id', userId).maybeSingle(),
                supabase.from('vendedor_perfil').select('*').eq('seller_user_id', userId).maybeSingle(),
                supabase.from('vinculos_loja').select('store_id').eq('user_id', userId).eq('is_active', true).limit(1),
                // `pdi_sessoes` é onde o PDI conduzido pelo gestor vive; a tabela
                // `pdis` (legado) está vazia e deixava este contador sempre em zero.
                supabase.from('pdi_sessoes').select('id', { count: 'exact', head: true }).eq('colaborador_id', userId),
            ])

            const storeId = vendedorPerfil?.loja_id || vinculos?.[0]?.store_id || ''
            const workStart = vendedorPerfil?.hora_entrada ? vendedorPerfil.hora_entrada.slice(0, 5) : ''
            const workEnd = vendedorPerfil?.hora_saida ? vendedorPerfil.hora_saida.slice(0, 5) : ''

            const [{ data: loja }, { data: planos }, { data: jornadas }] = await Promise.all([
                storeId
                    ? supabase.from('lojas').select('name').eq('id', storeId).maybeSingle()
                    : Promise.resolve({ data: null }),
                storeId
                    ? supabase
                        .from('remuneracao_planos')
                        .select('id,cargo,salario_fixo,salario_variavel,beneficios')
                        .eq('loja_id', storeId)
                        .order('cargo')
                        .order('vigencia_inicio', { ascending: false })
                    : Promise.resolve({ data: [] }),
                storeId
                    ? supabase
                        .from('vendedor_perfil')
                        .select('hora_entrada,hora_saida')
                        .eq('loja_id', storeId)
                        .not('hora_entrada', 'is', null)
                        .not('hora_saida', 'is', null)
                    : Promise.resolve({ data: [] }),
            ])

            const availablePlans = montarPlanosDisponiveis(planos || [])
            const selectedPlan = selecionarPlano(availablePlans, vendedorPerfil?.remuneracao_plano_id ?? null, vendedorPerfil?.cargo_atual ?? null)

            setPerfil({
                full_name: usuario?.name || '',
                phone: usuario?.phone || '',
                avatar_url: usuario?.avatar_url || '',
                dealership: storeId,
                dealership_name: loja?.name || '',
                role: selectedPlan?.cargo || vendedorPerfil?.cargo_atual || 'Vendedor',
                remuneracao_plano_id: vendedorPerfil?.remuneracao_plano_id || selectedPlan?.id || '',
                available_plans: availablePlans,
                experience_years: vendedorPerfil?.tempo_mercado_anos || 0,
                work_schedule_options: montarOpcoesJornada(jornadas || [], workStart, workEnd),
                work_start: workStart,
                work_end: workEnd,
                commission_per_unit: selectedPlan?.commission_per_unit ?? 0,
                salary_goal: selectedPlan?.salary_goal ?? vendedorPerfil?.pretensao_min ?? 0,
                job_interest: carreiraInteresseToLabel(vendedorPerfil?.carreira_interesse),
                entry_date: vendedorPerfil?.data_entrada || '',
                academic_education: vendedorPerfil?.formacao_academica || '',
                previous_experience: vendedorPerfil?.experiencias_anteriores || '',
                courses_certifications: vendedorPerfil?.cursos_certificacoes || '',
                career_plan: vendedorPerfil?.plano_carreira || '',
                pdi_history_count: pdiCount || 0,
            })
        } finally {
            setLoading(false)
        }
    }, [supabaseUser?.id])

    useEffect(() => { carregar() }, [carregar])

    const salvar = useCallback(async (dados: PerfilVendedor): Promise<{ error: string | null }> => {
        if (!supabaseUser?.id) return { error: 'Sessão inválida.' }
        setSaving(true)
        try {
            const userId = supabaseUser.id
            const { data: vinculos } = await supabase
                .from('vinculos_loja')
                .select('store_id')
                .eq('user_id', userId)
                .eq('is_active', true)
                .limit(1)
            const storeId = dados.dealership || vinculos?.[0]?.store_id || null

            const { error: usuarioError } = await supabase
                .from('usuarios')
                .update({ name: dados.full_name, phone: dados.phone, avatar_url: dados.avatar_url || null })
                .eq('id', userId)
            if (usuarioError) throw usuarioError

            // Remuneração (cargo_atual, remuneracao_plano_id, pretensao_min) é controlada
            // exclusivamente pelo dono via CadastroCarreira/EquipeUsuariosTab — o vendedor
            // não altera esses campos por aqui. Este upsert grava apenas dados pessoais/jornada/carreira.
            const { error } = await supabase
                .from('vendedor_perfil')
                .upsert({
                    seller_user_id: userId,
                    loja_id: storeId,
                    hora_entrada: dados.work_start ? `${dados.work_start}:00` : null,
                    hora_saida: dados.work_end ? `${dados.work_end}:00` : null,
                    tempo_mercado_anos: dados.experience_years,
                    carreira_interesse: carreiraInteresseFromLabel(dados.job_interest),
                    formacao_academica: dados.academic_education?.trim() || null,
                    experiencias_anteriores: dados.previous_experience?.trim() || null,
                    cursos_certificacoes: dados.courses_certifications?.trim() || null,
                    plano_carreira: dados.career_plan?.trim() || null,
                }, { onConflict: 'seller_user_id' })
            if (error) throw error
            return { error: null }
        } catch (error) {
            return { error: error instanceof Error ? error.message : 'Falha ao salvar perfil.' }
        } finally {
            setSaving(false)
        }
    }, [supabaseUser?.id])

    return { perfil, setPerfil, loading, saving, salvar, officialPerformance, refetch: carregar }
}
