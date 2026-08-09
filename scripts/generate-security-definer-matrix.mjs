import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tick = String.fromCharCode(96)
const snapshotPath = path.join(projectRoot, 'docs/execution/2026-08-09-supabase-security-snapshot.json')
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))
const checkoutSha = execSync('git rev-parse HEAD', { cwd: projectRoot }).toString().trim()
const anonExecutable = snapshot?.function_counts?.anon_executable
if (anonExecutable !== 0) {
  throw new Error(`Snapshot contém ${anonExecutable ?? 'desconhecida'} função(ões) executável(is) por anon`)
}

const output = [
  '# Sumário atual de SECURITY DEFINER',
  '',
  '> Snapshot Supabase capturado em ' + tick + snapshot.generated_at + tick + ', no SHA de origem ' + tick + snapshot.sha + tick + '.',
  '> Checkout que gerou este documento: ' + tick + checkoutSha + tick + '.',
  '> O snapshot é catalogação de grants e configuração; revisão comportamental por chamador, tenant e perfil continua explícita como pendente.',
  '',
  '| Métrica | Valor |',
  '|---|---:|',
  '| Funções públicas | ' + snapshot.function_counts.public_functions + ' |',
  '| SECURITY DEFINER | ' + snapshot.function_counts.security_definer + ' |',
  '| Executáveis por anon | ' + snapshot.function_counts.anon_executable + ' |',
  '| Executáveis por authenticated | ' + snapshot.function_counts.authenticated_executable + ' |',
  '| Executáveis por service_role | ' + snapshot.function_counts.service_role_executable + ' |',
  '| Com search_path configurado | ' + snapshot.function_counts.search_path_configured + ' |',
  '| Sem search_path configurado | ' + snapshot.function_counts.search_path_unconfigured + ' |',
  '| pg_net | ' + tick + snapshot.function_counts.pg_net + tick + ' |',
  '',
  '## Estado',
  '',
  '- anon sem EXECUTE nas funções SECURITY DEFINER catalogadas.',
  '- Os grants de authenticated e service_role permanecem classificados por assinatura na matriz atual.',
  '- Não houve revogação em massa baseada apenas no advisor.',
  '- Chamadores de frontend, autorização interna, isolamento de tenant e testes positivos/negativos ainda precisam de evidência por função.',
  '',
].join('\n')

const outputPath = path.join(projectRoot, 'docs/execution/2026-08-09-supabase-security-review-summary.md')
fs.writeFileSync(outputPath, output, 'utf8')
console.log(JSON.stringify({ output: path.relative(projectRoot, outputPath), checkoutSha, sourceSha: snapshot.sha, counts: snapshot.function_counts }, null, 2))
