-- Allow buyers to read supply listings when linked to their own RFQ flow.
-- This keeps supply visibility constrained to rows referenced by responses
-- on demand listings owned by the buyer's organization.

DROP POLICY IF EXISTS supply_select ON public.supply_listings;

CREATE POLICY supply_select
  ON public.supply_listings FOR SELECT
  USING (
    public.is_platform_superadmin()
    OR organization_id = public.auth_profile_org_id()
    OR EXISTS (
      SELECT 1
      FROM public.rfq_responses r
      JOIN public.demand_listings d ON d.id = r.demand_listing_id
      WHERE r.supply_listing_id = supply_listings.id
        AND d.organization_id = public.auth_profile_org_id()
        AND d.deleted_at IS NULL
    )
  );
