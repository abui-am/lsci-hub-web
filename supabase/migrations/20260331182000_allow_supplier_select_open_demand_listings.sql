-- Allow suppliers to view all open RFQs (demand_listings) across organizations.
-- AI recommender remains for suggestions; suppliers can respond to any open RFQ.

BEGIN;

DROP POLICY IF EXISTS demand_select ON public.demand_listings;

CREATE POLICY demand_select
  ON public.demand_listings FOR SELECT
  USING (
    public.is_platform_superadmin()
    OR organization_id = public.auth_profile_org_id()
    OR (
      public.auth_profile_is_supplier()
      AND is_open_for_bidding = true
      AND status IN ('active'::public.demand_listing_status, 'receiving_quotes'::public.demand_listing_status)
      AND deleted_at IS NULL
    )
  );

COMMIT;

