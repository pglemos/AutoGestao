-- Migration: Optimize Advisors, Key FK Indexes and Auth RLS subqueries
-- Version: 20260817150000

BEGIN;

-- 1. Create indexes for unindexed foreign keys on high-traffic operational tables
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente_id ON public.agendamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_oportunidade_id ON public.agendamentos(oportunidade_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_created_by ON public.agendamentos(created_by);
CREATE INDEX IF NOT EXISTS idx_clientes_created_by ON public.clientes(created_by);
CREATE INDEX IF NOT EXISTS idx_clientes_updated_by ON public.clientes(updated_by);
CREATE INDEX IF NOT EXISTS idx_atendimentos_cliente_id ON public.atendimentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_carteira_missao_itens_cliente_id ON public.carteira_missao_itens(cliente_id);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged_by ON public.alerts(acknowledged_by);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved_by ON public.alerts(resolved_by);
CREATE INDEX IF NOT EXISTS idx_consultoria_itens_entrega_client_id ON public.consultoria_itens_entrega(client_id);
CREATE INDEX IF NOT EXISTS idx_consultoria_itens_entrega_store_id ON public.consultoria_itens_entrega(store_id);
CREATE INDEX IF NOT EXISTS idx_consultoria_itens_entrega_responsible_user ON public.consultoria_itens_entrega(responsible_user_id);
CREATE INDEX IF NOT EXISTS idx_pacotes_indicadores_itens_version_id ON public.pacotes_indicadores_itens(version_id);
CREATE INDEX IF NOT EXISTS idx_pacotes_indicadores_versoes_pacote_id ON public.pacotes_indicadores_versoes(pacote_id);
CREATE INDEX IF NOT EXISTS idx_planos_acao_template_itens_version_id ON public.planos_acao_template_itens(version_id);
CREATE INDEX IF NOT EXISTS idx_planos_acao_template_versoes_template_id ON public.planos_acao_template_versoes(template_id);
CREATE INDEX IF NOT EXISTS idx_qualificacoes_produto_user_id ON public.qualificacoes_produto_consultor(user_id);
CREATE INDEX IF NOT EXISTS idx_qualificacoes_encontro_user_id ON public.qualificacoes_encontro_consultor(user_id);

-- 2. Optimize auth_rls_initplan on core tables by wrapping auth.uid() in (select auth.uid())
DROP POLICY IF EXISTS clientes_seller_rw ON public.clientes;
CREATE POLICY clientes_seller_rw ON public.clientes
  FOR ALL TO authenticated
  USING (seller_user_id = (SELECT auth.uid()))
  WITH CHECK (seller_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS agendamentos_seller_rw ON public.agendamentos;
CREATE POLICY agendamentos_seller_rw ON public.agendamentos
  FOR ALL TO authenticated
  USING (
    (seller_user_id = (SELECT auth.uid()))
    AND (
      (cliente_id IS NULL)
      OR EXISTS (
        SELECT 1 FROM public.clientes c
        WHERE c.id = agendamentos.cliente_id AND c.loja_id = agendamentos.loja_id
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.vendedores_loja vl
      WHERE vl.seller_user_id = (SELECT auth.uid()) AND vl.store_id = agendamentos.loja_id AND vl.is_active
    )
  )
  WITH CHECK (
    (seller_user_id = (SELECT auth.uid()))
    AND (
      (cliente_id IS NULL)
      OR EXISTS (
        SELECT 1 FROM public.clientes c
        WHERE c.id = agendamentos.cliente_id AND c.loja_id = agendamentos.loja_id
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.vendedores_loja vl
      WHERE vl.seller_user_id = (SELECT auth.uid()) AND vl.store_id = agendamentos.loja_id AND vl.is_active
    )
  );

COMMIT;
