#!/usr/bin/env node
/**
 * Onda 2 — regra automatizada contra decisão de layout na raiz de rota (§7.6).
 *
 * A raiz de uma página não pode escolher sua própria margem lateral, largura
 * máxima, centralização ou ritmo vertical. Essas decisões pertencem ao
 * `PageCanvas` (src/design-system/page). Enquanto duas camadas decidem a mesma
 * coisa, títulos equivalentes continuam começando em linhas diferentes entre
 * perfis, e corrigir o alinhamento exige editar 54 arquivos em vez de um.
 *
 * Este lint é um catraca (ratchet), não um portão binário: o inventário atual
 * está congelado em `page-roots-inventory.json` e só pode diminuir. Falhar o
 * build inteiro hoje pararia o trabalho; permitir crescimento deixaria o
 * problema se espalhar. A catraca faz as duas coisas certas ao mesmo tempo.
 *
 * LIMITE CONHECIDO: só o elemento raiz é inspecionado. Um wrapper imediato
 * (`<main><div className="mx-auto max-w-[1500px]">`) escapa, porque distinguir
 * "wrapper de layout" de "primeira seção do conteúdo" gera falso positivo em
 * volume maior do que o que pegaria. Esses casos são resolvidos na migração por
 * perfil (Onda 4), onde a página é lida inteira, não por este lint.
 *
 * Uso:
 *   node scripts/lint-page-roots.mjs            # verifica contra o inventário
 *   node scripts/lint-page-roots.mjs --update   # regrava o inventário (só reduz)
 *   node scripts/lint-page-roots.mjs --json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const INVENTORY_PATH = path.join(__dirname, 'page-roots-inventory.json')

const argv = process.argv.slice(2)
const UPDATE = argv.includes('--update')
const JSON_OUT = argv.includes('--json')

/**
 * `--dir` existe para diagnóstico, não para o gate.
 *
 * A catraca vigia `src/pages`, mas parte das telas reais mora em
 * `src/features` — `/treinamentos` para gerente, por exemplo, delega a
 * `ManagerUniversityReference`. Poder apontar o mesmo scanner para outro
 * diretório mostra o tamanho do que ainda está fora da regra, sem misturar
 * esse número no inventário congelado.
 */
const dirArg = argv.find((arg) => arg.startsWith('--dir='))
const SCAN_DIR = path.join(ROOT_DIR, dirArg ? dirArg.slice('--dir='.length) : 'src/pages')
const PAGES_DIR = SCAN_DIR
const DIAGNOSTIC_ONLY = Boolean(dirArg)

/**
 * Utilitários que representam uma decisão de layout de página.
 * Cada um tem um substituto explícito no PageCanvas.
 */
/**
 * Classes próprias do projeto cuja forma coincide com utilitário de espaçamento.
 *
 * `mx-pre-shell` (definida em src/index.css) é um componente de página inteira,
 * não `margin-x: pre-shell`. Estruturalmente é indistinguível de `p-mx-lg`
 * — prefixo, hífen, nome — então a única saída correta é listar as exceções em
 * vez de inventar uma heurística que erra nos dois sentidos.
 */
const PROJECT_CLASS_PREFIXES = [/^mx-pre-/, /^mx-ds$/]

const PROHIBITED = [
  { re: /(^|\s)-?p[xylrtb]?-\S+/, rule: 'padding', fix: 'padding do PageCanvas' },
  { re: /(^|\s)-?m[xylrtb]?-(?!auto)\S+/, rule: 'margin', fix: 'gap semântico ou PageCanvas' },
  { re: /(^|\s)mx-auto(\s|$)/, rule: 'mx-auto', fix: 'centralização do PageCanvas' },
  { re: /(^|\s)max-w-\S+/, rule: 'max-width', fix: 'width="..." do PageCanvas' },
  { re: /(^|\s)container(\s|$)/, rule: 'container', fix: 'PageCanvas' },
  { re: /(^|\s)space-y-\S+/, rule: 'space-y', fix: 'var(--mx-gap-section)' },
]

/**
 * Linhas com exceção declarada.
 *
 * Existe para um caso legítimo que o lint não distingue sozinho: telas
 * centradas em viewport cheio (acesso negado, recurso inexistente, aguardando
 * carregamento) não são páginas em canvas — o padding ali serve a
 * centralização, não à margem de página. Forçar `PageCanvas` nelas seria
 * aplicar a regra contra o próprio objetivo.
 *
 * Exige comentário na linha justamente para aparecer no diff. Sem isso a
 * exceção viraria escape hatch silencioso.
 */
