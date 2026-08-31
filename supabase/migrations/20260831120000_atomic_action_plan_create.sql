-- Criação atômica de plano de ação com checklist e metadados na mesma transação.
-- Evita POST 400 no patch pós-insert e planos órfãos sem vínculo de indicador/checklist.

BEGIN;

CREATE OR REPLACE FUNCTION public.criar_plano_acao_v2(
  p_scope_type score_scope_type,
  p_scope_id uuid,
  p_objetivo text,
  p_departamento text,
  p_indicador text,
  p_problema text,
  p_acao text,
  p_como text DEFAULT NULL,
  p_responsavel_id uuid DEFAULT NULL,
  p_prazo date DEFAULT NULL,
  p_prioridade action_priority DEFAULT 'media'::action_priority,
  p_origem action_origin DEFAULT 'manual'::action_origin,
  p_checklist jsonb DEFAULT NULL,
  p_participants text DEFAULT NULL,
  p_efficacy_indicator text DEFAULT NULL,
  p_reference_year integer DEFAULT NULL,
  p_iniciado_at date DEFAULT NULL,
  p_transition_metadata jsonb DEFAULT NULL,
  p_origem_ref_id uuid DEFAULT NULL,
  p_origem_ref_table text DEFAULT NULL,
  p_evidence_required boolean DEFAULT NULL
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

  IF nullif(trim(coalesce(p_departamento, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Campo obrigatório inválido: departamento.' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF nullif(trim(coalesce(p_indicador, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Campo obrigatório inválido: indicador.' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF nullif(trim(coalesce(p_problema, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Campo obrigatório inválido: problema.' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF nullif(trim(coalesce(p_acao, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Campo obrigatório inválido: acao.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_checklist IS NOT NULL AND jsonb_typeof(p_checklist) <> 'array' THEN
    RAISE EXCEPTION 'Campo inválido: checklist deve ser um array JSON.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  INSERT INTO public.planos_acao (
    codigo, scope_type, scope_id, objetivo, departamento, indicador, problema,
    acao, como, responsavel_id, prazo, prioridade, origem, created_by,
    checklist, participants, efficacy_indicator, reference_year, iniciado_at, transition_metadata,
    origem_ref_id, origem_ref_table, evidence_required
  ) VALUES (
    'PA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    p_scope_type, p_scope_id, nullif(trim(p_objetivo), ''), trim(p_departamento),
    trim(p_indicador), trim(p_problema), trim(p_acao), nullif(trim(p_como), ''),
    p_responsavel_id, p_prazo, p_prioridade, p_origem, auth.uid(),
    COALESCE(p_checklist, '[]'::jsonb),
    nullif(trim(p_participants), ''),
    nullif(trim(p_efficacy_indicator), ''),
    p_reference_year,
    p_iniciado_at,
    COALESCE(p_transition_metadata, '{}'::jsonb),
    p_origem_ref_id,
    nullif(trim(p_origem_ref_table), ''),
    p_evidence_required
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.criar_plano_acao_v2(
  score_scope_type, uuid, text, text, text, text, text, text, uuid, date, action_priority, action_origin,
  jsonb, text, text, integer, date, jsonb, uuid, text, boolean
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.criar_plano_acao_v2(
  score_scope_type, uuid, text, text, text, text, text, text, uuid, date, action_priority, action_origin,
  jsonb, text, text, integer, date, jsonb, uuid, text, boolean
) TO authenticated, service_role;

COMMIT;

-- DOWN
-- Restaura a assinatura anterior de criar_plano_acao_v2 (sem checklist/metadados atômicos).
-- DROP FUNCTION IF EXISTS public.criar_plano_acao_v2(
--   score_scope_type, uuid, text, text, text, text, text, text, uuid, date, action_priority, action_origin,
--   jsonb, text, text, integer, date, jsonb, uuid, text, boolean
-- );
-- CREATE OR REPLACE FUNCTION public.criar_plano_acao_v2(
--   p_scope_type score_scope_type,
--   p_scope_id uuid,
--   p_objetivo text,
--   p_departamento text,
--   p_indicador text,
--   p_problema text,
--   p_acao text,
--   p_como text default null,
--   p_responsavel_id uuid default null,
--   p_prazo date default null,
--   p_prioridade action_priority default 'media'::action_priority,
--   p_origem action_origin default 'manual'::action_origin
-- ) RETURNS planos_acao
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path TO 'public'
-- AS $function$
-- DECLARE
--   v_row public.planos_acao;
-- BEGIN
--   IF NOT public.can_create_mx_action_scope(p_scope_type, p_scope_id) THEN
--     RAISE EXCEPTION 'Apenas a area interna MX cria plano de acao. Dono, Gerente e Vendedor executam o plano.'
--       USING ERRCODE = 'insufficient_privilege';
--   END IF;
--   IF nullif(trim(coalesce(p_departamento, '')), '') IS NULL
--      OR nullif(trim(coalesce(p_indicador, '')), '') IS NULL
--      OR nullif(trim(coalesce(p_problema, '')), '') IS NULL
--      OR nullif(trim(coalesce(p_acao, '')), '') IS NULL THEN
--     RAISE EXCEPTION 'Departamento, indicador, problema e ação são obrigatórios.';
--   END IF;
--
--   INSERT INTO public.planos_acao (
--     codigo, scope_type, scope_id, objetivo, departamento, indicador, problema,
--     acao, como, responsavel_id, prazo, prioridade, origem, created_by
--   ) VALUES (
--     'PA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
--     p_scope_type, p_scope_id, nullif(trim(p_objetivo), ''), trim(p_departamento),
--     trim(p_indicador), trim(p_problema), trim(p_acao), nullif(trim(p_como), ''),
--     p_responsavel_id, p_prazo, p_prioridade, p_origem, auth.uid()
--   )
--   RETURNING * INTO v_row;
--
--   RETURN v_row;
-- END;
-- $function$;
