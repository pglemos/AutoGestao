-- A migration de VOLUME inseriu o 46º item nos pacotes, mas não recalculou
-- pacotes_indicadores_versoes.total_indicadores. A lista /plano-estrategico
-- lia o total desatualizado (45) enquanto o editor já mostrava 46.

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
