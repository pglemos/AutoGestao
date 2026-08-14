#!/usr/bin/env node
/**
 * Foundation Zero AC / FASE T 20.007 — gate de keyboard activation.
 *
 * Um elemento não-nativo com `onClick` que não é alcançável/operável por
 * teclado viola WCAG 2.1.1 (Keyboard) e 4.1.2 (Name, Role, Value): sem
 * `role="button|link|...`, `tabIndex` e um handler de teclado (Space/Enter),
 * usuários de teclado não conseguem ativar o controle.
 *
 * Regras:
 *   R1 non-native-clickable    : `<div|span|tr|td|li|section|article|ul>` com
 *                                `onClick` sem `role=button|link|...`,
 *                                `tabIndex`, `onKeyDown` ou `eslint-disable`.
 *
 * Este gate é um AUDITOR (mesma filosofia do lint-hover-without-focus): aponta
 * candidatos para revisão, não bloqueia build. Containers com bubbling
 * legítimos devem usar `role="presentation"` + `eslint-disable` ou um handler
 * de teclado adequado.
 *
 * Puramente read-only: regex determinístico sobre o source. Zero escrita.
 *
 * Uso:
 *   node scripts/lint-keyboard-activation.mjs
 *   node scripts/lint-keyboard-activation.mjs --json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const JSON_MODE = process.argv.includes('--json')

const NON_NATIVE_TAGS = ['div', 'span', 'tr', 'td', 'li', 'section', 'article', 'ul']
const VALID_ROLES = /role=["'](button|link|menuitem|switch|checkbox|radio|tab|treeitem|presentation|dialog|group|region|presentation)["']/

export function inspectKeyboardActivation(source, file = '<inline>') {
  const findings = []
  const re = /<(div|span|tr|td|li|section|article|ul)\b[^>]*?onClick/g
  let m
  while ((m = re.exec(source))) {
    const tag = m[1]
    const elStart = m.index
    // extrair o bloco do elemento até o `>` de fechamento, respeitando strings,
    // `=>` de arrow functions, JSX expressions `{}` e templates.
    let quote = null
    let template = null
    let braceDepth = 0
    let parenDepth = 0
    let end = elStart
    for (let i = elStart; i < source.length; i++) {
      const ch = source[i]
      const next = source[i + 1]
      if (quote) {
        if (ch === '\\') { i++; continue }
        if (ch === quote) quote = null
        continue
      }
      if (template) {
        if (ch === '\\') { i++; continue }
        if (ch === '`') template = null
        continue
      }
      if (ch === '"' || ch === "'") { quote = ch; continue }
      if (ch === '`') { template = true; continue }
      if (ch === '{') braceDepth++
      if (ch === '}') braceDepth--
      if (ch === '(') parenDepth++
      if (ch === ')') parenDepth--
      // `=>` de arrow function: não é fechamento de tag
      if (ch === '=' && next === '>') { i++; continue }
      if (ch === '>' && braceDepth === 0 && parenDepth === 0) { end = i + 1; break }
    }
    const block = source.slice(elStart, end)
    const hasRole = VALID_ROLES.test(block)
    const hasTab = /tabIndex/.test(block)
    const hasKey = /onKeyDown/.test(block)
    const hasEslint = /eslint-disable/.test(source.slice(Math.max(0, elStart - 400), elStart))
    if (!hasRole && !hasTab && !hasKey && !hasEslint) {
      findings.push({
        file,
        line: source.slice(0, elStart).split('\n').length,
        rule: 'non-native-clickable',
        tag,
      })
    }
  }
  return findings
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.includes('base44')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (/\.(tsx|jsx)$/.test(entry.name)) files.push(full)
  }
  return files
}

export function runKeyboardActivationGate() {
  const files = walk(path.join(ROOT, 'src'))
  const findings = []
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8')
    const rel = path.relative(ROOT, file)
    findings.push(...inspectKeyboardActivation(source, rel))
  }

  const result = {
    gate: 'lint-keyboard-activation',
    pass: findings.length === 0,
    findingCount: findings.length,
    findings,
  }

  if (JSON_MODE) {
    console.log(JSON.stringify(result, null, 2))
  } else if (findings.length === 0) {
    console.log('[lint-keyboard-activation] OK — nenhum controle clicável não-nativo sem teclado')
  } else {
    console.error(`[lint-keyboard-activation] ${findings.length} candidato(s) a controle sem teclado:`)
    for (const finding of findings) {
      console.error(`  - ${finding.file}:${finding.line} (${finding.rule}) <${finding.tag}>`)
    }
  }

  process.exit(0)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runKeyboardActivationGate()
}
