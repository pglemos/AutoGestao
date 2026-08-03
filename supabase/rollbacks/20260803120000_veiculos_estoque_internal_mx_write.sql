-- DOWN — restaura o contrato anterior: a área interna MX pode consultar o
-- estoque, mas somente membros da loja podem inserir/alterar/remover.

DROP POLICY IF EXISTS veiculos_estoque_loja_insert ON public.veiculos_estoque;
CREATE POLICY veiculos_estoque_loja_insert ON public.veiculos_estoque
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND tem_papel_loja(loja_id, ARRAY['vendedor'::text, 'gerente'::text, 'dono'::text])
  );

DROP POLICY IF EXISTS veiculos_estoque_loja_update ON public.veiculos_estoque;
CREATE POLICY veiculos_estoque_loja_update ON public.veiculos_estoque
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR tem_papel_loja(loja_id, ARRAY['gerente'::text, 'dono'::text])
  )
  WITH CHECK (
    created_by = auth.uid()
    OR tem_papel_loja(loja_id, ARRAY['gerente'::text, 'dono'::text])
  );

DROP POLICY IF EXISTS veiculos_estoque_loja_delete ON public.veiculos_estoque;
CREATE POLICY veiculos_estoque_loja_delete ON public.veiculos_estoque
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR tem_papel_loja(loja_id, ARRAY['gerente'::text, 'dono'::text])
  );

-- DOWN
