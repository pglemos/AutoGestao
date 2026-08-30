-- VOLUME_DE_LEADS_POR_VENDA é o 46º indicador oficial (manual, decimal, ordem 26).
-- O gate de 20260822033000 não listava os aliases; o editor tentava inserir a chave
-- sintetizada no ciclo e o trigger derrubava o Cadastro Rápido inteiro.

BEGIN;

CREATE OR REPLACE FUNCTION public.eh_indicador_oficial_base44(p_metric_key text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(p_metric_key)) IN (
    'active_inventory','active_stock','additional_revenue','after_sales_percentage','after_sales_volume',
    'agendamentos','agendamentos_por_venda','appointment_to_visit_conversion','appointment_to_visit_rate',
    'appointments','appointments_per_internet_sale','appointments_per_sale','appointments_volume',
    'approved_credit_applications','avaliacao_google_meu_negocio','average_after_sales_cost',
    'average_preparation_cost','average_sales_margin','avg_leads_per_seller','avg_margin',
    'avg_sales_per_seller','avg_stock_price','carteira_empresa','carteira_vendedor','comparecimentos',
    'content_quality','contribution_margin','conversao_agendamento_para_visita','conversao_lead_para_agendamento',
    'conversao_visita_para_venda','custo_de_preparacao','custo_medio_pos_venda','custo_medio_preparacao',
    'custo_pos_venda','despesa_total','employee_count','employees','estoque_acima_de_90_dias',
    'estoque_ativo','estoque_total','financed_sales_percentage','giro_de_estoque','google_business_rating',
    'google_rating','instagram_followers','internet_cost_per_sale','internet_investment',
    'inventory_average_margin','inventory_average_ticket','inventory_over_90_percentage',
    'inventory_over_90_volume','inventory_total','inventory_turnover','lead_to_appointment_conversion',
    'lead_to_appointment_rate','leads','leads_per_sale','leads_per_seller','leads_received','margem_de_contribuicao',
    'margem_media','margem_media_de_venda','media_de_leads_por_vendedor','media_de_vendas_por_vendedor',
    'media_vendas_por_vendedor','net_profit','paid_credit_applications','participacao_da_troca_nas_vendas',
    'post_sale_cost','preco_medio_do_estoque','preparation_cost','quadro_colaboradores',
    'quadro_de_colaboradores','receita_adicional','sales_carteira_empresa','sales_carteira_vendedor',
    'sales_company','sales_company_portfolio','sales_company_wallet','sales_door','sales_door_flow',
    'sales_indication','sales_internet','sales_other','sales_others','sales_per_seller','sales_referral',
    'sales_seller','sales_seller_portfolio','sales_seller_wallet','sales_total','sales_walkin','sales_web',
    'sales_with_trade','seller_count','sellers','stock_over_90_rate','stock_total','stock_turnover',
    'ticket_medio_do_estoque','total_expense','trade_in_to_sales_rate','trade_in_volume',
    'trade_sales_percentage','vehicles_appraised','vendas_fluxo_de_porta','vendas_indicacao',
    'vendas_internet','vendas_outros','visit_to_sale_conversion','visit_to_sale_rate','visitas','visits',
    'visits_volume','volume_de_agendamentos','volume_de_carros_de_troca','volume_de_leads_por_venda',
    'volume_de_vendas_com_troca','volume_de_visitas','volume_leads','volume_leads_por_venda','volume_vendedores'
  );
$$;

INSERT INTO public.catalogo_metricas_consultoria (
  metric_key, label, area, value_type, direction, source_scope, status, frequencia,
  casas_decimais, visivel_dono, formula_expression, target_calculation_mode,
  unit_entry_mode, unit_rollup_method, created_origin, sort_order, active, updated_at
) VALUES (
  'volume_de_leads_por_venda',
  'Volume de Leads por Venda',
  'Marketing',
  'number',
  'increase',
  'manual',
  'publicado',
  'mensal',
  2,
  true,
  null,
  'MANUAL',
  'PER_UNIT_REQUIRED',
  'SUM',
  'mx_padrao',
  26,
  true,
  now()
)
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
  casas_decimais = EXCLUDED.casas_decimais,
  updated_at = now();

INSERT INTO public.pacotes_indicadores_itens (
  version_id, metric_key, label_snapshot, area_snapshot, ordem_snapshot,
  input_mode_snapshot, formato_snapshot, direction_snapshot, inclusion_reason, is_required
)
SELECT
  version.id, catalog.metric_key, catalog.label, catalog.area, catalog.sort_order,
  'manual', catalog.value_type, catalog.direction, 'selecao_direta', true
FROM public.pacotes_indicadores_versoes version
CROSS JOIN public.catalogo_metricas_consultoria catalog
WHERE catalog.metric_key = 'volume_de_leads_por_venda'
  AND catalog.status = 'publicado'
  AND COALESCE(catalog.active, true)
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
  COALESCE(catalog.sort_order, 26), 'pacote'
FROM public.ciclos_plano_estrategico ciclo
CROSS JOIN public.catalogo_metricas_consultoria catalog
WHERE ciclo.status IN ('rascunho', 'em_validacao')
  AND catalog.metric_key = 'volume_de_leads_por_venda'
  AND catalog.status = 'publicado'
  AND COALESCE(catalog.active, true)
  AND public.eh_indicador_oficial_base44(catalog.metric_key)
  AND NOT EXISTS (
    SELECT 1 FROM public.ciclos_plano_estrategico_indicadores roster
    WHERE roster.ciclo_id = ciclo.id AND roster.metric_key = catalog.metric_key
  )
ON CONFLICT (ciclo_id, metric_key) DO NOTHING;

COMMIT;
