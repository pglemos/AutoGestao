import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * FASE AB — Perfis Administrador Geral / Admin MX / Consultor MX
 *
 * Os três perfis internos MX operam sobre os MESMOS primitives de módulo
 * (`MxModulePage`, `MxSectionCard`, `MxModuleHeader`) e a MESMA densidade
 * compacta herdada do shell — nunca uma paleta ou tema próprio por perfil
 * (§10.1/§10.2). Painéis com role-based rendering delegam para páginas que
 * usam esses primitives; a Agenda usa `PageTemplate` porque é compartilhada
 * entre todos os perfis (não é painel exclusivo admin).
 */
const root = path.resolve(import.meta.dir, '../..')
const read = (name: string) => readFileSync(path.join(root, name), 'utf8')

/** Painéis admin e o primitive de módulo que devem usar. */
const ADMIN_PANELS: Array<[string, string]> = [
  ['src/features/lojas/Lojas.container.tsx', 'MxModulePage'],
  ['src/features/configuracoes/components/ConfiguracoesShell.tsx', 'MxModulePage'],
  ['src/features/reprocessing/LegacyReprocessamentoPage.tsx', 'MxModulePage'],
  ['src/features/operational-diagnostics/OperationalDiagnosticsPage.tsx', 'MxModulePage'],
]

describe('FASE AB — perfis administrador', () => {
  test('os três perfis internos usam densidade compacta (herdada do shell)', () => {
    const config = read('src/design-system/shell/appShellConfig.ts')
    // administrador_geral/administrador_mx/consultor_mx apontam para INTERNAL_CONFIG.
    expect(config).toContain("administrador_geral: INTERNAL_CONFIG")
    expect(config).toContain("administrador_mx: INTERNAL_CONFIG")
    expect(config).toContain("consultor_mx: INTERNAL_CONFIG")
    expect(config).toContain("density: 'compact'")
  })

  test('painéis admin usam os mesmos primitives de módulo', () => {
    for (const [file, primitive] of ADMIN_PANELS) {
      const source = read(file)
      expect(source, `${file} sem ${primitive}`).toContain(primitive)
    }
  })

  test('a configuração por perfil não inventa paleta nem tema próprio', () => {
    const config = read('src/design-system/shell/appShellConfig.ts')
    // Sem hex, sem cor, sem nome de tema — só densidade + labels + skip-link.
    expect(config).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(config).not.toMatch(/\btheme\b|bg-|text-mx-/i)
  })

  test('a Agenda usa PageTemplate (compartilhada entre perfis, não exclusiva admin)', () => {
    const agenda = read('src/features/agenda-admin/AgendaAdmin.container.tsx')
    expect(agenda).toContain('PageTemplate')
  })
})
