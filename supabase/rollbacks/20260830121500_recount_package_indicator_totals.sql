-- DOWN (compensatório): não restaura os totais obsoletos anteriores.
--
-- A migration corrigiu colunas derivadas a partir dos itens reais. Restaurar
-- os números antigos voltaria a mentir na UI; o rollback seguro é repetir o
-- recálculo canônico, preservando os itens e seus dados.

BEGIN;

UPDATE public.pacotes_indicadores_versoes version
SET total_indicadores = sub.total,
    indicadores_manuais = sub.manuais,
    indicadores_calculados = sub.calculados,
    departamentos_count = sub.deptos,
    updated_at = now()
FROM (
  SELECT item.version_id,
    count(*)::int AS total,
    count(*) FILTER (WHERE item.input_mode_snapshot = 'manual')::int AS manuais,
    count(*) FILTER (WHERE item.input_mode_snapshot = 'calculado')::int AS calculados,
    count(DISTINCT item.area_snapshot)::int AS deptos
  FROM public.pacotes_indicadores_itens item
  GROUP BY item.version_id
) sub
WHERE version.id = sub.version_id;

COMMIT;
