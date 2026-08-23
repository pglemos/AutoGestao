import { describe, expect, test } from 'bun:test'
import {
  decideProductPackage,
  diffRosterAgainstPackage,
  type PackageItemRow,
  type PackageVersionRow,
  type ProductRow,
} from './clientProductPackage'

const product: ProductRow = {
  program_key: 'pmr_plus',
  name: 'PMR Plus',
  status: 'publicado',
  usa_plano_estrategico: true,
  indicator_package_version_id: 'versao-1',
}

const packageVersion: PackageVersionRow = {
  id: 'versao-1',
  nome: 'Versão 1.0 (Canônica)',
  status: 'publicada',
  versao: 1,
  total_indicadores: 3,
}

const item = (metric_key: string, ordem: number, input_mode = 'MANUAL', area = 'Comercial'): PackageItemRow => ({
  id: `item-${metric_key}`,
  version_id: 'versao-1',
  metric_key,
  label_snapshot: metric_key,
  area_snapshot: area,
  input_mode_snapshot: input_mode,
  ordem_snapshot: ordem,
  is_required: true,
  inclusion_reason: null,
})

const items = [
  item('visits_custom', 2),
  item('sales_door_flow_custom', 1),
  item('visit_to_sale_rate_custom', 3, 'CALCULATED', 'Comercial'),
]

describe('decideProductPackage — caminho feliz', () => {
  test('devolve o roster na ordem do pacote', () => {
    const result = decideProductPackage({ programKey: 'pmr_plus', product, packageVersion, items })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.resolution.indicatorCodes).toEqual(['sales_door_flow_custom', 'visits_custom', 'visit_to_sale_rate_custom'])
  })

  test('separa manuais de calculados e lista as áreas', () => {
    const result = decideProductPackage({ programKey: 'pmr_plus', product, packageVersion, items })
    if (!result.ok) throw new Error('esperava resolução')
    expect(result.resolution.manualCount).toBe(2)
    expect(result.resolution.calculatedCount).toBe(1)
    expect(result.resolution.departments).toEqual(['Comercial'])
  })

  test('códigos oficiais Base44 usam target_calculation_mode do catálogo', () => {
    const official = [
      item('SALES_WALKIN', 1, 'calculated'),
      item('SALES_TOTAL', 2, 'manual'),
    ]
    const result = decideProductPackage({ programKey: 'pmr_plus', product, packageVersion, items: official })
    if (!result.ok) throw new Error('esperava resolução')
    expect(result.resolution.manualCount).toBe(1)
    expect(result.resolution.calculatedCount).toBe(1)
  })

  test('conta modos no vocabulário do catálogo MX, em minúsculas', () => {
    const mxItems = [item('a', 1, 'manual'), item('b', 2, 'calculado'), item('c', 3, 'CALCULATED')]
    const result = decideProductPackage({ programKey: 'pmr_plus', product, packageVersion, items: mxItems })
    if (!result.ok) throw new Error('esperava resolução')
    expect(result.resolution.manualCount).toBe(1)
    expect(result.resolution.calculatedCount).toBe(2)
  })

  test('item sem ordem vai para o fim em vez de quebrar a ordenação', () => {
    const semOrdem = { ...item('extra', 0), ordem_snapshot: null }
    const result = decideProductPackage({ programKey: 'pmr_plus', product, packageVersion, items: [...items, semOrdem] })
    if (!result.ok) throw new Error('esperava resolução')
    expect(result.resolution.indicatorCodes.at(-1)).toBe('extra')
  })
})

