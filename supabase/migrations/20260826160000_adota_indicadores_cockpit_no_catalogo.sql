-- Adota no catálogo da metodologia os 41 indicadores do cockpit executivo.
--
-- O `central-mx-engine` mantinha catálogo próprio: dos 43 códigos que expõe ao
-- Dono, só `visit_to_sale_rate` e `net_profit` existiam em
-- `catalogo_metricas_consultoria`. Os outros 41 não existiam em lugar nenhum —
-- apareciam na tela sem respaldo na metodologia.
--
-- Entram como `criado_mx`, publicados e visíveis ao Dono. NÃO são adicionados a
-- nenhum pacote de produto: os planos estratégicos já publicados seguem com o
-- mesmo conjunto de indicadores, sem alteração retroativa.
--
-- Política de unidade: COMPANY_ONLY / COMPANY_VALUE. São medidas executivas da
-- operação como um todo; somar ou ponderar entre filiais exigiria uma regra que
-- a metodologia ainda não definiu, e chutá-la produziria número plausível e
-- errado.

INSERT INTO public.catalogo_metricas_consultoria (
  metric_key, label, direction, value_type, area, status, active, visivel_dono,
  frequencia, target_calculation_mode, unit_entry_mode, unit_rollup_method,
  created_origin, casas_decimais, sort_order
) VALUES
  ('sales_volume', 'Volume de Vendas', 'increase', 'number', 'Comercial', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 0, 1010),
  ('sales_goal_attainment', 'Atingimento da Meta', 'increase', 'percent', 'Comercial', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 1, 1020),
  ('daily_sales_rhythm', 'Ritmo Diário de Vendas', 'increase', 'number', 'Comercial', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 0, 1030),
  ('lead_to_schedule_rate', 'Conversão Lead > Agendamento', 'increase', 'percent', 'Comercial', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 1, 1040),
  ('schedule_to_visit_rate', 'Conversão Agendamento > Visita', 'increase', 'percent', 'Comercial', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 1, 1050),
  ('commercial_pipeline_health', 'Saúde do Funil de Vendas', 'increase', 'number', 'Comercial', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 0, 1070),
  ('seller_ranking_spread', 'Dispersão do Ranking', 'decrease', 'number', 'Comercial', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 0, 1080),
  ('leads_total', 'Leads Recebidos', 'increase', 'number', 'Marketing', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 0, 1110),
  ('digital_leads_share', 'Participação de Leads Digitais', 'increase', 'percent', 'Marketing', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 1, 1120),
  ('lead_quality_score', 'Qualidade dos Leads', 'increase', 'number', 'Marketing', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 0, 1130),
  ('campaign_cadence_score', 'Cadência de Campanhas', 'increase', 'number', 'Marketing', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 0, 1140),
  ('channel_mix_score', 'Mix de Canais', 'increase', 'number', 'Marketing', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 0, 1150),
  ('marketing_positioning_score', 'Posicionamento de Marketing', 'increase', 'number', 'Marketing', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 0, 1160),
  ('inventory_total', 'Estoque Total', 'decrease', 'number', 'Produto e Estoque', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 0, 1210),
  ('inventory_over_90_days', 'Estoque Acima de 90 Dias', 'decrease', 'number', 'Produto e Estoque', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 0, 1220),
  ('stock_turnover_rate', 'Giro de Estoque', 'increase', 'number', 'Produto e Estoque', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 0, 1230),
  ('average_vehicle_margin', 'Margem Média por Veículo', 'increase', 'percent', 'Produto e Estoque', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 1, 1240),
  ('pricing_accuracy_score', 'Aderência de Precificação', 'increase', 'number', 'Produto e Estoque', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 0, 1250),
  ('preparation_cycle_days', 'Ciclo de Preparação', 'decrease', 'number', 'Produto e Estoque', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 0, 1260),
  ('vehicle_mix_score', 'Mix de Veículos', 'increase', 'number', 'Produto e Estoque', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 0, 1270),
  ('gross_profit', 'Lucro Bruto', 'increase', 'currency', 'Financeiro', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 2, 1310),
  ('gross_margin_pct', '% Margem', 'increase', 'percent', 'Financeiro', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 1, 1320),
  ('cost_per_sale', 'Custo por Venda', 'decrease', 'currency', 'Financeiro', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 2, 1340),
  ('fixed_cost_ratio', 'Peso do Custo Fixo', 'decrease', 'percent', 'Financeiro', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 1, 1350),
  ('cash_flow_balance', 'Saldo de Fluxo de Caixa', 'increase', 'currency', 'Financeiro', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 2, 1360),
  ('dre_completion_rate', 'Completude do DRE', 'increase', 'percent', 'Financeiro', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 1, 1370),
  ('financial_risk_score', 'Risco Financeiro', 'increase', 'number', 'Financeiro', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 0, 1380),
  ('employees_total', 'Funcionários Ativos', 'increase', 'number', 'Pessoas - RH', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 0, 1410),
  ('feedback_cadence_rate', 'Cadência de Feedbacks', 'increase', 'percent', 'Pessoas - RH', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 1, 1430),
  ('pdi_completion_rate', 'Evolução de PDI', 'increase', 'percent', 'Pessoas - RH', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 1, 1440),
  ('turnover_rate', 'Turnover', 'decrease', 'percent', 'Pessoas - RH', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 1, 1450),
  ('happiness_index', 'Índice de Felicidade', 'increase', 'number', 'Pessoas - RH', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 0, 1460),
  ('role_clarity_score', 'Clareza de Papéis', 'increase', 'number', 'Pessoas - RH', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 0, 1470),
  ('behavioral_fit_score', 'Aderência Comportamental', 'increase', 'number', 'Pessoas - RH', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 0, 1480),
  ('routine_discipline_rate', 'Disciplina de Rotina', 'increase', 'percent', 'Operações', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 1, 1510),
  ('agenda_fulfillment_rate', 'Agenda Cumprida', 'increase', 'percent', 'Operações', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 1, 1520),
  ('daily_checkin_coverage', 'Cobertura de Fechamento Diário', 'increase', 'percent', 'Operações', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 1, 1530),
  ('action_plan_on_time_rate', 'Plano de Ação no Prazo', 'increase', 'percent', 'Operações', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 1, 1540),
  ('evidence_completion_rate', 'Evidências Registradas', 'increase', 'percent', 'Operações', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 1, 1550),
  ('executive_agenda_adherence', 'Aderência à Agenda Executiva', 'increase', 'percent', 'Operações', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 1, 1560),
  ('process_quality_score', 'Qualidade dos Processos', 'increase', 'number', 'Operações', 'publicado', true, true, 'mensal', 'MANUAL', 'COMPANY_ONLY', 'COMPANY_VALUE', 'criado_mx', 0, 1570)
ON CONFLICT (metric_key) DO NOTHING;
