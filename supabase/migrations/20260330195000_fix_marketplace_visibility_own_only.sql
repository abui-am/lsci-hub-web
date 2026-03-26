-- Enforce marketplace visibility rules:
-- - Suppliers can only see their own supply listings.
-- - Buyers can only see their own demand listings.
--
-- Implementation: tighten `supply_select` to "own org only".
-- (demand_select was already own-org-only in core policy.)

DROP POLICY IF EXISTS supply_select ON public.supply_listings;
CREATE POLICY supply_select
  ON public.supply_listings FOR SELECT
  USING (
    public.is_platform_superadmin()
    OR organization_id = public.auth_profile_org_id()
  );
