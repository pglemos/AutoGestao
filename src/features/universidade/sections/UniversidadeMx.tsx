import { Award, BookOpen, GraduationCap, Loader2, Radio, RefreshCw, Search, Sparkles, Trophy } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { PageCanvas } from '@/design-system/page'
import { cn } from '@/lib/utils'
import { useVendedorPerfil } from '@/features/crm/hooks/useVendedorPerfil'
import {
  useUniversidadeMx,
  type UniversidadeAulaTipo,
  type UniversidadePublico,
} from '../hooks/useUniversidadeMx'
import { derivarNivelTrilha, trilhaRecomendadaId, NIVEL_TRILHA_LABEL } from '../lib/trilha-level'
import { AulasAoVivoSection } from './AulasAoVivoSection'

/**
 * Universidade MX — Sprint 2 (S2-T4).
 *
 * Lista trilhas filtradas por público-alvo + aulas (biblioteca/gravada/ao vivo/quiz/desafio)
 * e certificações emitidas para o usuário. UI orientada a conteúdo (cards).
 */

const PUBLICO_LABEL: Record<UniversidadePublico, string> = {
  vendedor: 'Vendedor',
  gerente: 'Gerente',
  dono: 'Dono',
  marketing: 'Marketing',
  rh: 'RH',
  operacoes: 'Operações',
  geral: 'Geral',
}

const TIPO_LABEL: Record<UniversidadeAulaTipo, string> = {
  biblioteca: 'Biblioteca',
  aula_gravada: 'Aula gravada',
  aula_ao_vivo: 'Ao vivo',
  quiz: 'Quiz',
  desafio: 'Desafio',
}

const TIPO_TONE: Record<UniversidadeAulaTipo, string> = {
  biblioteca: 'border-border bg-gray-50 text-muted-foreground',
  aula_gravada: 'border-brand-primary/30 bg-mx-indigo-50 text-status-success-text',
  aula_ao_vivo: 'border-status-warning/30 bg-status-warning-surface text-status-warning',
  quiz: 'border-status-success/30 bg-status-success-surface text-status-success',
  desafio: 'border-status-error/30 bg-status-error-surface text-status-error',
}

type Props = {
  userId?: string | null
}

