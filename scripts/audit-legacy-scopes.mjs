import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Auditoria de scopes legados — C0.3 (Eliminar scopes legados).
 *
 * Bloqueia a reintrodução de:
 *   - `data-mx-internal-scope` (atributo do escopo visual interno MX);
 *   - seletores de classe `.mx-manager-scope` e `.owner-b44` (escopos de
 *     aparência por perfil já eliminados);
 *   - seletores de classe `.mx-manager-page-1to1` (clone 1:1 proibido).
 *
 * Seletores de classe só são auditados em `.css`: em TS/JSX os nomes podem
 * aparecer como documentação histórica (ex.: `'mx-manager-scope'` em teste de
 * regressão ou `@/lib/owner-b44/...` em imports do módulo do Dono).
 */

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(currentDir, '..')
const sourceRoot = path.join(projectRoot, 'src')
const SOURCE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.css']

export const legacyScopePatterns = [
  {
    id: 'legacy-internal-scope-attribute',
    expression: /data-mx-internal-scope\b/g,
    onlyCss: false,
  },
  {
    id: 'legacy-mx-manager-scope-class',
    expression: /\.mx-manager-scope\s*[,{]/g,
    onlyCss: true,
  },
  {
    id: 'legacy-owner-b44-class',
    expression: /\.owner-b44\s*[,{]/g,
    onlyCss: true,
  },
  {
    id: 'legacy-manager-page-1to1-class',
    expression: /\.mx-manager-page-1to1\b/g,
    onlyCss: true,
  },
]

function listSourceFiles(directory) {
  const files = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...listSourceFiles(absolute))
    else if (SOURCE_EXTENSIONS.includes(path.extname(entry.name))) files.push(absolute)
  }
  return files
}

export function auditLegacyScopes({ root = projectRoot } = {}) {
  if (root !== projectRoot) {
    throw new Error('A auditoria de fixtures deve usar auditText; root alternativo não é suportado.')
  }
  const violations = []
  let scannedFiles = 0
  for (const file of listSourceFiles(sourceRoot)) {
    scannedFiles += 1
    const source = fs.readFileSync(file, 'utf8')
    const isCss = path.extname(file) === '.css'
    for (const pattern of legacyScopePatterns) {
      if (pattern.onlyCss && !isCss) continue
      for (const match of source.matchAll(pattern.expression)) {
        const prefix = source.slice(0, match.index)
        const line = prefix.split('\n').length
        violations.push({
          file: path.relative(sourceRoot, file).split(path.sep).join('/'),
          line,
          rule: pattern.id,
          token: match[0],
        })
      }
    }
  }
  return { scannedFiles, violations }
}

export function auditText(source) {
  const violations = []
  for (const pattern of legacyScopePatterns) {
    for (const match of source.matchAll(pattern.expression)) {
      violations.push({ rule: pattern.id, token: match[0] })
    }
  }
  return violations
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = auditLegacyScopes()
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  if (report.violations.length > 0) process.exitCode = 1
}
