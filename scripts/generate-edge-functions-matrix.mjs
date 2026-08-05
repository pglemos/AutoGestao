import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(currentDir, '..')

// CRÍTICO: Este script consolida a lista real de Edge Functions obtida via API do Supabase.
// Dados da API listados em docs/execution/2026-08-05-edge-functions-matrix.md
// NÃO preenche campos de teste sem execução real.
// NÃO inventa idempotência, replay protection, rate limit ou Sentry.

let CURRENT_SHA = 'SHA_UNAVAILABLE'
try {
  CURRENT_SHA = execSync('git rev-parse HEAD', { cwd: projectRoot }).toString().trim()
} catch (e) {
  console.error('WARN: Não foi possível obter o SHA do git HEAD:', e.message)
}

// Dados REAIS da API do Supabase (list_edge_functions — 2026-08-05T08:43:00Z)
// NUNCA alterar verify_jwt com inferência de código-fonte — usar apenas o valor da API
const REAL_FUNCTIONS = [
  { slug: 'autonomous-reports',         id: '25d2adbe-d103-4a02-8712-89104bc6d08f', version: 54, verify_jwt: true,  status: 'ACTIVE' },
  { slug: 'relatorio-matinal',          id: '931cdc30-64f9-4c2a-a5a1-b244b5e10499', version: 68, verify_jwt: true,  status: 'ACTIVE' },
  { slug: 'feedback-semanal',           id: '79332120-595b-47d6-aa03-9f7765b1d437', version: 73, verify_jwt: true,  status: 'ACTIVE' },
  { slug: 'relatorio-mensal',           id: '2e7aa521-21c1-4a85-9827-4a3259bde8ec', version: 62, verify_jwt: true,  status: 'ACTIVE' },
  { slug: 'google-oauth-handler',       id: '2dee47a3-3c75-4480-aac0-5a42d485d943', version: 94, verify_jwt: false, status: 'ACTIVE' },
  { slug: 'google-calendar-events',     id: '94a3ae55-2f34-4795-a70c-c6a0294944cb', version: 56, verify_jwt: true,  status: 'ACTIVE' },
  { slug: 'send-individual-feedback',   id: 'eb2074d6-c05f-4889-95d1-f3d22da6eb6b', version: 56, verify_jwt: true,  status: 'ACTIVE' },
  { slug: 'register-user',              id: 'af832c15-dcfe-45ad-8dbc-f2a449871a80', version: 64, verify_jwt: true,  status: 'ACTIVE' },
  { slug: 'google-calendar-merged',     id: '92ac0d61-b53e-4f86-aa8d-3833c9008b5e', version: 65, verify_jwt: true,  status: 'ACTIVE' },
  { slug: 'google-calendar-sync',       id: '78a3da62-51b4-441c-8154-3067094cb718', version: 89, verify_jwt: false, status: 'ACTIVE' },
  { slug: 'send-visit-report',          id: 'ccc5068f-6c28-46d8-9cd6-9de7b7b380aa', version: 55, verify_jwt: true,  status: 'ACTIVE' },
  { slug: 'google-drive-files',         id: 'abad6459-72c7-4603-bfed-19b3f74ba754', version: 69, verify_jwt: true,  status: 'ACTIVE' },
  { slug: 'store-pre-registration',     id: 'ad3b81f5-fe73-4d07-b867-07e2c3326e22', version: 77, verify_jwt: false, status: 'ACTIVE' },
  { slug: 'approve-store-registration', id: 'e4b9978e-87c2-4a1d-ad57-8e4bb4fd11ba', version: 59, verify_jwt: true,  status: 'ACTIVE' },
  { slug: 'manage-store-team',          id: 'ce5c2446-25e5-4fd8-933b-da8426089eac', version: 41, verify_jwt: true,  status: 'ACTIVE' },
  { slug: 'openrouter-generate',        id: '0c35edc9-5227-41a0-80fb-20efeb3020f3', version: 41, verify_jwt: true,  status: 'ACTIVE' },
  { slug: 'google-meet-ata',            id: '587160db-b7ad-4ddd-a05f-651080a1e7b7', version: 48, verify_jwt: false, status: 'ACTIVE' },
  { slug: 'executive-agenda-google-sync',id: '18283a3c-5e09-42a2-aeab-21b8b503817e',version: 21, verify_jwt: true,  status: 'ACTIVE' },
  { slug: 'send-push-notification',     id: 'feeef07a-e086-4d17-adc8-dc26d377607d', version: 20, verify_jwt: true,  status: 'ACTIVE' },
  { slug: 'request-password-recovery',  id: 'eca2db92-ac10-478b-aad5-a7ca1fd2b9b9', version: 23, verify_jwt: false, status: 'ACTIVE' },
  { slug: 'manage-global-user',         id: '904bcc75-152f-4b6f-8bc7-298bbb818e52', version: 8,  verify_jwt: true,  status: 'ACTIVE' },
  { slug: 'mx-critical-jobs-health',    id: '37e3350b-0ada-420a-844a-9e46a6c13277', version: 9,  verify_jwt: true,  status: 'ACTIVE' },
]

