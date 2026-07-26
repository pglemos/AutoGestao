-- CRUD global de planejamento e consultoria para a área interna MX.
-- A exclusão de consultoria permanece arquivável: histórico e vínculos nunca
-- são removidos pelo fluxo administrativo.

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
  IF public.eh_area_interna_mx(uid) THEN RETURN true; END IF;

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

-- A função patch é o caminho usado pelo drawer completo do Plano de Ação;
-- a função can_manage acima faz com que qualquer perfil interno seja líder.

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
  v_leader boolean := public.eh_area_interna_mx(auth.uid());
BEGIN
  SELECT * INTO v_before FROM public.planos_acao WHERE id = p_plano_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plano de ação não encontrado.'; END IF;

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
      responsavel_id = CASE WHEN v_leader THEN coalesce(p_responsavel_id, responsavel_id) ELSE responsavel_id END,
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

DROP POLICY IF EXISTS planos_delete ON public.planos_acao;
CREATE POLICY planos_delete
  ON public.planos_acao
  FOR DELETE TO authenticated
  USING (public.can_manage_mx_action_scope(scope_type, scope_id));

ALTER TABLE public.regras_metas_loja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS role_matrix_store_meta_rules_write ON public.regras_metas_loja;
DROP POLICY IF EXISTS regras_metas_loja_write_admin_mx ON public.regras_metas_loja;
CREATE POLICY regras_metas_loja_internal_write ON public.regras_metas_loja
  FOR ALL TO authenticated
  USING (public.eh_area_interna_mx(auth.uid()))
  WITH CHECK (public.eh_area_interna_mx(auth.uid()));

ALTER TABLE public.benchmarks_loja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS role_matrix_store_benchmarks_write ON public.benchmarks_loja;
DROP POLICY IF EXISTS benchmarks_loja_write_admin_mx ON public.benchmarks_loja;
CREATE POLICY benchmarks_loja_internal_write ON public.benchmarks_loja
  FOR ALL TO authenticated
  USING (public.eh_area_interna_mx(auth.uid()))
  WITH CHECK (public.eh_area_interna_mx(auth.uid()));

CREATE OR REPLACE FUNCTION public.can_access_consulting_client(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.eh_area_interna_mx(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.atribuicoes_consultoria ca
      WHERE ca.client_id = p_client_id
        AND ca.user_id = auth.uid()
        AND ca.active = true
    )
$$;

ALTER TABLE public.clientes_consultoria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS consulting_clients_write ON public.clientes_consultoria;
DROP POLICY IF EXISTS consulting_clients_delete ON public.clientes_consultoria;
DROP POLICY IF EXISTS consulting_clients_insert ON public.clientes_consultoria;
DROP POLICY IF EXISTS consulting_clients_update ON public.clientes_consultoria;
DROP POLICY IF EXISTS clientes_consultoria_write ON public.clientes_consultoria;
DROP POLICY IF EXISTS clientes_consultoria_select ON public.clientes_consultoria;
CREATE POLICY clientes_consultoria_internal_select ON public.clientes_consultoria
  FOR SELECT TO authenticated
  USING (public.can_access_consulting_client(id));
CREATE POLICY clientes_consultoria_internal_insert ON public.clientes_consultoria
  FOR INSERT TO authenticated
  WITH CHECK (public.eh_area_interna_mx(auth.uid()));
CREATE POLICY clientes_consultoria_internal_update ON public.clientes_consultoria
  FOR UPDATE TO authenticated
  USING (public.eh_area_interna_mx(auth.uid()))
  WITH CHECK (public.eh_area_interna_mx(auth.uid()));

ALTER TABLE public.financeiro_consultoria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS consulting_financials_select ON public.financeiro_consultoria;
DROP POLICY IF EXISTS consulting_financials_write ON public.financeiro_consultoria;
DROP POLICY IF EXISTS financeiro_consultoria_select ON public.financeiro_consultoria;
DROP POLICY IF EXISTS financeiro_consultoria_write ON public.financeiro_consultoria;
CREATE POLICY financeiro_consultoria_internal_select ON public.financeiro_consultoria
  FOR SELECT TO authenticated
  USING (public.eh_area_interna_mx(auth.uid()));
CREATE POLICY financeiro_consultoria_internal_write ON public.financeiro_consultoria
  FOR ALL TO authenticated
  USING (public.eh_area_interna_mx(auth.uid()))
  WITH CHECK (public.eh_area_interna_mx(auth.uid()));

-- Dependências editáveis do cockpit consultivo seguem o mesmo escopo global.
ALTER TABLE public.unidades_cliente_consultoria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS unidades_cliente_consultoria_internal_all ON public.unidades_cliente_consultoria;
CREATE POLICY unidades_cliente_consultoria_internal_all ON public.unidades_cliente_consultoria
  FOR ALL TO authenticated
  USING (public.eh_area_interna_mx(auth.uid()))
  WITH CHECK (public.eh_area_interna_mx(auth.uid()));

ALTER TABLE public.contatos_cliente_consultoria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contatos_cliente_consultoria_internal_all ON public.contatos_cliente_consultoria;
CREATE POLICY contatos_cliente_consultoria_internal_all ON public.contatos_cliente_consultoria
  FOR ALL TO authenticated
  USING (public.eh_area_interna_mx(auth.uid()))
  WITH CHECK (public.eh_area_interna_mx(auth.uid()));

ALTER TABLE public.atribuicoes_consultoria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS atribuicoes_consultoria_internal_all ON public.atribuicoes_consultoria;
CREATE POLICY atribuicoes_consultoria_internal_all ON public.atribuicoes_consultoria
  FOR ALL TO authenticated
  USING (public.eh_area_interna_mx(auth.uid()))
  WITH CHECK (public.eh_area_interna_mx(auth.uid()));

ALTER TABLE public.modulos_cliente_consultoria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS modulos_cliente_consultoria_internal_all ON public.modulos_cliente_consultoria;
CREATE POLICY modulos_cliente_consultoria_internal_all ON public.modulos_cliente_consultoria
  FOR ALL TO authenticated
  USING (public.eh_area_interna_mx(auth.uid()))
  WITH CHECK (public.eh_area_interna_mx(auth.uid()));

COMMENT ON COLUMN public.clientes_consultoria.status IS
  'Status do cliente consultivo; use arquivado para exclusão administrativa recuperável.';

REVOKE ALL ON FUNCTION public.can_access_consulting_client(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_consulting_client(uuid) TO authenticated;

COMMIT;
