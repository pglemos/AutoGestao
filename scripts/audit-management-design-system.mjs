import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { managementSourceEntries } from '../src/design-system/management/managementRouteManifest.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(currentDir, '..')
const sourceRoot = path.join(projectRoot, 'src')
const baselinePath = process.env.MANAGEMENT_DESIGN_SYSTEM_BASELINE_FILE
  ? path.resolve(process.env.MANAGEMENT_DESIGN_SYSTEM_BASELINE_FILE)
  : path.join(currentDir, 'management-design-system-baseline.json')

const SELLER_ENTRIES = [
  'features/checkin/Checkin.container.tsx',
  'pages/Ranking.tsx',
  'pages/VendedorDesenvolvimento.tsx',
  'pages/VendedorTreinamentos.tsx',
  'pages/VendedorAjuda.tsx',
  'pages/VendedorConfiguracoes.tsx',
  'pages/MinhaRemuneracao.tsx',
  'pages/CarteiraClientes.tsx',
  'pages/FunilVendedor.tsx',
  'pages/CentralExecucao.tsx',
  'pages/MeuPerfilVendedor.tsx',
  'pages/RelatoriosVendedor.tsx',
  'pages/StoreConsultorIa.tsx',
]

const SOURCE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.css']
const MANAGEMENT_OWNED_ROOTS = ['features/lojas']
const IMPORT_PATTERN = /(?:import|export)\s+(?:[^'\"]*?\s+from\s+)?['\"]([^'\"]+)['\"]|import\(\s*['\"]([^'\"]+)['\"]\s*\)/g
const SELLER_ONLY_BLOCK = /\/\* management-audit:seller-only-start \*\/[\s\S]*?\/\* management-audit:seller-only-end \*\//g

export const forbiddenManagementPatterns = [
  // Fase 4 (T4.3–T4.9) canonizou no @theme os aliases semânticos usados em
  // todo o app: `--color-text-*`, `--color-surface-*`, `--color-border-*`,
  // `--color-brand-primary*`, `--color-brand-secondary`, `--color-pure-black`,
  // `--color-status-*`, `--color-mx-action`/`--color-mx-teal` e o `@utility
  // font-mono-numbers`. As regras que os flagravam como "legado" foram
  // removidas — eram falsos positivos contra a convenção vigente, ratificada
  // pelos gates lint-colors (T4.9) e lint-tokens-ast. O auditor agora só
  // pega padrões genuinamente obsoletos:
  { id: 'legacy-wrapper', expression: /\b(?:mxds-[\w-]+|mx-internal-[\w-]+)\b/g },
  { id: 'legacy-action-shadow', expression: /\bshadow-action\b/g },
]

export function stripSellerOnlyRegions(source) {
  return source.replace(SELLER_ONLY_BLOCK, (block) => block.replace(/[^\n]/g, ' '))
}

function listSourceFiles(directory) {
  const files = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...listSourceFiles(absolute))
    else if (SOURCE_EXTENSIONS.includes(path.extname(entry.name))) files.push(absolute)
  }
  return files
}

function resolveImport(importer, specifier) {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return null
  const unresolved = specifier.startsWith('@/')
    ? path.join(sourceRoot, specifier.slice(2))
    : path.resolve(path.dirname(importer), specifier)
  const candidates = path.extname(unresolved)
    ? [unresolved]
    : [
        ...SOURCE_EXTENSIONS.map((extension) => `${unresolved}${extension}`),
        ...SOURCE_EXTENSIONS.map((extension) => path.join(unresolved, `index${extension}`)),
      ]
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null
}

function buildGraph() {
  const graph = new Map()
  for (const file of listSourceFiles(sourceRoot)) {
    if (path.extname(file) === '.css') {
      graph.set(file, [])
      continue
    }
    const source = fs.readFileSync(file, 'utf8')
    const imports = []
    for (const match of source.matchAll(IMPORT_PATTERN)) {
      const resolved = resolveImport(file, match[1] ?? match[2])
      if (resolved) imports.push(resolved)
    }
    graph.set(file, imports)
  }
  return graph
}

function collectReachable(graph, entries) {
  const reachable = new Set()
  const stack = entries
    .map((entry) => path.join(sourceRoot, entry))
    .filter((entry) => fs.existsSync(entry))
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current || reachable.has(current)) continue
    reachable.add(current)
    for (const dependency of graph.get(current) ?? []) stack.push(dependency)
  }
  return reachable
}

function sha256(source) {
  return createHash('sha256').update(source).digest('hex')
}

function readBaseline() {
  if (!fs.existsSync(baselinePath)) return {}
  const parsed = JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
  return parsed.source_sha256 ?? {}
}

export function auditManagementDesignSystem({ root = projectRoot } = {}) {
  if (root !== projectRoot) {
    throw new Error('A auditoria de fixtures deve usar auditText; root alternativo não é suportado.')
  }
  const graph = buildGraph()
  const managementReachable = collectReachable(graph, managementSourceEntries)
  const sellerReachable = collectReachable(graph, SELLER_ENTRIES)
  const exclusiveFiles = [...managementReachable].filter((file) => !sellerReachable.has(file))
  const ownedFiles = MANAGEMENT_OWNED_ROOTS.flatMap((ownedRoot) => {
    const absolute = path.join(sourceRoot, ownedRoot)
    return fs.existsSync(absolute) ? listSourceFiles(absolute) : []
  }).filter((file) => !/\.(?:test|spec)\.(?:ts|tsx|js|jsx)$/.test(file))
  const auditedFiles = [...new Set([...exclusiveFiles, ...ownedFiles])]
  const baseline = readBaseline()
  const violations = []
  let baselineSuppressed = 0

  for (const file of auditedFiles) {
    if (!['.tsx', '.jsx', '.css'].includes(path.extname(file))) continue
    const rawSource = fs.readFileSync(file, 'utf8')
    const source = stripSellerOnlyRegions(rawSource)
    const relativeFile = path.relative(sourceRoot, file).split(path.sep).join('/')
    const isBaselineFile = baseline[relativeFile] === sha256(rawSource)
    for (const pattern of forbiddenManagementPatterns) {
      for (const match of source.matchAll(pattern.expression)) {
        if (isBaselineFile) {
          baselineSuppressed += 1
          continue
        }
        const prefix = source.slice(0, match.index)
        const line = prefix.split('\n').length
        violations.push({
          file: relativeFile,
          line,
          rule: pattern.id,
          token: match[0],
        })
      }
    }
  }

  return {
    entries: managementSourceEntries.length,
    reachableFiles: managementReachable.size,
    sellerSharedFiles: [...managementReachable].filter((file) => sellerReachable.has(file)).length,
    auditedExclusiveFiles: exclusiveFiles.length,
    auditedOwnedFiles: ownedFiles.length,
    auditedFiles: auditedFiles.length,
    baselineFiles: Object.keys(baseline).length,
    baselineSuppressed,
    violations,
  }
}

export function auditText(source) {
  const auditableSource = stripSellerOnlyRegions(source)
  const violations = []
  for (const pattern of forbiddenManagementPatterns) {
    for (const match of auditableSource.matchAll(pattern.expression)) {
      violations.push({ rule: pattern.id, token: match[0] })
    }
  }
  return violations
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = auditManagementDesignSystem()
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  if (report.violations.length > 0) process.exitCode = 1
}
