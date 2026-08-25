-- Permite que o modal de edição consulte o saldo sem contar a própria visita.
-- O segundo argumento tem default para manter compatibilidade com consumidores
-- existentes que chamam apenas saldo_presencial_cliente(p_client_id).

DROP FUNCTION IF EXISTS public.saldo_presencial_cliente(uuid, uuid);
DROP FUNCTION IF EXISTS public.saldo_presencial_cliente(uuid);

CREATE FUNCTION public.saldo_presencial_cliente(
  p_client_id uuid,
  p_exclude_visit_id uuid DEFAULT NULL
)
RETURNS TABLE (contratadas integer, minimas integer, usadas integer, disponiveis integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    p.max_presenciais,
    p.min_presenciais,
    count(v.id) FILTER (WHERE lower(coalesce(v.modality, '')) = 'presencial')::integer,
    CASE
      WHEN p.max_presenciais IS NULL THEN NULL
      ELSE p.max_presenciais - count(v.id) FILTER (WHERE lower(coalesce(v.modality, '')) = 'presencial')::integer
    END
  FROM public.clientes_consultoria c
  JOIN public.programas_visita_consultoria p ON p.program_key = c.program_template_key
  LEFT JOIN public.visitas_consultoria v
    ON v.client_id = c.id
   AND NOT v.fora_do_contrato
   AND (p_exclude_visit_id IS NULL OR v.id <> p_exclude_visit_id)
  WHERE c.id = p_client_id
  GROUP BY p.max_presenciais, p.min_presenciais;
$$;

REVOKE ALL ON FUNCTION public.saldo_presencial_cliente(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.saldo_presencial_cliente(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.saldo_presencial_cliente(uuid, uuid) IS
  'Retorna o saldo presencial contratado, opcionalmente excluindo a visita em edição.';
