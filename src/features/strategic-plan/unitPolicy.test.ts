import { describe, expect, test } from 'bun:test'
import {
  UNIT_ENTRY_MODES,
  UNIT_POLICY_DEFAULTS,
  UNIT_ROLLUP_METHODS,
  isUnitPolicyDefined,
  resolveUnitPolicy,
} from './unitPolicy'

describe('catálogo de modos e métodos', () => {
  test('expõe os quatro modos de cadastro', () => {
    expect(Object.keys(UNIT_ENTRY_MODES).sort()).toEqual([
      'COMPANY_ONLY',
      'PER_UNIT_OPTIONAL',
      'PER_UNIT_REQUIRED',
      'SHARED_COMPANY_VALUE',
    ])
  })

  test('expõe os oito métodos de consolidação', () => {
    expect(Object.keys(UNIT_ROLLUP_METHODS)).toHaveLength(8)
  })
})

describe('padrões do catálogo mestre', () => {
  test('indicadores aditivos somam', () => {
    expect(UNIT_POLICY_DEFAULTS.SALES_WALKIN.unit_rollup_method).toBe('SUM')
    expect(UNIT_POLICY_DEFAULTS.LEADS_RECEIVED.unit_rollup_method).toBe('SUM')
    expect(UNIT_POLICY_DEFAULTS.SELLER_COUNT.unit_rollup_method).toBe('SUM')
  })

  test('percentuais e médias nunca somam — recalculam pelas bases', () => {
    const naoSomaveis = [
      'SALES_TOTAL',
      'VISIT_TO_SALE_CONVERSION',
      'LEAD_TO_APPOINTMENT_CONVERSION',
      'TRADE_SALES_PERCENTAGE',
      'FINANCED_SALES_PERCENTAGE',
      'AVERAGE_SALES_MARGIN',
      'SALES_PER_SELLER',
      'INVENTORY_TURNOVER',
    ] as const
    for (const code of naoSomaveis) {
      expect(UNIT_POLICY_DEFAULTS[code].unit_rollup_method).toBe('RECALCULATE_FROM_BASES')
    }
  })

  test('médias ponderadas declaram o indicador-peso', () => {
    expect(UNIT_POLICY_DEFAULTS.INVENTORY_AVERAGE_TICKET).toMatchObject({
      unit_rollup_method: 'WEIGHTED_AVERAGE',
      weight_indicator_code: 'INVENTORY_TOTAL',
    })
    expect(UNIT_POLICY_DEFAULTS.AVERAGE_AFTER_SALES_COST.weight_indicator_code).toBe('AFTER_SALES_VOLUME')
  })

  test('indicadores centralizados são cadastrados só na empresa', () => {
    expect(UNIT_POLICY_DEFAULTS.INSTAGRAM_FOLLOWERS).toMatchObject({
      unit_entry_mode: 'COMPANY_ONLY',
      unit_rollup_method: 'COMPANY_VALUE',
    })
  })

  test('nenhum padrão declara soma para indicador percentual', () => {
    for (const [code, policy] of Object.entries(UNIT_POLICY_DEFAULTS)) {
      if (/PERCENTAGE|CONVERSION|_PER_|AVERAGE|TURNOVER|RATING/.test(code)) {
        expect(policy.unit_rollup_method).not.toBe('SUM')
      }
    }
  })
})

describe('resolveUnitPolicy — hierarquia override > pacote > catálogo > padrão', () => {
  const indicatorDef = {
    unit_entry_mode: 'PER_UNIT_OPTIONAL',
    unit_rollup_method: 'AVERAGE_VALID_VALUES',
    weight_indicator_code: null,
  }
  const packageItem = {
    unit_entry_mode_snapshot: 'COMPANY_ONLY',
    unit_rollup_method_snapshot: 'COMPANY_VALUE',
    weight_indicator_code_snapshot: null,
  }
  const clientIndicator = {
    unit_entry_mode: 'PER_UNIT_REQUIRED',
    unit_rollup_method: 'WEIGHTED_AVERAGE',
    weight_indicator_code: 'INVENTORY_TOTAL',
  }

  test('override do cliente vence tudo', () => {
    expect(resolveUnitPolicy('SALES_WALKIN', clientIndicator, packageItem, indicatorDef)).toEqual({
      unit_entry_mode: 'PER_UNIT_REQUIRED',
      unit_rollup_method: 'WEIGHTED_AVERAGE',
      weight_indicator_code: 'INVENTORY_TOTAL',
    })
  })

  test('snapshot do pacote vence o catálogo', () => {
    expect(resolveUnitPolicy('SALES_WALKIN', null, packageItem, indicatorDef)).toEqual({
      unit_entry_mode: 'COMPANY_ONLY',
      unit_rollup_method: 'COMPANY_VALUE',
      weight_indicator_code: null,
    })
  })

  test('catálogo vence o padrão do módulo', () => {
    expect(resolveUnitPolicy('SALES_WALKIN', null, null, indicatorDef)).toEqual({
      unit_entry_mode: 'PER_UNIT_OPTIONAL',
      unit_rollup_method: 'AVERAGE_VALID_VALUES',
      weight_indicator_code: null,
    })
  })

  test('sem nada declarado cai no padrão do módulo', () => {
    expect(resolveUnitPolicy('SALES_WALKIN')).toEqual({
      unit_entry_mode: 'PER_UNIT_REQUIRED',
      unit_rollup_method: 'SUM',
      weight_indicator_code: null,
    })
  })

  test('política parcial não é aceita como override', () => {
    const parcial = { unit_entry_mode: 'COMPANY_ONLY', unit_rollup_method: null }
    expect(resolveUnitPolicy('SALES_WALKIN', parcial).unit_rollup_method).toBe('SUM')
  })

  test('indicador desconhecido devolve política indefinida em vez de somar', () => {
    const policy = resolveUnitPolicy('INDICADOR_QUE_NAO_EXISTE')
    expect(policy).toEqual({
      unit_entry_mode: null,
      unit_rollup_method: null,
      weight_indicator_code: null,
    })
    expect(isUnitPolicyDefined(policy)).toBe(false)
  })
})

