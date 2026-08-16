-- Automações de governança do módulo Administrador: bloqueio de autoaprovação
-- e vigência de delegação gerencial.
--
-- A especificação trata as duas como regra de plataforma, não de tela. Deixar
-- na UI significa que qualquer chamada direta ao PostgREST passa por cima —
-- por isso a regra vive em trigger.
--
-- Verificado antes de aplicar: nenhuma linha existente viola as regras
-- (fechamento_liberacoes com 0 autoaprovações em 3 registros; planos_acao com
-- 0 aprovações próprias em 2 registros).

-- ---------------------------------------------------------------- fechamento
-- Quem pede a liberação do fechamento não pode ser quem libera.
CREATE OR REPLACE FUNCTION public.impedir_autoaprovacao_fechamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.liberado_por_id IS NOT NULL AND NEW.liberado_por_id = NEW.vendedor_id THEN
    RAISE EXCEPTION 'Autoaprovação bloqueada: o vendedor não pode liberar o próprio fechamento.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_impedir_autoaprovacao_fechamento ON public.fechamento_liberacoes;
CREATE TRIGGER trg_impedir_autoaprovacao_fechamento
  BEFORE INSERT OR UPDATE ON public.fechamento_liberacoes
  FOR EACH ROW EXECUTE FUNCTION public.impedir_autoaprovacao_fechamento();

-- ------------------------------------------------------------- plano de ação
-- O responsável pelo plano não valida a própria entrega.
CREATE OR REPLACE FUNCTION public.impedir_autoaprovacao_plano_acao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.approved_by IS NOT NULL
     AND NEW.responsavel_id IS NOT NULL
     AND NEW.approved_by = NEW.responsavel_id::text THEN
    RAISE EXCEPTION 'Autoaprovação bloqueada: o responsável não pode aprovar o próprio plano de ação.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_impedir_autoaprovacao_plano_acao ON public.planos_acao;
CREATE TRIGGER trg_impedir_autoaprovacao_plano_acao
  BEFORE INSERT OR UPDATE ON public.planos_acao
  FOR EACH ROW EXECUTE FUNCTION public.impedir_autoaprovacao_plano_acao();

-- --------------------------------------------------------------- delegações
-- Vigência coerente: fim nunca antes do início.
ALTER TABLE public.delegacoes_gerenciais
  DROP CONSTRAINT IF EXISTS delegacoes_gerenciais_vigencia_check;
ALTER TABLE public.delegacoes_gerenciais
  ADD CONSTRAINT delegacoes_gerenciais_vigencia_check
  CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from);

-- Uma delegação nasce válida: criar já vencida é erro de digitação, não regra.
-- O CHECK da tabela aceita apenas 'ativo' e 'encerrado' — usar 'ativa'/'expirada'
-- aqui faria a regra nunca disparar e a expiração violar a constraint.
CREATE OR REPLACE FUNCTION public.validar_delegacao_gerencial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     AND NEW.status = 'ativo'
     AND NEW.valid_until IS NOT NULL
     AND NEW.valid_until < CURRENT_DATE THEN
    RAISE EXCEPTION 'Delegação com vigência já encerrada não pode ser criada como ativa.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- autorizado_por é text e user_id é uuid nesta tabela; comparar sem cast
  -- derruba qualquer insert de delegação com "operator does not exist".
  IF NEW.autorizado_por IS NOT NULL AND NEW.autorizado_por = NEW.user_id::text THEN
    RAISE EXCEPTION 'Autoaprovação bloqueada: ninguém autoriza a própria delegação.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_delegacao_gerencial ON public.delegacoes_gerenciais;
CREATE TRIGGER trg_validar_delegacao_gerencial
  BEFORE INSERT OR UPDATE ON public.delegacoes_gerenciais
  FOR EACH ROW EXECUTE FUNCTION public.validar_delegacao_gerencial();

/**
 * Encerra delegações cuja vigência passou. Idempotente: rodar de novo não
 * altera nada. Chamada pelo módulo Administrador ao abrir a aba de acesso e
 * disponível para agendamento.
 */
CREATE OR REPLACE FUNCTION public.expirar_delegacoes_vencidas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  afetadas integer;
BEGIN
  UPDATE public.delegacoes_gerenciais
     SET status = 'encerrado', updated_at = now()
   WHERE status = 'ativo'
     AND valid_until IS NOT NULL
     AND valid_until < CURRENT_DATE;
  GET DIAGNOSTICS afetadas = ROW_COUNT;
  RETURN afetadas;
END;
$$;

REVOKE ALL ON FUNCTION public.expirar_delegacoes_vencidas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expirar_delegacoes_vencidas() TO authenticated;

/** Delegação vale hoje? Ignora vencida mesmo antes de a expiração rodar. */
CREATE OR REPLACE FUNCTION public.delegacao_gerencial_ativa(p_user_id uuid, p_loja_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.delegacoes_gerenciais d
     WHERE d.user_id = p_user_id
       AND d.loja_id = p_loja_id
       AND d.status = 'ativo'
       AND (d.valid_from IS NULL OR d.valid_from <= CURRENT_DATE)
       AND (d.valid_until IS NULL OR d.valid_until >= CURRENT_DATE)
  );
$$;

REVOKE ALL ON FUNCTION public.delegacao_gerencial_ativa(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delegacao_gerencial_ativa(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.impedir_autoaprovacao_fechamento() IS
  'Bloqueia vendedor liberando o próprio fechamento (regra 10.8 do módulo Administrador).';
COMMENT ON FUNCTION public.impedir_autoaprovacao_plano_acao() IS
  'Bloqueia responsável aprovando o próprio plano de ação (regra 10.8).';
COMMENT ON FUNCTION public.expirar_delegacoes_vencidas() IS
  'Encerra delegações gerenciais vencidas; idempotente.';
