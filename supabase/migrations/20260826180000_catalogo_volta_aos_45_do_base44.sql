-- O catálogo da metodologia volta a ser exatamente os 45 indicadores do Base44.
--
-- Sai tudo o que não pertence a esse conjunto:
--
--   * os 41 adotados do cockpit executivo na migration 20260826160000
--     (`created_origin = 'criado_mx'`) — nunca entraram em plano, pacote ou
--     meta: 0 linhas em cada uma dessas tabelas;
--   * os 17 legados arquivados (`status = 'arquivado'`), que tinham 204 linhas
--     de esqueleto em `valores_indicadores_planejamento` — todas sem meta, sem
--     realizado e sem ano anterior — e 17 registros de histórico.
--
-- Não existe FK apontando para `catalogo_metricas_consultoria`, então as linhas
-- dependentes precisam ser removidas explicitamente: um DELETE só no catálogo
-- deixaria dado órfão apontando para indicador inexistente, sem erro nenhum.

-- 1. Dados dependentes dos indicadores que vão sair.
DELETE FROM public.historico_valores_indicadores_planejamento
WHERE indicator_code IN (
  SELECT metric_key FROM public.catalogo_metricas_consultoria
  WHERE status = 'arquivado' OR created_origin = 'criado_mx'
);

DELETE FROM public.valores_indicadores_planejamento
WHERE indicator_code IN (
  SELECT metric_key FROM public.catalogo_metricas_consultoria
  WHERE status = 'arquivado' OR created_origin = 'criado_mx'
);

-- 2. O catálogo em si.
DELETE FROM public.catalogo_metricas_consultoria
WHERE status = 'arquivado' OR created_origin = 'criado_mx';
