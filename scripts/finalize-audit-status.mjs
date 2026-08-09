import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tick = String.fromCharCode(96)
const snapshot = JSON.parse(fs.readFileSync(path.join(projectRoot, 'docs/execution/2026-08-09-supabase-security-snapshot.json'), 'utf8'))
const sha = execSync('git rev-parse HEAD', { cwd: projectRoot }).toString().trim()
const generatedAt = new Date().toISOString()
const edgeMatrixPath = path.join(projectRoot, 'docs/execution/2026-08-09-edge-functions-matrix.md')
const edgeMatrix = fs.existsSync(edgeMatrixPath) ? fs.readFileSync(edgeMatrixPath, 'utf8') : ''
const edgeFunctionCount = edgeMatrix.match(/^\| EF-\d+/gm)?.length ?? 0
const edgeNoJwtCount = edgeMatrix.split('\n').filter(line => /^\| EF-\d+/.test(line) && line.includes('| não |')).length
let health = 'não capturado por este gerador'
try {
  health = execSync('curl -fsS --max-time 20 https://mxperformance.vercel.app/api/health', { encoding: 'utf8' }).trim()
} catch {
  health = 'consulta falhou; ver evidência externa do deployment'
}

const report = [
  '# Relatório de status — execução autónoma MX',
  '',
  '- **Gerado em:** ' + generatedAt,
  '- **Declaração permitida:** ' + tick + 'PARCIALMENTE CONCLUÍDO, COM BLOQUEIOS EXTERNOS COMPROVADOS' + tick,
  '- **Checkout SHA:** ' + tick + sha + tick,
  '- **Branch:** ' + tick + execSync('git branch --show-current', { cwd: projectRoot }).toString().trim() + tick,
  '- **Snapshot Supabase:** ' + tick + snapshot.generated_at + tick + ', origem ' + tick + snapshot.sha + tick,
  '',
  '## Fatos atuais',
  '',
  '- ' + snapshot.function_counts.security_definer + ' funções SECURITY DEFINER catalogadas; anon=' + snapshot.function_counts.anon_executable + ', authenticated=' + snapshot.function_counts.authenticated_executable + ', service_role=' + snapshot.function_counts.service_role_executable + '.',
  '- ' + snapshot.rls_counts.public_tables + ' tabelas públicas com RLS; ' + snapshot.rls_counts.rls_without_policy + ' sem policy na consulta atual.',
  '- ' + (edgeFunctionCount || 'nenhuma') + ' Edge Functions catalogadas no artefato local; ' + edgeNoJwtCount + ' com ' + tick + 'verify_jwt=false' + tick + '. Estado ACTIVE/deployment não é inferido por este gerador.',
  '- O guard local de scopes legados e os gates locais registrados pelo handoff permanecem evidências de checkout, não equivalem a QA autenticado completo.',
  '',
  '## Health observado pelo gerador',
  '',
  tick.repeat(4) + 'json',
  health.replaceAll(tick.repeat(3), ''),
  tick.repeat(4),
  '',
  '## Bloqueios externos comprovados',
  '',
  '| Item | Evidência | Impacto |',
  '|---|---|---|',
  '| Sentry | MCP exige reautenticação; não foi possível consultar evento sintético/source map/alertas nesta sessão | Observabilidade ponta a ponta não comprovada |',
  '| Perfis adicionais | Não há credencial comprovada para Administrador Geral e Consultor MX | Matriz de seis perfis incompleta |',
  '| Recuperação | Restore/PITR/rollback real não executados em ambiente seguro | DR não comprovado |',
  '',
  '## Pendências não convertidas em concluído',
  '',
  'Browser autenticado por rota/ação/viewport/estado, exports, acessibilidade runtime, performance por rota, testes de cada Edge Function, classificação individual dos ' + snapshot.function_counts.security_definer + ' SECURITY DEFINER e advisor findings permanecem com estado explícito nas matrizes atuais.',
  '',
].join('\n')

const outputPath = path.join(projectRoot, 'docs/execution/2026-08-09-final-report.md')
fs.writeFileSync(outputPath, report, 'utf8')
console.log(outputPath)
