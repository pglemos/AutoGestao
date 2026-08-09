-- Resolve the storage path through the protected consulting tables as the
-- database owner, then apply the requesting user's store membership check.
-- Direct joins from storage.objects policies are subject to the source tables'
-- RLS and hide valid evidence from store owners/managers.

CREATE OR REPLACE FUNCTION public.pode_ler_evidencia_consultoria(
  p_storage_path text,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.evidencias_visita ev
      JOIN public.visitas_consultoria vc ON vc.id = ev.visita_id
      JOIN public.clientes_consultoria cc ON cc.id = vc.client_id
      WHERE ev.caminho_storage = p_storage_path
        AND public.tem_papel_loja(
          cc.primary_store_id,
          ARRAY['dono', 'gerente'],
          p_user_id
        )
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.pode_ler_evidencia_consultoria(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pode_ler_evidencia_consultoria(text, uuid) TO authenticated;

DROP POLICY IF EXISTS evidencias_consultoria_select ON storage.objects;

CREATE POLICY evidencias_consultoria_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'evidencias-consultoria'
    AND (
      public.eh_area_interna_mx()
      OR public.pode_ler_evidencia_consultoria(name)
    )
  );

COMMENT ON FUNCTION public.pode_ler_evidencia_consultoria(text, uuid) IS
  'Authorizes consulting evidence downloads through the linked client store without exposing RLS-protected consulting rows to storage policy evaluation.';

COMMENT ON POLICY evidencias_consultoria_select ON storage.objects IS
  'Consulting evidence is readable by internal MX staff or the owner/manager of the linked client store; linkage is resolved by a fixed-search-path security-definer helper.';

NOTIFY pgrst, 'reload schema';
