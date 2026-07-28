-- Migration: 20260727230000_cancelar_venda_encerra_agenda_e_proxima_acao.sql
--
-- Ao cancelar a venda, os agendamentos abertos e a próxima ação do cliente
-- continuavam vivos no banco: a agenda e a rotina do gerente seguiam mostrando
-- "visita confirmada" e ação vencida de uma venda que não existe mais.
--
-- Opção B (decisão do dono do domínio, 2026-07-27): NÃO adicionar valor ao
-- enum `crm_agendamento_status`. Adicionar valor a enum é irreversível no
-- Postgres e `nao_compareceu` distorceria a métrica de comparecimento do
-- vendedor. O encerramento é registrado como fato auditável:
--   - `agendamentos.observacoes` recebe o marcador canônico
--     `[ENCERRADO:venda_cancelada]` seguido do motivo;
--   - `agendamentos.proxima_acao` é esvaziada (a ação pertencia à venda);
--   - um `eventos_comerciais` por agendamento encerrado, com `agendamento_id`;
--   - `clientes.proxima_acao` / `proxima_acao_em` são limpas apenas quando o
--     cliente não tem nenhuma outra oportunidade em etapa não terminal.
--
-- O status do agendamento é preservado de propósito: o fato histórico
-- (estava confirmado) não é reescrito. Quem consulta o encerramento usa o
-- marcador ou o evento.
--
-- Nenhuma linha é apagada. Idempotente: a RPC já rejeita recancelamento
-- (`etapa <> 'ganho' OR cancelada_em IS NOT NULL`), então o bloco novo roda
-- no máximo uma vez por oportunidade.

