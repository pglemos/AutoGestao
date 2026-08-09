-- Restrict consulting evidence downloads to MX internal staff or the
-- owner/manager of the store that owns the consulting client.
-- Existing objects are all linked to evidencias_visita -> visitas_consultoria
-- -> clientes_consultoria and use the legacy client/visit path shape.

DROP POLICY IF EXISTS evidencias_select_auth ON storage.objects;
DROP POLICY IF EXISTS evidencias_consultoria_select ON storage.objects;

CREATE POLICY evidencias_consultoria_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'evidencias-consultoria'
    AND (
      public.eh_area_interna_mx()
      OR EXISTS (
        SELECT 1
        FROM public.evidencias_visita ev
        JOIN public.visitas_consultoria vc ON vc.id = ev.visita_id
        JOIN public.clientes_consultoria cc ON cc.id = vc.client_id
        WHERE ev.caminho_storage = storage.objects.name
          AND public.tem_papel_loja(cc.primary_store_id, ARRAY['dono', 'gerente'])
      )
    )
  );

COMMENT ON POLICY evidencias_consultoria_select ON storage.objects IS
  'Consulting evidence is readable by internal MX staff or the owner/manager of the linked client store; no cross-tenant authenticated read.';

NOTIFY pgrst, 'reload schema';
