#!/usr/bin/env node
/**
 * Foundation Zero — contrato de região de rolagem declarada FOCÁVEL.
 *
 * Um `data-mx-scroll-region` só faz sentido se quem navega por teclado alcançar
 * a região: é a regra `scrollable-region-focusable` do axe (WCAG 2.1.1). O
 * primitivo canônico `ScrollableRegion` já garante `tabIndex={0}` +
 * `role="region"` + `aria-label` em um lugar só. Um `<div>` cru com o marcador
 * mas sem `tabIndex`/`role`/`aria-label` é declarado para o harness, porém
 * inalcançável por teclado — o resíduo reproduzido em /ranking mobile
 * (TabelaRanking.tsx).
 *
 * Escopo da fatia: regiões declaradas que envolvem `<table>` (tabela de dados),
 * onde o scroll por teclado é obrigatório. Corpos de drawer/modal vertical e
 * Kanban têm foco gerenciado pelo próprio overlay/componente e ficam fora.
 *
 * Puramente read-only: AST TypeScript, zero escrita, zero runtime.
 *
 * Uso:
 *   node scripts/lint-scroll-region-focusable.mjs
 *   node scripts/lint-scroll-region-focusable.mjs --json
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
  return openingElement(node).tagName.getText(sf)
}

function hasAttribute(element, name) {
  const opening = openingElement(element)
  return opening.attributes.properties.some(
    (property) => ts.isJsxAttribute(property) && property.name.text === name,
  )
}

function attributeValue(element, name) {
  const opening = openingElement(element)
  const property = opening.attributes.properties.find(
    (p) => ts.isJsxAttribute(p) && p.name.text === name,
  )
  if (!property?.initializer) return null
  const text = property.initializer.getText()
  const match = text.match(/^['"`]([^'"`]*)['"`]$/)
  return match ? match[1] : null
}

function isFocusableRegion(element) {
  if (hasAttribute(element, 'tabIndex')) return true
  const role = attributeValue(element, 'role')
  const labeled = hasAttribute(element, 'aria-label') || hasAttribute(element, 'aria-labelledby')
  return role === 'region' && labeled
}

function hasDescendantTable(element) {
  const children = ts.isJsxElement(element) ? element.children : []
  for (const child of children) {
    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
      if (tagName(child).toLowerCase() === 'table') return true
      if (hasDescendantTable(child)) return true
    } else if (ts.isJsxExpression(child) && child.expression) {
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
      visit(child.expression)
      if (found) return true
    }
  }
  return false
}

export function inspectScrollRegionFocusable(source, file = '<inline>') {
  const sf = sourceFile(file, source)
  const violations = []

  const visit = (node) => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (hasAttribute(node, 'data-mx-scroll-region')) {
        if (!isFocusableRegion(node) && hasDescendantTable(node)) {
          const opening = openingElement(node)
          const line = sf.getLineAndCharacterOfPosition(opening.getStart(sf)).line + 1
          violations.push({ file, line, tag: tagName(node, sf) })
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

export function runScrollRegionFocusableGate() {
  const violations = []
  for (const filePath of walk(SRC_DIR)) {
    const relative = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/')
    violations.push(...inspectScrollRegionFocusable(readText(filePath), relative))
  }
  return violations.sort((a, b) => `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`))
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isCli) {
  const violations = runScrollRegionFocusableGate()
  const result = {
    gate: 'lint-scroll-region-focusable',
    pass: violations.length === 0,
    violationCount: violations.length,
    violations,
  }

  if (JSON_MODE) {
    console.log(JSON.stringify(result, null, 2))
  } else if (violations.length === 0) {
    console.log('[lint-scroll-region-focusable] OK — toda região de tabela declarada é focável')
  } else {
    console.error(`[lint-scroll-region-focusable] ${violations.length} região(ões) de tabela declarada sem foco:`)
    for (const violation of violations) {
      console.error(`  - ${violation.file}:${violation.line} (${violation.tag})`)
    }
  }

  process.exit(violations.length === 0 ? 0 : 1)
}
