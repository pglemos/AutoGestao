#!/usr/bin/env node
/**
 * FASE AL 38.008 — dry-run lógico do rollback (sem destruir produção).
 *
 * Valida que o caminho reversível está pronto, SEM tocar remoto, Vercel ou DB:
 *   1. o SHA de rollback candidate existe e é ancestor de HEAD;
 *   2. a tag de backup mais recente é legível (`git cat-file`);
 *   3. `supabase/rollbacks/` contém migrations de reversal;
 *   4. o procedimento é não-destrutivo (revert, não reset).
 *
 * Exit 0 = caminho reversível pronto. Uso:
 *   node scripts/rollback-dry-run.mjs                 # usa HEAD~1 como candidate
 *   node scripts/rollback-dry-run.mjs --sha <sha>
 */
import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function sh(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

const argSha = process.argv.indexOf('--sha')
const candidate = argSha !== -1 ? process.argv[argSha + 1] : sh('git rev-parse --short HEAD~1')

const checks = []
function check(name, ok, detail) {
  checks.push({ name, ok, detail })
}

function resolveCandidate(sha) {
  if (sha) return sha
  return sh('git rev-parse --short HEAD~1') || 'HEAD~1'
}

export function runRollbackDryRun({ sha, root: runRoot = ROOT } = {}) {
  checks.length = 0
  const resolve = sha || candidate || 'HEAD~1'

  // 1. SHA existe e é ancestor de HEAD
  const exists = sh(`git cat-file -e ${resolve}^{commit} && echo yes`) === 'yes'
  check('candidate existe', exists, exists ? `${resolve} é um commit válido` : `${resolve} não é um commit`)
  if (exists) {
    const isAncestor = sh(`git merge-base --is-ancestor ${resolve} HEAD && echo yes`) === 'yes'
    check('candidate é ancestor de HEAD', isAncestor, isAncestor ? 'revertável por git revert' : 'não é ancestor — verificar')
  }

  // 2. tag de backup mais recente legível (commit ou tag annotated → commit)
  const tags = sh('git tag').split('\n').filter((t) => t.includes('pre-main-autonomous'))
  const latestTag = tags.sort().pop() || ''
  const tagType = latestTag ? sh(`git cat-file -t ${latestTag}`) : ''
  const tagReadable = !!latestTag && (tagType === 'commit' || tagType === 'tag')
  check('tag de backup legível', tagReadable, tagReadable ? `${latestTag} (${tagType})` : 'nenhuma tag de backup')

  // 3. supabase/rollbacks tem reversals
  const rollbacksDir = path.join(runRoot, 'supabase', 'rollbacks')
  const hasRollbacks = existsSync(rollbacksDir) && readdirSync(rollbacksDir).filter((f) => f.endsWith('.sql')).length > 0
  const rollbackCount = existsSync(rollbacksDir) ? readdirSync(rollbacksDir).filter((f) => f.endsWith('.sql')).length : 0
  check('reversal migrations existem', hasRollbacks, hasRollbacks ? `${rollbackCount} em supabase/rollbacks/` : 'nenhuma reversal')

  // 4. procedimento não-destrutivo (runbook documenta revert; reset só como proibição)
  const runbook = path.join(runRoot, 'docs', 'execution', 'rollback-runbook.md')
  const runbookExists = existsSync(runbook)
  const runbookText = runbookExists ? readFileSync(runbook, 'utf8') : ''
  const runbookNonDestructive = runbookExists && /git revert/.test(runbookText)
  // instruções de reset destrutivas (fora do bloco "Nunca:") não devem existir
  const destructiveResetOutsideProhibition = /^```bash[\s\S]*?git reset --hard/.test(runbookText)
  check(
    'runbook documenta revert (não reset)',
    runbookNonDestructive && !destructiveResetOutsideProhibition,
    runbookNonDestructive ? 'git revert documentado' : 'runbook ausente',
  )

  const pass = checks.every((c) => c.ok)
  const output = {
    gate: 'rollback-dry-run',
    pass,
    candidate,
    checks,
  }

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(output, null, 2))
  } else {
    for (const c of checks) {
      console.log(`${c.ok ? 'OK  ' : 'FAIL'} ${c.name}: ${c.detail}`)
    }
    console.log(`\n${pass ? 'Caminho reversível pronto.' : 'Corrigir antes da release.'}`)
  }

  process.exit(pass ? 0 : 1)
}

const isEntrypoint = process.argv[1] && process.argv[1].endsWith('rollback-dry-run.mjs')
if (isEntrypoint) {
  runRollbackDryRun()
}
