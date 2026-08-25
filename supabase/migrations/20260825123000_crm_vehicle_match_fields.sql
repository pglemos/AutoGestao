-- CRM: preserva os sinais estruturados de compatibilidade também no caminho
-- transacional `criar_oportunidade_crm`. A Carteira Base44 já recebe estes
-- campos pelo wrapper de competência; este wrapper evita que o fluxo CRM
-- direto crie uma oportunidade sem categoria, faixa ou modelo resolvido.

BEGIN;

ALTER FUNCTION public.criar_oportunidade_crm(jsonb)
  RENAME TO criar_oportunidade_crm_legacy_vehicle_match;

CREATE OR REPLACE FUNCTION public.criar_oportunidade_crm(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', pg_temp
AS $function$
DECLARE
  v_result jsonb;
  v_oportunidade_id uuid;
BEGIN
  v_result := public.criar_oportunidade_crm_legacy_vehicle_match(p_payload);

  IF COALESCE((v_result->>'ok')::boolean, false)
     AND (
       p_payload ? 'categoria_veiculo'
       OR p_payload ? 'preco_interesse_min'
       OR p_payload ? 'preco_interesse_max'
       OR p_payload ? 'catalog_model_id'
       OR p_payload ? 'classification_source'
     ) THEN
    v_oportunidade_id := NULLIF(v_result->'data'->>'id', '')::uuid;

    IF v_oportunidade_id IS NOT NULL THEN
      UPDATE public.oportunidades
      SET
        categoria_veiculo = CASE
          WHEN p_payload ? 'categoria_veiculo'
            THEN NULLIF(p_payload->>'categoria_veiculo', '')::public.crm_categoria_veiculo
          ELSE categoria_veiculo
        END,
        preco_interesse_min = CASE
          WHEN p_payload ? 'preco_interesse_min'
            THEN NULLIF(p_payload->>'preco_interesse_min', '')::numeric
          ELSE preco_interesse_min
        END,
        preco_interesse_max = CASE
          WHEN p_payload ? 'preco_interesse_max'
            THEN NULLIF(p_payload->>'preco_interesse_max', '')::numeric
          ELSE preco_interesse_max
        END,
        catalog_model_id = CASE
          WHEN p_payload ? 'catalog_model_id'
            THEN NULLIF(p_payload->>'catalog_model_id', '')::uuid
          ELSE catalog_model_id
        END,
        classification_source = CASE
          WHEN p_payload ? 'classification_source'
            THEN NULLIF(p_payload->>'classification_source', '')
          ELSE classification_source
        END,
        updated_at = now()
      WHERE id = v_oportunidade_id;
    END IF;
  END IF;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.criar_oportunidade_crm(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_oportunidade_crm(jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
