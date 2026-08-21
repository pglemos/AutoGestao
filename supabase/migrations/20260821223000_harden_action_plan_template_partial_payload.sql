-- CONS-20: preservar itens de rascunho quando o payload atualiza somente
-- metadados. A migration 20260821180000 recebe `items` no fluxo completo,
-- mas callers parciais não podem apagar silenciosamente a versão em edição.

BEGIN;

ALTER FUNCTION public.save_action_plan_template_draft(jsonb)
  RENAME TO save_action_plan_template_draft_legacy;

CREATE OR REPLACE FUNCTION public.save_action_plan_template_draft(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_template_id uuid;
  v_version_id uuid;
  v_items jsonb := '[]'::jsonb;
  v_payload jsonb := p_payload;
BEGIN
  IF v_actor IS NULL OR NOT public.eh_area_interna_mx(v_actor) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  -- Omitir `items` significa atualização parcial. Reidrata os itens do
  -- rascunho atual antes de delegar à implementação transacional existente.
  IF NOT (p_payload ? 'items') THEN
    v_template_id := NULLIF(p_payload ->> 'template_id', '')::uuid;
    IF v_template_id IS NOT NULL THEN
      SELECT id INTO v_version_id
      FROM public.planos_acao_template_versoes
      WHERE template_id = v_template_id
        AND status = 'rascunho'
      ORDER BY versao DESC
      LIMIT 1;

      IF v_version_id IS NOT NULL THEN
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'ordem', item.ordem,
              'problema', item.problema,
              'acao', item.acao,
              'como', item.como,
              'departamento', item.departamento,
              'indicador', item.indicador,
              'prioridade', item.prioridade,
              'prazo_dias', item.prazo_dias,
              'evidencia_requerida', item.evidencia_requerida,
              'support_material_type', item.support_material_type,
              'file_asset_path', item.file_asset_path,
              'file_asset_name', item.file_asset_name,
              'treinamento_id', item.treinamento_id,
              'treinamento_titulo', item.treinamento_titulo,
              'recommended_responsible_role', item.recommended_responsible_role,
              'peso_bp', item.peso_bp
            ) ORDER BY item.ordem, item.id
          ),
          '[]'::jsonb
        )
        INTO v_items
        FROM public.planos_acao_template_itens AS item
        WHERE item.version_id = v_version_id;
      END IF;
    END IF;
    v_payload := p_payload || jsonb_build_object('items', v_items);
  END IF;

  RETURN public.save_action_plan_template_draft_legacy(v_payload);
END;
$$;

REVOKE ALL ON FUNCTION public.save_action_plan_template_draft_legacy(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_action_plan_template_draft(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_action_plan_template_draft(jsonb) TO authenticated;

COMMENT ON FUNCTION public.save_action_plan_template_draft(jsonb) IS
  'Salva metadados e itens de template; payload sem items preserva os itens do rascunho atual.';

COMMIT;

-- DOWN
-- DROP FUNCTION IF EXISTS public.save_action_plan_template_draft(jsonb);
-- ALTER FUNCTION public.save_action_plan_template_draft_legacy(jsonb)
--   RENAME TO save_action_plan_template_draft;