describe('isUnitPolicyDefined', () => {
  test('exige modo e método', () => {
    expect(isUnitPolicyDefined({ unit_entry_mode: 'COMPANY_ONLY', unit_rollup_method: 'COMPANY_VALUE' })).toBe(true)
    expect(isUnitPolicyDefined({ unit_entry_mode: 'COMPANY_ONLY', unit_rollup_method: null })).toBe(false)
    expect(isUnitPolicyDefined(null)).toBe(false)
  })
})

describe('vocabulário do catálogo MX', () => {
  // O catálogo em produção usa metric_key próprio; sem estas entradas todo
  // indicador MX ficaria sem política e o consolidado sairia vazio.
  // Os 45 metric_key do catálogo em produção — o mesmo conjunto do Base44.
  // Legados fora desse conjunto foram removidos do catálogo em
  // 20260826180000; política para indicador inexistente é código morto.
  const MX_CODES = [
    'vehicles_appraised', 'approved_credit_applications', 'paid_credit_applications', 'financed_sales_percentage', 'sales_total',
    'inventory_over_90_volume', 'inventory_average_margin', 'contribution_margin', 'additional_revenue', 'total_expense',
    'sales_door_flow', 'after_sales_volume', 'after_sales_percentage', 'employee_count', 'sales_referral',
    'sales_company_wallet', 'sales_seller_wallet', 'sales_internet', 'sales_other', 'seller_count',
    'avg_sales_per_seller', 'leads_received', 'avg_leads_per_seller', 'appointments', 'visits',
    'appointments_per_sale', 'lead_to_appointment_rate', 'appointment_to_visit_rate', 'visit_to_sale_rate', 'internet_investment',
    'internet_cost_per_sale', 'avg_stock_price', 'instagram_followers', 'google_rating', 'content_quality',
    'stock_total', 'active_stock', 'stock_turnover', 'stock_over_90_rate', 'trade_in_volume',
    'trade_in_to_sales_rate', 'net_profit', 'avg_margin', 'preparation_cost', 'post_sale_cost',
  ]

  test('todo indicador do catálogo MX tem política declarada', () => {
    const semPolitica = MX_CODES.filter(code => !isUnitPolicyDefined(resolveUnitPolicy(code)))
    expect(semPolitica).toEqual([])
  })

  test('nenhuma taxa do catálogo MX é somada entre unidades', () => {
    for (const code of MX_CODES.filter(item => /_rate$|_share$|^avg_|_per_/.test(item))) {
      expect(resolveUnitPolicy(code).unit_rollup_method).not.toBe('SUM')
    }
  })

  test('médias de estoque são ponderadas pelo volume de estoque', () => {
    expect(resolveUnitPolicy('avg_stock_price')).toMatchObject({
      unit_rollup_method: 'WEIGHTED_AVERAGE',
      weight_indicator_code: 'stock_total',
    })
    // `trade_in_avg_margin` saiu do catálogo em 20260826180000; a média de
    // margem que restou é a do estoque, ponderada pelo mesmo volume.
    expect(resolveUnitPolicy('inventory_average_margin')).toMatchObject({
      unit_rollup_method: 'WEIGHTED_AVERAGE',
      weight_indicator_code: 'INVENTORY_TOTAL',
    })
  })

  test('presença digital é medida na empresa, não por unidade', () => {
    for (const code of ['instagram_followers', 'google_rating', 'content_quality']) {
      expect(resolveUnitPolicy(code).unit_entry_mode).toBe('COMPANY_ONLY')
    }
  })
})

describe('resolveUnitPolicy — vocabulário do código', () => {
  test('resolve o padrão para o roster persistido em snake_case minúsculo', () => {
    // Política ausente é impedimento crítico: com lookup exato, 12 dos 45
    // indicadores do roster ficavam sem política e travavam a publicação.
    for (const code of ['additional_revenue', 'approved_credit_applications', 'total_expense', 'vehicles_appraised']) {
      const policy = resolveUnitPolicy(code)
      expect(isUnitPolicyDefined(policy)).toBe(true)
    }
  })
})
