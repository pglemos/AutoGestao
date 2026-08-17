-- Migration: 20260816235500_consultor_mx_feedback_pdi_rls.sql
-- Description: Align devolutivas and pdis RLS select policies with internal MX role capabilities (eh_area_interna_mx)

DROP POLICY IF EXISTS role_matrix_feedbacks_select ON public.devolutivas;
CREATE POLICY role_matrix_feedbacks_select ON public.devolutivas
  FOR SELECT
  TO authenticated
  USING (
    public.eh_area_interna_mx(auth.uid())
    OR (SELECT public.is_owner_of(devolutivas.store_id))
    OR (SELECT public.is_manager_of(devolutivas.store_id))
    OR (seller_id = auth.uid() AND visible_to_seller)
  );

DROP POLICY IF EXISTS role_matrix_pdis_select ON public.pdis;
CREATE POLICY role_matrix_pdis_select ON public.pdis
  FOR SELECT
  TO authenticated
  USING (
    public.eh_area_interna_mx(auth.uid())
    OR (SELECT public.is_owner_of(pdis.store_id))
    OR (SELECT public.is_manager_of(pdis.store_id))
    OR (seller_id = auth.uid())
  );
