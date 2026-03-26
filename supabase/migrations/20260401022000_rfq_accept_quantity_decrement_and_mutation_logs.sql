-- Accepting RFQ responses should decrement remaining demand quantity first,
-- then close bidding only when remaining quantity reaches zero.
-- Also record mutation logs for traceability.

BEGIN;

CREATE TABLE IF NOT EXISTS public.mutation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mutation_logs_entity
  ON public.mutation_logs (entity, entity_id, created_at DESC);

ALTER TABLE public.mutation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mutation_logs_select_self_or_super ON public.mutation_logs;
CREATE POLICY mutation_logs_select_self_or_super
  ON public.mutation_logs FOR SELECT
  USING (public.is_platform_superadmin() OR actor_id = auth.uid());

DROP POLICY IF EXISTS mutation_logs_insert_authenticated ON public.mutation_logs;
CREATE POLICY mutation_logs_insert_authenticated
  ON public.mutation_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.apply_rfq_acceptance_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  accepted_qty numeric := COALESCE(NEW.quantity_offer, 0);
  before_qty numeric := NULL;
  after_qty numeric := NULL;
  resulting_status public.demand_listing_status := NULL;
BEGIN
  IF NEW.status = 'accepted'::public.rfq_response_status
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
  THEN
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
        'resulting_status', resulting_status
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

DROP TRIGGER IF EXISTS rfq_responses_close_demand_on_accept
  ON public.rfq_responses;

DROP TRIGGER IF EXISTS rfq_responses_apply_acceptance_mutation
  ON public.rfq_responses;

CREATE TRIGGER rfq_responses_apply_acceptance_mutation
  AFTER INSERT OR UPDATE OF status ON public.rfq_responses
  FOR EACH ROW
  EXECUTE PROCEDURE public.apply_rfq_acceptance_mutation();

COMMIT;

