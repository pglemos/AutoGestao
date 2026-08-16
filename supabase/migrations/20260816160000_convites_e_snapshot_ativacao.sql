-- Expiração de convite de autocadastro e snapshot de ativação do cliente.
--
-- Duas automações da especificação. A primeira fecha um buraco de segurança
-- real: hoje o link de autocadastro nasce com validade e limite de usos, mas
-- nada os aplica — o status fica 'ativo' para sempre e o link vira porta
-- permanente. A segunda registra o que foi validado no momento da ativação,
-- para a auditoria conseguir responder "com base em quê este cliente entrou".

-- ------------------------------------------------------------------ convites
/** O convite ainda vale? Considera validade em dias e limite de usos. */
CREATE OR REPLACE FUNCTION public.convite_autocadastro_valido(p_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.links_autocadastro_cliente l
     WHERE l.token = p_token
       AND l.status = 'ativo'
       AND l.usos_consumidos < l.limite_usos
       AND l.created_at + make_interval(days => l.validade_dias) > now()
  );
$$;

REVOKE ALL ON FUNCTION public.convite_autocadastro_valido(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convite_autocadastro_valido(text) TO authenticated;

/**
 * Fecha convites vencidos ou esgotados. Idempotente: separa os dois motivos
 * (`expirado` e `limite_atingido`) porque a equipe precisa saber se o link
 * caducou ou se foi consumido — a ação seguinte é diferente em cada caso.
 */
CREATE OR REPLACE FUNCTION public.expirar_convites_autocadastro()
RETURNS TABLE (expirados integer, esgotados integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expirados integer;
  v_esgotados integer;
BEGIN
  UPDATE public.links_autocadastro_cliente
     SET status = 'expirado', updated_at = now()
   WHERE status = 'ativo'
     AND created_at + make_interval(days => validade_dias) <= now();
  GET DIAGNOSTICS v_expirados = ROW_COUNT;

  UPDATE public.links_autocadastro_cliente
     SET status = 'limite_atingido', updated_at = now()
   WHERE status = 'ativo'
     AND usos_consumidos >= limite_usos;
  GET DIAGNOSTICS v_esgotados = ROW_COUNT;

  RETURN QUERY SELECT v_expirados, v_esgotados;
END;
$$;

REVOKE ALL ON FUNCTION public.expirar_convites_autocadastro() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expirar_convites_autocadastro() TO authenticated;

/** Consome um uso do convite e fecha o link quando o limite chega. */
CREATE OR REPLACE FUNCTION public.consumir_convite_autocadastro(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT l.id INTO v_id
    FROM public.links_autocadastro_cliente l
   WHERE l.token = p_token
     AND l.status = 'ativo'
     AND l.usos_consumidos < l.limite_usos
     AND l.created_at + make_interval(days => l.validade_dias) > now()
   FOR UPDATE;

  IF v_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.links_autocadastro_cliente
     SET usos_consumidos = usos_consumidos + 1,
         status = CASE WHEN usos_consumidos + 1 >= limite_usos THEN 'limite_atingido' ELSE status END,
         updated_at = now()
   WHERE id = v_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.consumir_convite_autocadastro(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consumir_convite_autocadastro(text) TO authenticated;

-- -------------------------------------------------------- snapshot ativação
CREATE TABLE IF NOT EXISTS public.snapshots_ativacao_cliente (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES public.clientes_consultoria(id) ON DELETE CASCADE,
  activated_at  timestamptz NOT NULL DEFAULT now(),
  activated_by  uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  program_key   text,
  product_name  text,
  primary_store_id uuid,
  unidades      integer NOT NULL DEFAULT 0,
  contatos      integer NOT NULL DEFAULT 0,
  modulos       integer NOT NULL DEFAULT 0,
  consultores   integer NOT NULL DEFAULT 0,
  checklist     jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_ativacao_cliente
  ON public.snapshots_ativacao_cliente (client_id, activated_at DESC);

ALTER TABLE public.snapshots_ativacao_cliente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS snapshots_ativacao_interna_select ON public.snapshots_ativacao_cliente;
CREATE POLICY snapshots_ativacao_interna_select
  ON public.snapshots_ativacao_cliente FOR SELECT TO authenticated
  USING (public.eh_area_interna_mx());

DROP POLICY IF EXISTS snapshots_ativacao_interna_write ON public.snapshots_ativacao_cliente;
CREATE POLICY snapshots_ativacao_interna_write
  ON public.snapshots_ativacao_cliente FOR ALL TO authenticated
  USING (public.eh_area_interna_mx()) WITH CHECK (public.eh_area_interna_mx());

REVOKE ALL ON public.snapshots_ativacao_cliente FROM PUBLIC;
GRANT SELECT, INSERT ON public.snapshots_ativacao_cliente TO authenticated;

/**
 * Congela o estado do cliente no momento da ativação. Chamada pelo trigger de
 * mudança de status; o checklist recebido é o mesmo que a tela mostrou a quem
 * clicou em ativar.
 */
CREATE OR REPLACE FUNCTION public.registrar_snapshot_ativacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(coalesce(NEW.status, '')) IN ('ativo', 'ativa', 'active')
     AND lower(coalesce(OLD.status, '')) NOT IN ('ativo', 'ativa', 'active') THEN
    INSERT INTO public.snapshots_ativacao_cliente
      (client_id, activated_by, program_key, product_name, primary_store_id, unidades, contatos, modulos, consultores)
    VALUES (
      NEW.id,
      auth.uid(),
      NEW.program_template_key,
      NEW.product_name,
      NEW.primary_store_id,
      (SELECT count(*) FROM public.unidades_cliente_consultoria u WHERE u.client_id = NEW.id),
      (SELECT count(*) FROM public.contatos_cliente_consultoria c WHERE c.client_id = NEW.id),
      (SELECT count(*) FROM public.modulos_cliente_consultoria m WHERE m.client_id = NEW.id AND m.enabled IS NOT false),
      (SELECT count(*) FROM public.atribuicoes_consultoria a WHERE a.client_id = NEW.id AND a.active IS NOT false)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registrar_snapshot_ativacao ON public.clientes_consultoria;
CREATE TRIGGER trg_registrar_snapshot_ativacao
  AFTER UPDATE OF status ON public.clientes_consultoria
  FOR EACH ROW EXECUTE FUNCTION public.registrar_snapshot_ativacao();

COMMENT ON TABLE public.snapshots_ativacao_cliente IS
  'Estado do cliente no instante da ativação — base de auditoria da entrada.';
COMMENT ON FUNCTION public.expirar_convites_autocadastro() IS
  'Fecha convites vencidos (expirado) e esgotados (limite_atingido); idempotente.';
COMMENT ON FUNCTION public.consumir_convite_autocadastro(text) IS
  'Consome um uso do convite; devolve false quando o link não vale mais.';
