-- Corrige o rótulo de escopo na varredura de ações atrasadas.
--
-- `mx_score_atualizar_atraso_plano(p_store_id)` filtrava por
-- `scope_type = 'loja'`. A coluna é do enum `score_scope_type`, cujos rótulos são
-- ('store', 'department', 'individual', 'process') — 'loja' não existe nele.
--
-- Efeito: chamar a função para uma loja específica levanta erro de valor inválido
-- de enum em vez de marcar as ações vencidas. Só a chamada global
-- (`p_store_id IS NULL`) funcionava, porque nesse caminho o predicado nem é
-- avaliado. Confirmado contra produção: filtrar `planos_acao` por
-- `scope_type = 'loja'` erra; por 'store' devolve linhas.

BEGIN;

CREATE OR REPLACE FUNCTION public.mx_score_atualizar_atraso_plano(
  p_store_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.user_has_role(ARRAY['master','director','sales_manager','consultant','admin_mx']) THEN
    RAISE EXCEPTION 'insuficiente: requer role operacional'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  WITH affected AS (
    UPDATE public.planos_acao
       SET status = 'atrasado',
           updated_at = now()
     WHERE prazo IS NOT NULL
       AND prazo < CURRENT_DATE
       AND status IN ('pendente', 'em_andamento')
       AND (
         p_store_id IS NULL
         OR (scope_type = 'store'::public.score_scope_type AND scope_id = p_store_id)
       )
     RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM affected;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.mx_score_atualizar_atraso_plano(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mx_score_atualizar_atraso_plano(uuid) TO authenticated;

COMMIT;

-- DOWN
-- Reverter recria a versão com o rótulo 'loja', que não resolve para o enum.
