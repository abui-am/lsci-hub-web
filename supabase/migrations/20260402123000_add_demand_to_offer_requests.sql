BEGIN;

ALTER TABLE public.offer_requests
  ADD COLUMN IF NOT EXISTS demand_listing_id uuid
    REFERENCES public.demand_listings (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_offer_requests_demand
  ON public.offer_requests (demand_listing_id, status, created_at DESC);

UPDATE public.offer_requests
SET demand_listing_id = dl.id
FROM public.supply_listings s
JOIN public.demand_listings dl
  ON dl.product_id = s.product_id
WHERE offer_requests.supply_listing_id = s.id
  AND offer_requests.demand_listing_id IS NULL
  AND dl.deleted_at IS NULL
  AND dl.is_open_for_bidding = true
  AND dl.status IN ('active', 'receiving_quotes');

ALTER TABLE public.offer_requests
  ALTER COLUMN demand_listing_id SET NOT NULL;

COMMIT;

