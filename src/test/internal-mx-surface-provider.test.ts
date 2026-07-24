import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

const read = (path: string) => readFileSync(path, 'utf8')

describe('internal MX manager visual provider', () => {
  test('isolates complete surface mode to internal MX profiles', () => {
    const roleScope = read('src/components/module/MxRoleVisualScope.tsx')
    const internalScope = read('src/components/module/InternalMxVisualScope.tsx')

    expect(roleScope).toContain('isPerfilInternoMx(role)')
    expect(roleScope).toContain('<InternalMxVisualScope role={role}>')
    expect(internalScope).toContain('<MxSurfaceVisualProvider mode="manager">')
    expect(internalScope).toContain('data-mx-visual-system="manager"')
  })

  test('manager surface mode reaches the shared design primitives', () => {
    const files = [
      'src/components/molecules/Card.tsx',
      'src/components/atoms/Typography.tsx',
      'src/components/atoms/Input.tsx',
      'src/components/atoms/Select.tsx',
      'src/components/atoms/Textarea.tsx',
      'src/components/atoms/Badge.tsx',
      'src/components/atoms/Skeleton.tsx',
      'src/components/organisms/DataGrid.tsx',
    ]

    for (const file of files) {
      expect(read(file)).toContain('useMxSurfaceVisualMode')
    }
  })

  test('canonical manager anatomy is present', () => {
    const card = read('src/components/molecules/Card.tsx')
    const input = read('src/components/atoms/Input.tsx')

    expect(card).toContain('rounded-2xl border border-gray-100 bg-white shadow-sm')
    expect(input).toContain('h-10 w-full rounded-xl border border-gray-200')
  })
})

describe('internal MX legacy route remediation', () => {
  test('removes dark promotional shells from the three failing admin routes', () => {
    const routes = [
      'src/pages/Reprocessamento.tsx',
      'src/pages/SellerPerformance.tsx',
      'src/pages/AiDiagnostics.tsx',
    ]

    for (const route of routes) {
      expect(read(route)).toContain('MxModulePage')
    }

    expect(read('src/pages/Reprocessamento.tsx')).not.toContain('DATA INJECTION ENGINE')
    expect(read('src/pages/SellerPerformance.tsx')).not.toContain('Terminal de Auditoria de Vendedores')
    expect(read('src/pages/AiDiagnostics.tsx')).toContain('if (!internalProfile)')
  })
})
