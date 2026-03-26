-- Seed/admin scripts use the Supabase service role key.
-- In some environments, RLS may still evaluate policies, so explicitly allow
-- writes when the JWT role is `service_role`.

DROP POLICY IF EXISTS orgs_insert_service_role ON public.organizations;
CREATE POLICY orgs_insert_service_role
  ON public.organizations FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS orgs_update_service_role ON public.organizations;
CREATE POLICY orgs_update_service_role
  ON public.organizations FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
