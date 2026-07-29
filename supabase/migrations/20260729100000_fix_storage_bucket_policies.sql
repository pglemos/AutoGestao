-- Fix storage bucket policies for pre-cadastro-avatares and evidencias-consultoria
-- Issue: Images in these buckets were not loading due to missing/broken RLS policies.

-- 1. pre-cadastro-avatares: Add explicit SELECT policy for public access
-- The bucket is public=true but RLS on storage.objects blocks access without a policy.
DROP POLICY IF EXISTS pre_cadastro_avatares_select_public ON storage.objects;
CREATE POLICY pre_cadastro_avatares_select_public
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'pre-cadastro-avatares');

-- 2. evidencias-consultoria: Broader SELECT policy for authenticated users
-- Existing policy restricts to eh_area_interna_mx() only, which breaks evidence
-- images shown in consulting visit reports for clients (donos/gerentes).
-- This broader policy allows any authenticated user to SELECT, while keeping
-- INSERT/UPDATE/DELETE restricted to internal MX staff.
DROP POLICY IF EXISTS evidencias_select_auth ON storage.objects;
CREATE POLICY evidencias_select_auth
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'evidencias-consultoria');

NOTIFY pgrst, 'reload schema';
