-- Keep RFQ bidding state consistent:
-- when a demand listing is closed, bidding must be closed too.

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_demand_bidding_with_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'closed'::public.demand_listing_status THEN
    NEW.is_open_for_bidding := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS demand_listings_sync_bidding_on_status ON public.demand_listings;

CREATE TRIGGER demand_listings_sync_bidding_on_status
  BEFORE INSERT OR UPDATE ON public.demand_listings
  FOR EACH ROW
  EXECUTE PROCEDURE public.sync_demand_bidding_with_status();

COMMIT;

