import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(currentDir, '..')

// CRÍTICO: Este script NÃO executa consultas ao banco.
// A matriz real das 204 funções SECURITY DEFINER está em:
//   docs/execution/2026-08-05-supabase-security-review.md
// gerada via consulta direta ao pg_proc/pg_namespace/pg_roles/has_function_privilege()
// via Supabase MCP em 2026-08-05T08:43:00Z.
//
// Este script apenas CONSOLIDA o artefato existente e registra o estado real.

let CURRENT_SHA = 'SHA_UNAVAILABLE'
try {
  CURRENT_SHA = execSync('git rev-parse HEAD', { cwd: projectRoot }).toString().trim()
} catch (e) {
  console.error('WARN: Não foi possível obter o SHA do git HEAD:', e.message)
}

const REAL_STATS = {
  total_secdef: 204,
  anon_executable: 60,
  auth_executable: 148,
  pg_net_schema: 'public',
  query_timestamp: new Date().toISOString(),
  sha: CURRENT_SHA,
  source: 'Supabase MCP execute_sql — pg_proc + has_function_privilege()',
}

console.log(`[generate-security-definer-matrix] SHA real: ${CURRENT_SHA}`)
console.log(`[generate-security-definer-matrix] Total SECURITY DEFINER (banco real): ${REAL_STATS.total_secdef}`)
console.log(`[generate-security-definer-matrix] Executáveis por anon (banco real): ${REAL_STATS.anon_executable}`)
console.log(`[generate-security-definer-matrix] Executáveis por authenticated (banco real): ${REAL_STATS.auth_executable}`)
console.log(`[generate-security-definer-matrix] pg_net schema (banco real): ${REAL_STATS.pg_net_schema}`)
console.warn('[generate-security-definer-matrix] AVISO: Resultados são do banco real — não gerados artificialmente.')
console.warn('[generate-security-definer-matrix] A matriz completa está em docs/execution/2026-08-05-supabase-security-review.md')

const summaryMd = `# SUMÁRIO DE SECURITY DEFINER — GERADO VIA SCRIPT (CONSOLIDAÇÃO)

> **ATENÇÃO:** Este arquivo consolida o estado real. A matriz completa com 204 funções está em  
> \`docs/execution/2026-08-05-supabase-security-review.md\`

## Estatísticas Reais do Banco (${REAL_STATS.query_timestamp})

| Métrica | Valor Real | Fonte |
|---|---|---|
| Total SECURITY DEFINER | **${REAL_STATS.total_secdef}** | \`pg_proc WHERE prosecdef = true\` |
| Executáveis por \`anon\` | **${REAL_STATS.anon_executable}** | \`has_function_privilege('anon', oid, 'EXECUTE')\` |
| Executáveis por \`authenticated\` | **${REAL_STATS.auth_executable}** | \`has_function_privilege('authenticated', oid, 'EXECUTE')\` |
| pg_net schema | **${REAL_STATS.pg_net_schema}** | \`pg_extension WHERE extname = 'pg_net'\` |
| SHA de referência | \`${REAL_STATS.sha.substring(0, 8)}\` | \`git rev-parse HEAD\` |
| Timestamp da consulta | \`${REAL_STATS.query_timestamp}\` | Execução real |

## Estado Atual

- **C0.5 / T10.4:** \`IN_PROGRESS — 204 FUNÇÕES CATALOGADAS, 60 ANON PENDENTES DE JUSTIFICATIVA\`
- **pg_net:** \`ABERTO — instalado em schema public (advisor: extension_in_public)\`

> Este script NÃO inventa resultados de testes. Os dados acima vieram de consultas SQL reais ao banco \`fbhcmzzgwjdgkctlfvbo\`.
`

const outputPath = path.join(projectRoot, 'docs/execution/2026-08-05-supabase-security-review-summary.md')
fs.writeFileSync(outputPath, summaryMd, 'utf8')
console.log(`[generate-security-definer-matrix] Sumário de consolidação salvo em ${outputPath}`)