describe('decideProductPackage — cada recusa é distinguível', () => {
  test('cliente sem produto contratado', () => {
    const result = decideProductPackage({ programKey: null, product: null, packageVersion: null, items: [] })
    expect(result).toMatchObject({ ok: false, reason: 'CLIENTE_SEM_PRODUTO' })
  })

  test('produto do cliente não existe no catálogo', () => {
    const result = decideProductPackage({ programKey: 'pmr_inexistente', product: null, packageVersion: null, items: [] })
    expect(result).toMatchObject({ ok: false, reason: 'PRODUTO_NAO_ENCONTRADO' })
  })

  test('produto não usa plano estratégico — estado real de todos os produtos hoje', () => {
    const result = decideProductPackage({
      programKey: 'pmr_plus',
      product: { ...product, usa_plano_estrategico: false },
      packageVersion,
      items,
    })
    expect(result).toMatchObject({ ok: false, reason: 'PRODUTO_NAO_USA_PLANO' })
    if (result.ok) return
    expect(result.product?.program_key).toBe('pmr_plus')
  })

  test('flag nula não é tratada como verdadeira', () => {
    const result = decideProductPackage({
      programKey: 'pmr_plus',
      product: { ...product, usa_plano_estrategico: null },
      packageVersion,
      items,
    })
    expect(result).toMatchObject({ ok: false, reason: 'PRODUTO_NAO_USA_PLANO' })
  })

  test('produto sem pacote vinculado', () => {
    const result = decideProductPackage({
      programKey: 'pmr_plus',
      product: { ...product, indicator_package_version_id: null },
      packageVersion,
      items,
    })
    expect(result).toMatchObject({ ok: false, reason: 'PRODUTO_SEM_PACOTE' })
  })

  test('versão do pacote não encontrada', () => {
    const result = decideProductPackage({ programKey: 'pmr_plus', product, packageVersion: null, items })
    expect(result).toMatchObject({ ok: false, reason: 'PACOTE_NAO_ENCONTRADO' })
  })

  test('versão em rascunho não vale como roster', () => {
    const result = decideProductPackage({
      programKey: 'pmr_plus',
      product,
      packageVersion: { ...packageVersion, status: 'rascunho' },
      items,
    })
    expect(result).toMatchObject({ ok: false, reason: 'PACOTE_NAO_PUBLICADO' })
  })

  test('versão publicada sem itens não gera plano vazio silencioso', () => {
    const result = decideProductPackage({ programKey: 'pmr_plus', product, packageVersion, items: [] })
    expect(result).toMatchObject({ ok: false, reason: 'PACOTE_SEM_ITENS' })
  })
})

describe('diffRosterAgainstPackage — vocabulário do plano vs do pacote', () => {
  // O pacote guarda `metric_key` (sales_volume); a série do plano carrega `id`
  // e `code` apresentáveis (SP-001) além de `metricCode`. Comparar com o campo
  // de apresentação faz todo plano parecer 100% divergente — e o aviso ao
  // usuário viraria ruído permanente.
  const pacote = ['sales_volume', 'leads_total', 'gross_margin_rate']

  test('plano descrito pelo código canônico confere com o pacote', () => {
    expect(diffRosterAgainstPackage(pacote, pacote).aligned).toBe(true)
  })

  test('plano descrito pelo código de apresentação diverge por inteiro', () => {
    const resultado = diffRosterAgainstPackage(['SP-001', 'SP-002', 'SP-003'], pacote)
    expect(resultado.aligned).toBe(false)
    expect(resultado.missing).toHaveLength(3)
    expect(resultado.extra).toHaveLength(3)
  })

  test('divergência quase total se declara disjunta, para não virar aviso diário', () => {
    // O caso real de hoje: a tela fala sales_volume/leads_total e o pacote fala
    // sales_total/leads_received. O consultor não reconcilia isso pela tela.
    const tela = ['sales_volume', 'leads_total', 'lead_to_schedule_rate', 'daily_sales_rhythm']
    const contratado = ['sales_total', 'leads_received', 'lead_to_appointment_rate', 'sales_door_flow']
    expect(diffRosterAgainstPackage(tela, contratado).disjoint).toBe(true)
  })

  test('divergência parcial continua acionável e não é disjunta', () => {
    const tela = ['sales_volume', 'leads_total', 'gross_margin_rate']
    const contratado = ['sales_volume', 'leads_total', 'gross_margin_rate', 'turnover_rate']
    const r = diffRosterAgainstPackage(tela, contratado)
    expect(r.disjoint).toBe(false)
    expect(r.missing).toEqual(['turnover_rate'])
  })
})

describe('diffRosterAgainstPackage', () => {
  test('plano alinhado ao pacote', () => {
    expect(diffRosterAgainstPackage(['a', 'b'], ['b', 'a'])).toEqual({ missing: [], extra: [], aligned: true, disjoint: false })
  })

  test('indicador que o pacote passou a exigir aparece como faltante', () => {
    expect(diffRosterAgainstPackage(['a'], ['a', 'b']).missing).toEqual(['b'])
  })

  test('indicador removido do pacote continua no plano e é sinalizado', () => {
    expect(diffRosterAgainstPackage(['a', 'z'], ['a']).extra).toEqual(['z'])
  })

  test('plano vazio contra pacote cheio não passa por alinhado', () => {
    const diff = diffRosterAgainstPackage([], ['a', 'b'])
    expect(diff.aligned).toBe(false)
    expect(diff.missing).toHaveLength(2)
  })
})
