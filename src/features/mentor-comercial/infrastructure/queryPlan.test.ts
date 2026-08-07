/**
 * Teste Estático de Planos de Consulta e Performance — Mentor Comercial (TASK 44 e 45 / TAREFA B09).
 *
 * Realiza análise estática do código fonte (AST/string matching) sem chamadas de rede.
 * Valida:
 * 1. Padrões de queries N+1 dentro de laços (`for`, `map`, `forEach`).
 * 2. Uso de `select('*')` em tabelas grandes (`oportunidades`, `cadencia_estado_cliente`).
 * 3. Ausência de chamadas diretas ao banco Supabase dentro de `CarteiraAtivaList.tsx`.
 * 4. Presença de cache em memória para catálogos do Mentor.
 * 5. Cobertura de índices da migration `20260807120000_mentor_comercial_motor_v1.sql`.
 */

import { describe, expect, it } from 'bun:test'
import * as fs from 'node:fs'
import * as path from 'node:path'

const REPO_ROOT = process.cwd()

function readProjectFile(relativePath: string): string {
  const fullPath = path.join(REPO_ROOT, relativePath)
  return fs.readFileSync(fullPath, 'utf-8')
}

describe('Auditoria Estática de Performance de Queries (TASK 44 & 45)', () => {
  const repoContent = readProjectFile('src/features/mentor-comercial/infrastructure/supabaseMentorRepository.ts')
  const dailyProcessorContent = readProjectFile('src/features/mentor-comercial/application/dailyProcessor.ts')
  const centralIntegrationContent = readProjectFile('src/features/mentor-comercial/application/centralIntegration.ts')
  const carteiraListContent = readProjectFile('src/features/mentor-comercial/ui/CarteiraAtivaList.tsx')
  const migrationContent = readProjectFile('supabase/migrations/20260807120000_mentor_comercial_motor_v1.sql')

  describe('1. Detecção de Padrões N+1', () => {
    it('deve identificar iteração com chamadas assíncronas em dailyProcessor.ts', () => {
      // Verifica se existe laço for..of que chama loadFacts para cada oportunidade
      const hasForLoopWithLoadFacts =
        /for\s*\(\s*const\s+\w+\s+of\s+opportunitiesRefs\s*\)\s*\{[\s\S]*?loadFacts/m.test(
          dailyProcessorContent,
        )

      expect(hasForLoopWithLoadFacts).toBe(true)
    })

    it('não deve conter chamadas ao Supabase dentro de map/forEach em centralIntegration.ts', () => {
      const hasQueryInLoop = /\.(map|forEach)\s*\(\s*async[\s\S]*?\.(from|select|insert|update|upsert)/m.test(
        centralIntegrationContent,
      )

      expect(hasQueryInLoop).toBe(false)
    })
  })

  describe('2. Auditoria de Projeções (select)', () => {
    it('deve identificar o uso de select("*") em oportunidades em loadFacts', () => {
      const hasSelectStarOportunidades = /\.from\(['"]oportunidades['"]\)\s*\.select\(['"]\*['"]\)/.test(
        repoContent,
      )

      expect(hasSelectStarOportunidades).toBe(true)
    })

    it('deve identificar o uso de select("*") em cadencia_estado_cliente', () => {
      const hasSelectStarCadencia = /\.from\(['"]cadencia_estado_cliente['"]\)\s*\.select\(['"]\*['"]\)/.test(
        repoContent,
      )

      expect(hasSelectStarCadencia).toBe(true)
    })

    it('deve verificar se loadCatalog possui cache em memória para evitar releitura', () => {
      const hasCatalogCacheMap = /catalogCache\s*=\s*new\s+Map/.test(repoContent)
      const checksCacheBeforeFetch = /if\s*\(\s*cached\s*\)\s*return\s+cached/.test(repoContent)

      expect(hasCatalogCacheMap).toBe(true)
      expect(checksCacheBeforeFetch).toBe(true)
    })
  })

  describe('3. Validação da UI (CarteiraAtivaList.tsx)', () => {
    it('garante que CarteiraAtivaList NÃO faz chamadas diretas ao banco (0 queries por card)', () => {
      const hasDirectSupabaseCall = /\.from\(/i.test(carteiraListContent) || /getSupabaseClient/i.test(carteiraListContent)

      expect(hasDirectSupabaseCall).toBe(false)
    })

    it('garante que CarteiraAtivaList utiliza useMemo para ordenação e filtragem em memória', () => {
      const usesUseMemo = /useMemo\s*\(/m.test(carteiraListContent)
      const usesSortCarteiraAtiva = /sortCarteiraAtiva\s*\(/m.test(carteiraListContent)

      expect(usesUseMemo).toBe(true)
      expect(usesSortCarteiraAtiva).toBe(true)
    })
  })

  describe('4. Análise de Cobertura de Índices da Migration 20260807120000', () => {
    it('deve conter índice parcial por prioridade na tabela oportunidades', () => {
      const hasPriorityIndex = /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_oportunidades_mentor_priority[\s\S]*?ON\s+public\.oportunidades\s*\(\s*loja_id,\s*seller_user_id,\s*priority_index\s+DESC\s*\)/i.test(
        migrationContent,
      )

      expect(hasPriorityIndex).toBe(true)
    })

    it('deve conter índice parcial para próxima ação na tabela oportunidades', () => {
      const hasNextActionIndex = /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_oportunidades_mentor_next_action[\s\S]*?ON\s+public\.oportunidades\s*\(\s*loja_id,\s*seller_user_id,\s*next_action_at\s*\)/i.test(
        migrationContent,
      )

      expect(hasNextActionIndex).toBe(true)
    })

    it('deve conter índice na FK oportunidade_id em cadencia_estado_cliente', () => {
      const hasCadenciaIndex = /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_cadencia_estado_oportunidade[\s\S]*?ON\s+public\.cadencia_estado_cliente\s*\(\s*oportunidade_id\s*\)/i.test(
        migrationContent,
      )

      expect(hasCadenciaIndex).toBe(true)
    })

    it('deve identificar índices parciais que requerem atenção em RLS', () => {
      // Garante que a migration define a policy RLS store_commercial_settings_select com subconsulta em oportunidades
      const hasRlsSubquery = /CREATE\s+POLICY\s+store_commercial_settings_select[\s\S]*?EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+public\.oportunidades/i.test(
        migrationContent,
      )

      expect(hasRlsSubquery).toBe(true)
    })
  })
})