const IGNORE_LOOKBEHIND = 4

function isIgnored(lines, lineNumber) {
  // Olha para trás em vez de projetar offsets para frente: a justificativa
  // costuma ocupar duas ou três linhas de comentário antes da tag, e contar
  // offsets fixos erra silenciosamente quando ela cresce.
  const start = Math.max(0, lineNumber - 1 - IGNORE_LOOKBEHIND)
  return lines
    .slice(start, lineNumber)
    .some((line) => /lint-page-roots-ignore/.test(line))
}

function walkPages(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkPages(full, files)
    } else if (/\.tsx$/.test(entry.name) && !/\.(test|spec)\.tsx$/.test(entry.name)) {
      files.push(full)
    }
  }
  return files
}

/** Texto estático de um className, ignorando as partes dinâmicas. */
function staticClassName(attribute, sourceFile) {
  if (!attribute?.initializer) return ''
  const init = attribute.initializer
  if (ts.isStringLiteral(init)) return init.text
  // Em `className={cn('...', cond && '...')}` só as literais interessam: a
  // parte condicional pode ser layout legítimo dependente de estado.
  const text = init.getText(sourceFile)
  return [...text.matchAll(/['"`]([^'"`]*)['"`]/g)].map(([, value]) => value).join(' ')
}

/**
 * Elementos JSX raiz de uma página: o primeiro elemento de cada `return` que
 * pertence ao corpo da função de página.
 *
 * Early returns de loading e erro contam. São exatamente onde o padding solto
 * costuma sobreviver a uma migração, e onde o desalinhamento aparece só quando
 * a tela está carregando.
 */
function findRootJsxElements(fn, sourceFile) {
  const roots = []

  function unwrap(node) {
    if (!node) return null
    if (ts.isParenthesizedExpression(node)) return unwrap(node.expression)
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
      return node
    }
    // `cond ? <A/> : <B/>` na raiz: ambos os ramos são raiz.
    if (ts.isConditionalExpression(node)) {
      const whenTrue = unwrap(node.whenTrue)
      const whenFalse = unwrap(node.whenFalse)
      return [whenTrue, whenFalse].filter(Boolean)
    }
    return null
  }

  function visit(node) {
    // Não desce em funções aninhadas: o JSX de um callback (render de item de
    // lista, coluna de tabela) não é raiz de página.
    if (node !== fn && (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node))) {
      return
    }
    if (ts.isReturnStatement(node)) {
      const found = unwrap(node.expression)
      if (Array.isArray(found)) roots.push(...found)
      else if (found) roots.push(found)
    }
    ts.forEachChild(node, visit)
  }

  visit(fn)
  return roots
}

/**
 * Nomes que são a página em si, e não um auxiliar declarado no mesmo arquivo.
 *
 * Distinção essencial: `FunilVendedor.tsx` declara treze componentes, dos quais
 * doze são cards. O padding de um card é decisão legítima do card. Só a raiz do
 * componente exportado como rota é território do PageCanvas. Sem este filtro o
 * lint acusa 9 violações num arquivo que tem 1.
 */
function exportedComponentNames(sourceFile) {
  const names = new Set()

  function visit(node) {
    const exported = node.modifiers?.some(
      (modifier) =>
        modifier.kind === ts.SyntaxKind.ExportKeyword || modifier.kind === ts.SyntaxKind.DefaultKeyword,
    )
    if (exported) {
      if (ts.isFunctionDeclaration(node) && node.name) names.add(node.name.getText(sourceFile))
      if (ts.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          names.add(declaration.name.getText(sourceFile))
        }
      }
    }
    // `export default Componente` — declaração e export em pontos separados.
    if (ts.isExportAssignment(node) && ts.isIdentifier(node.expression)) {
      names.add(node.expression.getText(sourceFile))
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return names
}

function scanFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8')
  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const exportedNames = exportedComponentNames(sourceFile)
  const lines = text.split('\n')
  const violations = []

  function checkRoot(element) {
    // Fragmento não carrega className — é justamente o estado desejado.
    if (ts.isJsxFragment(element)) return
    const opening = ts.isJsxElement(element) ? element.openingElement : element
    const attribute = opening.attributes.properties.find(
      (property) => ts.isJsxAttribute(property) && property.name.getText(sourceFile) === 'className',
    )
    const classes = staticClassName(attribute, sourceFile)
    if (!classes) return

    for (const { re, rule, fix } of PROHIBITED) {
      const match = classes.match(re)
      if (!match) continue
      const utility = match[0].trim()
      if (PROJECT_CLASS_PREFIXES.some((pattern) => pattern.test(utility))) continue
      const { line } = sourceFile.getLineAndCharacterOfPosition(opening.getStart(sourceFile))
      if (isIgnored(lines, line + 1)) continue
      violations.push({
        file: path.relative(ROOT_DIR, filePath).replace(/\\/g, '/'),
        line: line + 1,
        rule,
        utility,
        fix,
      })
    }
  }

  function visit(node) {
    const isComponent =
      (ts.isFunctionDeclaration(node) && node.body) ||
      (ts.isVariableDeclaration(node) &&
        node.initializer &&
        (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)))

    if (isComponent) {
      const fn = ts.isVariableDeclaration(node) ? node.initializer : node
      const name = ts.isVariableDeclaration(node) ? node.name.getText(sourceFile) : node.name?.getText(sourceFile)
      // Convenção do React: componente começa com maiúscula. E precisa ser
      // exportado, ou é auxiliar interno do arquivo.
      if (name && /^[A-Z]/.test(name) && exportedNames.has(name)) {
        for (const root of findRootJsxElements(fn, sourceFile)) checkRoot(root)
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return violations
}

const files = walkPages(PAGES_DIR)
const violations = files.flatMap(scanFile)

/** Contagem por arquivo — a unidade que a catraca controla. */
const counts = {}
for (const violation of violations) {
  counts[violation.file] = (counts[violation.file] ?? 0) + 1
}

if (JSON_OUT) {
  process.stdout.write(JSON.stringify({ counts, violations }, null, 2))
  process.exit(0)
}

if (DIAGNOSTIC_ONLY) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
  const files = Object.entries(counts).sort(([, a], [, b]) => b - a)
  console.log(
    `[lint-page-roots] diagnóstico de ${path.relative(ROOT_DIR, SCAN_DIR)} — ` +
      `${total} ocorrência(s) em ${files.length} arquivo(s). Fora do inventário congelado.`,
  )
  for (const [file, count] of files.slice(0, 15)) console.log(`  ${count}  ${file}`)
  if (files.length > 15) console.log(`  … e ${files.length - 15} arquivo(s)`)
  process.exit(0)
}

const baseline = fs.existsSync(INVENTORY_PATH)
  ? JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8')).counts
  : null

if (UPDATE || !baseline) {
  const merged = {}
  for (const [file, count] of Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))) {
    // Nunca sobe o teto ao regravar: se o arquivo piorou, o --update recusa.
    if (baseline?.[file] !== undefined && count > baseline[file]) {
      console.error(
        `[lint-page-roots] recusado: ${file} subiu de ${baseline[file]} para ${count}. ` +
          'O inventário só pode diminuir.',
      )
      process.exit(1)
    }
    merged[file] = count
  }
  fs.writeFileSync(
    INVENTORY_PATH,
    `${JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), counts: merged }, null, 2)}\n`,
  )
  const total = Object.values(merged).reduce((sum, count) => sum + count, 0)
  console.log(`[lint-page-roots] inventário gravado — ${Object.keys(merged).length} arquivo(s), ${total} ocorrência(s).`)
  process.exit(0)
}

const regressions = []
for (const [file, count] of Object.entries(counts)) {
  const allowed = baseline[file] ?? 0
  if (count > allowed) regressions.push({ file, count, allowed })
}

if (regressions.length > 0) {
  console.error('\n[lint-page-roots] a raiz destas páginas voltou a decidir layout próprio:\n')
  for (const { file, count, allowed } of regressions) {
    console.error(`  ${file} — ${count} ocorrência(s), teto ${allowed}`)
    for (const violation of violations.filter((item) => item.file === file)) {
      console.error(`    ${violation.line}:  ${violation.utility}  → use ${violation.fix}`)
    }
  }
  console.error('\nMova a decisão para o PageCanvas (src/design-system/page).\n')
  process.exit(1)
}

const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
const ceiling = Object.values(baseline).reduce((sum, count) => sum + count, 0)
const cleared = Object.entries(baseline).filter(([file]) => !counts[file]).length
console.log(
  `[lint-page-roots] OK — ${total} ocorrência(s) em ${files.length} páginas, teto ${ceiling}` +
    (cleared > 0 ? `, ${cleared} arquivo(s) já limpos (rode --update para baixar o teto).` : '.'),
)
process.exit(0)
