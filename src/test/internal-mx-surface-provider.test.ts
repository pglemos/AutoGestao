import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

const read = (path: string) => readFileSync(path, 'utf8')

/**
 * A aparência aprovada deixou de ser um "modo" fornecido por contexto: passou a
 * ser a única do produto (§8.5). Estes testes garantem que a anatomia canônica
 * continua no lugar e que nenhum componente reintroduz bifurcação por perfil.
 */
describe('superfície unificada do MX', () => {
  test('mantém o escopo dos perfis internos MX', () => {
    const roleScope = read('src/components/module/MxRoleVisualScope.tsx')
    const internalScope = read('src/components/module/InternalMxVisualScope.tsx')

    expect(roleScope).toContain('isPerfilInternoMx(role)')
    expect(roleScope).toContain('<InternalMxVisualScope role={role}>')
    expect(internalScope).toContain('data-mx-visual-system="manager"')
  })

  test('nenhum primitivo compartilhado bifurca a aparência por perfil', () => {
    const files = [
      'src/components/molecules/Card.tsx',
      'src/components/molecules/PageHeading.tsx',
      'src/components/atoms/Typography.tsx',
      'src/components/atoms/Input.tsx',
      'src/components/atoms/Select.tsx',
      'src/components/atoms/Textarea.tsx',
      'src/components/atoms/Badge.tsx',
      'src/components/atoms/Button.tsx',
      'src/components/atoms/Skeleton.tsx',
      'src/components/organisms/DataGrid.tsx',
    ]

    for (const file of files) {
      const source = read(file)
      expect(source, `${file} ainda lê o modo de superfície`).not.toContain('useMxSurfaceVisualMode')
      expect(source, `${file} ainda lê o modo de botão`).not.toContain('ButtonVisualContext')
    }
  })

  test('a anatomia canônica é a aprovada', () => {
    expect(read('src/components/molecules/Card.tsx')).toContain(
      'rounded-2xl border border-gray-100 bg-white shadow-sm',
    )
    expect(read('src/components/atoms/Input.tsx')).toContain(
      'h-10 w-full rounded-xl border border-gray-200',
    )
    expect(read('src/components/atoms/Button.tsx')).toContain(
      'rounded-xl bg-emerald-600 text-white shadow-sm',
    )
  })
})

describe('internal MX legacy route remediation', () => {
  test('removes dark promotional shells from the three failing admin routes', () => {
    const routes = [
      ['src/pages/Reprocessamento.tsx', 'src/features/reprocessing/ReprocessingGuardedPage.tsx'],
      ['src/pages/SellerPerformance.tsx', 'src/features/seller-performance/SellerPerformancePage.tsx'],
      ['src/pages/AiDiagnostics.tsx', 'src/features/operational-diagnostics/OperationalDiagnosticsPage.tsx'],
    ]

    for (const [route, implementation] of routes) {
      expect(read(route)).toContain(implementation.split('/').pop()!.replace('.tsx', ''))
      expect(read(implementation)).toContain('MxModulePage')
    }

    expect(read('src/pages/Reprocessamento.tsx')).not.toContain('DATA INJECTION ENGINE')
    expect(read('src/pages/SellerPerformance.tsx')).not.toContain('Terminal de Auditoria de Vendedores')
    expect(read('src/pages/AiDiagnostics.tsx')).toContain('isPerfilInternoMx(role)')
  })
})
