import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import ts from 'typescript'

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

function getJsxAttribute(
  attributes: ts.JsxAttributes,
  name: string,
): ts.JsxAttribute | undefined {
  return attributes.properties.find(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) && property.name.getText() === name,
  )
}

function getStringAttribute(attributes: ts.JsxAttributes, name: string) {
  const attribute = getJsxAttribute(attributes, name)
  return attribute?.initializer && ts.isStringLiteral(attribute.initializer)
    ? attribute.initializer.text
    : undefined
}

function attributeContainsTag(attributes: ts.JsxAttributes, name: string, tagName: string) {
  const attribute = getJsxAttribute(attributes, name)
  if (!attribute?.initializer || !ts.isJsxExpression(attribute.initializer)) return false

  let found = false
  const visit = (node: ts.Node) => {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText() === tagName
    ) {
      found = true
    }
    node.forEachChild(visit)
  }
  attribute.initializer.forEachChild(visit)
  return found
}

// Módulo do Dono portado 1:1 do export Base44 (paths /dono/*).
const referenceFiles = [
  'src/components/Layout.tsx',
  'src/components/MxSidebarShell.tsx',
  'src/components/owner/OwnerLayout.jsx',
  'src/components/owner/OwnerTopbar.jsx',
  'src/components/owner/OwnerContext.jsx',
  'src/components/owner/ConsultantRequestModal.jsx',
  'src/pages/owner/OwnerHome.jsx',
  'src/pages/owner/PlanoEstrategico.jsx',
  'src/pages/owner/PlanoDeAcao.jsx',
  'src/pages/owner/Consultoria.jsx',
  'src/pages/owner/Placeholders.jsx',
  'src/features/owner-base44/OwnerModule.tsx',
  'src/styles/owner-base44-exact.css',
] as const

describe('owner Base44 exact parity contract', () => {
  it('ships all Base44 owner pages and dedicated sidebar', () => {
    for (const file of referenceFiles) {
      expect(existsSync(resolve(root, file)), `${file} must exist`).toBe(true)
    }
    expect(existsSync(resolve(root, 'src/components/owner/OwnerSidebar.jsx'))).toBe(true)
  })

  it('mounts the Base44 owner module as a protected root route with dedicated layout', () => {
    const app = read('src/App.tsx')
    expect(app).toContain("const OwnerModule = lazy(() => import('@/features/owner-base44/OwnerModule'))")
    expect(app).toContain('<Route path="/dono/*" element={<ProtectedRoute><Suspense fallback={<Spinner />}><OwnerModule /></Suspense></ProtectedRoute>} />')
  })

  it('routes every Base44 owner surface through the module', () => {
    const route = read('src/features/owner-base44/OwnerModule.tsx')
    expect(route).toContain('OwnerLayout')
    expect(route).toContain('OwnerLiveDataPage')
    expect(route).toContain('PlanoDeAcao')
    expect(route).toContain('<Route path="*" element={<OwnerLiveDataPage />} />')
    expect(route).toContain('<Route path="plano-acao" element={<PlanoDeAcao />} />')
  })

  it('preserves the Base44 executive navigation in OwnerSidebar', () => {
    const sidebar = read('src/components/owner/OwnerSidebar.jsx')
    for (const label of [
      'Início',
      'Rotina do Dia',
      'Central de Decisões',
      'Plano Estratégico',
      'Plano de Ação',
      'Consultoria',
      'Departamentos',
      'Mercado',
      'Universidade MX',
      'Falar com Consultor',
    ]) {
      expect(sidebar).toContain(label)
    }
  })

  it('exposes a dedicated executive layout with sidebar drawer and topbar', () => {
    const module = read('src/features/owner-base44/OwnerModule.tsx')
    const ownerLayout = read('src/components/owner/OwnerLayout.jsx')
    const topbar = read('src/components/owner/OwnerTopbar.jsx')
    expect(module).toContain('owner-base44-exact')
    expect(ownerLayout).toContain('<OwnerSidebar')
    expect(ownerLayout).toContain('<aside')
    expect(topbar).toContain('owner-base44-exact__topbar')
    expect(topbar).toContain('onOpenSidebar')
  })

  it('keeps owner scope chart variables and styles explicit', () => {
    const styles = read('src/styles/owner-base44-exact.css')
    for (let index = 1; index <= 5; index += 1) {
      expect(styles).toContain(`--color-chart-${index}: hsl(var(--chart-${index}))`)
    }
  })

  it('binds consultant requests exclusively to the authenticated session', () => {
    const adapter = read('src/features/owner-base44/b44adapter.js')
    expect(adapter).toContain('const { data: auth, error: authError } = await supabase.auth.getUser()')
    expect(adapter).toContain("if (authError || !userId) throw new Error('Usuário não identificado')")
    expect(adapter).not.toContain('payload.created_by')
  })
})
