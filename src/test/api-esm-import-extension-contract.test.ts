import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

/**
 * Guard de CLASSE (não de instância) para o P0 do `/api/health`.
 *
 * O bug de produção não foi "alguém esqueceu uma extensão": foi um import
 * relativo sem extensão dentro de `api/`, que o Bun resolve no teste local e o
 * Node ESM da Vercel não resolve em runtime — a Function morria no carregamento
 * do módulo com ERR_MODULE_NOT_FOUND e o deployment continuava READY.
 *
 * `src/test/api-health-node-esm-contract.test.ts` prova os DOIS endpoints que
 * existem hoje transpilando e carregando de verdade. Este contrato cobre o
 * resto do diretório: qualquer handler novo já nasce obrigado à extensão
 * explícita, sem depender de alguém lembrar de escrever o teste de carga.
 */
const API_DIR = path.resolve(import.meta.dir, '../../api')
const RELATIVE_IMPORT = /(?:from|import)\s+['"](\.\.?\/[^'"]+)['"]/g

function apiSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) return apiSourceFiles(full)
    return /\.(ts|js|mjs)$/.test(entry) ? [full] : []
  })
}

describe('imports relativos dos handlers serverless', () => {
  test('todo import relativo em api/ traz extensão explícita', () => {
    const offenders: string[] = []

    for (const file of apiSourceFiles(API_DIR)) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(RELATIVE_IMPORT)) {
        const specifier = match[1]
        // Extensão explícita resolvível pelo Node ESM. `.ts` NÃO conta: o
        // artefato publicado é JavaScript.
        if (/\.(js|mjs|cjs|json)$/.test(specifier)) continue
        offenders.push(`${path.relative(API_DIR, file)} -> ${specifier}`)
      }
    }

    expect(offenders).toEqual([])
  })
})
