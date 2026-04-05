-- Allow all authenticated users to read active organizations.
-- This ensures marketplace cards can always resolve buyer/supplier identity data.

BEGIN;

DROP POLICY IF EXISTS orgs_select_policy ON public.organizations;

CREATE POLICY orgs_select_policy
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

COMMIT;
