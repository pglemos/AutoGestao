#!/usr/bin/env node
/**
 * Foundation Zero AC-29.016 — gate de horizontal page overflow.
 *
 * O browser test (harness da matriz route × viewport) mede o invariante
 * runtime `document.documentElement.scrollWidth <= clientWidth + 1` em todas as
 * rotas e viewports (390→1920). Este gate é o análogo ESTÁTICO: flagra, na raiz
 * da página, as fontes de overflow horizontal que o browser mediria como
 * `scrollWidth > clientWidth`.
 *
 * Regras (elemento raiz da página — o primeiro elemento JSX renderizado):
 *   R1 page-root-viewport-width : largura fixa de viewport (`w-screen`,
 *                                 `min-w-screen`, `w-[100vw]`, `100vw`).
 *                                 `100vw` inclui a barra de rolagem; com
 *                                 scrollbar vertical presente, estoura o
 *                                 documento. O PageCanvas já centraliza a
 *                                 largura de página com token — largura de
 *                                 viewport na raiz é sempre um desvio.
 *   R2 page-root-arbitrary-width : `w-[Npx]`/`min-w-[Npx]` arbitrário na raiz,
 *                                 fora do PageCanvas — largura fixa que não
 *                                 encolhe abaixo do viewport compacto.
 *
 * Escopo = raízes de página canônicas (arquivos que renderizam PageCanvas /
 * PageTemplate como raiz) + telas fullscreen montadas por rota. Elementos DENTRO
 * de uma `ScrollableRegion`/`data-mx-scroll-region` (scroll horizontal LOCAL,
 * FASE I 09.012) são o denominador correto e ficam fora — não são overflow de
 * página. `h-screen` (altura) não é overflow e é ignorado.
 *
 * Puramente read-only: AST TypeScript + regex determinístico, zero escrita.
 *
 * Uso:
 *   node scripts/lint-horizontal-page-overflow.mjs
 *   node scripts/lint-horizontal-page-overflow.mjs --json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const SRC_DIR = path.join(ROOT_DIR, 'src')
const JSON_MODE = process.argv.includes('--json')

/**
 * KEEP por arquivo (caminho relativo). Dívida DOCUMENTADA: cada entrada é uma
 * tela de estado fullscreen montada por rota que centraliza conteúdo com
 * `h-screen w-screen` — clipada pelo `overflow-hidden` do `main#main-content`
 * do shell, e o harness browser mede `scrollWidth <= clientWidth + 1` nessas
 * rotas (prova: matriz route × viewport). São exceções DELIBERADAS, não
 * violações ocultas: a allowlist deve ENCOLHER conforme essas telas migram
 * para PageCanvas/tokens.
 */
export const ALLOWLIST = new Map([
  [
    'src/pages/LiberacaoFechamento.tsx',
    'Tela de estado fullscreen (acesso restrito) centralizada com h-screen w-screen; clipada pelo main do shell; medida sem overflow no harness.',
  ],
])

const SOURCE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js']

const VIEWPORT_WIDTH = /\b(?:min-)?w-screen\b|\b(?:min-)?w-\[100vw\]\b|\b100vw\b/
const ARBITRARY_WIDTH = /\b(?:w|min-w)-\[[0-9]+px\]/

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function sourceFile(filePath, text) {
  const kind = /\.tsx?$/.test(filePath) ? ts.ScriptKind.TSX : ts.ScriptKind.JSX
  return ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, kind)
}

function classNameTokens(element, sf) {
  const opening = ts.isJsxElement(element) ? element.openingElement : element
  const attribute = opening.attributes.properties.find(
    (property) => ts.isJsxAttribute(property) && property.name.text === 'className',
  )
  if (!attribute?.initializer) return ''
  const text = attribute.initializer.getText(sf)
  const literals = [...text.matchAll(/['"`]([^'"`]*)['"`]/g)]
  return literals.map(([, value]) => value).join(' ')
}

/**
 * Primeiro elemento JSX em DFS que NÃO está aninhado dentro de outro elemento
 * JSX — a raiz da árvore renderizada pelo arquivo (a raiz da página).
 */
function rootElement(node) {
  let found = null
  const visit = (current) => {
    if (found) return
    if (ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current)) {
      found = current
      return
    }
    ts.forEachChild(current, visit)
  }
  visit(node)
  return found
}

export function inspectHorizontalPageOverflow(source, file = '<inline>') {
  const sf = sourceFile(file, source)
  const violations = []

  const root = rootElement(sf)
  if (root) {
    const classes = classNameTokens(root, sf)
    const line = sf.getLineAndCharacterOfPosition(root.getStart(sf)).line + 1
    if (VIEWPORT_WIDTH.test(classes)) {
      violations.push({
        file,
        line,
        rule: 'page-root-viewport-width',
        utility: classes.trim().split(/\s+/).slice(0, 8).join(' '),
      })
    } else if (ARBITRARY_WIDTH.test(classes)) {
      violations.push({
        file,
        line,
        rule: 'page-root-arbitrary-width',
        utility: classes.trim().split(/\s+/).slice(0, 8).join(' '),
      })
    }
  }

  return violations
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!['node_modules', '.git', 'base44-reference', '_stories'].includes(entry.name)) {
        walk(full, files)
      }
    } else if (
      SOURCE_EXTENSIONS.some((extension) => entry.name.endsWith(extension)) &&
      !/\.(test|spec|playwright)\./.test(entry.name)
    ) {
      files.push(full)
    }
  }
  return files
}

export function runHorizontalPageOverflowGate() {
  const violations = []
  for (const filePath of walk(SRC_DIR)) {
    const text = readText(filePath)
    // Escopo: raízes de página canônicas + telas fullscreen de rota.
    if (!/PageCanvas|PageTemplate|h-screen|w-screen|fullscreen|Fullscreen/.test(text)) {
      continue
    }
    const relative = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/')
    const found = inspectHorizontalPageOverflow(text, relative).filter((v) => !ALLOWLIST.has(v.file))
    violations.push(...found)
  }
  return violations.sort((a, b) => `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`))
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isCli) {
  const violations = runHorizontalPageOverflowGate()
  const result = {
    gate: 'lint-horizontal-page-overflow',
    pass: violations.length === 0,
    violationCount: violations.length,
    violations,
  }

  if (JSON_MODE) {
    console.log(JSON.stringify(result, null, 2))
  } else if (violations.length === 0) {
    console.log('[lint-horizontal-page-overflow] OK — nenhuma fonte de overflow horizontal em raízes de página')
  } else {
    console.error(`[lint-horizontal-page-overflow] ${violations.length} fonte(s) de overflow horizontal:`)
    for (const violation of violations) {
      console.error(`  - ${violation.file}:${violation.line} (${violation.rule}) ${violation.utility ?? ''}`)
    }
  }

  process.exit(violations.length === 0 ? 0 : 1)
}
