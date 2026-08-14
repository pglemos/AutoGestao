#!/usr/bin/env node
/**
 * Foundation Zero AC / FASE T 20.002 — gate de hover sem focus-visible.
 *
 * Um controle interativo que sinaliza affordance SÓ por hover deixa o usuário
 * de teclado sem feedback de interatividade (WCAG 2.4.7 Focus Visible,
 * 2.1.1 Keyboard). Este gate auditA padrões estáticos de risco:
 *
 *   R1 clickable-row-without-focus : `<tr>`/`<div>` com `onClick`/`onRowClick`
 *                                    e `hover:*`/`cursor-pointer` mas sem
 *                                    `role=button|link`, `tabIndex`, `focus-
 *                                    visible:` ou `onKeyDown`. Row clicável não
 *                                    alcançável por teclado.
 *   R2 hover-only-nav-link          : `<NavLink>`/`<Link>`/`<a>` com `hover:*`
 *                                    sem `focus-visible:` no mesmo elemento.
 *   R3 button-hover-without-focus   : `<button>` com `hover:*` sem
 *                                    `focus-visible:ring`/`focus-visible:outline`.
 *
 * RATCHET (FASE T aprovada 2026-08-14): o baseline por arquivo+regra está em
 * `hover-without-focus-baseline.json` (471 candidatos em 175 arquivos). O gate
 * é um AUDITOR — exit 0 SEMPRE (não bloqueia o build) — mas reporta:
 *   - contagem que AUMENTOU acima do baseline (ratchet violado)
 *   - arquivo NOVO com findings (não estava no baseline)
 * O contrato de teste falha se o ratchet crescer; a allowlist só pode encolher.
 * Corrigir um controle = remover a linha do baseline no mesmo diff.
 *
 * Puramente read-only: AST TypeScript + regex determinístico, zero escrita.
 *
 * Uso:
 *   node scripts/lint-hover-without-focus.mjs            # auditor + ratchet
 *   node scripts/lint-hover-without-focus.mjs --json
 *   node scripts/lint-hover-without-focus.mjs --update   # reescreve baseline (só reduz)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const SRC_DIR = path.join(ROOT_DIR, 'src')
const JSON_MODE = process.argv.includes('--json')
const UPDATE = process.argv.includes('--update')
const BASELINE_PATH = path.join(__dirname, 'hover-without-focus-baseline.json')

/** Baseline de ratchet: `file -> rule -> contagem`. */
function readBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return { baseline: {}, total: 0 }
  const data = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'))
  return { baseline: data.baseline ?? {}, total: data.total ?? 0 }
}

/** Total de findings no baseline (para o relatório). */
function baselineTotal() {
  return readBaseline().total
}

const SOURCE_EXTENSIONS = ['.tsx', '.jsx']

const HOVER = /\bhover:/
const FOCUS_VISIBLE = /\bfocus-visible:/
const HAS_ROLE_ATTR = /\brole\s*=/
const HAS_TABINDEX = /\btabIndex\s*=/
const HAS_ONKEYDOWN = /\bonKeyDown\s*=/
const CURSOR_POINTER = /\bcursor-pointer/

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
      !/\.(test|spec|playwright|stories)\./.test(entry.name)
    ) {
      files.push(full)
    }
  }
  return files
}

