-- Corrige a autorização de edição do Plano de Ação sem reescrever migrações já aplicadas.

BEGIN;

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
  v_manager boolean;
BEGIN
  SELECT * INTO v_before FROM public.planos_acao WHERE id = p_plano_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plano de ação não encontrado.'; END IF;

  v_manager := public.can_manage_mx_action_scope(v_before.scope_type, v_before.scope_id);
  IF NOT v_manager AND v_before.responsavel_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Sem permissão para atualizar este plano.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT v_manager AND (
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
      responsavel_id = CASE WHEN v_manager AND p_responsavel_id IS NOT NULL THEN p_responsavel_id ELSE responsavel_id END,
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

GRANT EXECUTE ON FUNCTION public.atualizar_plano_acao(uuid, text, text, text, text, uuid, date, public.action_priority, public.action_status, smallint, text, smallint, text, jsonb, jsonb) TO authenticated;

COMMIT;