export function UniversidadeMx({ userId }: Props) {
  const {
    trilhas,
    aulas,
    certificacoes,
    loading,
    error,
    refresh,
    filtros,
    toggleFiltro,
    searchQuery,
    setSearchQuery,
  } = useUniversidadeMx(userId)

  // Maturity-based trilha recommendation (EV-5.3)
  const { perfil } = useVendedorPerfil()
  const nivelTrilha = derivarNivelTrilha({
    tempo_mercado_anos: perfil.tempo_mercado_anos,
    experiencia_declarada: perfil.experiencia_declarada,
    cargo_atual: perfil.cargo_atual,
  })
  const recomendadaId = trilhaRecomendadaId(trilhas, nivelTrilha)

  return (
    <PageCanvas as="section" width="dashboard" className="flex flex-col gap-mx-lg" aria-label="Universidade MX">
      <header className="flex flex-col gap-mx-xs md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-mx-sm">
          <div className="rounded-2xl bg-brand-primary p-mx-sm text-pure-white shadow-sm">
            <GraduationCap size={22} aria-hidden="true" />
          </div>
          <div>
            <Typography variant="h2" className="font-bold tracking-tight">
              Universidade MX
            </Typography>
            <Typography variant="tiny" tone="muted" className="block font-bold normal-case tracking-normal">
              Biblioteca • Trilhas • Aulas ao vivo • Certificações (`.docx §340`).
            </Typography>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={refresh} disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          <span className="ml-1">Atualizar</span>
        </Button>
      </header>

      {error && (
        <div className="rounded-xl border border-status-error/40 bg-status-error-surface p-mx-sm">
          <Typography variant="tiny" className="font-bold text-status-error">
            {error}
          </Typography>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-mx-xs">
        <Typography variant="tiny" tone="muted" className="font-bold">
          Filtrar por público
        </Typography>
        {(Object.keys(PUBLICO_LABEL) as UniversidadePublico[]).map((publico) => (
          <button
            key={publico}
            type="button"
            onClick={() => toggleFiltro(publico)}
            className={cn(
              'rounded-xl border px-mx-xs py-mx-tiny text-mx-tiny font-bold uppercase tracking-widest transition-colors',
              filtros.includes(publico)
                ? 'border-brand-primary bg-brand-primary text-pure-white'
                : 'border-border bg-white text-muted-foreground',
            )}
            aria-pressed={filtros.includes(publico)}
          >
            {PUBLICO_LABEL[publico]}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por tema, nível ou título…"
          className="w-full rounded-xl border border-border bg-white py-mx-xs pl-8 pr-mx-sm text-mx-tiny font-bold placeholder-text-secondary focus:border-brand-primary focus:outline-none"
          aria-label="Buscar trilhas e aulas"
        />
      </div>

      {certificacoes.length > 0 && (
        <Card className="p-mx-md">
          <header className="mb-mx-sm flex items-center gap-mx-xs">
            <div className="rounded-2xl bg-status-success-surface p-mx-xs text-status-success">
              <Trophy size={18} aria-hidden="true" />
            </div>
            <Typography variant="h3" className="font-bold">
              Minhas certificações ({certificacoes.length})
            </Typography>
          </header>
          <ul className="grid grid-cols-1 gap-mx-sm md:grid-cols-2 xl:grid-cols-3">
            {certificacoes.map((cert) => (
              <li
                key={cert.id}
                className="rounded-2xl border border-status-success/30 bg-status-success-surface/40 p-mx-sm"
              >
                <div className="flex items-center gap-mx-xs">
                  <Award size={16} className="text-status-success" />
                  <Typography variant="caption" className="font-bold">
                    {cert.trilha_id}
                  </Typography>
                </div>
                <Typography variant="tiny" tone="muted" className="block">
                  Emitida em {new Date(cert.emitida_em).toLocaleDateString('pt-BR')}
                </Typography>
                {cert.pontuacao != null && (
                  <Typography variant="tiny" className="block font-bold">
                    Pontuação {cert.pontuacao}
                  </Typography>
                )}
                {cert.certificado_url && (
                  <a
                    href={cert.certificado_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-mx-xs inline-block text-mx-tiny font-bold uppercase tracking-widest text-status-success-text underline"
                  >
                    Baixar certificado
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!trilhas.length ? (
        <Card className="p-mx-md">
          <div className="rounded-xl border border-dashed border-border p-mx-md text-center">
            <Typography variant="tiny" tone="muted" className="font-bold">
              {filtros.length === 0
                ? 'Selecione ao menos um público para listar trilhas.'
                : searchQuery.trim()
                  ? `Nenhum resultado para "${searchQuery}".`
                  : 'Nenhuma trilha disponível para os filtros atuais.'}
            </Typography>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-mx-md xl:grid-cols-2">
          {trilhas.map((trilha) => (
            <Card
              key={trilha.id}
              className={cn(
                'rounded-2xl p-mx-md',
                recomendadaId === trilha.id && 'ring-2 ring-brand-primary ring-offset-2',
              )}
            >
              <header className="mb-mx-sm">
                <div className="flex flex-wrap items-center gap-mx-xs">
                  <Badge variant="outline" className="font-bold">
                    {PUBLICO_LABEL[trilha.publico_alvo]}
                  </Badge>
                  {trilha.duracao_horas != null && (
                    <Badge variant="outline" className="font-bold">
                      {trilha.duracao_horas}h
                    </Badge>
                  )}
                  {recomendadaId === trilha.id && (
                    <Badge className="flex items-center gap-1 border-brand-primary font-bold text-pure-white">
                      <Sparkles size={10} aria-hidden="true" />
                      Recomendada para você · {NIVEL_TRILHA_LABEL[nivelTrilha]}
                    </Badge>
                  )}
                </div>
                <Typography variant="h3" className="mt-mx-xs font-bold">
                  {trilha.titulo}
                </Typography>
                {trilha.descricao && (
                  <Typography variant="tiny" tone="muted" className="block font-bold normal-case tracking-normal">
                    {trilha.descricao}
                  </Typography>
                )}
              </header>
              <ul className="space-y-mx-xs">
                {(aulas[trilha.id] ?? []).map((aula) => (
                  <li
                    key={aula.id}
                    className={cn(
                      'rounded-2xl border p-mx-sm',
                      TIPO_TONE[aula.tipo],
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-mx-xs">
                      <Badge variant="outline" className="font-bold">
                        {aula.ordem.toString().padStart(2, '0')}
                      </Badge>
                      <Badge variant="outline" className="font-bold">
                        {aula.tipo === 'aula_ao_vivo' ? (
                          <Radio size={10} className="mr-1" />
                        ) : (
                          <BookOpen size={10} className="mr-1" />
                        )}
                        {TIPO_LABEL[aula.tipo]}
                      </Badge>
                      {aula.data_ao_vivo && (
                        <Badge variant="outline" className="font-bold">
                          {new Date(aula.data_ao_vivo).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Badge>
                      )}
                    </div>
                    <Typography variant="p" className="mt-mx-xs font-bold">
                      {aula.titulo}
                    </Typography>
                    {aula.url_video && (
                      <a
                        href={aula.url_video}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-mx-xs inline-block text-mx-tiny font-bold uppercase tracking-widest underline"
                      >
                        Abrir vídeo
                      </a>
                    )}
                  </li>
                ))}
                {!(aulas[trilha.id] ?? []).length && (
                  <li className="rounded-xl border border-dashed border-border p-mx-sm text-center">
                    <Typography variant="tiny" tone="muted" className="font-bold">
                      Trilha sem aulas publicadas ainda.
                    </Typography>
                  </li>
                )}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <AulasAoVivoSection />
    </PageCanvas>
  )
}
