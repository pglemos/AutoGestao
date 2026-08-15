-- REVERSAL de 20260815130000_action_plan_templates.sql
-- Remove a biblioteca de templates de plano de ação do módulo Administrador MX.
-- Idempotente (DROP ... IF EXISTS). Ordem: dependentes primeiro.

DROP TABLE IF EXISTS public.planos_acao_template_itens;
DROP TABLE IF EXISTS public.planos_acao_template_versoes;
DROP TABLE IF EXISTS public.planos_acao_templates;
