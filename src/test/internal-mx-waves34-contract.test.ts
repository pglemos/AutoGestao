import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const routeAdapters = [
  'src/pages/PainelConsultor.tsx',
  'src/pages/ConsultoriaVisitaExecucao.tsx',
  'src/pages/SellerPerformance.tsx',
]

const canonicalPages = [
  'src/features/network-dashboard/NetworkDashboardPage.tsx',
  'src/features/internal-profile/InternalProfilePage.tsx',
  'src/features/morning-report/AdminMorningReportPage.tsx',
  'src/features/seller-performance/SellerPerformancePage.tsx',
  'src/features/operational-diagnostics/OperationalDiagnosticsPage.tsx',
]

describe('internal MX waves 3 and 4 architecture', () => {
  test('route adapters remain thin', () => {
    for (const path of routeAdapters) {
      const source = read(path)
      expect(source.split('\n').length).toBeLessThanOrEqual(12)
      expect(source).not.toMatch(/<main[\s>]/)
      expect(source).not.toContain('PageHeading')
    }
  })

  test('new internal pages use the canonical page primitive', () => {
    for (const path of canonicalPages) {
      const source = read(path)
      expect(source.includes('MxModulePage') || source.includes('ReportPageShell')).toBe(true)
      expect(source).not.toMatch(/<main[\s>]/)
      expect(source).not.toContain('PageHeading')
    }
    expect(read('src/features/internal-reports/ReportPageShell.tsx')).toContain('MxModulePage')
  })

  test('authorization exists before sensitive domains', () => {
    const policy = read('src/features/internal-mx-access/internalMxActionPolicy.ts')
    expect(policy).toContain("resource === 'reprocessing'")
    expect(policy).toContain("resource === 'simulation'")
    expect(policy).toContain('Ação não autorizada para o perfil atual.')
    expect(read('src/features/reprocessing/reprocessingPolicy.ts')).toContain('canExecuteReprocessing')
    expect(read('src/features/simulation/simulationPolicy.ts')).toContain('canPerformSimulatedAction')
  })

  test('legacy consumers are explicitly isolated', () => {
    expect(read('src/pages/Perfil.tsx')).toContain('LegacyProfilePage')
    expect(read('src/pages/MorningReport.tsx')).toContain('LegacyMorningReportPage')
    expect(read('src/pages/AiDiagnostics.tsx')).toContain('LegacyOperationalDiagnosticsPage')
  })

  test('no credentials are embedded in wave sources', () => {
    const paths = [...routeAdapters, ...canonicalPages,
      'src/hooks/auth/authHelpers.ts',
      'src/hooks/auth/useAuthRBAC.ts',
      'e2e/internal-mx-waves34.spec.ts',
    ]
    const joined = paths.map(read).join('\n')
    expect(joined).not.toContain('E2E_ROLE_PASSWORD=')
    expect(joined).not.toMatch(/const\s+password\s*=\s*['"]/i)
    expect(joined).not.toMatch(/(?:dono|gerente|vendedor)@mxgestaopreditiva\.com\.br/)
  })
})
