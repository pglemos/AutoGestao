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

  test('o frame escolhe um template real em vez do retrofit de rota', () => {
    const frame = read('src/components/module/InternalManagerRouteFrame.tsx')
    const template = read('src/components/module/InternalMxCanonicalTemplate.tsx')
    expect(frame).toContain('InternalMxCanonicalTemplate')
    expect(frame).toContain('data-mx-manager-template')
    expect(frame).toContain('pageMeta.template')
    expect(template).toContain('data-mx-canonical-template')
    expect(template).toContain('manager-v3')
    expect(frame).not.toContain('mx-manager-page-1to1')
  })

  test('a composição não depende de seletores específicos por página', () => {
    const css = read('src/styles/internal-mx-manager-scope.css')
    expect(css).toContain('.mx-canonical-template')
    expect(css).toContain("[data-mx-canonical-template")
    expect(css).not.toContain('.mx-manager-page-1to1')
    expect(css).not.toContain("data-mx-manager-page='")
    expect(css).not.toContain('data-mx-manager-page="')
  })

  test('as primitivas expõem contratos semânticos para header, cards e conteúdo', () => {
    const primitives = read('src/components/module/MxModuleVisualPrimitives.tsx')
    expect(primitives).toContain('data-mx-module-page')
    expect(primitives).toContain('data-mx-module-header')
    expect(primitives).toContain('data-mx-section-card')
    expect(primitives).toContain('data-mx-toolbar')
    expect(primitives).toContain('data-mx-table-surface')
  })

  test('PageHeading continua usando a anatomia compacta do Gerente', () => {
    const heading = read('src/components/molecules/PageHeading.tsx')
    expect(heading).toContain('data-mx-page-heading="manager"')
    expect(heading).toContain('rounded-2xl border border-gray-100 bg-white p-5 shadow-sm')
    expect(heading).toContain('text-xl font-bold text-gray-800')
  })
})
