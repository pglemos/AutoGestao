import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')

describe('Onda 1: fundação, permissões e testes', () => {
  test('Parâmetros PMR usa página canônica e bloqueia mutação para consulta', () => {
    const page = read('src/features/consultoria/components/ConsultingParametersView.tsx')
    const hook = read('src/hooks/useConsultingParameters.ts')
    expect(page).toContain('MxModulePage accessMode=')
    expect(page).toContain('data-mx-requires-manage')
    expect(page).toContain('readOnlyMessage')
    expect(page).not.toContain('PageHeading')
    expect(hook).toContain("canManageInternalMxArea('pmr-parameters', role)")
    expect(hook).toContain('if (!canManage) return { error: readOnlyMessage }')
  })

  test('regras de entrega bloqueiam gravação na camada de dados', () => {
    const hook = read('src/hooks/useStoreDeliveryRules.ts')
    expect(hook).toContain("canManageInternalMxArea('operational-settings', role)")
    expect(hook).toContain('if (!canManage) return { error: readOnlyMessage }')
  })

  test('matriz visual declara os três perfis e as três resoluções', () => {
    const visualAudit = read('src/test/module-route-visual-audit.playwright.ts')
    for (const role of ['administrador_geral', 'administrador_mx', 'consultor_mx']) {
      expect(visualAudit).toContain(`role: '${role}'`)
    }
    for (const viewport of ['desktop', 'tablet', 'mobile']) {
      expect(visualAudit).toContain(`key: '${viewport}'`)
    }
    expect(visualAudit).toContain('data-mx-template-shell')
    expect(visualAudit).toContain('enabledManageActions')
  })
})
