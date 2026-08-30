-- DOWN — desativa o 46º indicador sem remover dados históricos.
--
-- O catálogo e os snapshots de pacote/ciclo são históricos. Por isso o
-- rollback arquiva o catálogo e restaura a lista oficial anterior, mas não
-- apaga itens já materializados nem metas eventualmente lançadas.

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
    'lead_to_appointment_rate','leads','leads_per_seller','leads_received','margem_de_contribuicao',
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
    'visits_volume','volume_de_agendamentos','volume_de_carros_de_troca','volume_de_vendas_com_troca',
    'volume_de_visitas','volume_leads','volume_vendedores'
  );
$$;

UPDATE public.catalogo_metricas_consultoria
SET status = 'arquivado', active = false, updated_at = now()
WHERE metric_key = 'volume_de_leads_por_venda';

COMMIT;
