import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Guarda contra rótulo de enum inexistente em SQL.
//
// Três defeitos do mesmo tipo já chegaram a produção: `scope_type = 'loja'` num
// enum cujos rótulos são store/department/individual/process. As funções
// `gerar_alertas_loja` e `mx_score_recalcular_loja` levantaram
// `invalid input value for enum` em toda chamada por quase três meses sem que
// nada acusasse — o erro só aparece quando a função é executada.
//
// A verificação olha apenas a definição VIGENTE de cada função: migrations
// antigas guardam o texto errado por definição, e reescrevê-las seria falsificar
// o histórico.

const MIGRATIONS_DIR = join(import.meta.dir, '../../supabase/migrations')

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter(name => name.endsWith('.sql'))
    .sort()
}

/** Rótulos de cada enum declarado em qualquer migration. */
function enumLabels(): Record<string, string[]> {
  const labels: Record<string, string[]> = {}
  for (const file of migrationFiles()) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
    for (const match of sql.matchAll(/CREATE TYPE public\.(\w+) AS ENUM \(([^)]*)\)/g)) {
      labels[match[1]] = [...match[2].matchAll(/'([^']+)'/g)].map(item => item[1])
    }
  }
  return labels
}

/** Última definição de cada função: nome → corpo vigente. */
function currentFunctionBodies(): Map<string, { file: string; body: string }> {
  const current = new Map<string, { file: string; body: string }>()
  for (const file of migrationFiles()) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
    for (const match of sql.matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)\s*\(/g)) {
      const name = match[1]
      const start = match.index ?? 0
      const end = sql.indexOf('$$;', start)
      current.set(name, { file, body: sql.slice(start, end === -1 ? sql.length : end) })
    }
  }
  return current
}

/**
 * Colunas cujo tipo é um enum conhecido. Comparar ou gravar um literal fora dos
 * rótulos declarados falha só em tempo de execução.
 */
const ENUM_COLUMNS: Array<{ column: string; enumType: string }> = [
  { column: 'scope_type', enumType: 'score_scope_type' },
]

describe('rótulos de enum no SQL vigente', () => {
  const labels = enumLabels()

  test('os enums verificados existem nas migrations', () => {
    for (const { enumType } of ENUM_COLUMNS) {
      expect(labels[enumType], `enum ${enumType} não encontrado`).toBeDefined()
      expect(labels[enumType].length).toBeGreaterThan(0)
    }
  })

  test('nenhuma função vigente compara um enum com rótulo inexistente', () => {
    const offenders: string[] = []

    for (const [name, { file, body }] of currentFunctionBodies()) {
      for (const { column, enumType } of ENUM_COLUMNS) {
        const valid = new Set(labels[enumType] ?? [])
        const pattern = new RegExp(`\\b${column}\\s*=\\s*'([a-z_]+)'`, 'g')
        for (const match of body.matchAll(pattern)) {
          if (!valid.has(match[1])) {
            offenders.push(`${name} (${file}): ${column} = '${match[1]}'`)
          }
        }
      }
    }

    expect(offenders).toEqual([])
  })

  test('reconhece um rótulo inválido quando ele existe', () => {
    // Sem este caso, o teste acima passaria mesmo que a extração estivesse
    // quebrada e nunca encontrasse comparação nenhuma.
    const valid = new Set(labels.score_scope_type)
    expect(valid.has('store')).toBe(true)
    expect(valid.has('loja')).toBe(false)
  })

  test('a extração encontra comparações de verdade no repositório', () => {
    let comparisons = 0
    for (const [, { body }] of currentFunctionBodies()) {
      comparisons += [...body.matchAll(/\bscope_type\s*=\s*'[a-z_]+'/g)].length
    }
    expect(comparisons).toBeGreaterThan(0)
  })
})
