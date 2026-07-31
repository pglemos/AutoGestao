#!/usr/bin/env node
/**
 * Landmark `main` única por documento (§21, WCAG 1.3.1 / ARIA landmarks).
 *
 * O shell autenticado já emite `<main id="main-content">`. Uma página que
 * renderiza o seu próprio `<main>` produz duas landmarks no mesmo documento:
 * o leitor de tela passa a anunciar dois conteúdos principais, o skip-link
 * deixa de ser determinístico e `page.locator('main')` vira ambíguo — foi
 * assim que o defeito apareceu, como strict mode violation no Playwright.
 *
 * Páginas servidas FORA do shell (login, landing, erro, termos) são o único
 * lugar onde `<main>` é correto, e estão na allowlist abaixo.
 *
 * Uso:
 *   node scripts/lint-landmarks.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = path.join(root, 'src')

/** Renderizadas fora do shell autenticado: `<main>` é a landmark correta. */
const OUTSIDE_SHELL = new Set([
  'src/App.tsx',
  'src/pages/Login.tsx',
  'src/pages/NotFound.tsx',
  'src/pages/OAuthHome.tsx',
  'src/pages/Privacy.tsx',
  'src/pages/StorePreRegistration.tsx',
  'src/pages/Terms.tsx',
  'src/features/landing/MXPerformanceLanding.container.tsx',
  'src/components/MxSidebarShell.tsx',
])

function shouldSkip(relative) {
  return (
    OUTSIDE_SHELL.has(relative) ||
    relative.startsWith('src/base44-reference/') ||
    /\.(test|stories)\.[jt]sx?$/.test(relative)
  )
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (/\.(tsx|jsx)$/.test(entry.name)) files.push(full)
  }
  return files
}

const offenders = []
for (const file of walk(sourceDir)) {
  const relative = path.relative(root, file)
  if (shouldSkip(relative)) continue
  const source = fs.readFileSync(file, 'utf8')
  const lines = source.split('\n')
  lines.forEach((line, index) => {
    if (/<main[\s>]/.test(line) || /role=["']main["']/.test(line)) {
      offenders.push(`${relative}:${index + 1}`)
    }
  })
}

if (offenders.length > 0) {
  console.error(
    `[lint-landmarks] ${offenders.length} landmark(s) main dentro do shell — o shell já provê main#main-content:`,
  )
  for (const offender of offenders) console.error(`  ${offender}`)
  console.error('Use <div> ou <section aria-label> na raiz da página.')
  process.exit(1)
}

console.log('[lint-landmarks] OK — uma única landmark main por documento.')
