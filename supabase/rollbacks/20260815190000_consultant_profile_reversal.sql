-- REVERSAL de 20260815190000_consultant_profile.sql
-- Remove o perfil interno do consultor MX e suas qualificações. Idempotente.
-- Ordem: dependentes primeiro (qualificações por encontro/produto, depois perfil).

DROP TABLE IF EXISTS public.qualificacoes_encontro_consultor;
DROP TABLE IF EXISTS public.qualificacoes_produto_consultor;
DROP TABLE IF EXISTS public.perfil_consultor_mx;
