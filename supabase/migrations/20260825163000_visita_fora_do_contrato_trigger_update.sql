-- Garante que o trigger de validação de saldo presencial revalide quando fora_do_contrato for alterado.
DROP TRIGGER IF EXISTS trg_validar_saldo_presencial ON public.visitas_consultoria;

CREATE TRIGGER trg_validar_saldo_presencial
  BEFORE INSERT OR UPDATE OF modality, fora_do_contrato ON public.visitas_consultoria
  FOR EACH ROW EXECUTE FUNCTION public.validar_saldo_presencial();
