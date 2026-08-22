#!/usr/bin/env node
/**
 * FASE U — 21.003/21.004 audit de ícones (tamanho e stroke semânticos).
 *
 * Lucide é o padrão de ícones (21.002). Este audit garante que:
 *   - 21.003 tamanhos: `size={N}` nos ícones usa a escala semântica
 *     `--mx-icon-size-*` (xs 14, sm 16, md 20, lg 24) — N em {14, 16, 20, 24};
 *   - 21.004 stroke: `strokeWidth={N}` usa o peso canônico — 1.8 (decorativo em
 *     containers de card), 2 (padrão Lucide), 3 (marcas minúsculas <= 12px).
 *
 * O gate ignora `<svg>` inline de non-icons (charts/gauges/logos) e atributos
 * de recharts (`stroke=`, `dot=`, `<Line>`, `<ReferenceLine>`, path). A
 * ALLOWLIST é orçamento explícito de debt (mesma mecânica do icon-only gate).
 *
 * Uso: `node scripts/lint-icon-semantics.mjs [--fix]`
 * Saída: arquivos + ícones fora do padrão; exit 1 com violações.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import ts from 'typescript'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const CANONICAL_SIZES = new Set([12, 14, 16, 20, 24])
const CANONICAL_STROKES = new Set([1.8, 2, 3])

export const ALLOWLIST = new Map([
  // Logos/brand assets não convertidos (21.002 ressalva) e marcas grandes de
  // empty-state com peso próprio deliberado.
  ['src/components/GoogleIcon.jsx', 'Logo Google — brand asset, fora do padrão Lucide.'],
  ['src/features/landing/data/landing-css.ts', 'Decoração de landing (SVG inline não-ícone).'],
  // Watermark decorativo com stroke fino proposital (opacity-10, 200px).
  ['src/features/consultoria-cliente/sections/ROISection.tsx', 'Watermark decorativo stroke 1 (opacity-10).'],
])

/**
 * Dívida 21.003 — arquivos com tamanhos de ícone fora da escala semântica
 * {12, 14, 16, 20, 24}. Orçamento explícito: a migração é uma coorte futura;
 * até lá, novos arquivos fora do padrão SÃO bloqueados, e os já orçados ficam
 * registrados (contados, não bloqueados).
 */
let SIZE_DEBT = new Set()
try {
  const debt = JSON.parse(
    readFileSync(resolve(ROOT, 'scripts/data/icon-size-debt.json'), 'utf8'),
  )
  SIZE_DEBT = new Set(Object.keys(debt.files ?? {}))
} catch {
  // Sem arquivo de orçamento, o gate trata todo size fora do padrão como violação.
}

const ICON_SIZE_RE = /size=\{\s*(\d+(?:\.\d+)?)\s*\}/
const STROKE_RE = /strokeWidth=\{\s*([\d.]+)\s*\}/

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'base44-reference') continue
    const full = resolve(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) out.push(...walk(full))
    else if (/(\.(ts|tsx|js|jsx))$/.test(entry) && !/\.(test|spec|playwright)\./.test(entry)) {
      out.push(full)
    }
  }
  return out
}

function isLucideImport(imports, tagName) {
  return imports.some(([name, from]) => {
    const base = name.split(/\s+as\s+/)[0].trim()
    return base === tagName && from === 'lucide-react'
  })
}

/** Coleta importações `import { X, Y as Z } from 'lucide-react'` */
function collectLucideImports(sourceFile) {
  const imports = []
  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt)) continue
    const clause = stmt.importClause
    if (!clause || !clause.namedBindings || !ts.isNamedImports(clause.namedBindings)) continue
    const from = stmt.moduleSpecifier.getText(sourceFile).replace(/['"]/g, '')
    if (from !== 'lucide-react') continue
    for (const el of clause.namedBindings.elements) {
      imports.push([el.name.getText(sourceFile), from])
    }
  }
  return imports
}

