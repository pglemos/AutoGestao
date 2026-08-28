import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

/**
 * A tela do Dono mostrava "Vendas Total 12" ao lado de origens que somavam 13.
 * A origem da divergência: `vendedor_performance_oficial` desconta venda
 * cancelada (via `vendas_oficiais_deduplicadas_periodo`) e a contagem por
 * canal não descontava. Na rede eram 15 de 554 vendas infladas.
 *
 * A função canônica tem EXECUTE revogado para o cliente, então a regra está
 * replicada no hook. Este teste existe para que a réplica não se perca:
 * se alguém simplificar a query de volta, o contrato quebra aqui.
 */
const source = readFileSync(new URL('./useSalesByChannel.ts', import.meta.url), 'utf8')

describe('a contagem por canal desconta venda cancelada', () => {
  test('busca os eventos de cancelamento', () => {
    expect(source).toContain("'venda_cancelada'")
  })

  test('o cancelamento NÃO é filtrado por competência', () => {
    // Uma venda de julho pode ser cancelada em agosto e segue não valendo
    // para julho. Amarrar o cancelamento à competência reabriria o furo.
    const trecho = source.slice(source.indexOf("'venda_cancelada'") - 400, source.indexOf("'venda_cancelada'") + 200)
    expect(trecho).not.toContain('data_competencia')
  })

  test('exclui por etapa da oportunidade e por evento de cancelamento', () => {
    expect(source).toContain("etapa === 'cancelada'")
    expect(source).toContain('eventosCancelados.has')
    expect(source).toContain('oportunidadesCanceladas.has')
  })

  test('venda sem oportunidade não é descartada por engano', () => {
    // `!row.oportunidade_id` precisa devolver `true`: venda avulsa conta.
    expect(source).toContain('if (!row.oportunidade_id) return true')
  })

  test('o débito de duplicação está declarado no arquivo', () => {
    expect(source).toContain('DÉBITO CONHECIDO')
    expect(source).toContain('vendas_oficiais_deduplicadas_periodo')
  })
})
