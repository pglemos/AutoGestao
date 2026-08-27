-- Correção dos valores de oportunidade gravados mil vezes maiores.
--
-- 27 oportunidades acima de R$ 10 milhões, em 15 lojas de clientes: três zeros
-- a mais na digitação. Quinze já estavam como venda ganha, entrando em
-- faturamento, ticket médio e base de comissão. A maior registrava
-- R$ 228.000.000,00 por um BMW X4.
--
-- Ficam de fora, de propósito:
--   * `24ffcfec` (MX CONSULTORIA) — duplicata, tratada como perdida;
--   * `4e52fa08` (IMPÉRIO, GWM HAVAL H6 2025) — ÷1000 daria R$ 18.990, baixo
--     demais para um H6 2025. O erro ali é outro e corrigir pela mesma regra
--     gravaria um valor errado com cara de certo.
--
-- `prevent_valor_negociado_tamper_after_close` bloqueia alterar valor de venda
-- concluída, exceto para administrador MX, gerente ou dono da loja. A correção
-- roda no contexto do administrador geral, que tem essa autoridade — a
-- proteção continua valendo para todo o resto.
DO $$
DECLARE
  v_admin uuid := '9b9ee2fb-d002-492f-b274-06846972a014';
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  INSERT INTO public.data_correction_audit (correction_key, table_name, row_identity, payload, action)
  SELECT '2026-08-27-valores-oportunidade-mil-vezes', 'oportunidades',
    jsonb_build_object('id', o.id),
    jsonb_build_object('valor_anterior', o.valor_negociado,
      'valor_novo', round(o.valor_negociado / 1000, 2),
      'loja_id', o.loja_id, 'etapa', o.etapa, 'veiculo', o.veiculo_interesse),
    'before_value_scale_fix'
  FROM public.oportunidades o
  WHERE o.valor_negociado > 10000000
    AND o.id NOT IN ('4e52fa08-e227-4dad-bea8-dad6cc3f4bc3', '24ffcfec-a052-4b5f-a136-ceb2c8bcbd5c');

  UPDATE public.oportunidades
  SET valor_negociado = round(valor_negociado / 1000, 2), updated_at = now()
  WHERE valor_negociado > 10000000
    AND id NOT IN ('4e52fa08-e227-4dad-bea8-dad6cc3f4bc3', '24ffcfec-a052-4b5f-a136-ceb2c8bcbd5c');
END $$;
