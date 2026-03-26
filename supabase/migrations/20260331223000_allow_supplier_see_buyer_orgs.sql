-- Marketplace visibility fix:
-- Suppliers must be able to see buyer organization names (industry/hotel)
-- when browsing open demand listings.

BEGIN;

DROP POLICY IF EXISTS orgs_select_policy ON public.organizations;

CREATE POLICY orgs_select_policy
  ON public.organizations FOR SELECT
  USING (
    public.is_platform_superadmin()
    OR id = public.auth_profile_org_id()
    OR (
      -- Buyer can view supplier organizations in marketplace context
      public.auth_profile_org_type() IN ('industry', 'hotel')
      AND type IN ('farmer', 'umkm')
    )
    OR (
      -- Supplier can view buyer organizations in marketplace context
      public.auth_profile_org_type() IN ('farmer', 'umkm')
      AND type IN ('industry', 'hotel')
    )
    OR (public.auth_profile_org_type() = 'government')
  );

COMMIT;

