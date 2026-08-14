#!/usr/bin/env node
/**
 * Foundation Zero AC-29.002.
 *
 * Toda rota viva precisa resolver para uma entrada explícita de
 * `routeLayoutMetadata.ts` (correspondência exata ou prefixo documentado).
 * O default continua sendo útil em runtime para tolerar links antigos, mas
 * não pode esconder uma rota nova do inventário de layout.
 *
 * Uso:
 *   node scripts/lint-route-layout-metadata.mjs
 *   node scripts/lint-route-layout-metadata.mjs --json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const APP_PATH = path.join(ROOT_DIR, 'src/App.tsx')
const METADATA_PATH = path.join(ROOT_DIR, 'src/design-system/page/routeLayoutMetadata.ts')
const JSON_MODE = process.argv.includes('--json')

const VALID_WIDTHS = new Set(['fluid', 'dashboard', 'wide', 'focused', 'form', 'reading'])
const VALID_DENSITIES = new Set(['comfortable', 'compact'])
const VALID_CLEARANCES = new Set(['none', 'navigation', 'actions'])

function normalizeRoute(value) {
  return value.replace(/^\/+|\/+$/g, '')
}

function collectAppRoutes(source) {
  const routes = new Set()
  const routePattern = /<Route\s+path\s*=\s*(?:"([^"]+)"|'([^']+)'|\{\s*["']([^"']+)["']\s*\})/g
  for (const match of source.matchAll(routePattern)) {
    const route = match[1] ?? match[2] ?? match[3]
    if (!route || route === '*' || route === '/' || route.endsWith('/*')) continue
    routes.add(route)
  }
  return [...routes].sort()
}

function collectMetadata(source) {
  const entries = []
  const entryPattern = /(?:^|\n)\s*(?:'([^']+)'|([A-Za-z0-9_-]+))\s*:\s*\{([^}]*)\}/g
  for (const match of source.matchAll(entryPattern)) {
    const key = match[1] ?? match[2]
    const block = match[3]
    const width = block.match(/\bwidth:\s*'([^']+)'/)?.[1]
    const density = block.match(/\bdensity:\s*'([^']+)'/)?.[1]
    const bottomClearance = block.match(/\bbottomClearance:\s*'([^']+)'/)?.[1]
    entries.push({ key, normalizedKey: normalizeRoute(key), width, density, bottomClearance })
  }
  return entries
}

function resolveEntry(route, entries) {
  const normalized = normalizeRoute(route)
  const exact = entries.find(entry => entry.key === route || entry.normalizedKey === normalized)
  if (exact) return exact
  return entries
    .filter(entry => entry.normalizedKey && normalized.startsWith(`${entry.normalizedKey}/`))
    .sort((a, b) => b.normalizedKey.length - a.normalizedKey.length)[0] ?? null
}

export function inspectRouteLayoutMetadata(appSource, metadataSource) {
  const routes = collectAppRoutes(appSource)
  const entries = collectMetadata(metadataSource)
  const missing = routes.filter(route => !resolveEntry(route, entries))
  const invalid = entries
    .filter(entry =>
      !entry.width ||
      !VALID_WIDTHS.has(entry.width) ||
      (entry.density && !VALID_DENSITIES.has(entry.density)) ||
      (entry.bottomClearance && !VALID_CLEARANCES.has(entry.bottomClearance)),
    )
    .map(entry => ({ key: entry.key, width: entry.width, density: entry.density, bottomClearance: entry.bottomClearance }))

  return {
    gate: 'lint-route-layout-metadata',
    pass: missing.length === 0 && invalid.length === 0,
    routeCount: routes.length,
    metadataCount: entries.length,
    missing,
    invalid,
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isCli) {
  const result = inspectRouteLayoutMetadata(
    fs.readFileSync(APP_PATH, 'utf8'),
    fs.readFileSync(METADATA_PATH, 'utf8'),
  )

  if (JSON_MODE) {
    console.log(JSON.stringify(result, null, 2))
  } else if (result.pass) {
    console.log(`[lint-route-layout-metadata] OK — ${result.routeCount} rotas resolvidas por metadata explícita`)
  } else {
    console.error('[lint-route-layout-metadata] FALHA')
    if (result.missing.length > 0) console.error(`  rotas sem classificação: ${result.missing.join(', ')}`)
    if (result.invalid.length > 0) console.error(`  entradas inválidas: ${JSON.stringify(result.invalid)}`)
  }

  process.exit(result.pass ? 0 : 1)
}