console.log(`[generate-edge-functions-matrix] SHA real: ${CURRENT_SHA}`)
console.log(`[generate-edge-functions-matrix] Total Edge Functions (API real): ${REAL_FUNCTIONS.length}`)
console.warn('[generate-edge-functions-matrix] AVISO: verify_jwt é da API real, NÃO inferido por código-fonte.')
console.warn('[generate-edge-functions-matrix] Testes por endpoint estão PENDING — não preenchidos artificialmente.')

const ts = new Date().toISOString()

let md = `# MATRIZ DE AUDITORIA DAS ${REAL_FUNCTIONS.length} EDGE FUNCTIONS — 2026-08-05

> **Status:** \`IN_PROGRESS — CONFIGURAÇÃO REAL CATALOGADA, TESTES POR ENDPOINT PENDENTES\`
> **Gerado por:** \`generate-edge-functions-matrix.mjs\` — consolida API real
> **SHA:** \`${CURRENT_SHA}\`
> **Timestamp:** \`${ts}\`
> **Fonte:** API Supabase \`list_edge_functions\` — 2026-08-05T08:43:00Z

---

| Slug | ID | Version | verify_jwt (API Real) | Status | Teste OPTIONS | Teste Sem Auth | Teste JWT Inválido | Teste JWT Válido |
|---|---|---|---|---|---|---|---|---|
`

for (const fn of REAL_FUNCTIONS) {
  md += `| \`${fn.slug}\` | \`${fn.id.substring(0, 8)}...\` | ${fn.version} | **${fn.verify_jwt}** | ${fn.status} | PENDING | PENDING | PENDING | PENDING |\n`
}

md += `
---

## Resumo

- **Total:** ${REAL_FUNCTIONS.length} Edge Functions
- **verify_jwt=true:** ${REAL_FUNCTIONS.filter(f => f.verify_jwt).length} funções
- **verify_jwt=false:** ${REAL_FUNCTIONS.filter(f => !f.verify_jwt).length} funções (${REAL_FUNCTIONS.filter(f => !f.verify_jwt).map(f => f.slug).join(', ')})
- **Testes individuais:** TODOS PENDENTES — não executados e não fabricados

> **Campos NÃO preenchidos** (sem implementação verificada):
> - Replay Protection: não confirmada
> - Idempotência: não confirmada a nível de Edge Function
> - Rate Limit: não confirmado em Edge Function (existe em RPC)
> - Sentry: DSN não encontrado no .env de Edge Functions
`

const outputPath = path.join(projectRoot, 'docs/execution/2026-08-05-edge-functions-matrix.md')
fs.writeFileSync(outputPath, md, 'utf8')
console.log(`[generate-edge-functions-matrix] Matriz salva em ${outputPath}`)