/**
 * Inspeciona um arquivo e devolve as violações de tamanho/stroke.
 * @returns {Array<{ file: string; line: number; prop: string; value: number; canonical: string }>}
 */
export function inspectIconSemantics(source, file) {
  if (ALLOWLIST.has(file)) return []
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const lucideImports = collectLucideImports(sourceFile)
  if (lucideImports.length === 0) return []

  const violations = []

  function check(node) {
    if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) return
    const tagName = node.tagName.getText(sourceFile)
    if (!isLucideImport(lucideImports, tagName)) return

    // Recharts Lines/ReferenceLine não são ícones; usam stroke em path próprio.
    if (['Line', 'ReferenceLine', 'Radar', 'Area', 'Bar'].includes(tagName)) return

    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
    const lineNumber = line + 1

    for (const attr of node.attributes.properties) {
      if (!ts.isJsxAttribute(attr) || !attr.initializer) continue
      const propName = attr.name.getText(sourceFile)
      const init = attr.initializer
      const valueMatch =
        ts.isJsxExpression(init) && init.expression
          ? init.expression.getText(sourceFile).match(/^-?\d+(\.\d+)?$/)
          : null

      if (propName === 'size' && valueMatch) {
        const value = Number(valueMatch[0])
        if (!CANONICAL_SIZES.has(value)) {
          violations.push({
            file,
            line: lineNumber,
            prop: 'size',
            value,
            canonical: [...CANONICAL_SIZES].join('/'),
            budgeted: SIZE_DEBT.has(file),
          })
        }
      }
      if (propName === 'strokeWidth' && valueMatch) {
        const value = Number(valueMatch[0])
        if (!CANONICAL_STROKES.has(value)) {
          violations.push({
            file,
            line: lineNumber,
            prop: 'strokeWidth',
            value,
            canonical: [...CANONICAL_STROKES].join('/'),
            budgeted: false,
          })
        }
      }
    }
  }

  function visit(node) {
    if (ts.isJsxOpeningElement(node)) {
      check(node)
    } else if (ts.isJsxSelfClosingElement(node)) {
      check(node)
    }
    ts.forEachChild(node, visit)
  }

  ts.forEachChild(sourceFile, visit)
  return violations
}

export function runIconSemanticsGate() {
  const files = walk(resolve(ROOT, 'src'))
  const all = []
  for (const file of files) {
    const relative = file.replace(resolve(ROOT) + '/', '')
    const source = readFileSync(file, 'utf8')
    const found = inspectIconSemantics(source, relative).filter(
      (v) => !ALLOWLIST.has(v.file) && !v.budgeted,
    )
    all.push(...found)
  }
  return all
}

export function countIconSizeDebt() {
  let count = 0
  // A contagem só precisa visitar os arquivos explicitamente orçados. Fazer
  // outra varredura/parse da árvore inteira torna o contrato lento e sujeito
  // ao timeout padrão do Bun, sem aumentar a cobertura desta métrica.
  for (const relative of SIZE_DEBT) {
    const file = resolve(ROOT, relative)
    try {
      const source = readFileSync(file, 'utf8')
      count += inspectIconSemantics(source, relative).filter(
        (v) => v.prop === 'size' && v.budgeted,
      ).length
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
  }
  return count
}

// Execução direta (CLI)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const violations = runIconSemanticsGate()
  if (violations.length > 0) {
    for (const v of violations) {
      console.log(
        `${v.file}:${v.line} — ${v.prop}={${v.value}} fora do canônico (${v.canonical})`,
      )
    }
    console.error(
      `[lint-icon-semantics] ${violations.length} violação(ões); ALLOWLIST=${ALLOWLIST.size}`,
    )
    process.exit(1)
  }
  console.log(
    `[lint-icon-semantics] OK — ${ALLOWLIST.size} allowlisted; ${countIconSizeDebt()} ocorrência(s) de size em dívida 21.003; stroke/tamanhos novos canônicos.`,
  )
}
