-- Link RFQ responses to a concrete supplier listing.
-- Supports automatic selection and optional manual override from UI.

BEGIN;

ALTER TABLE public.rfq_responses
  ADD COLUMN IF NOT EXISTS supply_listing_id uuid
  REFERENCES public.supply_listings (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rfq_responses_supply_listing
  ON public.rfq_responses (supply_listing_id);

COMMENT ON COLUMN public.rfq_responses.supply_listing_id IS
  'Optional direct link to supplier listing used for this RFQ quote.';

COMMIT;

