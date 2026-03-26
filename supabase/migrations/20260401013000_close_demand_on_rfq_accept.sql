-- When a buyer accepts a supplier quote, close the parent RFQ automatically.

BEGIN;

CREATE OR REPLACE FUNCTION public.close_demand_listing_on_rfq_accept()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'accepted'::public.rfq_response_status
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
  THEN
    UPDATE public.demand_listings
    SET
      status = 'closed'::public.demand_listing_status,
      is_open_for_bidding = false
    WHERE id = NEW.demand_listing_id
      AND deleted_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rfq_responses_close_demand_on_accept
  ON public.rfq_responses;

CREATE TRIGGER rfq_responses_close_demand_on_accept
  AFTER INSERT OR UPDATE OF status ON public.rfq_responses
  FOR EACH ROW
  EXECUTE PROCEDURE public.close_demand_listing_on_rfq_accept();

COMMIT;