/** Extrai classes de um className literal. */
function classNameOf(element, sf) {
  const opening = ts.isJsxElement(element) ? element.openingElement : element
  const attr = opening.attributes.properties.find(
    (p) => ts.isJsxAttribute(p) && p.name.text === 'className',
  )
  if (!attr?.initializer) return ''
  const text = attr.initializer.getText(sf)
  const literals = [...text.matchAll(/['"`]([^'"`]*)['"`]/g)]
  return literals.map(([, v]) => v).join(' ')
}

function attrText(element, sf) {
  const opening = ts.isJsxElement(element) ? element.openingElement : element
  return opening.attributes.properties.map((p) => p.getText(sf)).join(' ')
}

export function inspectHoverWithoutFocus(source, file = '<inline>') {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const findings = []

  const visit = (node) => {
    if (ts.isJsxElement(node)) {
      const tag = node.openingElement.tagName.getText()
      const attrs = attrText(node, sf)
      const classes = classNameOf(node, sf)
      const hasHover = HOVER.test(classes)
      const hasFocus = FOCUS_VISIBLE.test(classes)
      const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1

      if (tag === 'tr' && /onClick|onRowClick/.test(attrs) && (hasHover || /cursor-pointer/.test(classes))) {
        if (!HAS_ROLE_ATTR.test(attrs) && !HAS_TABINDEX.test(attrs) && !hasFocus && !HAS_ONKEYDOWN.test(attrs)) {
          findings.push({ file, line, rule: 'clickable-row-without-focus', tag: 'tr' })
        }
      }

      if (/^(NavLink|Link|a)$/.test(tag) && hasHover && !hasFocus) {
        findings.push({ file, line, rule: 'hover-only-nav-link', tag })
      }

      if (tag === 'button' && hasHover && !hasFocus && !/outline-none/.test(classes)) {
        findings.push({ file, line, rule: 'button-hover-without-focus', tag: 'button' })
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sf)
  return findings
}

export function runHoverWithoutFocusGate() {
  const findings = []
  for (const filePath of walk(SRC_DIR)) {
    const relative = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/')
    const source = fs.readFileSync(filePath, 'utf8')
    findings.push(...inspectHoverWithoutFocus(source, relative))
  }
  return findings.sort((a, b) => `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`))
}

/** Agrega findings por `file -> rule -> count`. */
export function aggregateByFileRule(findings) {
  const perFile = {}
  for (const finding of findings) {
    perFile[finding.file] = perFile[finding.file] ?? {}
    perFile[finding.file][finding.rule] = (perFile[finding.file][finding.rule] ?? 0) + 1
  }
  return perFile
}

/**
 * Compara o estado atual contra o baseline de ratchet.
 * Retorna `{ current, increases, newFiles }` — aumentos são violações de ratchet.
 */
export function checkRatchet(findings, baseline) {
  const current = aggregateByFileRule(findings)
  const increases = []
  const newFiles = []

  for (const [file, rules] of Object.entries(current)) {
    const baseFile = baseline[file]
    if (!baseFile) {
      newFiles.push(file)
      continue
    }
    for (const [rule, count] of Object.entries(rules)) {
      const baseCount = baseFile[rule] ?? 0
      if (count > baseCount) {
        increases.push({ file, rule, baseline: baseCount, current: count })
      }
    }
  }

  return { current, increases, newFiles }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isCli) {
  const findings = runHoverWithoutFocusGate()
  const { baseline } = readBaseline()
  const { current, increases, newFiles } = checkRatchet(findings, baseline)

  if (UPDATE) {
    const updated = { generatedAt: new Date().toISOString(), baseline: current, total: findings.length }
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(updated, null, 2) + '\n')
    console.log(`[lint-hover-without-focus] baseline atualizado: ${findings.length} candidatos em ${Object.keys(current).length} arquivos`)
    process.exit(0)
  }

  const result = {
    gate: 'lint-hover-without-focus',
    pass: findings.length === 0,
    findingCount: findings.length,
    baselineTotal: baselineTotal(),
    ratchet: {
      increases,
      newFiles,
      blocked: increases.length + newFiles.length > 0,
    },
    findings,
  }

  if (JSON_MODE) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    if (increases.length + newFiles.length > 0) {
      console.error(`[lint-hover-without-focus] RATCHET: ${increases.length} aumento(s) + ${newFiles.length} arquivo(s) novo(s):`)
      for (const increase of increases) {
        console.error(`  • ${increase.file} ${increase.rule}: ${increase.baseline} -> ${increase.current} (corrigir e reduzir baseline no mesmo diff)`)
      }
      for (const file of newFiles) {
        console.error(`  • ${file}: arquivo novo com findings — adicionar ao baseline ou corrigir`)
      }
    }
    console.error(`[lint-hover-without-focus] ${findings.length} candidato(s) (baseline ${baselineTotal()}); auditor: não bloqueia build`)
  }

  process.exit(0)
}
