#!/usr/bin/env node
/**
 * Foundation Zero AC-29.014 — gate de icon-only action sem nome acessível.
 *
 * Espelha a regra `button-name`/`link-name` do axe (WCAG 2.1.1/4.1.2): um
 * controle `<button>`/`<a>` que mostra apenas um ícone precisa de um nome
 * acessível — `aria-label`, `aria-labelledby`, `title`, um `<VisuallyHidden>`
 * com texto, ou o `<label>` do `Spinner`. Sem isso, quem navega por leitor de
 * tela ou por voz ouve só "botão" (ou nada) e não sabe o que o controle faz.
 *
 * O primitivo canônico `IconButton` já exige `label` e o renderiza via
 * `<VisuallyHidden>`; o `Spinner` carrega o próprio `label`. Este gate flagra o
 * DESVIO: `<button>`/`<a>` crus com ícone e sem nome.
 *
 * Heurística CONSERVADORA (zero falso-positivo): o controle só é considerado
 * icon-only sem nome quando TODOS os filhos são ícone, `Spinner` ou whitespace.
 * Qualquer filho que possa carregar texto (texto JSX, expressão, outro
 * elemento) torna o controle "não icon-only" e o gate não acusa — a decisão de
 * acessibilidade passa para a revisão, não para o lint.
 *
 * Puramente read-only: AST TypeScript, zero escrita, zero runtime.
 *
 * Uso:
 *   node scripts/lint-icon-only-action.mjs
 *   node scripts/lint-icon-only-action.mjs --json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const SRC_DIR = path.join(ROOT_DIR, 'src')
const JSON_MODE = process.argv.includes('--json')

const SOURCE_EXTENSIONS = ['.tsx', '.jsx']

/**
 * KEEP por arquivo (caminho relativo). Só se acrescenta linha aqui com
 * justificativa escrita — e o contrato falha se a lista crescer.
 *
 * Debt real exposto pelo gate em 2026-08-14: controles icon-only (Lucide) sem
 * nome acessível no próprio elemento. A via canônica é `IconButton` (exige
 * `label`) ou `aria-label`/`VisuallyHidden`. Cada linha documenta o defeito
 * concreto; o orçamento deve ENCOLHER à medida que os controles migram.
 */
export const ALLOWLIST = new Map([
  [
    'src/components/carteira/CarteiraAtivaTab.jsx',
    'Botões X (fechar filtros / remover chip) sem aria-label — migrar para IconButton label.',
  ],
  [
    'src/components/carteira/VeiculosChegaram.jsx',
    'Botão icon-only sem aria-label.',
  ],
  [
    'src/components/execucao/NovaAtividadeModal.jsx',
    'Botão icon-only sem aria-label.',
  ],
  [
    'src/components/fechamento/ClientCard.jsx',
    'Ações icon-only de linha (2) sem aria-label.',
  ],
  [
    'src/components/fechamento/ClientesListaMobile.jsx',
    'Ações icon-only de linha (2) sem aria-label.',
  ],
  [
    'src/components/fechamento/DisciplinaModal.jsx',
    'Botão icon-only sem aria-label.',
  ],
  [
    'src/components/fechamento/NovoRegistroModal.jsx',
    'Botão icon-only sem aria-label.',
  ],
  [
    'src/components/fechamento/RegularizarFechamentoDrawer.jsx',
    'Ações icon-only (3) sem aria-label.',
  ],
  [
    'src/components/owner/actionplan/ActionsToolbar.jsx',
    'Ação icon-only sem aria-label.',
  ],
  [
    'src/components/owner/actionplan/ExecutiveFilters.jsx',
    'Botão icon-only sem aria-label.',
  ],
  [
    'src/components/owner/actionplan/board/ExecutionTab.jsx',
    'Botão remover checklist (Trash2) sem aria-label.',
  ],
  [
    'src/components/ui/toast.jsx',
    'Botão de fechar toast (X) sem aria-label — sonner close button.',
  ],
  [
    'src/components/vendedor/CalculationDetailsDrawer.jsx',
    'Botão icon-only sem aria-label.',
  ],
  [
    'src/components/vendedor/CommissionHeroCard.jsx',
    'Botão icon-only sem aria-label.',
  ],
  [
    'src/features/agenda-admin/sections/VisitaDetailPanel.tsx',
    'Botão limpar seleção (X) sem aria-label.',
  ],
  [
    'src/features/consultoria/components/GoogleCalendarView.tsx',
    'Link de evento (abre em nova aba) sem texto/nome acessível.',
  ],
  [
    'src/features/internal-profile/LegacyProfilePage.tsx',
    'Botão icon-only sem aria-label.',
  ],
  [
    'src/features/mentor-comercial/ui/CarteiraAtivaList.tsx',
    'Botão icon-only sem aria-label.',
  ],
  [
    'src/features/remuneracao/components/dashboard/CalculationDetailsDrawer.tsx',
    'Botão icon-only sem aria-label.',
  ],
  [
    'src/pages/ConsultorTreinamentos.tsx',
    'Link externo icon-only (aria-label no Button asChild, não no <a>).',
  ],
])

function openingOf(element) {
  return ts.isJsxElement(element) ? element.openingElement : element
}

function hasAttribute(element, name) {
  return openingOf(element).attributes.properties.some(
    (property) => ts.isJsxAttribute(property) && property.name.text === name,
  )
}

