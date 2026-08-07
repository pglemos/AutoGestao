#!/usr/bin/env node
/**
 * Gera o catálogo ENXUTO de status para o frontend.
 *
 * A Carteira precisa consultar objetivo, próximo passo e orientação de forma
 * síncrona, no render. Buscar isso do banco a cada card seria uma query por card —
 * proibido pelo §59. Então os campos que a tela usa são embarcados no bundle.
 *
 * Só entram os campos realmente consumidos. Os textos longos da planilha
 * (definição, resultados principais, observações) ficam de fora: eles vivem no
 * banco, para quem precisar do catálogo completo.
 *
 * Uso:
 *   node scripts/mentor-rules-bundle.mjs           # gera
 *   node scripts/mentor-rules-bundle.mjs --check   # falha se estiver desatualizado
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RULES_DIR = path.join(projectRoot, 'rules/mentor-comercial/v1')
const OUT = path.join(
  projectRoot,
  'src/features/mentor-comercial/catalog/statusCatalog.generated.ts',
)
const CHECK_ONLY = process.argv.includes('--check')

/** Campos que a tela realmente consome. Acrescentar aqui é uma decisão consciente. */
const CAMPOS = [
  'statusId',
  'channel',
  'family',
  'label',
  'responsible',
  'temperature',
  'objective',
  'nextStep',
  'cadenceId',
  'scriptId',
  'potential',
  'centralRule',
  'mentorGuidance',
]

function build() {
  const statuses = JSON.parse(readFileSync(path.join(RULES_DIR, 'statuses.json'), 'utf8')).records
  const metadata = JSON.parse(readFileSync(path.join(RULES_DIR, 'metadata.json'), 'utf8'))

  const slim = statuses.map((s) => {
    const out = {}
    for (const c of CAMPOS) out[c] = s[c] ?? null
    return out
  })

  const body = slim
    .map((s) => `  ${JSON.stringify(s)},`)
    .join('\n')

  return `/* eslint-disable */
/**
 * GERADO AUTOMATICAMENTE — NÃO EDITE À MÃO.
 *
 * Fonte:  rules/mentor-comercial/v1/statuses.json
 * SHA256: ${metadata.sourceSha256}
 * Gerar:  node scripts/mentor-rules-bundle.mjs
 *
 * Contém apenas os campos que a Carteira consulta no render. O catálogo completo,
 * com definições e observações, vive em public.mentor_status_definitions.
 */

export type StatusCatalogEntry = {
${CAMPOS.map((c) => `  ${c}: string | null`).join('\n')}
}

export const RULE_VERSION = ${JSON.stringify(metadata.version)}
export const SOURCE_SHA256 = ${JSON.stringify(metadata.sourceSha256)}

export const STATUS_CATALOG: readonly StatusCatalogEntry[] = [
${body}
] as const

const PORT_INDEX = new Map(STATUS_CATALOG.map((s) => [s.statusId, s]))

export function statusPorId(statusId: string | null | undefined): StatusCatalogEntry | null {
  if (!statusId) return null
  return PORT_INDEX.get(statusId) ?? null
}
`
}

function main() {
  const conteudo = build()

  if (CHECK_ONLY) {
    if (!existsSync(OUT)) {
      console.error('DRIFT: statusCatalog.generated.ts não existe.')
      process.exit(1)
    }
    if (readFileSync(OUT, 'utf8') !== conteudo) {
      console.error('DRIFT: statusCatalog.generated.ts está desatualizado.')
      console.error('Rode: node scripts/mentor-rules-bundle.mjs')
      process.exit(1)
    }
    console.log('OK: catálogo embarcado em sincronia com a matriz.')
    return
  }

  writeFileSync(OUT, conteudo, 'utf8')
  const kb = (Buffer.byteLength(conteudo) / 1024).toFixed(1)
  console.log(`Catálogo embarcado gerado: ${kb} KB (${CAMPOS.length} campos por status).`)
}

main()
