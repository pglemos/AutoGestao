-- Porta transacional do ciclo do plano estratégico.
--
-- A revisão anterior fazia UPDATE do ciclo publicado e, em seguida, INSERT da
-- nova versão no navegador. Uma falha entre as duas operações deixava o cliente
-- sem ciclo vigente. Todas as mutações passam agora por uma única função, sob
-- lock, com autorização e controle de concorrência no banco.

BEGIN;

CREATE OR REPLACE FUNCTION public.operar_ciclo_plano_estrategico(
  p_operation text,
  p_client_id uuid DEFAULT NULL,
  p_year integer DEFAULT NULL,
  p_cycle_id uuid DEFAULT NULL,
  p_expected_status text DEFAULT NULL,
  p_package_version_id uuid DEFAULT NULL
)
RETURNS public.ciclos_plano_estrategico
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operation text := lower(trim(coalesce(p_operation, '')));
  v_cycle public.ciclos_plano_estrategico;
  v_created public.ciclos_plano_estrategico;
  v_next_status text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.eh_area_interna_mx(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para administrar o ciclo do plano estratégico.'
      USING ERRCODE = '42501';
  END IF;

  IF v_operation = 'ensure' THEN
    IF p_client_id IS NULL OR p_year IS NULL OR p_year NOT BETWEEN 2020 AND 2100 THEN
      RAISE EXCEPTION 'Cliente e ano válido são obrigatórios para criar o ciclo.';
    END IF;

    PERFORM 1 FROM public.clientes_consultoria WHERE id = p_client_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cliente não encontrado.'; END IF;

    SELECT * INTO v_cycle
    FROM public.ciclos_plano_estrategico
    WHERE client_id = p_client_id AND year = p_year AND status <> 'revisado'
    FOR UPDATE;
    IF FOUND THEN RETURN v_cycle; END IF;

    INSERT INTO public.ciclos_plano_estrategico (
      client_id, year, status, package_version_id, created_by
    ) VALUES (
      p_client_id, p_year, 'rascunho', p_package_version_id, auth.uid()
    ) RETURNING * INTO v_created;
    RETURN v_created;
  END IF;

  IF p_cycle_id IS NULL THEN RAISE EXCEPTION 'Ciclo é obrigatório.'; END IF;

  SELECT * INTO v_cycle
  FROM public.ciclos_plano_estrategico
  WHERE id = p_cycle_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ciclo do plano estratégico não encontrado.'; END IF;

  IF p_expected_status IS NULL OR v_cycle.status <> p_expected_status THEN
    RAISE EXCEPTION 'O ciclo mudou de estado em outra sessão. Recarregue a tela.'
      USING ERRCODE = '40001';
  END IF;

  v_next_status := CASE v_operation
    WHEN 'submit_validation' THEN 'em_validacao'
    WHEN 'return_draft' THEN 'rascunho'
    WHEN 'publish' THEN 'publicado'
    WHEN 'revise' THEN 'revisado'
    ELSE NULL
  END;
  IF v_next_status IS NULL THEN RAISE EXCEPTION 'Operação de ciclo inválida: %.', p_operation; END IF;

  IF NOT (
    (v_cycle.status = 'rascunho' AND v_next_status = 'em_validacao') OR
    (v_cycle.status = 'em_validacao' AND v_next_status IN ('rascunho', 'publicado')) OR
    (v_cycle.status = 'publicado' AND v_next_status = 'revisado')
  ) THEN
    RAISE EXCEPTION 'Transição não permitida: % → %.', v_cycle.status, v_next_status;
  END IF;

  IF v_operation = 'revise' THEN
    UPDATE public.ciclos_plano_estrategico
    SET status = 'revisado', updated_at = now()
    WHERE id = v_cycle.id;

    INSERT INTO public.ciclos_plano_estrategico (
      client_id, year, status, version_number, package_version_id,
      revised_from_id, created_by
    ) VALUES (
      v_cycle.client_id, v_cycle.year, 'rascunho', v_cycle.version_number + 1,
      v_cycle.package_version_id, v_cycle.id, auth.uid()
    ) RETURNING * INTO v_created;
    RETURN v_created;
  END IF;

  UPDATE public.ciclos_plano_estrategico
  SET status = v_next_status,
      published_at = CASE WHEN v_next_status = 'publicado' THEN now() ELSE published_at END,
      published_by = CASE WHEN v_next_status = 'publicado' THEN auth.uid() ELSE published_by END,
      updated_at = now()
  WHERE id = v_cycle.id
  RETURNING * INTO v_created;
  RETURN v_created;
END;
$$;

REVOKE ALL ON FUNCTION public.operar_ciclo_plano_estrategico(text, uuid, integer, uuid, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.operar_ciclo_plano_estrategico(text, uuid, integer, uuid, text, uuid)
  TO authenticated;

COMMIT;
