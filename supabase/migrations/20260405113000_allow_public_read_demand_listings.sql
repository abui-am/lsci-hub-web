-- Allow all users to read non-deleted demand listings.
-- This simplifies marketplace discovery and prevents missing-demand issues
-- when related entities (e.g. chat/bidding history) still reference RFQs.

BEGIN;

DROP POLICY IF EXISTS demand_select ON public.demand_listings;

CREATE POLICY demand_select
  ON public.demand_listings
  FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL);

COMMIT;
