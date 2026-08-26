-- Leitura das trilhas de auditoria pela área interna MX.
--
-- A tela /auditoria passa a expor todas as trilhas reais do sistema, não só
-- `internal_mx_admin_audit`. Duas delas não eram legíveis por quem audita:
--
--   * `data_correction_audit` só tinha policy para `service_role`;
--   * `checkin_audit_logs` liberava `usuarios.role IN ('admin','dono','gerente')`,
--     vocabulário que não inclui os papéis internos MX
--     (`administrador_geral`, `administrador_mx`, `consultor_mx`).
--
-- Ambas ganham SELECT para a área interna MX, no mesmo formato de
-- `internal_mx_admin_audit_select`. Nenhuma permissão de escrita é concedida:
-- trilha de auditoria continua imutável pela aplicação.

DROP POLICY IF EXISTS data_correction_audit_internal_mx_select ON public.data_correction_audit;
CREATE POLICY data_correction_audit_internal_mx_select
  ON public.data_correction_audit
  FOR SELECT
  TO authenticated
  USING (public.eh_area_interna_mx(auth.uid()));

DROP POLICY IF EXISTS checkin_audit_logs_internal_mx_select ON public.checkin_audit_logs;
CREATE POLICY checkin_audit_logs_internal_mx_select
  ON public.checkin_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.eh_area_interna_mx(auth.uid()));
