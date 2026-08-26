-- Trilhas de auditoria imutáveis pelo cliente.
--
-- `internal_mx_admin_audit` concede a `authenticated` apenas `rm` (leitura):
-- quem grava é função SECURITY DEFINER, e a policy `no_direct_write` (qual =
-- false) barra qualquer escrita direta. As outras três trilhas concediam
-- `arwdm` — INSERT, UPDATE e DELETE ao cliente, contidos só por RLS. Uma trilha
-- de auditoria que o próprio auditado pode reescrever não é trilha.
--
-- O alinhamento é feito respeitando quem escreve hoje em cada uma:
--
--   * `checkin_audit_logs` só é escrita por `aplicar_regularizacao_fechamento`
--     (SECURITY DEFINER) — o cliente perde toda a escrita.
--   * `logs_auditoria_loja` recebia INSERT direto do painel do gerente. Esse
--     INSERT já falhava: a tabela tem RLS ligada e nenhuma policy de INSERT,
--     então o comentário da decisão de regularização nunca era auditado (o
--     gerente via "o comentário não pôde ser auditado" em toda decisão). Ganha
--     a RPC `registrar_auditoria_loja`, e o cliente perde a escrita direta.
--   * `d1_audit_log` recebe INSERT direto do fechamento D1 e precisa continuar
--     recebendo — mantém INSERT e SELECT, perde UPDATE e DELETE. As policies de
--     UPDATE/DELETE para administrador MX ficariam sem efeito sem o grant e são
--     removidas junto: corrigir fechamento não é reescrever a trilha dele.

-- 1. checkin_audit_logs — escrita só via SECURITY DEFINER.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.checkin_audit_logs FROM authenticated;

-- 2. logs_auditoria_loja — o caminho de escrita passa a ser a RPC.
CREATE OR REPLACE FUNCTION public.registrar_auditoria_loja(
  p_store_id uuid,
  p_changes jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_store_id IS NULL OR p_changes IS NULL THEN
    RAISE EXCEPTION 'store_id e changes são obrigatórios';
  END IF;

  IF NOT (
    public.is_manager_of(p_store_id)
    OR public.is_owner_of(p_store_id)
    OR public.eh_area_interna_mx(auth.uid())
  ) THEN
    RAISE EXCEPTION 'sem permissão para auditar esta loja';
  END IF;

  INSERT INTO public.logs_auditoria_loja (store_id, changed_by, changes)
  VALUES (p_store_id, auth.uid(), p_changes)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_auditoria_loja(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_auditoria_loja(uuid, jsonb) TO authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.logs_auditoria_loja FROM authenticated;

-- 3. d1_audit_log — mantém o INSERT que o fechamento usa, perde UPDATE/DELETE.
DROP POLICY IF EXISTS d1_audit_log_admin_write ON public.d1_audit_log;
DROP POLICY IF EXISTS d1_audit_log_admin_delete ON public.d1_audit_log;

REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.d1_audit_log FROM authenticated;
