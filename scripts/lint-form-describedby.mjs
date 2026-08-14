#!/usr/bin/env node
/**
 * Foundation Zero AC / FASE V 22.004 — gate de aria-describedby em field errors.
 *
 * Um controle de formulário que sinaliza erro só por `aria-invalid`/borda não
 * expõe a mensagem de erro a leitores de tela (WCAG 1.3.1, 3.3.1, 4.1.2). O
 * padrão canônico (`Field`/`FormField`) injeta `aria-describedby` apontando
 * para o helper/error via spread `{...control}`. Este auditor flagra controles
 * com `aria-invalid` que NÃO recebem `aria-describedby` na própria tag nem via
 * `{...control}`/spread de um wrapper canônico.
 *
 * Heurística determinística (read-only): para cada `<Input|input|select|...>`
 * com `aria-invalid`, exige `aria-describedby` na própria tag OU um spread
 * `{...control}`/`{...props}`/`{...field}` no mesmo elemento.
 *
 * Uso:
 *   node scripts/lint-form-describedby.mjs
 *   node scripts/lint-form-describedby.mjs --json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const JSON_MODE = process.argv.includes('--json')

export function inspectFormDescribedBy(source, file = '<inline>') {
  const findings = []
  const re = /<(Input|input|select|textarea)\b([^>]*?)aria-invalid[^>]*>/g
  let m
  while ((m = re.exec(source))) {
    const tag = m[1]
    const attrs = m[2] || ''
    const elStart = m.index
    // extrair bloco até o `>` respeitando strings/arrow/braces (mesma técnica do keyboard lint)
    let quote = null
    let template = null
    let braceDepth = 0
    let parenDepth = 0
    let end = elStart
    for (let i = elStart; i < source.length; i++) {
      const ch = source[i]
      const next = source[i + 1]
      if (quote) { if (ch === '\\') { i++; continue } if (ch === quote) quote = null; continue }
      if (template) { if (ch === '\\') { i++; continue } if (ch === '`') template = null; continue }
      if (ch === '"' || ch === "'") { quote = ch; continue }
      if (ch === '`') { template = true; continue }
      if (ch === '{') braceDepth++
      if (ch === '}') braceDepth--
      if (ch === '(') parenDepth++
      if (ch === ')') parenDepth--
      if (ch === '=' && next === '>') { i++; continue }
      if (ch === '>' && braceDepth === 0 && parenDepth === 0) { end = i + 1; break }
    }
    const block = source.slice(elStart, end)
    const hasDescribedBy = /aria-describedby/.test(block)
    const hasControlSpread = /\{\.\.\.(control|props|field|form|register)|\{\.\.\.rest\}/.test(block)
    const hasEslint = /eslint-disable/.test(source.slice(Math.max(0, elStart - 300), elStart))
    if (!hasDescribedBy && !hasControlSpread && !hasEslint) {
      findings.push({
        file,
        line: source.slice(0, elStart).split('\n').length,
        rule: 'error-without-describedby',
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

export function runFormDescribedByGate() {
  const files = walk(path.join(ROOT, 'src'))
  const findings = []
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8')
    findings.push(...inspectFormDescribedBy(source, path.relative(ROOT, file)))
  }

  const result = {
    gate: 'lint-form-describedby',
    pass: findings.length === 0,
    findingCount: findings.length,
    findings,
  }

  if (JSON_MODE) {
    console.log(JSON.stringify(result, null, 2))
  } else if (findings.length === 0) {
    console.log('[lint-form-describedby] OK — nenhum controle com aria-invalid sem descrição de erro')
  } else {
    console.error(`[lint-form-describedby] ${findings.length} candidato(s) a erro sem aria-describedby:`)
    for (const finding of findings) {
      console.error(`  - ${finding.file}:${finding.line} (${finding.rule}) <${finding.tag}>`)
    }
  }

  process.exit(0)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runFormDescribedByGate()
}
