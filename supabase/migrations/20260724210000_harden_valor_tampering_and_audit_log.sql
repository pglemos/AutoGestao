-- Auditoria ampla de 2026-07-24 — 2 achados reais de integridade de negócio
-- (não são bugs de auth, mas encaixam em "nenhum erro em conta/usuário").
--
-- 1) oportunidades.valor_negociado / valor_troca: RLS permite o próprio
--    vendedor (seller_user_id = auth.uid()) editar livremente, mesmo depois
--    da oportunidade já estar 'ganho'. vendedor_performance_oficial() soma
--    valor_negociado direto como faturamento oficial — ou seja, o vendedor
--    podia inflar a própria métrica oficial/comissão depois da venda
--    fechada, sem nenhuma reconciliação. Confirmado uso real: 6 casos
--    históricos de oportunidade 'ganho' editada pelo próprio vendedor após
--    closed_at. Fix via trigger (não RLS) pra poder comparar OLD vs NEW e
--    travar só os 2 campos financeiros — todo o resto (data de entrega,
--    placa, financiamento) continua editável normalmente por qualquer
--    papel, preservando o fluxo real de pós-venda já em uso.
--
-- 2) d1_audit_log: RLS dava ALL (insert/select/update/delete) pro próprio
--    usuário auditado. Um audit trail que o próprio auditado pode reescrever
--    ou apagar não é audit trail. 28 linhas reais já existem. Restringe pra
--    INSERT+SELECT do próprio; UPDATE/DELETE só admin MX.

BEGIN;

-- 1. Trigger de trava financeira pós-venda em oportunidades.
CREATE OR REPLACE FUNCTION public.prevent_valor_negociado_tamper_after_close()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.etapa::text = 'ganho'
     AND (
       NEW.valor_negociado IS DISTINCT FROM OLD.valor_negociado
       OR NEW.valor_troca IS DISTINCT FROM OLD.valor_troca
     )
     AND NOT (
       public.eh_administrador_mx(auth.uid())
       OR public.is_manager_of(OLD.loja_id)
       OR public.is_owner_of(OLD.loja_id)
     )
  THEN
    RAISE EXCEPTION 'Não é possível alterar o valor negociado de uma venda já concluída. Fale com o gerente da loja.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_oportunidades_prevent_valor_tamper ON public.oportunidades;
CREATE TRIGGER trg_oportunidades_prevent_valor_tamper
BEFORE UPDATE ON public.oportunidades
FOR EACH ROW
EXECUTE FUNCTION public.prevent_valor_negociado_tamper_after_close();

-- 2. d1_audit_log: fecha auto-edição/exclusão do próprio audit trail.
DROP POLICY IF EXISTS d1_audit_log_seller_rw ON public.d1_audit_log;

CREATE POLICY d1_audit_log_select_own ON public.d1_audit_log
  FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.eh_administrador_mx(auth.uid()));

CREATE POLICY d1_audit_log_insert_own ON public.d1_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY d1_audit_log_admin_write ON public.d1_audit_log
  FOR UPDATE TO authenticated
  USING (public.eh_administrador_mx(auth.uid()))
  WITH CHECK (public.eh_administrador_mx(auth.uid()));

CREATE POLICY d1_audit_log_admin_delete ON public.d1_audit_log
  FOR DELETE TO authenticated
  USING (public.eh_administrador_mx(auth.uid()));

-- 3. treinamento_quiz_questoes: SELECT estava aberto (USING: true) pra
-- qualquer autenticado, sem escopo nenhum. Tabela vazia em prod hoje (sem
-- risco ativo), mas se ganhar dados no futuro (pergunta+opções de quiz)
-- qualquer usuário conseguiria ler todas as perguntas de todos os
-- treinamentos, inclusive os que não tem acesso. Reaproveita o mesmo
-- escopo de treinamentos_select_scoped via join.
DROP POLICY IF EXISTS treinamento_quiz_questoes_select ON public.treinamento_quiz_questoes;
CREATE POLICY treinamento_quiz_questoes_select ON public.treinamento_quiz_questoes
  FOR SELECT TO authenticated
  USING (
    public.eh_area_interna_mx(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.treinamentos t
      WHERE t.id = treinamento_quiz_questoes.training_id
    )
  );

COMMIT;
