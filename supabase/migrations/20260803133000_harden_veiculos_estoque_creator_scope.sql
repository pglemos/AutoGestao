-- O criador só mantém ou remove um registro enquanto continua vinculado à
-- loja. Gerentes, donos e a área interna MX mantêm seus caminhos próprios.

DROP POLICY IF EXISTS veiculos_estoque_loja_update ON public.veiculos_estoque;
CREATE POLICY veiculos_estoque_loja_update ON public.veiculos_estoque
  FOR UPDATE
  USING (
    (created_by = auth.uid() AND tem_papel_loja(loja_id, ARRAY['vendedor'::text, 'gerente'::text, 'dono'::text]))
    OR tem_papel_loja(loja_id, ARRAY['gerente'::text, 'dono'::text])
    OR eh_area_interna_mx()
  )
  WITH CHECK (
    (created_by = auth.uid() AND tem_papel_loja(loja_id, ARRAY['vendedor'::text, 'gerente'::text, 'dono'::text]))
    OR tem_papel_loja(loja_id, ARRAY['gerente'::text, 'dono'::text])
    OR eh_area_interna_mx()
  );

DROP POLICY IF EXISTS veiculos_estoque_loja_delete ON public.veiculos_estoque;
CREATE POLICY veiculos_estoque_loja_delete ON public.veiculos_estoque
  FOR DELETE
  USING (
    (created_by = auth.uid() AND tem_papel_loja(loja_id, ARRAY['vendedor'::text, 'gerente'::text, 'dono'::text]))
    OR tem_papel_loja(loja_id, ARRAY['gerente'::text, 'dono'::text])
    OR eh_area_interna_mx()
  );

-- DOWN
-- Recriar as policies anteriores exigiria restaurar o contrato histórico da
-- migration 20260803120000; manter o rollback explícito no release report.
