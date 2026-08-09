import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tick = String.fromCharCode(96)
const promptPath = process.env.MX_MASTER_PROMPT || path.join(projectRoot, 'docs/execution/prompt-mestre-final-auditado.md')
if (!fs.existsSync(promptPath)) {
  throw new Error(
    'Prompt mestre não localizado: ' + promptPath + '. Defina MX_MASTER_PROMPT com o caminho do arquivo.',
  )
}
const prompt = fs.readFileSync(promptPath, 'utf8')
const tasks = [...prompt.matchAll(/^## ((?:C0|T\d+)\.\d+) — (.+)$/gm)].map(match => ({ id: match[1], title: match[2] }))
const uniqueTasks = [...new Map(tasks.map(task => [task.id, task])).values()]
const sha = execSync('git rev-parse HEAD', { cwd: projectRoot }).toString().trim()
const generatedAt = new Date().toISOString()
const snapshotPath = path.join(projectRoot, 'docs/execution/2026-08-09-supabase-security-snapshot.json')
if (!fs.existsSync(snapshotPath)) throw new Error('Snapshot Supabase não localizado: ' + snapshotPath)
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))
for (const key of ['generated_at', 'sha', 'rls_counts', 'function_counts']) {
  if (snapshot[key] === undefined) throw new Error('Snapshot Supabase sem a chave obrigatória: ' + key)
}
for (const key of ['public_tables', 'rls_without_policy']) {
  if (snapshot.rls_counts[key] === undefined) throw new Error('Snapshot Supabase sem rls_counts.' + key)
}
for (const key of ['security_definer', 'anon_executable', 'authenticated_executable']) {
  if (snapshot.function_counts[key] === undefined) throw new Error('Snapshot Supabase sem function_counts.' + key)
}

const known = new Map([
  ['T0.1', ['DONE_WITH_EVIDENCE', 'git rev-parse HEAD e branch --show-current', 'checkout/branch capturados']],
  ['T0.2', ['TESTED_LOCAL_ONLY', 'tag pre-main-autonomous-20260809-101705 e bundle local', 'backup detectado; verify deve acompanhar o artefato']],
  ['T0.4', ['TESTED_PRODUCTION', 'health/deployment do checkpoint', 'revalidar no SHA final']],
  ['C0.3', ['TESTED_LOCAL_ONLY', 'node scripts/audit-owner-b44-graph.mjs --check', 'guard runtime sem imports retirados']],
  ['C0.4', ['TESTED_LOCAL_ONLY', 'snapshot Supabase ' + snapshot.generated_at, snapshot.rls_counts.public_tables + ' tabelas com RLS; ' + snapshot.rls_counts.rls_without_policy + ' sem policy']],
  ['C0.5', ['IN_PROGRESS', 'snapshot pg_proc/has_function_privilege', snapshot.function_counts.security_definer + ' SECURITY DEFINER; anon=' + snapshot.function_counts.anon_executable + '; auth=' + snapshot.function_counts.authenticated_executable]],
  ['C0.6', ['IN_PROGRESS', 'supabase list_edge_functions', '22 funções catalogadas; testes por endpoint pendentes']],
  ['C0.7', ['TESTED_LOCAL_ONLY', 'proteção GitHub do checkpoint', 'revalidar required checks no SHA final']],
  ['C0.8', ['IN_PROGRESS', 'git branch -r', 'branches dependabot remanescentes precisam de decisão documentada']],
  ['C0.9', ['NOT_REEVALUATED', 'deployment/health do checkpoint', 'revalidar após push final']],
  ['C0.10', ['IN_PROGRESS', 'matrizes atuais e bloqueios', 'browser, Sentry, restore e rollback pendentes']],
])

const currentTitle = (task) => {
  if (task.id === 'C0.5') return 'Revisar funções SECURITY DEFINER (inventário atual)'
  if (task.id === 'C0.6') return 'Revisar Edge Functions (inventário atual)'
  if (task.id === 'C0.8') return 'Limpar branches além da main (inventário atual)'
  return task.title
}

const rows = uniqueTasks.map(task => {
  const [state, evidence, observed] = known.get(task.id) || ['NOT_PROVEN', 'nenhuma evidência atual anexada', 'não executado ou não revalidado nesta execução']
  const blocker = state === 'NOT_PROVEN' ? 'capturar evidência atual ou registrar bloqueio externo genuíno' : state === 'IN_PROGRESS' ? 'ver matriz/ledger atual e anexar artefato de fechamento' : 'revalidar no SHA final quando a task for release-sensitive'
  return { ...task, title: currentTitle(task), state, evidence, observed, blocker }
})

const md = [
  '# Ledger integral derivado do prompt mestre',
  '',
  '- **Gerado em:** ' + generatedAt,
  '- **SHA do checkout:** ' + tick + sha + tick,
  '- **Total de tasks encontradas no prompt:** ' + rows.length,
  '- **Regra:** nenhum gerador pode promover task a DONE_WITH_EVIDENCE sem artefato externo verificável.',
  '',
  '| Task | Nome | Estado | Evidência/Ação | Observado | Próximo passo |',
  '|---|---|---|---|---|---|',
  ...rows.map(row => '| ' + row.id + ' | ' + row.title.replaceAll('|', '\\|') + ' | ' + tick + row.state + tick + ' | ' + row.evidence.replaceAll('|', '\\|') + ' | ' + row.observed.replaceAll('|', '\\|') + ' | ' + row.blocker.replaceAll('|', '\\|') + ' |'),
  '',
  '> As matrizes Supabase, Edge Functions, RLS, browser e release devem ser vinculadas a este ledger quando cada task for exercitada. O arquivo não transforma documentação em prova.',
  '',
].join('\n')

const outputPath = path.join(projectRoot, 'docs/execution/2026-08-09-full-execution-matrix.md')
fs.writeFileSync(outputPath, md, 'utf8')
console.log(JSON.stringify({ output: path.relative(projectRoot, outputPath), taskCount: rows.length, sha }, null, 2))
