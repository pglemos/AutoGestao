-- Hardening final do contrato canônico do Plano de Ação.
-- Reaplica o ciclo de vida, fecha RPCs para a API autenticada e impede que
-- responsáveis alterem o escopo persistido por atualização direta.

BEGIN;

CREATE OR REPLACE FUNCTION public.planos_acao_protect_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.scope_type IS DISTINCT FROM OLD.scope_type
     OR NEW.scope_id IS DISTINCT FROM OLD.scope_id THEN
    IF NOT public.can_manage_mx_action_scope(OLD.scope_type, OLD.scope_id)
       OR NOT public.can_manage_mx_action_scope(NEW.scope_type, NEW.scope_id) THEN
      RAISE EXCEPTION 'O escopo do plano de ação não pode ser alterado por este usuário.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_planos_acao_protect_scope ON public.planos_acao;
CREATE TRIGGER trg_planos_acao_protect_scope
  BEFORE UPDATE ON public.planos_acao
  FOR EACH ROW EXECUTE FUNCTION public.planos_acao_protect_scope();

DROP TRIGGER IF EXISTS trg_planos_acao_touch ON public.planos_acao;
CREATE TRIGGER trg_planos_acao_touch
  BEFORE INSERT OR UPDATE ON public.planos_acao
  FOR EACH ROW EXECUTE FUNCTION public.planos_acao_touch_updated_at();

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
    'PA-' || upper(replace(gen_random_uuid()::text, '-', '')),
    p_scope_type, p_scope_id, nullif(trim(p_objetivo), ''), trim(p_departamento),
    trim(p_indicador), trim(p_problema), trim(p_acao), nullif(trim(p_como), ''),
    p_responsavel_id, p_prazo, p_prioridade, p_origem, auth.uid()
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.planos_acao_protect_scope() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.criar_plano_acao_v2(public.score_scope_type, uuid, text, text, text, text, text, text, uuid, date, public.action_priority, public.action_origin) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.atualizar_plano_acao(uuid, text, text, text, text, uuid, date, public.action_priority, public.action_status, smallint, text, smallint, text, jsonb, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_mx_action_scope(public.score_scope_type, uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.criar_plano_acao_v2(public.score_scope_type, uuid, text, text, text, text, text, text, uuid, date, public.action_priority, public.action_origin) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_plano_acao(uuid, text, text, text, text, uuid, date, public.action_priority, public.action_status, smallint, text, smallint, text, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_mx_action_scope(public.score_scope_type, uuid, uuid) TO authenticated;

COMMIT;
