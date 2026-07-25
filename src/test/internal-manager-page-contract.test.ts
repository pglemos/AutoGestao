import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')

const canonicalPages = [
  'painel',
  'lojas',
  'loja-detalhe',
  'consultoria',
  'agenda',
  'ranking',
  'devolutivas',
  'treinamentos',
  'produtos',
  'notificacoes',
  'relatorio-matinal',
  'performance-vendas',
  'performance-vendedor',
  'auditoria',
  'config-operacional',
  'config-pmr',
  'reprocessamento',
  'configuracoes',
  'simulacao',
] as const

const templateKinds = ['dashboard', 'list', 'detail', 'workspace', 'settings'] as const

describe('contrato canônico do módulo interno MX', () => {
  test('registra as dezenove áreas no sistema visual compartilhado', () => {
    const registry = read('src/design-system/internal-mx/internalMxPageRegistry.ts')
    for (const key of canonicalPages) {
      expect(registry).toContain(`key: '${key}'`)
      const entry = registry.split(`key: '${key}'`)[1]?.split('},')[0] ?? ''
      expect(entry).toContain('managerLayout: true')
      expect(templateKinds.some((kind) => entry.includes(`template: '${kind}'`))).toBe(true)
    }
  })

  test('o frame fornece metadados completos ao template real', () => {
    const frame = read('src/components/module/InternalManagerRouteFrame.tsx')
    const template = read('src/components/module/InternalMxCanonicalTemplate.tsx')
    expect(frame).toContain('InternalMxCanonicalTemplate')
    expect(frame).toContain('pageKey={pageMeta.key}')
    expect(frame).toContain('pageTitle={pageMeta.title}')
    expect(frame).toContain('role={role}')
    expect(template).toContain('InternalMxTemplateContext.Provider')
    expect(template).toContain('data-mx-template-shell')
    expect(template).toContain('data-mx-template-body')
    expect(template).toContain('manager-v4')
    expect(frame).not.toContain('mx-manager-page-1to1')
  })

  test('slots semânticos sustentam página, header, toolbar, seção, tabela, tabs e sidebar', () => {
    const slots = read('src/components/module/InternalMxTemplateSlots.tsx')
    for (const slot of ['page', 'header', 'toolbar', 'section', 'table', 'tabs', 'sidebar']) {
      expect(slots).toContain(`data-mx-template-slot="${slot}"`)
    }

    const primitives = read('src/components/module/MxModuleVisualPrimitives.tsx')
    expect(primitives).toContain('InternalMxTemplatePage')
    expect(primitives).toContain('InternalMxTemplateHeader')
    expect(primitives).toContain('InternalMxTemplateToolbar')
    expect(primitives).toContain('InternalMxTemplateSection')
    expect(primitives).toContain('InternalMxTemplateTable')
  })

  test('a composição não adiciona seletores específicos por rota', () => {
    const legacyCss = read('src/styles/internal-mx-manager-scope.css')
    const slotsCss = read('src/styles/internal-mx-template-slots.css')
    const css = `${legacyCss}\n${slotsCss}`
    expect(css).toContain('.mx-canonical-template')
    expect(css).toContain('[data-mx-template-shell]')
    expect(css).toContain('[data-mx-template-page]')
    expect(css).not.toContain('.mx-manager-page-1to1')
    expect(css).not.toContain("data-mx-manager-page='")
    expect(css).not.toContain('data-mx-manager-page="')
  })

  test('o escopo visual importa a camada explícita de slots', () => {
    const scope = read('src/components/module/InternalMxVisualScope.tsx')
    expect(scope).toContain("@/styles/internal-mx-template-slots.css")
  })

  test('PageHeading permanece apenas como ponte compacta para páginas ainda não migradas', () => {
    const heading = read('src/components/molecules/PageHeading.tsx')
    expect(heading).toContain('data-mx-page-heading="manager"')
    expect(heading).toContain('rounded-2xl border border-gray-100 bg-white p-5 shadow-sm')
  })
})
