import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tick = String.fromCharCode(96)
const snapshot = JSON.parse(fs.readFileSync(path.join(projectRoot, 'docs/execution/2026-08-09-supabase-security-snapshot.json'), 'utf8'))
const sha = execSync('git rev-parse HEAD', { cwd: projectRoot }).toString().trim()
const branch = execSync('git branch --show-current', { cwd: projectRoot }).toString().trim()
const remoteBranches = execSync("git for-each-ref --format='%(refname:short)' refs/remotes/origin", { cwd: projectRoot })
  .toString().split('\n').filter(Boolean).filter(name => !name.endsWith('/HEAD') && !name.endsWith('/main'))
const dependabotBranches = remoteBranches.filter(name => name.includes('/dependabot/'))
const edgeMatrix = fs.readFileSync(path.join(projectRoot, 'docs/execution/2026-08-09-edge-functions-matrix.md'), 'utf8')
const edgeFunctionCount = edgeMatrix.match(/^\| EF-\d+/gm)?.length ?? 0
const edgeNoJwtCount = edgeMatrix.split('\n').filter(line => /^\| EF-\d+/.test(line) && line.includes('| não |')).length
let ownerGraph = 'not captured'
try {
  const guardOutput = execSync('node scripts/audit-owner-b44-graph.mjs --check', {
    cwd: projectRoot,
    encoding: 'utf8',
  })
  ownerGraph = guardOutput.match(/Found (\d+) runtime imports/)?.[1] ?? ownerGraph
} catch {
  ownerGraph = 'guard falhou; ver saída de audit-owner-b44-graph'
}

const md = [
  '# Live progress — estado factual atual',
  '',
  '- **Gerado em:** ' + new Date().toISOString(),
  '- **Branch:** ' + tick + branch + tick,
  '- **SHA do checkout:** ' + tick + sha + tick,
  '- **Status geral:** ' + tick + 'PARCIALMENTE IMPLEMENTADO — PRODUÇÃO OPERACIONAL, GARANTIAS COMPLETAS AINDA PENDENTES' + tick,
  '- **Snapshot Supabase:** ' + tick + snapshot.generated_at + tick + ' (fonte SHA ' + tick + snapshot.sha + tick + ')',
  '',
  '| Task | Estado atual | Evidência atual | Próximo fechamento |',
  '|---|---|---|---|',
  '| C0.1 Design System | ' + tick + 'NOT_REEVALUATED' + tick + ' | Este gerador não executa os gates do workflow | Consultar CI no SHA final |',
  '| C0.2 Dono / PR #175 | ' + tick + 'NOT_REEVALUATED' + tick + ' | Estado de PR/produção não é consultado por este gerador | Browser autenticado e dados reais |',
  '| C0.3 Scopes legados | ' + tick + 'DONE_WITH_EVIDENCE' + tick + ' local | Guard encontrou ' + ownerGraph + ' imports runtime | Revalidar no CI/produção |',
  '| C0.4 RLS | ' + tick + 'TESTED_LOCAL_ONLY' + tick + ' | ' + snapshot.rls_counts.public_tables + ' tabelas públicas com RLS e ' + snapshot.rls_counts.rls_without_policy + ' sem policy no snapshot | Testes por perfil/tenant |',
  '| C0.5 SECURITY DEFINER | ' + tick + 'IN_PROGRESS' + tick + ' | ' + snapshot.function_counts.security_definer + ' catalogadas; anon=' + snapshot.function_counts.anon_executable + '; auth=' + snapshot.function_counts.authenticated_executable + '; service_role=' + snapshot.function_counts.service_role_executable + ' | Classificação e testes por assinatura |',
  '| C0.6 Edge Functions | ' + tick + 'IN_PROGRESS' + tick + ' | ' + edgeFunctionCount + ' funções catalogadas no artefato local; ' + edgeNoJwtCount + ' com verify_jwt=false; deployment não consultado | OPTIONS/sem auth/JWT/tenant por endpoint |',
  '| C0.7 Proteção main | ' + tick + 'NOT_REEVALUATED' + tick + ' | GitHub protection/checks não são consultados por este gerador | Revalidar via GitHub no SHA final |',
  '| C0.8 Branches | ' + tick + 'NOT_REEVALUATED' + tick + ' | ' + remoteBranches.length + ' refs fora de main no mirror local; ' + dependabotBranches.length + ' nomes contêm dependabot; PR/estado remoto não consultado | Confirmar via GitHub e registrar retenção/remoção |',
  '| C0.9 Deployment | ' + tick + 'NOT_REEVALUATED' + tick + ' | Health/deployment do checkpoint anterior | Revalidar após SHA final |',
  '| C0.10 Evidências | ' + tick + 'IN_PROGRESS' + tick + ' | Snapshot e matriz atuais criados | Browser, Sentry, restore e rollback |',
  '',
  '## Bloqueios explícitos',
  '',
  '- QA browser autenticado completo ainda não capturado.',
  '- Sentry exige reautenticação para evento sintético/source map/alerta.',
  '- Restore/PITR e rollback real ainda não comprovados.',
  '- Admin Geral e Consultor MX não possuem credencial comprovada nesta execução.',
  '',
].join('\n')

const outputPath = path.join(projectRoot, 'docs/execution/2026-08-09-live-progress.md')
fs.writeFileSync(outputPath, md, 'utf8')
console.log(outputPath)
