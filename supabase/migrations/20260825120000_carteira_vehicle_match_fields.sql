-- Carteira: mantém no RPC Base44 os sinais estruturados usados pelo match de
-- veículos. O delta de 2026-08-08 criou as colunas, mas o wrapper canônico de
-- competência ainda repassava apenas o contrato legado e descartava esses
-- campos durante o cadastro/edição da ficha.

BEGIN;

CREATE OR REPLACE FUNCTION public.carteira_salvar_cliente(
  p_payload jsonb,
  p_idempotency_key text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_result jsonb;
  v_competencia date := NULLIF(p_payload->>'data_competencia', '')::date;
  v_sale_date date := COALESCE(NULLIF(p_payload->>'sale_date', '')::date, v_competencia);
  v_oportunidade_id uuid;
  v_cliente_id uuid;
  v_evento_id uuid;
BEGIN
  v_result := public.carteira_salvar_cliente_legacy(p_payload, p_idempotency_key);

  IF COALESCE((v_result->>'ok')::boolean, false) THEN
    v_cliente_id := NULLIF(v_result->>'cliente_id', '')::uuid;
    v_oportunidade_id := NULLIF(v_result->>'oportunidade_id', '')::uuid;
    v_evento_id := NULLIF(v_result->>'evento_id', '')::uuid;

    IF v_oportunidade_id IS NOT NULL AND (
      p_payload ? 'categoria_veiculo'
      OR p_payload ? 'preco_interesse_min'
      OR p_payload ? 'preco_interesse_max'
      OR p_payload ? 'catalog_model_id'
      OR p_payload ? 'classification_source'
    ) THEN
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

    -- Mantém a competência canônica introduzida no release anterior.
    IF v_competencia IS NOT NULL THEN
      IF v_cliente_id IS NOT NULL THEN
        UPDATE public.clientes SET data_competencia = v_competencia WHERE id = v_cliente_id;
      END IF;
      IF v_oportunidade_id IS NOT NULL THEN
        UPDATE public.oportunidades
        SET data_competencia = v_competencia,
            sale_date = COALESCE(v_sale_date, sale_date)
        WHERE id = v_oportunidade_id;
      END IF;
      IF v_evento_id IS NOT NULL THEN
        UPDATE public.eventos_comerciais SET data_competencia = v_competencia WHERE id = v_evento_id;
      END IF;
    END IF;
  END IF;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.carteira_salvar_cliente(jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.carteira_salvar_cliente(jsonb, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
