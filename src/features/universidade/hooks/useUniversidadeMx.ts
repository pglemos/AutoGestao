import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { listarTreinamentosVendedor, type VendedorTreinamento } from '../services/universidade-service'

/**
 * Hook do Sprint 2 — S2-T4 (Universidade MX).
 *
 * Lê trilhas + aulas (paginadas por trilha) + certificações emitidas para o
 * usuário corrente. Suporta filtro por público-alvo.
 */

export type UniversidadePublico =
  | 'vendedor'
  | 'gerente'
  | 'dono'
  | 'marketing'
  | 'rh'
  | 'operacoes'
  | 'geral'

export type UniversidadeTrilha = {
  id: string
  codigo: string
  titulo: string
  publico_alvo: UniversidadePublico
  descricao: string | null
  duracao_horas: number | null
}

export type UniversidadeAulaTipo =
  | 'biblioteca'
  | 'aula_gravada'
  | 'aula_ao_vivo'
  | 'quiz'
  | 'desafio'

export type UniversidadeAula = {
  id: string
  trilha_id: string | null
  ordem: number
  tipo: UniversidadeAulaTipo
  titulo: string
  conteudo_md: string | null
  url_video: string | null
  data_ao_vivo: string | null
}

export type UniversidadeCertificacao = {
  id: string
  trilha_id: string
  user_id: string
  emitida_em: string
  pontuacao: number | null
  certificado_url: string | null
}

export type UseUniversidadeMxResult = {
  trilhas: UniversidadeTrilha[]
  aulas: Record<string, UniversidadeAula[]>
  certificacoes: UniversidadeCertificacao[]
  /** Conteúdo publicado em `treinamentos`, com o progresso do usuário. */
  biblioteca: VendedorTreinamento[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  filtros: UniversidadePublico[]
  toggleFiltro: (publico: UniversidadePublico) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
}

const ALL_PUBLICOS: UniversidadePublico[] = [
  'vendedor',
  'gerente',
  'dono',
  'marketing',
  'rh',
  'operacoes',
  'geral',
]

export function useUniversidadeMx(userId?: string | null): UseUniversidadeMxResult {
  const [trilhas, setTrilhas] = useState<UniversidadeTrilha[]>([])
  const [aulas, setAulas] = useState<Record<string, UniversidadeAula[]>>({})
  const [certificacoes, setCertificacoes] = useState<UniversidadeCertificacao[]>([])
  const [biblioteca, setBiblioteca] = useState<VendedorTreinamento[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filtros, setFiltros] = useState<UniversidadePublico[]>(ALL_PUBLICOS)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const trilhasRes = await supabase
        .from('universidade_trilhas')
        .select('id, codigo, titulo, publico_alvo, descricao, duracao_horas')
        .eq('ativo', true)
        .order('codigo')
      if (trilhasRes.error) throw trilhasRes.error
      const trilhasData = (trilhasRes.data ?? []) as UniversidadeTrilha[]
      setTrilhas(trilhasData)

      if (trilhasData.length > 0) {
        const aulasRes = await supabase
          .from('universidade_aulas')
          .select('id, trilha_id, ordem, tipo, titulo, conteudo_md, url_video, data_ao_vivo')
          .in(
            'trilha_id',
            trilhasData.map((t) => t.id),
          )
          .eq('ativo', true)
          .order('trilha_id')
          .order('ordem')
        if (aulasRes.error) throw aulasRes.error
        const grouped: Record<string, UniversidadeAula[]> = {}
        for (const aula of (aulasRes.data ?? []) as UniversidadeAula[]) {
          const tid = aula.trilha_id ?? '_orphan_'
          if (!grouped[tid]) grouped[tid] = []
          grouped[tid].push(aula)
        }
        setAulas(grouped)
      } else {
        setAulas({})
      }

      if (userId) {
        const certRes = await supabase
          .from('universidade_certificacoes')
          .select('id, trilha_id, user_id, emitida_em, pontuacao, certificado_url')
          .eq('user_id', userId)
          .order('emitida_em', { ascending: false })
        if (certRes.error) throw certRes.error
        setCertificacoes((certRes.data ?? []) as UniversidadeCertificacao[])

        // A biblioteca vive em `treinamentos`, não nas tabelas `universidade_*`.
        // Sem ela a tela prometia "Biblioteca" no subtítulo e mostrava apenas
        // "Nenhuma trilha disponível", enquanto as 14 aulas do vendedor
        // estavam publicadas e legíveis o tempo todo.
        setBiblioteca(await listarTreinamentosVendedor(supabase, userId))
      } else {
        setCertificacoes([])
        setBiblioteca([])
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar Universidade MX.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const toggleFiltro = useCallback((publico: UniversidadePublico) => {
    setFiltros((current) =>
      current.includes(publico)
        ? current.filter((value) => value !== publico)
        : [...current, publico],
    )
  }, [])

  const trilhasFiltradas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return trilhas
      .filter((trilha) => filtros.includes(trilha.publico_alvo))
      .filter((trilha) => {
        if (!q) return true
        const matchTrilha =
          trilha.titulo.toLowerCase().includes(q) ||
          (trilha.descricao ?? '').toLowerCase().includes(q)
        if (matchTrilha) return true
        const aulasDoTrilha = aulas[trilha.id] ?? []
        return aulasDoTrilha.some(
          (aula) =>
            aula.titulo.toLowerCase().includes(q) ||
            (aula.tipo ?? '').toLowerCase().includes(q),
        )
      })
  }, [trilhas, filtros, aulas, searchQuery])

  const bibliotecaFiltrada = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return biblioteca.filter((item) => {
      if (!q) return true
      return (
        item.title.toLowerCase().includes(q)
        || (item.description ?? '').toLowerCase().includes(q)
        || item.category.toLowerCase().includes(q)
      )
    })
  }, [biblioteca, searchQuery])

  return {
    trilhas: trilhasFiltradas,
    aulas,
    certificacoes,
    biblioteca: bibliotecaFiltrada,
    loading,
    error,
    refresh: fetchAll,
    filtros,
    toggleFiltro,
    searchQuery,
    setSearchQuery,
  }
}
