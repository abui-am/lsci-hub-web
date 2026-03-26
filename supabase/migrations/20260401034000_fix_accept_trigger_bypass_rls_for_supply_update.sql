-- Fix: ensure RFQ acceptance mutation can update supplier listing quantity
-- even when the actor is a buyer (RLS would otherwise hide supplier rows).

BEGIN;

CREATE OR REPLACE FUNCTION public.apply_rfq_acceptance_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  accepted_qty numeric := COALESCE(NEW.quantity_offer, 0);
  before_qty numeric := NULL;
  after_qty numeric := NULL;
  resulting_status public.demand_listing_status := NULL;
  supply_before_qty numeric := NULL;
  supply_after_qty numeric := NULL;
BEGIN
  IF NEW.status = 'accepted'::public.rfq_response_status
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
  THEN
    -- 1) Decrement demand remaining quantity
    SELECT d.required_quantity, d.status
      INTO before_qty, resulting_status
    FROM public.demand_listings d
    WHERE d.id = NEW.demand_listing_id
      AND d.deleted_at IS NULL
    LIMIT 1;

    UPDATE public.demand_listings d
    SET
      required_quantity = GREATEST(d.required_quantity - accepted_qty, 0),
      status = CASE
        WHEN GREATEST(d.required_quantity - accepted_qty, 0) <= 0
          THEN 'closed'::public.demand_listing_status
        ELSE d.status
      END,
      is_open_for_bidding = CASE
        WHEN GREATEST(d.required_quantity - accepted_qty, 0) <= 0
          THEN false
        ELSE d.is_open_for_bidding
      END
    WHERE d.id = NEW.demand_listing_id
      AND d.deleted_at IS NULL
    RETURNING d.required_quantity, d.status
      INTO after_qty, resulting_status;

    -- 2) Decrement linked supply quantity (if supply_listing_id is present)
    IF NEW.supply_listing_id IS NOT NULL THEN
      SELECT s.quantity INTO supply_before_qty
      FROM public.supply_listings s
      WHERE s.id = NEW.supply_listing_id
        AND s.deleted_at IS NULL
      LIMIT 1;

      UPDATE public.supply_listings s
      SET
        quantity = GREATEST(s.quantity - accepted_qty, 0),
        status = CASE
          WHEN GREATEST(s.quantity - accepted_qty, 0) <= 0
            THEN 'closed'::public.listing_status
          ELSE s.status
        END
      WHERE s.id = NEW.supply_listing_id
        AND s.deleted_at IS NULL
      RETURNING s.quantity INTO supply_after_qty;
    END IF;

    INSERT INTO public.mutation_logs (
      entity,
      entity_id,
      action,
      actor_id,
      payload
    )
    VALUES (
      'demand_listings',
      NEW.demand_listing_id,
      'rfq_response_accepted',
      auth.uid(),
      jsonb_build_object(
        'rfq_response_id', NEW.id,
        'accepted_quantity', accepted_qty,
        'required_quantity_before', before_qty,
        'required_quantity_after', after_qty,
        'resulting_status', resulting_status,
        'supply_listing_id', NEW.supply_listing_id,
        'supply_quantity_before', supply_before_qty,
        'supply_quantity_after', supply_after_qty
      )
    );
  ELSIF NEW.status = 'rejected'::public.rfq_response_status
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
  THEN
    INSERT INTO public.mutation_logs (
      entity,
      entity_id,
      action,
      actor_id,
      payload
    )
    VALUES (
      'rfq_responses',
      NEW.id,
      'rfq_response_rejected',
      auth.uid(),
      jsonb_build_object(
        'demand_listing_id', NEW.demand_listing_id,
        'quantity_offer', NEW.quantity_offer,
        'price_offer', NEW.price_offer
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;

