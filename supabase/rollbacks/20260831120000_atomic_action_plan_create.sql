-- DOWN — restaura criar_plano_acao_v2 sem parâmetros de checklist/metadados atômicos.

BEGIN;

DROP FUNCTION IF EXISTS public.criar_plano_acao_v2(
  score_scope_type, uuid, text, text, text, text, text, text, uuid, date, action_priority, action_origin,
  jsonb, text, text, integer, date, jsonb, uuid, text, boolean
);

CREATE OR REPLACE FUNCTION public.criar_plano_acao_v2(
  p_scope_type score_scope_type,
  p_scope_id uuid,
  p_objetivo text,
  p_departamento text,
  p_indicador text,
  p_problema text,
  p_acao text,
  p_como text default null,
  p_responsavel_id uuid default null,
  p_prazo date default null,
  p_prioridade action_priority default 'media'::action_priority,
  p_origem action_origin default 'manual'::action_origin
) RETURNS planos_acao
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.planos_acao;
BEGIN
  IF NOT public.can_create_mx_action_scope(p_scope_type, p_scope_id) THEN
    RAISE EXCEPTION 'Apenas a area interna MX cria plano de acao. Dono, Gerente e Vendedor executam o plano.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF nullif(trim(coalesce(p_departamento, '')), '') IS NULL
     OR nullif(trim(coalesce(p_indicador, '')), '') IS NULL
     OR nullif(trim(coalesce(p_problema, '')), '') IS NULL
     OR nullif(trim(coalesce(p_acao, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Departamento, indicador, problema e ação são obrigatórios.';
  END IF;

  INSERT INTO public.planos_acao (
    codigo, scope_type, scope_id, objetivo, departamento, indicador, problema,
    acao, como, responsavel_id, prazo, prioridade, origem, created_by
  ) VALUES (
    'PA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    p_scope_type, p_scope_id, nullif(trim(p_objetivo), ''), trim(p_departamento),
    trim(p_indicador), trim(p_problema), trim(p_acao), nullif(trim(p_como), ''),
    p_responsavel_id, p_prazo, p_prioridade, p_origem, auth.uid()
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

COMMIT;