function attributeValue(element, name) {
  const property = openingOf(element).attributes.properties.find(
    (p) => ts.isJsxAttribute(p) && p.name.text === name,
  )
  if (!property?.initializer) return null
  const text = property.initializer.getText()
  const match = text.match(/^['"`]([^'"`]*)['"`]$/)
  return match ? match[1] : null
}

/** Ícones Lucide importados no arquivo (via `lucide-react`). */
function lucideIconsInSource(sf) {
  const icons = new Set()
  const visit = (node) => {
    if (
      ts.isImportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text === 'lucide-react'
    ) {
      const clause = node.importClause?.namedBindings
      if (clause && ts.isNamedImports(clause)) {
        for (const spec of clause.elements) icons.add(spec.name.text)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return icons
}

/** `<svg>` direto ou componente importado de `lucide-react`. */
function isIconNode(node, icons) {
  if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node)) return false
  const name = openingOf(node).tagName.getText()
  return name === 'svg' || icons.has(name)
}

function isSpinnerNode(node) {
  if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node)) return false
  return openingOf(node).tagName.getText() === 'Spinner'
}

function isVisuallyHiddenNode(node) {
  return (
    ts.isJsxElement(node) &&
    ['VisuallyHidden', 'VisuallyHiddenPrimitive'].includes(openingOf(node).tagName.getText())
  )
}

function isWhitespaceOnly(node) {
  return ts.isJsxText(node) && node.getText().replace(/\s+/g, '') === ''
}

/** Texto literal dos filhos de um `<VisuallyHidden>` (nome acessível). */
function visuallyHiddenText(node) {
  if (!ts.isJsxElement(node)) return ''
  return node.children
    .map((child) => {
      if (ts.isJsxText(child)) return child.getText()
      if (
        ts.isJsxExpression(child) &&
        child.expression &&
        ts.isStringLiteral(child.expression)
      ) {
        return child.expression.text
      }
      return ''
    })
    .join('')
    .replace(/\s+/g, '')
}

export function inspectIconOnlyAction(source, file = '<inline>') {
  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    /\.tsx?$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.JSX,
  )
  const icons = lucideIconsInSource(sf)
  const violations = []

  const visit = (node) => {
    if (ts.isJsxElement(node)) {
      const tag = node.openingElement.tagName.getText()
      if (tag === 'button' || tag === 'a') {
        if (hasAttribute(node, 'aria-hidden')) return
        const hasNameAttr = ['aria-label', 'aria-labelledby', 'title'].some((name) =>
          hasAttribute(node, name),
        )
        if (hasNameAttr) return

        const children = node.children ?? []
        const hasIcon = children.some((child) => isIconNode(child, icons))
        if (!hasIcon) return

        // Nome acessível via VisuallyHidden com texto?
        const hiddenText = children
          .filter(isVisuallyHiddenNode)
          .map(visuallyHiddenText)
          .join('')
        if (hiddenText) return

        // Nome via label do Spinner?
        const spinnerLabel = children
          .filter(isSpinnerNode)
          .map((spinner) => attributeValue(spinner, 'label'))
          .filter(Boolean)
          .join('')
          .replace(/\s+/g, '')
        if (spinnerLabel) return

        // Icon-only conservador: TODO filho é ícone, Spinner ou whitespace
        // (nenhum filho carrega texto visível). O nome, quando existe, já veio
        // de aria-label/aria-labelledby/title/VisuallyHidden/label do Spinner.
        const onlyIconish = children.every(
          (child) =>
            isIconNode(child, icons) || isSpinnerNode(child) || isWhitespaceOnly(child),
        )
        if (onlyIconish) {
          const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
          violations.push({ file, line, tag })
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sf)
  return violations
}

function shouldExclude(relative) {
  return (
    relative.startsWith('src/base44-reference/') ||
    relative.includes('/_stories/') ||
    /\.(test|spec|playwright)\./.test(relative)
  )
}

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
      !/\.(test|spec|playwright)\./.test(entry.name)
    ) {
      files.push(full)
    }
  }
  return files
}

export function runIconOnlyActionGate() {
  const violations = []
  for (const filePath of walk(SRC_DIR)) {
    const relative = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/')
    if (shouldExclude(relative)) continue
    const source = fs.readFileSync(filePath, 'utf8')
    const found = inspectIconOnlyAction(source, relative).filter((v) => !ALLOWLIST.has(v.file))
    violations.push(...found)
  }
  return violations.sort((a, b) => `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`))
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isCli) {
  const violations = runIconOnlyActionGate()
  const result = {
    gate: 'lint-icon-only-action',
    pass: violations.length === 0,
    violationCount: violations.length,
    allowlistSize: ALLOWLIST.size,
    violations,
  }

  if (JSON_MODE) {
    console.log(JSON.stringify(result, null, 2))
  } else if (violations.length === 0) {
    console.log(`[lint-icon-only-action] OK — ${ALLOWLIST.size} arquivo(s) allowlisted; nenhum controle icon-only sem nome`)
  } else {
    console.error(`[lint-icon-only-action] ${violations.length} controle(s) icon-only sem nome acessível:`)
    for (const violation of violations) {
      console.error(`  - ${violation.file}:${violation.line} (<${violation.tag}>)`)
    }
  }

  process.exit(violations.length === 0 ? 0 : 1)
}
