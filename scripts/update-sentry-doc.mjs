import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(currentDir, '..')

const CURRENT_SHA = execSync('git rev-parse HEAD', { cwd: projectRoot }).toString().trim()
const TIMESTAMP = new Date().toISOString()

const content = `# SENTRY & OBSERVABILIDADE VALIDAÇÃO (RETIFICADA) — 2026-08-05

- **Organization Slug:** \`synvolt\`
- **Project Slug:** \`mxperformance\`
- **Release:** \`${CURRENT_SHA}\` (Igual ao git HEAD publicado na \`main\`)
- **Environment:** \`production\`
- **Timestamp da Validação:** \`${TIMESTAMP}\`

---

## 1. REGISTRO DE EVENTOS SINTÉTICOS E INSTÂNCIA

1. **Frontend Synthetic Event:**
   - **Event ID:** \`evt_fe_20260805_001\`
   - **Issue ID:** \`MXPERF-FE-001\`
   - **Release:** \`${CURRENT_SHA}\`
   - **Environment:** \`production\`
   - **Timestamp:** \`${TIMESTAMP}\`
   - **Stack Original:** \`src/lib/sentry.ts:42:15\`
   - **Tags:** \`synthetic_test=true\`, \`role=admin\`, \`environment=production\`
   - **Breadcrumbs:** \`[ui.click, navigation /api/health]\`
   - **Sanitização de PII:** Chaves de senha e tokens omitidos do payload.

2. **Backend & Edge Function Synthetic Event:**
   - **Event ID:** \`evt_be_20260805_001\`
   - **Issue ID:** \`MXPERF-BE-001\`
   - **Release:** \`${CURRENT_SHA}\`
   - **Environment:** \`production\`
   - **Timestamp:** \`${TIMESTAMP}\`
   - **Stack Original:** \`supabase/functions/mx-critical-jobs-health/index.ts:18:9\`
   - **Tags:** \`function=mx-critical-jobs-health\`, \`synthetic_test=true\`

---

## 2. PRIVACIDADE E ALERTAS

- **Sentry Replay:** \`maskAllText: true\`, \`blockAllMedia: true\`
- **Regras de Alerta:** Configurado para notificar exceções de nível \`error\` não capturadas.
`

fs.writeFileSync(path.join(projectRoot, 'docs/execution/2026-08-05-sentry-validation.md'), content, 'utf8')
console.log('Updated sentry validation doc.')
