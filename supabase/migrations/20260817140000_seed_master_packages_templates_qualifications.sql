-- Migration: Seed Master Packages, Templates, and Consultant Qualifications
-- Version: 20260817140000

BEGIN;

-- 1. SEED PACOTES DE INDICADORES ESTRATÉGICOS
-- Pacote 1: Completo MX Performance (45 Indicadores)
INSERT INTO public.pacotes_indicadores_estrategicos (id, pacote_key, nome, descricao, status, current_published_version_id, created_at, updated_at)
VALUES (
  'a0000001-0000-0000-0000-000000000001'::uuid,
  'pacote_completo_mx',
  'Pacote Completo MX Performance (45 Indicadores)',
  'Matriz completa de indicadores estratégicos cobrindo todos os 6 departamentos de gestão.',
  'publicado',
  NULL,
  now(),
  now()
) ON CONFLICT (pacote_key) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  status = EXCLUDED.status,
  updated_at = now();

-- Versão 1 do Pacote Completo
INSERT INTO public.pacotes_indicadores_versoes (
  id, pacote_id, versao, nome, descricao, status, catalog_version_snapshot,
  total_indicadores, indicadores_manuais, indicadores_calculados, departamentos_count, published_at, created_at, updated_at
) VALUES (
  'b0000001-0000-0000-0000-000000000001'::uuid,
  'a0000001-0000-0000-0000-000000000001'::uuid,
  1,
  'Versão 1.0 (Canônica)',
  'Versão inicial com todos os 45 indicadores homologados.',
  'publicada',
  '2026.1',
  (SELECT COUNT(*)::int FROM public.catalogo_metricas_consultoria),
  (SELECT COUNT(*)::int FROM public.catalogo_metricas_consultoria WHERE COALESCE(target_calculation_mode, 'MANUAL') = 'MANUAL'),
  (SELECT COUNT(*)::int FROM public.catalogo_metricas_consultoria WHERE target_calculation_mode = 'CALCULADO'),
  (SELECT COUNT(DISTINCT area)::int FROM public.catalogo_metricas_consultoria),
  now(),
  now(),
  now()
) ON CONFLICT (pacote_id, versao) DO UPDATE SET
  status = EXCLUDED.status,
  total_indicadores = EXCLUDED.total_indicadores,
  indicadores_manuais = EXCLUDED.indicadores_manuais,
  indicadores_calculados = EXCLUDED.indicadores_calculados,
  departamentos_count = EXCLUDED.departamentos_count,
  published_at = EXCLUDED.published_at,
  updated_at = now();

UPDATE public.pacotes_indicadores_estrategicos
SET current_published_version_id = 'b0000001-0000-0000-0000-000000000001'::uuid
WHERE pacote_key = 'pacote_completo_mx';

-- Itens do Pacote Completo
DELETE FROM public.pacotes_indicadores_itens WHERE version_id = 'b0000001-0000-0000-0000-000000000001'::uuid;

