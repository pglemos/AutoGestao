-- Unifica os dois catálogos de indicadores para a tela "Metas e realizados".
--
-- A tela lista `catalogo_metricas_consultoria` (chave `metric_key`, 50 itens),
-- mas `salvar_metas_indicador_planejamento` valida contra
-- `catalogo_indicadores_planejamento` (chave `code`, 45 itens). Os dois
-- conjuntos só coincidiam em 4 códigos, então 46 dos 50 indicadores da tela
-- falhavam com "Indicador estratégico inválido." ao salvar.
--
-- `catalogo_indicadores_planejamento` também é alvo de FK de
-- `valores_indicadores_planejamento` e `historico_valores_indicadores_planejamento`,
-- então o código precisa existir nele para a meta poder ser gravada.
--
-- Esta migration copia para o catálogo de planejamento os códigos que só
-- existem no catálogo de métricas. Nada é sobrescrito: `ON CONFLICT DO NOTHING`
-- preserva os 4 já presentes e os 41 que só existem no de planejamento
-- (usados pela Central MX e não expostos nesta tela).

INSERT INTO public.catalogo_indicadores_planejamento (
  code, label, category, unit, sort_order, active, metadata,
  department_code, dimension, target_direction
)
SELECT
  metrica.metric_key,
  metrica.label,
  area_mapeada.category,
  -- `value_type` já usa o mesmo vocabulário de `unit` (number/currency/percent).
  metrica.value_type,
  COALESCE(metrica.sort_order, 100),
  COALESCE(metrica.active, true),
  jsonb_build_object(
    'origem', 'catalogo_metricas_consultoria',
    'area_original', metrica.area,
    'unificado_em', '2026-08-18'
  ),
  area_mapeada.category,
  -- `dimension` fica nulo: o catálogo de métricas não carrega essa
  -- classificação, e o CHECK só aceita resultado/processo/disciplina.
  NULL,
  CASE metrica.direction
    WHEN 'increase' THEN 'higher'
    WHEN 'decrease' THEN 'lower'
  END
FROM public.catalogo_metricas_consultoria AS metrica
CROSS JOIN LATERAL (
  -- `category` e `department_code` do catálogo de planejamento usam o
  -- vocabulário de departamento; o de métricas usa áreas de negócio.
  SELECT CASE metrica.area
    WHEN 'Vendas'          THEN 'comercial'
    WHEN 'Funil'           THEN 'comercial'
    WHEN 'CRM'             THEN 'comercial'
    WHEN 'Estoque'         THEN 'produto'
    WHEN 'Troca'           THEN 'produto'
    WHEN 'Financeiro'      THEN 'financeiro'
    WHEN 'Marketing'       THEN 'marketing'
    WHEN 'Equipe'          THEN 'rh'
    WHEN 'Desenvolvimento' THEN 'rh'
    ELSE 'operacional'
  END AS category
) AS area_mapeada
WHERE metrica.active IS TRUE
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE public.catalogo_indicadores_planejamento IS
  'Catálogo canônico de indicadores que aceitam meta anual. Desde 2026-08-18 '
  'inclui os códigos de catalogo_metricas_consultoria (metadata->>''origem''), '
  'para que a tela Metas e realizados consiga salvar os indicadores que exibe.';
