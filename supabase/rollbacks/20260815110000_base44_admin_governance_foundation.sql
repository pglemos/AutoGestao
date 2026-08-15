-- DOWN
-- Rollback: 20260815110000_base44_admin_governance_foundation.sql
-- Seguro enquanto esta fundação ainda não tiver dados produtivos dependentes.
-- A ordem abaixo respeita as FKs internas da camada de governança.

BEGIN;

DROP TABLE IF EXISTS public.modelos_relatorio_encontro CASCADE;
DROP TABLE IF EXISTS public.conteudos_referencia_encontro CASCADE;
DROP TABLE IF EXISTS public.evidencias_modelo_encontro CASCADE;
DROP TABLE IF EXISTS public.entregas_modelo_encontro CASCADE;
DROP TABLE IF EXISTS public.guias_consultor_encontro CASCADE;
DROP TABLE IF EXISTS public.conteudos_metodologia_encontro CASCADE;
DROP TABLE IF EXISTS public.versoes_metodologia_consultoria CASCADE;

DROP TABLE IF EXISTS public.aplicacoes_modelo_plano_acao CASCADE;
DROP TABLE IF EXISTS public.itens_modelo_plano_acao CASCADE;
DROP TABLE IF EXISTS public.versoes_modelos_planos_acao CASCADE;
DROP TABLE IF EXISTS public.modelos_planos_acao CASCADE;

DROP TABLE IF EXISTS public.itens_pacote_indicadores_estrategicos CASCADE;
DROP TABLE IF EXISTS public.versoes_pacote_indicadores_estrategicos CASCADE;
DROP TABLE IF EXISTS public.pacotes_indicadores_estrategicos CASCADE;

DROP TABLE IF EXISTS public.consultores_mx_encontros CASCADE;
DROP TABLE IF EXISTS public.consultores_mx_produtos CASCADE;
DROP TABLE IF EXISTS public.consultores_mx_perfil CASCADE;

DROP TABLE IF EXISTS public.versoes_programa_consultoria CASCADE;

COMMIT;
