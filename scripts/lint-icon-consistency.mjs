#!/usr/bin/env node
/**
 * FASE U — 21.009 audit de consistência de ícones para a mesma ação.
 *
 * Lucide é a única fonte (21.002). Para cada ação recorrente, o runtime deve
 * usar UM ícone canônico — variações sem razão funcional fragmentam a UX e o
 * reconhecimento visual (a mesma ação com desenho diferente em telas
 * diferentes). Este audit flagra os ícones ALTERNATIVOS de cada grupo.
 *
 * Grupos e canônicos (2026-08-15, consenso com o uso dominante no runtime):
 *   editar      -> Pencil        (alternativos: Edit, Edit2, Pen, SquarePen)
 *   recarregar  -> RefreshCw     (alternativo: RefreshCcw)
 *   adicionar   -> Plus          (alternativo: PlusCircle quando usado como
 *                                 "criar/adicionar", não status)
 *
 * NOTA de semântica (excluídos do grupo por razão funcional):
 *   - `XCircle` NÃO é alternativo de `X` — é ícone de status de erro/crítico
 *     (AlertMessage, status cards), não de "fechar".
 *   - `RotateCcw` NÃO é alternativo de `RefreshCw` — é rewind/reset/replay
 *     (repetir tour, restaurar histórico, limpar, reiniciar player), não
 *     "atualizar dados". Razão funcional distinta — fora do grupo.
 *
 * A ALLOWLIST é orçamento explícito de exceptions intencionais (mesma mecânica
 * dos demais gates). O gate resolve `lucide-react` por arquivo (AST) e ignora
 * recharts/paths. 100% fs — imune ao C8.
 *
 * Uso: `node scripts/lint-icon-consistency.mjs [--json]`
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import ts from 'typescript'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const JSON_MODE = process.argv.includes('--json')

/** Ação -> { canônico, alternativos }. */
const GROUPS = {
  editar: { canonical: 'Pencil', alternatives: ['Edit', 'Edit2', 'Edit3', 'Pen', 'SquarePen'] },
  recarregar: { canonical: 'RefreshCw', alternatives: ['RefreshCcw'] },
  adicionar: { canonical: 'Plus', alternatives: ['PlusCircle'] },
}

export const ALLOWLIST = new Map([
  // Sem exceptions intencionais registradas hoje.
])

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    if (['node_modules', 'base44-reference', '_stories'].includes(entry)) continue
    const full = resolve(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) out.push(...walk(full))
    else if (/\.(tsx|jsx)$/.test(entry) && !/\.(test|spec|playwright|stories)\./.test(entry)) {
      out.push(full)
    }
  }
  return out
}

/** Ícones lucide importados num arquivo (via AST). */
function lucideImports(source, file) {
  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    /\.tsx?$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.JSX,
  )
  const imported = new Set()
  const visit = (node) => {
    if (
      ts.isImportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text === 'lucide-react' &&
      node.importClause?.namedBindings &&
      ts.isNamedImports(node.importClause.namedBindings)
    ) {
      for (const element of node.importClause.namedBindings.elements) {
        imported.add(element.name.text)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return imported
}

export function inspectIconConsistency(source, file = '<inline>') {
  const imported = lucideImports(source, file)
  const findings = []
  for (const [action, { canonical, alternatives }] of Object.entries(GROUPS)) {
    for (const alternative of alternatives) {
      if (imported.has(alternative)) {
        findings.push({ file, rule: `icon-inconsistent-${action}`, canonical, used: alternative })
      }
    }
  }
  return findings
}

export function runIconConsistencyGate() {
  const findings = []
  for (const filePath of walk(resolve(ROOT, 'src'))) {
    const relative = filePath.replace(`${ROOT}/`, '').replace(/\\/g, '/')
    if (ALLOWLIST.has(relative)) continue
    const source = readFileSync(filePath, 'utf8')
    findings.push(...inspectIconConsistency(source, relative))
  }
  return findings.sort((a, b) => `${a.file}:${a.rule}`.localeCompare(`${b.file}:${b.rule}`))
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isCli) {
  const findings = runIconConsistencyGate()
  const result = {
    gate: 'lint-icon-consistency',
    pass: findings.length === 0,
    findingCount: findings.length,
    findings,
  }

  if (JSON_MODE) {
    console.log(JSON.stringify(result, null, 2))
  } else if (findings.length === 0) {
    console.log('[lint-icon-consistency] OK — ícones consistentes por ação')
  } else {
    console.error(`[lint-icon-consistency] ${findings.length} uso(s) de ícone não-canônico:`)
    for (const finding of findings) {
      console.error(`  - ${finding.file} (${finding.rule}) usou ${finding.used}; canônico é ${finding.canonical}`)
    }
  }

  process.exit(findings.length === 0 ? 0 : 1)
}
