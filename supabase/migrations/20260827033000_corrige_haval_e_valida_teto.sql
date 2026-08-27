-- Duas últimas correções de valor e validação do teto.
--
-- 1. GWM HAVAL H6 2025 (IMPÉRIO, cliente RUDY): R$ 18.990.000 -> R$ 189.900.
--    Ficou fora da correção em lote porque não seguia o padrão dos outros 25 —
--    dividir por mil daria R$ 18.990, baixo demais para o modelo. O erro aqui
--    é de cem vezes, não de mil. Valor definido pelo administrador geral.
--
-- 2. Duplicata de teste da MX CONSULTORIA (JOSE TESTE / TCROSS), já marcada
--    como perdida: o valor seguia em R$ 110.000.000, mantendo o maior valor do
--    sistema em 110 milhões e impedindo validar o CHECK. Alinhado ao registro
--    gêmeo criado 1h10 depois pelo mesmo vendedor: R$ 110.000.
--
-- 3. Com nenhuma linha acima do teto, a constraint deixa de ser NOT VALID.
DO $$
DECLARE
  v_admin uuid := '9b9ee2fb-d002-492f-b274-06846972a014';
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  INSERT INTO public.data_correction_audit (correction_key, table_name, row_identity, payload, action)
  SELECT '2026-08-27-valor-haval-h6-imperio', 'oportunidades',
    jsonb_build_object('id', o.id),
    jsonb_build_object('valor_anterior', o.valor_negociado, 'valor_novo', 189900.00,
      'loja_id', o.loja_id, 'etapa', o.etapa, 'veiculo', o.veiculo_interesse),
    'before_value_scale_fix'
  FROM public.oportunidades o WHERE o.id = '4e52fa08-e227-4dad-bea8-dad6cc3f4bc3';

  UPDATE public.oportunidades SET valor_negociado = 189900.00, updated_at = now()
  WHERE id = '4e52fa08-e227-4dad-bea8-dad6cc3f4bc3';

  INSERT INTO public.data_correction_audit (correction_key, table_name, row_identity, payload, action)
  SELECT '2026-08-27-duplicata-mx-consultoria', 'oportunidades',
    jsonb_build_object('id', o.id),
    jsonb_build_object('valor_anterior', o.valor_negociado, 'valor_novo', 110000.00,
      'loja_id', o.loja_id, 'etapa', o.etapa, 'nota', 'duplicata alinhada ao registro gemeo'),
    'before_value_scale_fix'
  FROM public.oportunidades o WHERE o.id = '24ffcfec-a052-4b5f-a136-ceb2c8bcbd5c';

  UPDATE public.oportunidades SET valor_negociado = 110000.00, updated_at = now()
  WHERE id = '24ffcfec-a052-4b5f-a136-ceb2c8bcbd5c';
END $$;

ALTER TABLE public.oportunidades
  VALIDATE CONSTRAINT oportunidades_valor_negociado_teto;
