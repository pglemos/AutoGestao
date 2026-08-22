-- Completa os 12 oficiais Base44 que o catálogo MX ainda não tinha.

BEGIN;

INSERT INTO public.catalogo_metricas_consultoria (
  metric_key, label, area, value_type, direction, source_scope, status, frequencia,
  casas_decimais, visivel_dono, formula_expression, target_calculation_mode,
  unit_entry_mode, unit_rollup_method, created_origin, sort_order, active, updated_at
) VALUES
  ('vehicles_appraised', 'Volume de Carros Avaliados', 'Comercial', 'number', 'increase', 'computed', 'publicado', 'mensal', 0, true, 'IND("trade_in_volume") * PAR("EVALUATIONS_PER_TRADE_SALE")', 'CALCULATED_ADJUSTABLE', 'PER_UNIT_REQUIRED', 'SUM', 'mx_padrao', 12, true, now()),
  ('approved_credit_applications', 'Volume de Fichas Aprovadas', 'Comercial', 'number', 'increase', 'computed', 'publicado', 'mensal', 0, true, 'IND("sales_total") * PAR("FINANCED_SALES_RATE") * PAR("APPROVAL_BUFFER_MULTIPLIER")', 'CALCULATED_ADJUSTABLE', 'PER_UNIT_REQUIRED', 'SUM', 'mx_padrao', 15, true, now()),
  ('paid_credit_applications', 'Volume de Fichas Pagas', 'Comercial', 'number', 'increase', 'computed', 'publicado', 'mensal', 0, true, 'IND("approved_credit_applications") * PAR("APPROVED_TO_PAID_CONVERSION")', 'CALCULATED_ADJUSTABLE', 'PER_UNIT_REQUIRED', 'SUM', 'mx_padrao', 16, true, now()),
  ('financed_sales_percentage', '% Vendas Financiadas', 'Comercial', 'percent', 'increase', 'computed', 'publicado', 'mensal', 2, true, 'IND("paid_credit_applications") / IND("sales_total")', 'CALCULATED_LOCKED', 'PER_UNIT_REQUIRED', 'RECALCULATE_FROM_BASES', 'mx_padrao', 17, true, now()),
  ('inventory_over_90_volume', 'Tempo de Estoque > 90', 'Produto e Estoque', 'number', 'decrease', 'computed', 'publicado', 'mensal', 0, true, 'IND("stock_total") * PAR("OVER_90_STOCK_RATE")', 'CALCULATED_ADJUSTABLE', 'PER_UNIT_REQUIRED', 'SUM', 'mx_padrao', 32, true, now()),
  ('inventory_average_margin', 'Margem Média do Estoque', 'Produto e Estoque', 'currency', 'increase', 'computed', 'publicado', 'mensal', 2, true, 'IND("avg_stock_price") * PAR("STOCK_MARGIN_RATE")', 'CALCULATED_ADJUSTABLE', 'PER_UNIT_OPTIONAL', 'WEIGHTED_AVERAGE', 'mx_padrao', 35, true, now()),
  ('contribution_margin', 'Margem de Contribuição', 'Financeiro', 'currency', 'increase', 'manual', 'publicado', 'mensal', 2, true, null, 'MANUAL', 'PER_UNIT_REQUIRED', 'SUM', 'mx_padrao', 36, true, now()),
  ('additional_revenue', 'Receita Adicional', 'Financeiro', 'currency', 'increase', 'manual', 'publicado', 'mensal', 2, true, null, 'MANUAL', 'PER_UNIT_REQUIRED', 'SUM', 'mx_padrao', 37, true, now()),
  ('total_expense', 'Despesa Total', 'Financeiro', 'currency', 'decrease', 'manual', 'publicado', 'mensal', 2, true, null, 'MANUAL', 'PER_UNIT_REQUIRED', 'SUM', 'mx_padrao', 38, true, now()),
  ('after_sales_volume', 'Volume de Pós-Venda', 'Operações', 'number', 'decrease', 'computed', 'publicado', 'mensal', 0, true, 'IND("sales_total") * PAR("POST_SALE_RATE")', 'CALCULATED_ADJUSTABLE', 'PER_UNIT_REQUIRED', 'SUM', 'mx_padrao', 43, true, now()),
  ('after_sales_percentage', '% de Pós-Venda', 'Operações', 'percent', 'decrease', 'computed', 'publicado', 'mensal', 2, true, 'IND("after_sales_volume") / IND("sales_total")', 'CALCULATED_LOCKED', 'PER_UNIT_REQUIRED', 'RECALCULATE_FROM_BASES', 'mx_padrao', 44, true, now()),
  ('employee_count', 'Quadro de Colaboradores', 'Pessoas - RH', 'number', 'decrease', 'manual', 'publicado', 'mensal', 0, true, null, 'MANUAL', 'PER_UNIT_REQUIRED', 'SUM', 'mx_padrao', 45, true, now())
