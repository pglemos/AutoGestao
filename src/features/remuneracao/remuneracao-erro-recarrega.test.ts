import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

/**
 * O estado de erro da Minha Remuneração oferecia "Tentar novamente" sem
 * nenhuma ação: clicar não fazia nada e o vendedor só saía do erro recarregando
 * a página no navegador. Botão que não faz nada é pior que a ausência dele.
 */
describe('estado de erro da remuneração', () => {
  test('o botão "Tentar novamente" chama o recarregamento', () => {
    const page = readFileSync('src/features/remuneracao/MinhaRemuneracaoPage.tsx', 'utf8')
    const bloco = page.slice(page.indexOf('if (data.error)'), page.indexOf('const userName'))
    expect(bloco).toContain('Tentar novamente')
    expect(bloco).toContain('onClick')
    expect(bloco).toContain('data.recarregar()')
  })

  test('o hook expõe o recarregamento que a tela usa', () => {
    const hook = readFileSync('src/features/remuneracao/hooks/useMinhaRemuneracaoDashboard.ts', 'utf8')
    expect(hook).toContain('recarregar: home.handleRefresh')
  })
})
