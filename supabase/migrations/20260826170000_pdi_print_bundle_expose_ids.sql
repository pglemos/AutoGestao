-- Expõe os identificadores das avaliações de competência no bundle de impressão
-- do PDI. Sem o id da linha de pdi_avaliacoes_competencia a tela do documento
-- consegue exibir nota/alvo mas não consegue corrigi-los — e a correção pelo
-- gestor já é autorizada pela policy pdi_avaliacoes_write_operacional.
-- Nenhuma mudança de permissão: apenas dois campos a mais no JSON.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_pdi_print_bundle(p_sessao_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_is_service_role boolean := auth.role() = 'service_role';
  v_sessao record;
  v_metas jsonb;
  v_avaliacoes jsonb;
  v_plano_acao jsonb;
  v_top_gaps jsonb;
BEGIN
  IF NOT v_is_service_role AND v_caller IS NULL THEN
    RAISE EXCEPTION 'Sessao invalida.' USING ERRCODE = '42501';
  END IF;

  SELECT
    s.*,
    u.name AS colaborador_nome,
    g.name AS gerente_nome,
    l.name AS loja_nome,
    nc.nome AS cargo_nome
  INTO v_sessao
  FROM public.pdi_sessoes s
  LEFT JOIN public.usuarios u ON u.id = s.colaborador_id
  LEFT JOIN public.usuarios g ON g.id = s.gerente_id
  LEFT JOIN public.lojas l ON l.id = s.loja_id
  LEFT JOIN public.pdi_niveis_cargo nc ON nc.id = s.cargo_id
  WHERE s.id = p_sessao_id
    AND (
      v_is_service_role
      OR public.eh_area_interna_mx(v_caller)
      OR public.is_owner_of(s.loja_id)
      OR public.is_manager_of(s.loja_id)
      OR s.colaborador_id = v_caller
      OR s.gerente_id = v_caller
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sessao nao encontrada ou sem acesso.' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_agg(
    row_to_json(m)
    ORDER BY
      CASE m.prazo
        WHEN '6_meses' THEN 1
        WHEN '12_meses' THEN 2
        WHEN '24_meses' THEN 3
        ELSE 4
      END,
      m.created_at
  )
  INTO v_metas
  FROM public.pdi_metas m
  WHERE m.sessao_id = p_sessao_id;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'competencia_id', a.competencia_id,
      'competencia', c.nome,
      'tipo', c.tipo,
      'nota', a.nota_atribuida,
      'alvo', a.alvo,
      'gap', a.alvo - a.nota_atribuida
    )
    ORDER BY c.tipo DESC, c.ordem ASC
  )
  INTO v_avaliacoes
  FROM public.pdi_avaliacoes_competencia a
  JOIN public.pdi_competencias c ON a.competencia_id = c.id
  WHERE a.sessao_id = p_sessao_id;

  SELECT jsonb_agg(gap_info)
  INTO v_top_gaps
  FROM (
    SELECT jsonb_build_object(
      'competencia', c.nome,
      'gap', a.alvo - a.nota_atribuida
    ) AS gap_info
    FROM public.pdi_avaliacoes_competencia a
    JOIN public.pdi_competencias c ON a.competencia_id = c.id
    WHERE a.sessao_id = p_sessao_id
    ORDER BY (a.alvo - a.nota_atribuida) DESC, c.ordem ASC
    LIMIT 5
  ) AS sub;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', pa.id,
      'competencia_id', pa.competencia_id,
      'competencia', c.nome,
      'descricao_acao', pa.descricao_acao,
      'data_conclusao', pa.data_conclusao,
      'impacto', pa.impacto,
      'custo', pa.custo,
      'status', pa.status,
      'evidencia_url', pa.evidencia_url
    )
    ORDER BY pa.data_conclusao ASC, c.ordem ASC
  )
  INTO v_plano_acao
  FROM public.pdi_plano_acao pa
  JOIN public.pdi_competencias c ON pa.competencia_id = c.id
  WHERE pa.sessao_id = p_sessao_id;

  RETURN jsonb_build_object(
    'sessao', row_to_json(v_sessao),
    'metas', COALESCE(v_metas, '[]'::jsonb),
    'avaliacoes', COALESCE(v_avaliacoes, '[]'::jsonb),
    'top_5_gaps', COALESCE(v_top_gaps, '[]'::jsonb),
    'plano_acao', COALESCE(v_plano_acao, '[]'::jsonb)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_pdi_print_bundle(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_pdi_print_bundle(uuid)
  TO authenticated, service_role;

COMMIT;
