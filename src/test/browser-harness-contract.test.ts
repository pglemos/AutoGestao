import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const harness = readFileSync(join(process.cwd(), 'scripts/agent-browser-validate.mjs'), 'utf8')

describe('contrato do harness de validação visual', () => {
  test('assenta o layout antes de capturar, senão a foto mente', () => {
    // `set viewport` retorna antes do reflow. Capturar nesse instante produzia
    // PNGs mobile com o conteúdo deslocado lateralmente — defeito que só
    // existia na foto. A espera precisa vir antes do screenshot.
    expect(harness).toContain('settleLayout')
    const settleAt = harness.indexOf('settleLayout();')
    const shotAt = harness.indexOf("ab([...sessionArgs, 'screenshot'")
    expect(settleAt).toBeGreaterThan(-1)
    expect(settleAt).toBeLessThan(shotAt)
  })

  test('resolve placeholders de env em vez de digitar a string literal', () => {
    expect(harness).toContain('resolveEnvPlaceholders')
    expect(harness).toContain('needs env var')
  })

  test('nenhum flow versionado carrega credencial em texto plano', () => {
    const flows = ['admin-parity', 'consultoria', 'painel', 'default', 'sidebar-audit']
    for (const name of flows) {
      let content: string
      try {
        content = readFileSync(join(process.cwd(), `scripts/browser-flows/${name}.flow.json`), 'utf8')
      } catch {
        continue
      }
      expect(content).not.toContain('@gmail.com')
      expect(content).not.toContain('Mx#')
    }
  })
})
