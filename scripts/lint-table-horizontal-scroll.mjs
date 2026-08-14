#!/usr/bin/env node
/**
 * Foundation Zero — contrato de scroll horizontal local (FASE I 09.012).
 *
 * Tabela horizontal não pode criar scroll de página nem scroller "fantasma":
 * pela regra do CSS, um eixo `overflow-x` não-`visible` força o outro eixo a
 * `auto`, então um `overflow-x-auto` solto vira um scroll vertical de página
 * com a altura exata da barra (14px). A via canônica é o primitivo
 * `ScrollableRegion` (marca `data-mx-scroll-region` + `overflow-y-hidden` +
 * nome acessível + foco por teclado).
 *
 * Escopo da FASE I: **páginas canônicas** (arquivos que importam `PageCanvas`
 * ou `PageTemplate`). Seções de DashboardLoja e componentes de tabela fora da
 * página canônica ficam para o inventário de horizontal overflow (23.015).
 *
 * Este gate flagra qualquer elemento JSX com `overflow-x-auto/scroll` cujo
 * subárvore contém uma `<table>` e que não está declarado como região de
 * rolagem. Ele NÃO decide o que é residual: o teste
 * `src/test/table-horizontal-scroll-contract.test.ts` aplica o orçamento de
 * residuais conhecidos e falha quando um caso novo ou não-migrado aparece.
 *
 * Puramente read-only: AST TypeScript, zero escrita, zero runtime.
 *
 * Uso:
 *   node scripts/lint-table-horizontal-scroll.mjs
 *   node scripts/lint-table-horizontal-scroll.mjs --json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const SRC_DIR = path.join(ROOT_DIR, 'src')
const JSON_MODE = process.argv.includes('--json')

const SOURCE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js']
const SCROLL_TOKENS = /\boverflow-x-(?:auto|scroll)\b/

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function sourceFile(filePath, text) {
  const kind = /\.tsx?$/.test(filePath) ? ts.ScriptKind.TSX : ts.ScriptKind.JSX
  return ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, kind)
}

function openingElement(node) {
  return ts.isJsxElement(node) ? node.openingElement : node
}

function tagName(node, sf) {
  const opening = openingElement(node)
  return opening.tagName.getText(sf)
}

function classNameTokens(element, sf) {
  const opening = openingElement(element)
  const attribute = opening.attributes.properties.find(
    (property) => ts.isJsxAttribute(property) && property.name.text === 'className',
  )
  if (!attribute?.initializer) return ''
  const text = attribute.initializer.getText(sf)
  const literals = [...text.matchAll(/['"`]([^'"`]*)['"`]/g)]
  return literals.map(([, value]) => value).join(' ')
}

function hasAttribute(element, name) {
  const opening = openingElement(element)
  return opening.attributes.properties.some(
    (property) => ts.isJsxAttribute(property) && property.name.text === name,
  )
}

function hasDescendantTable(element) {
  const children = ts.isJsxElement(element) ? element.children : []
  for (const child of children) {
    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
      if (tagName(child).toLowerCase() === 'table') return true
      if (hasDescendantTable(child)) return true
    } else if (ts.isJsxExpression(child) && child.expression) {
      if (containsTableInExpression(child.expression)) return true
    }
  }
  return false
}

function containsTableInExpression(node) {
  let found = false
  const visit = (current) => {
    if (found) return
    if (ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current)) {
      if (tagName(current).toLowerCase() === 'table') {
        found = true
        return
      }
      if (hasDescendantTable(current)) {
        found = true
        return
      }
    }
    ts.forEachChild(current, visit)
  }
  visit(node)
  return found
}

export function inspectTableHorizontalScroll(source, file = '<inline>') {
  const sf = sourceFile(file, source)
  const violations = []

  const visit = (node) => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const classes = classNameTokens(node, sf)
      if (SCROLL_TOKENS.test(classes) && !hasAttribute(node, 'data-mx-scroll-region')) {
        const name = tagName(node, sf)
        if (name !== 'ScrollableRegion' && hasDescendantTable(node)) {
          const opening = openingElement(node)
          const line = sf.getLineAndCharacterOfPosition(opening.getStart(sf)).line + 1
          violations.push({ file, line, utility: classes.trim().split(/\s+/).slice(0, 8).join(' '), tag: name })
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sf)
  return violations
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!['node_modules', '.git', 'base44-reference', '_stories'].includes(entry.name)) walk(full, files)
    } else if (
      SOURCE_EXTENSIONS.some((extension) => entry.name.endsWith(extension)) &&
      !/\.(test|spec|playwright)\./.test(entry.name)
    ) {
      files.push(full)
    }
  }
  return files
}

export function runTableHorizontalScrollGate() {
  const violations = []
  for (const filePath of walk(SRC_DIR)) {
    const text = readText(filePath)
    // Escopo FASE I: páginas canônicas que importam PageCanvas ou PageTemplate.
    // Seções profundas (DashboardLoja, components/) são inventário 23.015.
    if (!text.includes('PageCanvas') && !text.includes('PageTemplate')) continue
    const relative = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/')
    const found = inspectTableHorizontalScroll(text, relative)
    violations.push(...found)
  }
  return violations.sort((a, b) => `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`))
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isCli) {
  const violations = runTableHorizontalScrollGate()
  const result = {
    gate: 'lint-table-horizontal-scroll',
    pass: violations.length === 0,
    violationCount: violations.length,
    violations,
  }

  if (JSON_MODE) {
    console.log(JSON.stringify(result, null, 2))
  } else if (violations.length === 0) {
    console.log('[lint-table-horizontal-scroll] OK — nenhuma tabela com scroll horizontal não-declarado')
  } else {
    console.error(`[lint-table-horizontal-scroll] ${violations.length} ocorrência(s) de scroll horizontal de tabela não-declarado:`)
    for (const violation of violations) {
      console.error(`  - ${violation.file}:${violation.line} (${violation.tag}) ${violation.utility}`)
    }
  }

  process.exit(violations.length === 0 ? 0 : 1)
}