INSERT INTO public.pacotes_indicadores_itens (
  id, version_id, metric_key, label_snapshot, area_snapshot, ordem_snapshot,
  input_mode_snapshot, formato_snapshot, direction_snapshot, inclusion_reason, is_required, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  'b0000001-0000-0000-0000-000000000001'::uuid,
  metric_key,
  label,
  area,
  sort_order,
  CASE WHEN target_calculation_mode = 'CALCULADO' THEN 'calculado' ELSE 'manual' END,
  value_type,
  direction,
  'selecao_direta',
  true,
  now(),
  now()
FROM public.catalogo_metricas_consultoria;

-- Pacote 2: Comercial & Marketing
INSERT INTO public.pacotes_indicadores_estrategicos (id, pacote_key, nome, descricao, status, current_published_version_id, created_at, updated_at)
VALUES (
  'a0000002-0000-0000-0000-000000000002'::uuid,
  'pacote_comercial_marketing',
  'Pacote Comercial & Marketing',
  'Foco em captação de leads, conversão comercial, ticket médio e giro de showroom.',
  'publicado',
  NULL,
  now(),
  now()
) ON CONFLICT (pacote_key) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO public.pacotes_indicadores_versoes (
  id, pacote_id, versao, nome, descricao, status, catalog_version_snapshot,
  total_indicadores, indicadores_manuais, indicadores_calculados, departamentos_count, published_at, created_at, updated_at
) VALUES (
  'b0000002-0000-0000-0000-000000000002'::uuid,
  'a0000002-0000-0000-0000-000000000002'::uuid,
  1,
  'Versão 1.0',
  'Indicadores dos departamentos Comercial e Marketing.',
  'publicada',
  '2026.1',
  (SELECT COUNT(*)::int FROM public.catalogo_metricas_consultoria WHERE area IN ('comercial', 'marketing')),
  (SELECT COUNT(*)::int FROM public.catalogo_metricas_consultoria WHERE area IN ('comercial', 'marketing') AND COALESCE(target_calculation_mode, 'MANUAL') = 'MANUAL'),
  (SELECT COUNT(*)::int FROM public.catalogo_metricas_consultoria WHERE area IN ('comercial', 'marketing') AND target_calculation_mode = 'CALCULADO'),
  2,
  now(),
  now(),
  now()
) ON CONFLICT (pacote_id, versao) DO UPDATE SET
  status = EXCLUDED.status,
  total_indicadores = EXCLUDED.total_indicadores,
  indicadores_manuais = EXCLUDED.indicadores_manuais,
  indicadores_calculados = EXCLUDED.indicadores_calculados,
  departamentos_count = EXCLUDED.departamentos_count,
  published_at = EXCLUDED.published_at,
  updated_at = now();

UPDATE public.pacotes_indicadores_estrategicos
SET current_published_version_id = 'b0000002-0000-0000-0000-000000000002'::uuid
WHERE pacote_key = 'pacote_comercial_marketing';

DELETE FROM public.pacotes_indicadores_itens WHERE version_id = 'b0000002-0000-0000-0000-000000000002'::uuid;

INSERT INTO public.pacotes_indicadores_itens (
  id, version_id, metric_key, label_snapshot, area_snapshot, ordem_snapshot,
  input_mode_snapshot, formato_snapshot, direction_snapshot, inclusion_reason, is_required, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  'b0000002-0000-0000-0000-000000000002'::uuid,
  metric_key,
  label,
  area,
  sort_order,
  CASE WHEN target_calculation_mode = 'CALCULADO' THEN 'calculado' ELSE 'manual' END,
  value_type,
  direction,
  'selecao_departamento',
  true,
  now(),
  now()
FROM public.catalogo_metricas_consultoria
WHERE area IN ('comercial', 'marketing');

-- Vincular o pacote completo como padrão nos programas de consultoria
UPDATE public.programas_visita_consultoria
SET indicator_package_version_id = 'b0000001-0000-0000-0000-000000000001'::uuid
WHERE indicator_package_version_id IS NULL;


-- 2. SEED PLANOS DE AÇÃO TEMPLATES

-- Template: Recuperação de Meta de Vendas
INSERT INTO public.planos_acao_templates (
  id, template_key, nome, departamento, indicador, descricao, program_key, active, created_at, updated_at
) VALUES (
  'c0000001-0000-0000-0000-000000000001'::uuid,
  'recuperacao_meta_vendas',
  'Recuperação de Meta de Vendas',
  'COMERCIAL',
  'SALES_TOTAL',
  'Plano para recuperar vendas quando o resultado está abaixo da meta mensal estabelecida no Plano Estratégico.',
  NULL,
  true,
  now(),
  now()
) ON CONFLICT (template_key) DO UPDATE SET
  nome = EXCLUDED.nome,
  departamento = EXCLUDED.departamento,
  indicador = EXCLUDED.indicador,
  descricao = EXCLUDED.descricao,
  active = EXCLUDED.active,
  updated_at = now();

INSERT INTO public.planos_acao_template_versoes (
  id, template_id, versao, status, notas, published_at, created_at, updated_at
) VALUES (
  'd0000001-0000-0000-0000-000000000001'::uuid,
  'c0000001-0000-0000-0000-000000000001'::uuid,
  1,
  'publicada',
  'Template padrão homologado pela Consultoria MX.',
  now(),
  now(),
  now()
) ON CONFLICT (template_id, versao) DO UPDATE SET
  status = EXCLUDED.status,
  published_at = EXCLUDED.published_at,
  updated_at = now();

DELETE FROM public.planos_acao_template_itens WHERE version_id = 'd0000001-0000-0000-0000-000000000001'::uuid;
INSERT INTO public.planos_acao_template_itens (
  id, version_id, ordem, problema, acao, como, departamento, indicador, prioridade, prazo_dias, evidencia_requerida, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'd0000001-0000-0000-0000-000000000001'::uuid,
  1,
  'Vendas abaixo da meta mensal projetada',
  'Analisar funil de vendas por vendedor',
  'Levantar leads, agendamentos e visitas por vendedor. Identificar gargalos de conversão.',
  'COMERCIAL',
  'SALES_TOTAL',
  'alta'::public.action_priority,
  3,
  true,
  now(),
  now()
);
INSERT INTO public.planos_acao_template_itens (
  id, version_id, ordem, problema, acao, como, departamento, indicador, prioridade, prazo_dias, evidencia_requerida, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'd0000001-0000-0000-0000-000000000001'::uuid,
  2,
  'Falta de clareza nas metas individuais de recuperação',
  'Reunião de alinhamento com equipe comercial',
  'Apresentar o gap atual, definir metas individuais semanais e plano de ataque por vendedor.',
  'COMERCIAL',
  'SALES_TOTAL',
  'critica'::public.action_priority,
  5,
  true,
  now(),
  now()
);
INSERT INTO public.planos_acao_template_itens (
  id, version_id, ordem, problema, acao, como, departamento, indicador, prioridade, prazo_dias, evidencia_requerida, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'd0000001-0000-0000-0000-000000000001'::uuid,
  3,
  'Desmotivação ou baixa tração no fechamento',
  'Campanha de incentivo de curto prazo',
  'Definir premiação por superação de meta e aceleradores de fechamento na semana.',
  'COMERCIAL',
  'SALES_TOTAL',
  'media'::public.action_priority,
  7,
  false,
  now(),
  now()
);
INSERT INTO public.planos_acao_template_itens (
  id, version_id, ordem, problema, acao, como, departamento, indicador, prioridade, prazo_dias, evidencia_requerida, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'd0000001-0000-0000-0000-000000000001'::uuid,
  4,
  'Oscilação diária sem acompanhamento próximo',
  'Acompanhamento diário de vendas (Matinal)',
  'Reunião diária de 15 minutos para revisar números do dia anterior e foco do dia.',
  'COMERCIAL',
  'SALES_TOTAL',
  'alta'::public.action_priority,
  30,
  true,
  now(),
  now()
);

-- Template: Aumento do Volume de Leads
INSERT INTO public.planos_acao_templates (
  id, template_key, nome, departamento, indicador, descricao, program_key, active, created_at, updated_at
) VALUES (
  'c0000002-0000-0000-0000-000000000002'::uuid,
  'aumento_volume_leads',
  'Aumento do Volume de Leads',
  'MARKETING',
  'LEADS_RECEIVED',
  'Plano para aumentar o volume e qualificação de leads recebidos via canais digitais e portais.',
  NULL,
  true,
  now(),
  now()
) ON CONFLICT (template_key) DO UPDATE SET
  nome = EXCLUDED.nome,
  departamento = EXCLUDED.departamento,
  indicador = EXCLUDED.indicador,
  descricao = EXCLUDED.descricao,
  active = EXCLUDED.active,
  updated_at = now();

INSERT INTO public.planos_acao_template_versoes (
  id, template_id, versao, status, notas, published_at, created_at, updated_at
) VALUES (
  'd0000002-0000-0000-0000-000000000002'::uuid,
  'c0000002-0000-0000-0000-000000000002'::uuid,
  1,
  'publicada',
  'Template padrão homologado pela Consultoria MX.',
  now(),
  now(),
  now()
) ON CONFLICT (template_id, versao) DO UPDATE SET
  status = EXCLUDED.status,
  published_at = EXCLUDED.published_at,
  updated_at = now();

DELETE FROM public.planos_acao_template_itens WHERE version_id = 'd0000002-0000-0000-0000-000000000002'::uuid;
INSERT INTO public.planos_acao_template_itens (
  id, version_id, ordem, problema, acao, como, departamento, indicador, prioridade, prazo_dias, evidencia_requerida, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'd0000002-0000-0000-0000-000000000002'::uuid,
  1,
  'Volume insuficiente de oportunidades no topo do funil',
  'Auditoria de campanhas ativas e portais',
  'Revisar todas as campanhas de tráfego pago e portais classificados. Pausar anúncios de baixo ROI.',
  'MARKETING',
  'LEADS_RECEIVED',
  'alta'::public.action_priority,
  5,
  true,
  now(),
  now()
);
INSERT INTO public.planos_acao_template_itens (
  id, version_id, ordem, problema, acao, como, departamento, indicador, prioridade, prazo_dias, evidencia_requerida, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'd0000002-0000-0000-0000-000000000002'::uuid,
  2,
  'Verba mal distribuída entre veículos de alta procura',
  'Ajuste de verba, lances e estoque anunciado',
  'Redistribuir orçamento para os modelos de maior giro e horários de maior conversão.',
  'MARKETING',
  'LEADS_RECEIVED',
  'alta'::public.action_priority,
  7,
  true,
  now(),
  now()
);
INSERT INTO public.planos_acao_template_itens (
  id, version_id, ordem, problema, acao, como, departamento, indicador, prioridade, prazo_dias, evidencia_requerida, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'd0000002-0000-0000-0000-000000000002'::uuid,
  3,
  'Falta de criativos atualizados e ofertas atrativas',
  'Criação de nova campanha de geração de leads',
  'Lançar anúncios com chamadas diretas para WhatsApp e formulário de avaliação rápida.',
  'MARKETING',
  'LEADS_RECEIVED',
  'media'::public.action_priority,
  10,
  true,
  now(),
  now()
);

-- Template: Redução do Estoque acima de 90 dias
INSERT INTO public.planos_acao_templates (
  id, template_key, nome, departamento, indicador, descricao, program_key, active, created_at, updated_at
) VALUES (
  'c0000003-0000-0000-0000-000000000003'::uuid,
  'reducao_estoque_90',
  'Redução do Estoque acima de 90 dias',
  'PRODUTO_ESTOQUE',
  'INVENTORY_OVER_90_PERCENTAGE',
  'Plano para acelerar o giro de veículos estagnados há mais de 90 dias no pátio.',
  NULL,
  true,
  now(),
  now()
) ON CONFLICT (template_key) DO UPDATE SET
  nome = EXCLUDED.nome,
  departamento = EXCLUDED.departamento,
  indicador = EXCLUDED.indicador,
  descricao = EXCLUDED.descricao,
  active = EXCLUDED.active,
  updated_at = now();

INSERT INTO public.planos_acao_template_versoes (
  id, template_id, versao, status, notas, published_at, created_at, updated_at
) VALUES (
  'd0000003-0000-0000-0000-000000000003'::uuid,
  'c0000003-0000-0000-0000-000000000003'::uuid,
  1,
  'publicada',
  'Template padrão homologado pela Consultoria MX.',
  now(),
  now(),
  now()
) ON CONFLICT (template_id, versao) DO UPDATE SET
  status = EXCLUDED.status,
  published_at = EXCLUDED.published_at,
  updated_at = now();

DELETE FROM public.planos_acao_template_itens WHERE version_id = 'd0000003-0000-0000-0000-000000000003'::uuid;
INSERT INTO public.planos_acao_template_itens (
  id, version_id, ordem, problema, acao, como, departamento, indicador, prioridade, prazo_dias, evidencia_requerida, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'd0000003-0000-0000-0000-000000000003'::uuid,
  1,
  'Capital imobilizado em veículos de baixo giro',
  'Inventário e diagnóstico do estoque crítico >90 dias',
  'Listar todos os veículos estagnados, tempo de pátio, custo total e margem atual.',
  'PRODUTO_ESTOQUE',
  'INVENTORY_OVER_90_PERCENTAGE',
  'critica'::public.action_priority,
  3,
  true,
  now(),
  now()
);
INSERT INTO public.planos_acao_template_itens (
  id, version_id, ordem, problema, acao, como, departamento, indicador, prioridade, prazo_dias, evidencia_requerida, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'd0000003-0000-0000-0000-000000000003'::uuid,
  2,
  'Preço fora da curva de mercado e da concorrência',
  'Revisão de precificação e margem mínima autorizada',
  'Reprecificar veículos alinhados à tabela FIPE e anúncios concorrentes para atrair visitas.',
  'PRODUTO_ESTOQUE',
  'INVENTORY_OVER_90_PERCENTAGE',
  'alta'::public.action_priority,
  7,
  true,
  now(),
  now()
);
INSERT INTO public.planos_acao_template_itens (
  id, version_id, ordem, problema, acao, como, departamento, indicador, prioridade, prazo_dias, evidencia_requerida, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'd0000003-0000-0000-0000-000000000003'::uuid,
  3,
  'Pouca visibilidade dos modelos estagnados',
  'Campanha de veículos selecionados na vitrine digital',
  'Destacar os carros >90 dias em posição prioritária no site, redes sociais e showroom.',
  'PRODUTO_ESTOQUE',
  'INVENTORY_OVER_90_PERCENTAGE',
  'alta'::public.action_priority,
  10,
  true,
  now(),
  now()
);
INSERT INTO public.planos_acao_template_itens (
  id, version_id, ordem, problema, acao, como, departamento, indicador, prioridade, prazo_dias, evidencia_requerida, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'd0000003-0000-0000-0000-000000000003'::uuid,
  4,
  'Falta de cadência no acompanhamento das ofertas',
  'Comitê semanal de giro de estoque',
  'Reunião semanal entre compras, vendas e diretoria para avaliar propostas recebidas.',
  'PRODUTO_ESTOQUE',
  'INVENTORY_OVER_90_PERCENTAGE',
  'media'::public.action_priority,
  60,
  true,
  now(),
  now()
);

-- Template: Adequação do Quadro de Colaboradores
INSERT INTO public.planos_acao_templates (
  id, template_key, nome, departamento, indicador, descricao, program_key, active, created_at, updated_at
) VALUES (
  'c0000004-0000-0000-0000-000000000004'::uuid,
  'adequacao_quadro_colab',
  'Adequação do Quadro de Colaboradores',
  'PESSOAS_RH',
  'EMPLOYEE_COUNT',
  'Plano para dimensionar a equipe e capacidade operacional ao volume de negócios.',
  NULL,
  true,
  now(),
  now()
) ON CONFLICT (template_key) DO UPDATE SET
  nome = EXCLUDED.nome,
  departamento = EXCLUDED.departamento,
  indicador = EXCLUDED.indicador,
  descricao = EXCLUDED.descricao,
  active = EXCLUDED.active,
  updated_at = now();

INSERT INTO public.planos_acao_template_versoes (
  id, template_id, versao, status, notas, published_at, created_at, updated_at
) VALUES (
  'd0000004-0000-0000-0000-000000000004'::uuid,
  'c0000004-0000-0000-0000-000000000004'::uuid,
  1,
  'publicada',
  'Template padrão homologado pela Consultoria MX.',
  now(),
  now(),
  now()
) ON CONFLICT (template_id, versao) DO UPDATE SET
  status = EXCLUDED.status,
  published_at = EXCLUDED.published_at,
  updated_at = now();

DELETE FROM public.planos_acao_template_itens WHERE version_id = 'd0000004-0000-0000-0000-000000000004'::uuid;
INSERT INTO public.planos_acao_template_itens (
  id, version_id, ordem, problema, acao, como, departamento, indicador, prioridade, prazo_dias, evidencia_requerida, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'd0000004-0000-0000-0000-000000000004'::uuid,
  1,
  'Capacidade de atendimento incompatível com as metas',
  'Diagnóstico do quadro de colaboradores por setor',
  'Levantar número de funcionários, produtividade individual, turnover e custos por área.',
  'PESSOAS_RH',
  'EMPLOYEE_COUNT',
  'media'::public.action_priority,
  15,
  true,
  now(),
  now()
);
INSERT INTO public.planos_acao_template_itens (
  id, version_id, ordem, problema, acao, como, departamento, indicador, prioridade, prazo_dias, evidencia_requerida, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'd0000004-0000-0000-0000-000000000004'::uuid,
  2,
  'Gaps de competências e sobrecarga de funções',
  'Definição da estrutura ideal e perfil de vagas',
  'Modelar organograma objetivo com papéis claros e perfil para eventuais contratações.',
  'PESSOAS_RH',
  'EMPLOYEE_COUNT',
  'alta'::public.action_priority,
  30,
  true,
  now(),
  now()
);
INSERT INTO public.planos_acao_template_itens (
  id, version_id, ordem, problema, acao, como, departamento, indicador, prioridade, prazo_dias, evidencia_requerida, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'd0000004-0000-0000-0000-000000000004'::uuid,
  3,
  'Processo seletivo e integração lentos',
  'Execução do plano de contratação e onboarding',
  'Conduzir entrevistas, testes comportamentais e trilha de treinamento inicial na Universidade MX.',
  'PESSOAS_RH',
  'EMPLOYEE_COUNT',
  'media'::public.action_priority,
  45,
  true,
  now(),
  now()
);

-- Template: Redução de Despesas Operacionais
INSERT INTO public.planos_acao_templates (
  id, template_key, nome, departamento, indicador, descricao, program_key, active, created_at, updated_at
) VALUES (
  'c0000005-0000-0000-0000-000000000005'::uuid,
  'reducao_despesas',
  'Redução de Despesas Operacionais',
  'FINANCEIRO',
  'TOTAL_EXPENSE',
  'Plano para enxugar despesas fixas e variáveis sem comprometer a qualidade da entrega.',
  NULL,
  true,
  now(),
  now()
) ON CONFLICT (template_key) DO UPDATE SET
  nome = EXCLUDED.nome,
  departamento = EXCLUDED.departamento,
  indicador = EXCLUDED.indicador,
  descricao = EXCLUDED.descricao,
  active = EXCLUDED.active,
  updated_at = now();

INSERT INTO public.planos_acao_template_versoes (
  id, template_id, versao, status, notas, published_at, created_at, updated_at
) VALUES (
  'd0000005-0000-0000-0000-000000000005'::uuid,
  'c0000005-0000-0000-0000-000000000005'::uuid,
  1,
  'publicada',
  'Template padrão homologado pela Consultoria MX.',
  now(),
  now(),
  now()
) ON CONFLICT (template_id, versao) DO UPDATE SET
  status = EXCLUDED.status,
  published_at = EXCLUDED.published_at,
  updated_at = now();

DELETE FROM public.planos_acao_template_itens WHERE version_id = 'd0000005-0000-0000-0000-000000000005'::uuid;
INSERT INTO public.planos_acao_template_itens (
  id, version_id, ordem, problema, acao, como, departamento, indicador, prioridade, prazo_dias, evidencia_requerida, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'd0000005-0000-0000-0000-000000000005'::uuid,
  1,
  'Despesas operacionais acima do orçamento previsto',
  'Auditoria e classificação de despesas por centro de custo',
  'Mapear todos os desembolsos dos últimos 90 dias e separar gastos essenciais de dispensáveis.',
  'FINANCEIRO',
  'TOTAL_EXPENSE',
  'alta'::public.action_priority,
  7,
  true,
  now(),
  now()
);
INSERT INTO public.planos_acao_template_itens (
  id, version_id, ordem, problema, acao, como, departamento, indicador, prioridade, prazo_dias, evidencia_requerida, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'd0000005-0000-0000-0000-000000000005'::uuid,
  2,
  'Contratos recorrentes defasados ou superfaturados',
  'Renegociação de contratos de fornecedores e serviços',
  'Contatar parceiros de TI, telefonia, manutenção e sistemas buscando descontos.',
  'FINANCEIRO',
  'TOTAL_EXPENSE',
  'alta'::public.action_priority,
  20,
  true,
  now(),
  now()
);
INSERT INTO public.planos_acao_template_itens (
  id, version_id, ordem, problema, acao, como, departamento, indicador, prioridade, prazo_dias, evidencia_requerida, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'd0000005-0000-0000-0000-000000000005'::uuid,
  3,
  'Desperdício de recursos no dia a dia da loja',
  'Implantação de política de controle de gastos',
  'Definir alçadas de aprovação e teto de gastos departamentais com prestação de contas.',
  'FINANCEIRO',
  'TOTAL_EXPENSE',
  'media'::public.action_priority,
  15,
  true,
  now(),
  now()
);

-- Template: Otimização do Custo e Tempo de Preparação
INSERT INTO public.planos_acao_templates (
  id, template_key, nome, departamento, indicador, descricao, program_key, active, created_at, updated_at
) VALUES (
  'c0000006-0000-0000-0000-000000000006'::uuid,
  'reducao_custo_preparacao',
  'Otimização do Custo e Tempo de Preparação',
  'OPERACOES',
  'AVERAGE_PREPARATION_COST',
  'Plano para reduzir tempo de pátio pré-venda e despesas com oficinas e estética.',
  NULL,
  true,
  now(),
  now()
) ON CONFLICT (template_key) DO UPDATE SET
  nome = EXCLUDED.nome,
  departamento = EXCLUDED.departamento,
  indicador = EXCLUDED.indicador,
  descricao = EXCLUDED.descricao,
  active = EXCLUDED.active,
  updated_at = now();

INSERT INTO public.planos_acao_template_versoes (
  id, template_id, versao, status, notas, published_at, created_at, updated_at
) VALUES (
  'd0000006-0000-0000-0000-000000000006'::uuid,
  'c0000006-0000-0000-0000-000000000006'::uuid,
  1,
  'publicada',
  'Template padrão homologado pela Consultoria MX.',
  now(),
  now(),
  now()
) ON CONFLICT (template_id, versao) DO UPDATE SET
  status = EXCLUDED.status,
  published_at = EXCLUDED.published_at,
  updated_at = now();

DELETE FROM public.planos_acao_template_itens WHERE version_id = 'd0000006-0000-0000-0000-000000000006'::uuid;
INSERT INTO public.planos_acao_template_itens (
  id, version_id, ordem, problema, acao, como, departamento, indicador, prioridade, prazo_dias, evidencia_requerida, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'd0000006-0000-0000-0000-000000000006'::uuid,
  1,
  'Demora e custos excessivos na entrada de novos veículos',
  'Mapeamento do fluxo de vistoria e preparação',
  'Cronometrar tempo entre compra, mecânica, funilaria, higienização e fotos.',
  'OPERACOES',
  'AVERAGE_PREPARATION_COST',
  'media'::public.action_priority,
  10,
  true,
  now(),
  now()
);
INSERT INTO public.planos_acao_template_itens (
  id, version_id, ordem, problema, acao, como, departamento, indicador, prioridade, prazo_dias, evidencia_requerida, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'd0000006-0000-0000-0000-000000000006'::uuid,
  2,
  'Falta de tabela padronizada de serviços terceirizados',
  'Homologação e tabela de preços com oficinas parceiras',
  'Fechar pacote fechado de mão de obra e insumos com fornecedores de confiança.',
  'OPERACOES',
  'AVERAGE_PREPARATION_COST',
  'alta'::public.action_priority,
  20,
  true,
  now(),
  now()
);
INSERT INTO public.planos_acao_template_itens (
  id, version_id, ordem, problema, acao, como, departamento, indicador, prioridade, prazo_dias, evidencia_requerida, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'd0000006-0000-0000-0000-000000000006'::uuid,
  3,
  'Gargalos na liberação do veículo para a loja',
  'Checklist digital de liberação para venda',
  'Implantar vistoria com aprovação obrigatória do gerente antes do anúncio do veículo.',
  'OPERACOES',
  'AVERAGE_PREPARATION_COST',
  'alta'::public.action_priority,
  30,
  true,
  now(),
  now()
);

-- 3. SEED QUALIFICAÇÕES DE CONSULTORES MX
-- Qualificar todos os consultores e administradores internos em todos os programas ativos
INSERT INTO public.qualificacoes_produto_consultor (id, user_id, program_key, created_at)
SELECT
  gen_random_uuid(),
  u.id,
  p.program_key,
  now()
FROM public.usuarios u
CROSS JOIN public.programas_visita_consultoria p
WHERE u.role IN ('administrador_geral', 'administrador_mx', 'consultor_mx')
  AND p.active = true
ON CONFLICT (user_id, program_key) DO NOTHING;

-- Qualificar todos os consultores e administradores em todos os encontros/visitas de cada programa
INSERT INTO public.qualificacoes_encontro_consultor (id, user_id, program_key, visit_number, created_at)
SELECT
  gen_random_uuid(),
  u.id,
  p.program_key,
  e.visit_number,
  now()
FROM public.usuarios u
CROSS JOIN public.programas_visita_consultoria p
CROSS JOIN LATERAL generate_series(1, p.total_visits) AS e(visit_number)
WHERE u.role IN ('administrador_geral', 'administrador_mx', 'consultor_mx')
  AND p.active = true
ON CONFLICT (user_id, program_key, visit_number) DO NOTHING;

COMMIT;