ON CONFLICT (metric_key) DO UPDATE SET
  label = EXCLUDED.label,
  area = EXCLUDED.area,
  value_type = EXCLUDED.value_type,
  direction = EXCLUDED.direction,
  source_scope = EXCLUDED.source_scope,
  status = 'publicado',
  active = true,
  visivel_dono = true,
  formula_expression = EXCLUDED.formula_expression,
  target_calculation_mode = EXCLUDED.target_calculation_mode,
  unit_entry_mode = EXCLUDED.unit_entry_mode,
  unit_rollup_method = EXCLUDED.unit_rollup_method,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

UPDATE public.catalogo_metricas_consultoria
SET formula_expression = 'IND("contribution_margin") + IND("additional_revenue") - IND("total_expense")',
    target_calculation_mode = 'CALCULATED_LOCKED',
    source_scope = 'computed',
    updated_at = now()
WHERE metric_key = 'net_profit';

INSERT INTO public.pacotes_indicadores_itens (
  version_id, metric_key, label_snapshot, area_snapshot, ordem_snapshot,
  input_mode_snapshot, formato_snapshot, direction_snapshot, inclusion_reason, is_required
)
SELECT
  version.id, catalog.metric_key, catalog.label, catalog.area, catalog.sort_order,
  CASE WHEN catalog.formula_expression IS NOT NULL AND btrim(catalog.formula_expression) <> '' THEN 'calculado' ELSE 'manual' END,
  catalog.value_type, catalog.direction, 'selecao_direta', true
FROM public.pacotes_indicadores_versoes version
CROSS JOIN public.catalogo_metricas_consultoria catalog
WHERE catalog.status = 'publicado'
  AND COALESCE(catalog.active, true)
  AND public.eh_indicador_oficial_base44(catalog.metric_key)
  AND NOT EXISTS (
    SELECT 1 FROM public.pacotes_indicadores_itens item
    WHERE item.version_id = version.id AND item.metric_key = catalog.metric_key
  )
ON CONFLICT (version_id, metric_key) DO NOTHING;

INSERT INTO public.ciclos_plano_estrategico_indicadores (
  ciclo_id, metric_key, label_snapshot, area_snapshot, value_type_snapshot,
  calculation_mode_snapshot, enabled, visible_to_owner, display_order, origin
)
SELECT
  ciclo.id, catalog.metric_key, catalog.label, catalog.area, catalog.value_type,
  catalog.target_calculation_mode, true, COALESCE(catalog.visivel_dono, true),
  COALESCE(catalog.sort_order, 9999), 'pacote'
FROM public.ciclos_plano_estrategico ciclo
CROSS JOIN public.catalogo_metricas_consultoria catalog
WHERE ciclo.status IN ('rascunho', 'em_validacao')
  AND catalog.status = 'publicado'
  AND COALESCE(catalog.active, true)
  AND public.eh_indicador_oficial_base44(catalog.metric_key)
  AND NOT EXISTS (
    SELECT 1 FROM public.ciclos_plano_estrategico_indicadores roster
    WHERE roster.ciclo_id = ciclo.id AND roster.metric_key = catalog.metric_key
  )
ON CONFLICT (ciclo_id, metric_key) DO NOTHING;

UPDATE public.pacotes_indicadores_versoes version
SET total_indicadores = sub.total,
    indicadores_manuais = sub.manuais,
    indicadores_calculados = sub.calculados,
    departamentos_count = sub.deptos,
    updated_at = now()
FROM (
  SELECT item.version_id, count(*)::int AS total,
    count(*) FILTER (WHERE item.input_mode_snapshot = 'manual')::int AS manuais,
    count(*) FILTER (WHERE item.input_mode_snapshot = 'calculado')::int AS calculados,
    count(DISTINCT item.area_snapshot)::int AS deptos
  FROM public.pacotes_indicadores_itens item
  GROUP BY item.version_id
) sub
WHERE version.id = sub.version_id;

COMMIT;
