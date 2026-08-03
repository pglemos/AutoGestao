-- Escrita de `veiculos_estoque` para a área interna MX.
--
-- A leitura já reconhece a área interna:
--   veiculos_estoque_loja_read USING (tem_papel_loja(...) OR eh_area_interna_mx())
-- mas INSERT/UPDATE/DELETE não. O resultado é uma tela que mostra o botão
-- "Registrar veículo" para quem não pode gravar: o POST volta 403 e o usuário
-- fica sem estoque registrado e sem explicação.
--
-- Evidência (Sentry, projeto mx-performance-frontend, 2026-07-30 12:47:21Z,
-- issue 7642316051, release 07d2e9ea):
--   POST /rest/v1/veiculos_estoque → 403
--   mx.user_role=administrador_geral, mx.route=/carteira-clientes
--   capturado como UnhandledRejection ("Object captured as promise rejection
--   with keys: code, details, hint, message").
--
-- A convenção do banco já é essa: 13 policies de INSERT, 9 de UPDATE e 4 de
-- DELETE usam `eh_area_interna_mx()`. Esta migração alinha `veiculos_estoque`
-- ao mesmo contrato — quem enxerga o estoque da loja pela área interna também
-- o mantém. O vínculo `created_by = auth.uid()` continua exigido no INSERT,
-- então o registro segue atribuído a quem o criou.

DROP POLICY IF EXISTS veiculos_estoque_loja_insert ON public.veiculos_estoque;
CREATE POLICY veiculos_estoque_loja_insert ON public.veiculos_estoque
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (
      tem_papel_loja(loja_id, ARRAY['vendedor'::text, 'gerente'::text, 'dono'::text])
      OR eh_area_interna_mx()
    )
  );

DROP POLICY IF EXISTS veiculos_estoque_loja_update ON public.veiculos_estoque;
CREATE POLICY veiculos_estoque_loja_update ON public.veiculos_estoque
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR tem_papel_loja(loja_id, ARRAY['gerente'::text, 'dono'::text])
    OR eh_area_interna_mx()
  )
  WITH CHECK (
    created_by = auth.uid()
    OR tem_papel_loja(loja_id, ARRAY['gerente'::text, 'dono'::text])
    OR eh_area_interna_mx()
  );

DROP POLICY IF EXISTS veiculos_estoque_loja_delete ON public.veiculos_estoque;
CREATE POLICY veiculos_estoque_loja_delete ON public.veiculos_estoque
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR tem_papel_loja(loja_id, ARRAY['gerente'::text, 'dono'::text])
    OR eh_area_interna_mx()
  );
