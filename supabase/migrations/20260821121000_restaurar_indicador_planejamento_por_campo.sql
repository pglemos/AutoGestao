-- restaurar_metas_indicador_planejamento sempre restaurava para a coluna
-- `meta`, mesmo quando o snapshot histórico era de `realizado` (campo criado
-- na migration anterior deste mesmo lote). Sem esta correção, restaurar uma
-- versão do realizado escreveria o valor de volta na meta — corrompendo o
-- alvo do plano em vez de corrigir o resultado.

BEGIN;

CREATE OR REPLACE FUNCTION public.restaurar_metas_indicador_planejamento(
  p_history_id uuid,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_history public.historico_valores_indicadores_planejamento;
BEGIN
  SELECT * INTO v_history
  FROM public.historico_valores_indicadores_planejamento
  WHERE id = p_history_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Versão não encontrada.'; END IF;
  IF NOT public.pode_gerir_metas_planejamento(v_history.loja_id) THEN
    RAISE EXCEPTION 'Sem permissão para restaurar valores estratégicos.' USING ERRCODE = '42501';
  END IF;

  IF v_history.field = 'realizado' THEN
    RETURN public.salvar_realizado_indicador_planejamento(
      v_history.loja_id,
      v_history.indicator_code,
      v_history.year,
      v_history.previous_values,
      'manual',
      COALESCE(nullif(trim(p_note), ''), 'Restauração da versão ' || v_history.id::text)
    );
  END IF;

  RETURN public.salvar_metas_indicador_planejamento(
    v_history.loja_id,
    v_history.indicator_code,
    v_history.year,
    v_history.previous_values,
    COALESCE(nullif(trim(p_note), ''), 'Restauração da versão ' || v_history.id::text)
  );
END;
$$;

COMMIT;
