import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')

const managerRoutes = [
  'ranking',
  'devolutivas',
  'treinamentos',
  'produtos',
  'notificacoes',
  'relatorio-matinal',
  'performance-vendas',
  'config-operacional',
  'config-pmr',
  'configuracoes',
] as const

describe('contrato visual Gerente 1:1 para o módulo interno MX', () => {
  test('registra todas as dez rotas na composição gerencial', () => {
    const registry = read('src/design-system/internal-mx/internalMxPageRegistry.ts')
    for (const key of managerRoutes) {
      expect(registry).toContain(`key: '${key}'`)
      const entry = registry.split(`key: '${key}'`)[1]?.split('},')[0] ?? ''
      expect(entry).toContain('managerLayout: true')
    }
  })

  test('o frame interno aplica uma única composição por rota', () => {
    const frame = read('src/components/module/InternalManagerRouteFrame.tsx')
    expect(frame).toContain('data-mx-manager-page')
    expect(frame).toContain('mx-manager-page-1to1')
    expect(frame).toContain('pageMeta.managerLayout')
  })

  test('PageHeading renderiza o cabeçalho compacto do Gerente no contexto manager', () => {
    const heading = read('src/components/molecules/PageHeading.tsx')
    expect(heading).toContain('data-mx-page-heading="manager"')
    expect(heading).toContain('rounded-2xl border border-gray-100 bg-white p-5 shadow-sm')
    expect(heading).toContain('text-xl font-bold text-gray-800')
    expect(heading).not.toContain('padrão da tela /classificacao')
  })

  test('a composição elimina superfícies e tipografia promocionais antigas', () => {
    const css = read('src/styles/internal-mx-manager-scope.css')
    expect(css).toContain('.mx-manager-page-1to1')
    expect(css).toContain('[data-mx-card]')
    expect(css).toContain('[data-mx-config-tabs=')
    expect(css).toContain('text-transform: none')
    expect(css).toContain('max-width: 80rem')
  })
})
