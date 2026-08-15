#!/usr/bin/env node
/**
 * FASE Z 26.013 — audit: controle de acesso por código, não por CSS.
 *
 * O RBAC de rotas vive em `canAccessPath` (src/lib/auth/routeAccess.ts) e em
 * `RoleSwitch`/`ForbiddenRoute` no App.tsx. Este gate garante que nenhuma
 * superfície de página esconde acesso a perfil via CSS (ex.: `hidden`/
 * `display:none`/`invisible`/`opacity-0` condicionado a `role`/`perfil`).
 *
 * Esconder por CSS mantém o conteúdo no DOM e no tab-order — um convite a
 * vazamento de dados e a acessibilidade quebrada. O acesso deve ser negado em
 * código (rota ForbiddenRoute / RoleSwitch) ou por capability, nunca por
 * aparência.
 */
import { createSourceFile, forEachChild, isJsxAttribute, isJsxExpression, isJsxOpeningElement, isPropertyAccessExpression, isStringLiteral, isVariableDeclaration, isIdentifier, ScriptKind, ScriptTarget } from 'typescript'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

const SOURCE_DIRS = [
  'src/features',
  'src/pages',
  'src/design-system',
]

const ROLE_KEYWORDS = /\b(role|perfil|isOwner|isAdmin|can[A-Z][A-Za-z0-9_]*|has[A-Z][A-Za-z0-9_]*)\b/
const HIDE_CLASSES = /\b(hidden|invisible|opacity-0|pointer-events-none|sr-only|collapse)\b/

/**
 * Verifica se a string de className contém classe de ocultação.
 */
function hasHideClass(classNameText) {
  return HIDE_CLASSES.test(classNameText)
}

/**
 * Verifica se a expressão condicional menciona role/perfil/capability.
 */
function mentionsRole(exprText) {
  return ROLE_KEYWORDS.test(exprText)
}

function scanSource(source, fileName) {
  const sf = createSourceFile(fileName, source, ScriptTarget.Latest, true, ScriptKind.TSX)
  const findings = []

  const visit = (node) => {
    if (isJsxOpeningElement(node)) {
      for (const attr of node.attributes.properties) {
        if (!isJsxAttribute(attr) || !attr.initializer) continue
        const name = attr.name.getText(sf)
        if (name !== 'className' && name !== 'style') continue

        let exprText = null
        if (isStringLiteral(attr.initializer)) exprText = attr.initializer.text
        else if (isJsxExpression(attr.initializer) && attr.initializer.expression) {
          exprText = attr.initializer.expression.getText(sf)
        }
        if (!exprText) continue

        // className dinâmico com template de role + classe de ocultação
        if (name === 'className' && mentionsRole(exprText) && hasHideClass(exprText)) {
          const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
          findings.push({ file: fileName, line, reason: `className condicionado a role com classe de ocultação: ${exprText.slice(0, 120)}` })
        }
        // style inline com display none condicionado a role
        if (name === 'style' && mentionsRole(exprText) && /display\s*:\s*['"]?none/.test(exprText)) {
          const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
          findings.push({ file: fileName, line, reason: `style inline com display:none condicionado a role: ${exprText.slice(0, 120)}` })
        }
      }
    }
    forEachChild(node, visit)
  }
  visit(sf)
  return findings
}

function collectFiles(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry)
    const st = statSync(abs)
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.graphify' || entry === '__tests__') continue
      collectFiles(abs, out)
    } else if (/\.(tsx|jsx|ts|js)$/.test(entry)) {
      out.push(abs)
    }
  }
  return out
}

export function auditNoCssRoleGating({ readFile = (rel) => { const abs = join(ROOT, rel); return existsSync(abs) ? readFileSync(abs, 'utf8') : null } } = {}) {
  const violations = []
  for (const dir of SOURCE_DIRS) {
    for (const abs of collectFiles(join(ROOT, dir))) {
      const rel = abs.replace(ROOT, '').replace(/^[\\/]/, '')
      const source = readFile(rel)
      if (source === null) continue
      const findings = scanSource(source, rel)
      for (const f of findings) violations.push({ ...f, rule: 'css-role-gating' })
    }
  }
  return {
    gate: 'lint-no-css-role-gating',
    pass: violations.length === 0,
    violations,
  }
}

export function inspectNoCssRoleGating(source, fileName = 'page.tsx') {
  return scanSource(source, fileName).map((f) => ({ ...f, rule: 'css-role-gating' }))
}

const isCli = process.argv[1] && join(ROOT, 'scripts/lint-no-css-role-gating.mjs') === process.argv[1]
if (isCli) {
  const result = auditNoCssRoleGating()
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2))
  } else if (result.pass) {
    console.log(`[lint-no-css-role-gating] OK — controle de acesso por código (canAccessPath/RoleSwitch), não por CSS`)
  } else {
    console.error(`[lint-no-css-role-gating] FALHA — ${result.violations.length} violação(ões) de esconder acesso por CSS:`)
    for (const v of result.violations) {
      console.error(`  - [${v.rule}] ${v.file}:${v.line} — ${v.reason}`)
    }
  }
  process.exit(result.pass ? 0 : 1)
}
