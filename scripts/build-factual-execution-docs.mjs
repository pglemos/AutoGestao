import fs from 'node:fs'
import path from 'node:path'
import { execFileSync, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tick = String.fromCharCode(96)
const snapshot = JSON.parse(fs.readFileSync(path.join(projectRoot, 'docs/execution/2026-08-09-supabase-security-snapshot.json'), 'utf8'))
const sha = execSync('git rev-parse HEAD', { cwd: projectRoot }).toString().trim()
const generatedAt = new Date().toISOString()
let tag = 'não capturada'
try {
  tag = execFileSync('git', ['tag', '--list', 'pre-main-autonomous-*', '--sort=-creatordate'], {
    cwd: projectRoot,
    encoding: 'utf8',
  }).split('\n')[0].trim() || tag
} catch {
  // Keep the explicit fallback in generated evidence when Git is unavailable.
}
const bundle = path.resolve(projectRoot, '..', 'MXGESTAOPREDITIVA-pre-main-autonomous-20260809-101705.bundle')
let bundleState = 'não localizado nesta execução'
if (fs.existsSync(bundle)) {
  try {
    execFileSync('git', ['bundle', 'verify', bundle], { cwd: projectRoot, stdio: 'pipe' })
    bundleState = 'presente; git bundle verify PASS'
  } catch {
    bundleState = 'presente; git bundle verify FALHOU'
  }
}

let ownerGraph = 'não capturado'
try {
  ownerGraph = execFileSync('node', ['scripts/audit-owner-b44-graph.mjs', '--check'], {
    cwd: projectRoot,
    encoding: 'utf8',
  }).match(/Found (\d+) runtime imports/)?.[1] ?? ownerGraph
} catch {
  ownerGraph = 'guard falhou; consultar a saída do script'
}

const edgeMatrix = fs.readFileSync(path.join(projectRoot, 'docs/execution/2026-08-09-edge-functions-matrix.md'), 'utf8')
const edgeFunctionCount = edgeMatrix.match(/^\| EF-\d+/gm)?.length ?? 0
const remoteBranches = execFileSync('git', ['for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin'], {
  cwd: projectRoot,
  encoding: 'utf8',
}).split('\n').filter(Boolean).filter(name => !name.endsWith('/HEAD'))
const nonMainBranches = remoteBranches.filter(name => !name.endsWith('/main'))
const dependabotBranches = nonMainBranches.filter(name => name.includes('/dependabot/'))

const evidence = [
  '# Evidence ledger — snapshot factual atual',
  '',
  '- **Gerado em:** ' + generatedAt,
  '- **SHA do checkout:** ' + tick + sha + tick,
  '- **Branch:** ' + tick + execSync('git branch --show-current', { cwd: projectRoot }).toString().trim() + tick,
  '- **Tag de backup detectada:** ' + tick + tag + tick,
  '- **Bundle:** ' + bundleState,
  '',
  '| ID | Task | Ambiente | Ação/evidência | Resultado observado | Estado |',
  '|---|---|---|---|---|---|',
  '| EV-T0-01 | T0.1 | Local Git | git rev-parse HEAD / branch --show-current | checkout e branch capturados no SHA acima | DONE_WITH_EVIDENCE |',
  '| EV-T0-02 | T0.2 | Local Git | tag e bundle detectados | tag ' + tag + '; bundle ' + bundleState + ' | TESTED_LOCAL_ONLY |',
  '| EV-C0-03 | C0.3 | Local | node scripts/audit-owner-b44-graph.mjs --check | ' + ownerGraph + ' runtime imports retirados no checkout atual | TESTED_LOCAL_ONLY |',
  '| EV-C0-04 | C0.4 | Supabase | snapshot SQL de RLS | ' + snapshot.rls_counts.public_tables + ' tabelas públicas com RLS; ' + snapshot.rls_counts.rls_without_policy + ' sem policy | TESTED_LOCAL_ONLY |',
  '| EV-C0-05 | C0.5 | Supabase | pg_proc + has_function_privilege | ' + snapshot.function_counts.security_definer + ' SECURITY DEFINER; anon=' + snapshot.function_counts.anon_executable + '; authenticated=' + snapshot.function_counts.authenticated_executable + '; service_role=' + snapshot.function_counts.service_role_executable + ' | IN_PROGRESS |',
  '| EV-C0-06 | C0.6 | Local artifact | docs/execution/2026-08-09-edge-functions-matrix.md | ' + edgeFunctionCount + ' funções catalogadas; endpoints ainda não exercitados por este gerador | IN_PROGRESS |',
  '| EV-C0-07 | C0.7 | GitHub | não consultado por este gerador | estado de proteção/CI externo não revalidado nesta execução | NOT_REEVALUATED |',
  '| EV-C0-08 | C0.8 | Local Git | git for-each-ref refs/remotes/origin | ' + remoteBranches.length + ' branches remotas locais; ' + nonMainBranches.length + ' além de main, ' + dependabotBranches.length + ' Dependabot | TESTED_LOCAL_ONLY |',
  '| EV-C0-09 | C0.9 | Vercel | não consultado por este gerador | health/deployment externo não revalidado nesta execução | NOT_REEVALUATED |',
  '| EV-C0-10 | C0.10 | Local/externo | este gerador não consulta browser/Sentry/restore | lacunas externas permanecem explicitamente pendentes | IN_PROGRESS |',
  '',
  '## Regra de leitura',
  '',
  'Este ledger substitui os geradores que marcavam testes como concluídos sem artefato. Matrizes antigas permanecem preservadas como histórico, mas não são evidência da release atual.',
  '',
].join('\n')

fs.writeFileSync(path.join(projectRoot, 'docs/execution/2026-08-09-evidence-ledger.md'), evidence, 'utf8')
console.log(JSON.stringify({ output: 'docs/execution/2026-08-09-evidence-ledger.md', sha, generatedAt }, null, 2))