CREATE OR REPLACE FUNCTION public.cancelar_venda(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_oportunidade_id uuid := nullif(p_payload->>'oportunidade_id', '')::uuid;
  v_motivo text := nullif(trim(coalesce(p_payload->>'motivo', '')), '');
  v_op record;
  v_is_privileged boolean;
  v_is_vendedor_mesmo_mes boolean;
  v_evento_id uuid;
  v_marcador text := '[ENCERRADO:venda_cancelada]';
  v_agendamentos_encerrados int := 0;
  v_proxima_acao_limpa int := 0;
  v_tem_outra_ativa boolean;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Não autenticado.');
  END IF;

  IF v_oportunidade_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Venda (oportunidade_id) é obrigatória.');
  END IF;

  IF v_motivo IS NULL OR length(v_motivo) < 10 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Motivo do cancelamento é obrigatório (mínimo 10 caracteres).');
  END IF;

  SELECT * INTO v_op FROM public.oportunidades WHERE id = v_oportunidade_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Venda não encontrada.');
  END IF;

  IF v_op.etapa::text <> 'ganho' OR v_op.cancelada_em IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Venda não está em estado cancelável.');
  END IF;

  v_is_privileged := public.eh_area_interna_mx(v_caller_id)
    OR public.is_manager_of(v_op.loja_id)
    OR public.is_owner_of(v_op.loja_id);

  v_is_vendedor_mesmo_mes := v_op.seller_user_id = v_caller_id
    AND v_op.closed_at IS NOT NULL
    AND date_trunc('month', v_op.closed_at) = date_trunc('month', now());

  IF NOT (v_is_privileged OR v_is_vendedor_mesmo_mes) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sem permissão para cancelar esta venda (vendedor só pode cancelar vendas do mesmo mês).');
  END IF;

  UPDATE public.oportunidades
     SET etapa = 'cancelada',
         cancelada_em = now(),
         cancelada_por = v_caller_id,
         motivo_cancelamento = v_motivo,
         updated_at = now(),
         updated_by = v_caller_id
   WHERE id = v_oportunidade_id;

  INSERT INTO public.eventos_comerciais (
    cliente_id, oportunidade_id, loja_id, seller_user_id, tipo_evento,
    observacao, origem_modulo, created_by
  ) VALUES (
    v_op.cliente_id, v_op.id, v_op.loja_id, v_op.seller_user_id, 'venda_cancelada',
    v_motivo, 'crm', v_caller_id
  ) RETURNING id INTO v_evento_id;

  -- ── Agendamentos abertos da venda cancelada ────────────────────────────
  -- Só os que ainda podem gerar situação ativa. `compareceu` e
  -- `nao_compareceu` já são fatos consumados e ficam intactos.
  WITH encerrados AS (
    UPDATE public.agendamentos a
       SET observacoes = v_marcador || ' ' || v_motivo
                         || coalesce(' | ' || nullif(a.observacoes, ''), ''),
           proxima_acao = NULL,
           updated_at = now(),
           updated_by = v_caller_id
     WHERE a.oportunidade_id = v_op.id
       AND a.status IN ('confirmado', 'aguardando')
       AND coalesce(a.observacoes, '') NOT LIKE v_marcador || '%'
    RETURNING a.id, a.cliente_id, a.loja_id, a.seller_user_id
  ), eventos AS (
    INSERT INTO public.eventos_comerciais (
      cliente_id, oportunidade_id, agendamento_id, loja_id, seller_user_id,
      tipo_evento, observacao, origem_modulo, created_by
    )
    SELECT e.cliente_id, v_op.id, e.id, e.loja_id, e.seller_user_id,
           'venda_cancelada',
           v_marcador || ' agendamento encerrado: ' || v_motivo,
           'crm', v_caller_id
      FROM encerrados e
    RETURNING 1
  )
  SELECT count(*) INTO v_agendamentos_encerrados FROM eventos;

  -- ── Próxima ação do cliente ────────────────────────────────────────────
  -- A próxima ação é do cliente, não da oportunidade: só pode ser limpa se
  -- não sobrou nenhuma oportunidade viva para sustentá-la.
  SELECT EXISTS (
    SELECT 1 FROM public.oportunidades o
     WHERE o.cliente_id = v_op.cliente_id
       AND o.id <> v_op.id
       AND o.etapa::text NOT IN ('ganho', 'perdido', 'cancelada')
  ) INTO v_tem_outra_ativa;

  IF NOT v_tem_outra_ativa THEN
    UPDATE public.clientes c
       SET proxima_acao = NULL,
           proxima_acao_em = NULL,
           updated_at = now()
     WHERE c.id = v_op.cliente_id
       AND (c.proxima_acao IS NOT NULL OR c.proxima_acao_em IS NOT NULL);
    GET DIAGNOSTICS v_proxima_acao_limpa = ROW_COUNT;
  END IF;

  INSERT INTO public.d1_audit_log (
    usuario_id, cliente_id, tipo_alteracao, valor_anterior, valor_novo
  ) VALUES (
    v_caller_id, v_op.cliente_id::text, 'cancelamento_venda', 'ganho', 'cancelada'
  );

  RETURN jsonb_build_object('ok', true, 'data', jsonb_build_object(
    'oportunidade_id', v_op.id,
    'evento_id', v_evento_id,
    'agendamentos_encerrados', v_agendamentos_encerrados,
    'proxima_acao_limpa', v_proxima_acao_limpa > 0
  ));
END;
$function$;

-- `CREATE OR REPLACE FUNCTION` preserva a ACL existente, então o EXECUTE que
-- `anon` herdou de DEFAULT PRIVILEGES sobrevivia a cada replace. Não havia
-- exposição real (a função rejeita com auth.uid() NULL), mas uma RPC que
-- cancela venda não deve ser chamável sem sessão.
REVOKE ALL ON FUNCTION public.cancelar_venda(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancelar_venda(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.cancelar_venda(jsonb) TO authenticated;

COMMENT ON FUNCTION public.cancelar_venda(jsonb) IS
  'Cancela uma venda ganha. Encerra agendamentos abertos e a próxima ação '
  'vinculadas, marcando-os com [ENCERRADO:venda_cancelada] sem apagar nada e '
  'sem reescrever o status do agendamento. Regras por perfil: vendedor só a '
  'própria venda no mês do fechamento; gerente/dono/área interna MX sem limite.';

-- ============================================================
-- DOWN
-- ============================================================
-- Restaura a versão de 20260727140000 (sem encerramento de agenda/próxima
-- ação). Os marcadores já gravados permanecem — são fato histórico e podem
-- ser identificados por observacoes LIKE '[ENCERRADO:venda_cancelada]%'.
