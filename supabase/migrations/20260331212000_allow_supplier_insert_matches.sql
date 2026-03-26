-- Allow suppliers to create matches themselves for open RFQs.
-- AI remains a recommender (suggested matches), while supplier-created matches
-- become `accepted`.

BEGIN;

CREATE POLICY matches_insert_supplier
  ON public.matches FOR INSERT
  WITH CHECK (
    public.is_platform_superadmin()
    OR (
      public.auth_profile_is_supplier()
      AND EXISTS (
        SELECT 1
        FROM public.supply_listings s
        WHERE s.id = matches.supply_listing_id
          AND s.organization_id = public.auth_profile_org_id()
          AND s.deleted_at IS NULL
      )
      AND EXISTS (
        SELECT 1
        FROM public.demand_listings d
        WHERE d.id = matches.demand_listing_id
          AND d.deleted_at IS NULL
          AND d.is_open_for_bidding = true
          AND d.status IN (
            'active'::public.demand_listing_status,
            'receiving_quotes'::public.demand_listing_status
          )
      )
    )
  );

COMMIT;

