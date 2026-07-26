-- RPCs canônicas para criar/editar Plano de Ação com escopo e auditoria.

BEGIN;

CREATE OR REPLACE FUNCTION public.can_manage_mx_action_scope(
  p_scope_type public.score_scope_type,
  p_scope_id uuid,
  uid uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF uid IS NULL OR p_scope_id IS NULL THEN RETURN false; END IF;
  IF public.eh_area_interna_mx(uid) OR public.user_has_role(ARRAY['admin_mx', 'consultant'], uid) THEN
    RETURN true;
  END IF;

  IF p_scope_type = 'store'::public.score_scope_type THEN
    RETURN public.can_access_mx_scope(p_scope_type, p_scope_id, uid);
  END IF;

  IF p_scope_type = 'department'::public.score_scope_type THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.departamentos_mx d
      WHERE d.id = p_scope_id
        AND public.can_access_mx_scope('store'::public.score_scope_type, d.loja_id, uid)
    );
  END IF;

  IF p_scope_type = 'individual'::public.score_scope_type THEN
    RETURN p_scope_id = uid
      OR EXISTS (
        SELECT 1
        FROM public.vinculos_loja alvo
        JOIN public.vinculos_loja gestor ON gestor.store_id = alvo.store_id
        WHERE alvo.user_id = p_scope_id
          AND alvo.is_active
          AND gestor.user_id = uid
          AND gestor.is_active
          AND gestor.role IN ('dono', 'gerente')
      );
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.criar_plano_acao_v2(
  p_scope_type public.score_scope_type,
  p_scope_id uuid,
  p_objetivo text,
  p_departamento text,
  p_indicador text,
  p_problema text,
  p_acao text,
  p_como text DEFAULT NULL,
  p_responsavel_id uuid DEFAULT NULL,
  p_prazo date DEFAULT NULL,
  p_prioridade public.action_priority DEFAULT 'media',
  p_origem public.action_origin DEFAULT 'manual'
)
RETURNS public.planos_acao
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.planos_acao;
BEGIN
  IF NOT public.can_manage_mx_action_scope(p_scope_type, p_scope_id) THEN
    RAISE EXCEPTION 'Sem permissão para criar ação neste escopo.' USING ERRCODE = 'insufficient_privilege';
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
$$;

CREATE OR REPLACE FUNCTION public.atualizar_plano_acao(
  p_plano_id uuid,
  p_acao text DEFAULT NULL,
  p_objetivo text DEFAULT NULL,
  p_indicador text DEFAULT NULL,
  p_departamento text DEFAULT NULL,
  p_responsavel_id uuid DEFAULT NULL,
  p_prazo date DEFAULT NULL,
  p_prioridade public.action_priority DEFAULT NULL,
  p_status public.action_status DEFAULT NULL,
  p_progresso smallint DEFAULT NULL,
  p_como text DEFAULT NULL,
  p_eficacia_score smallint DEFAULT NULL,
  p_eficacia_nota text DEFAULT NULL,
  p_checklist jsonb DEFAULT NULL,
  p_comentarios jsonb DEFAULT NULL
)
RETURNS public.planos_acao
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before public.planos_acao;
  v_after public.planos_acao;
  v_leader boolean;
BEGIN
  SELECT * INTO v_before FROM public.planos_acao WHERE id = p_plano_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plano de ação não encontrado.'; END IF;

  v_leader := public.user_has_role(ARRAY['master', 'director', 'sales_manager', 'consultant', 'admin_mx']);
  IF NOT public.can_manage_mx_action_scope(v_before.scope_type, v_before.scope_id)
     AND v_before.responsavel_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Sem permissão para atualizar este plano.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT v_leader AND (
    p_acao IS NOT NULL OR p_objetivo IS NOT NULL OR p_indicador IS NOT NULL
    OR p_departamento IS NOT NULL OR p_responsavel_id IS NOT NULL
    OR p_prazo IS NOT NULL OR p_prioridade IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Responsável pode atualizar apenas execução, progresso e eficácia.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.planos_acao
  SET acao = coalesce(p_acao, acao),
      objetivo = coalesce(p_objetivo, objetivo),
      indicador = coalesce(p_indicador, indicador),
      departamento = coalesce(p_departamento, departamento),
      responsavel_id = CASE WHEN v_leader THEN p_responsavel_id ELSE responsavel_id END,
      prazo = coalesce(p_prazo, prazo),
      prioridade = coalesce(p_prioridade, prioridade),
      status = coalesce(p_status, status),
      progresso = coalesce(p_progresso, progresso),
      como = coalesce(p_como, como),
      eficacia_score = coalesce(p_eficacia_score, eficacia_score),
      eficacia_nota = coalesce(p_eficacia_nota, eficacia_nota),
      checklist = coalesce(p_checklist, checklist),
      comentarios = coalesce(p_comentarios, comentarios)
  WHERE id = p_plano_id
  RETURNING * INTO v_after;

  RETURN v_after;
END;
$$;

REVOKE ALL ON FUNCTION public.can_manage_mx_action_scope(public.score_scope_type, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_mx_action_scope(public.score_scope_type, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_plano_acao_v2(public.score_scope_type, uuid, text, text, text, text, text, text, uuid, date, public.action_priority, public.action_origin) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_plano_acao(uuid, text, text, text, text, uuid, date, public.action_priority, public.action_status, smallint, text, smallint, text, jsonb, jsonb) TO authenticated;

COMMIT;
