BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'offer_request_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.offer_request_status AS ENUM (
      'pending',
      'accepted',
      'rejected'
    );
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.offer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_listing_id uuid NOT NULL REFERENCES public.supply_listings (id) ON DELETE CASCADE,
  buyer_organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  created_by_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  status public.offer_request_status NOT NULL DEFAULT 'pending',
  price_offer numeric NOT NULL,
  quantity_offer numeric NOT NULL,
  lead_time_days integer,
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_requests_supply
  ON public.offer_requests (supply_listing_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_offer_requests_buyer_org
  ON public.offer_requests (buyer_organization_id, status, created_at DESC);

ALTER TABLE public.offer_requests
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY offer_requests_buyer_access ON public.offer_requests
  FOR SELECT
  USING (
    buyer_organization_id IN (
      SELECT organization_id
      FROM public.profiles
      WHERE id = auth.uid()
        AND organization_id IS NOT NULL
    )
  );

CREATE POLICY offer_requests_buyer_insert ON public.offer_requests
  FOR INSERT
  WITH CHECK (
    buyer_organization_id IN (
      SELECT organization_id
      FROM public.profiles
      WHERE id = auth.uid()
        AND organization_id IS NOT NULL
    )
    AND created_by_profile_id = auth.uid()
  );

CREATE POLICY offer_requests_supplier_access ON public.offer_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.supply_listings s
      WHERE s.id = offer_requests.supply_listing_id
        AND s.organization_id IN (
          SELECT organization_id
          FROM public.profiles
          WHERE id = auth.uid()
            AND organization_id IS NOT NULL
        )
    )
  );

CREATE POLICY offer_requests_supplier_update ON public.offer_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.supply_listings s
      WHERE s.id = offer_requests.supply_listing_id
        AND s.organization_id IN (
          SELECT organization_id
          FROM public.profiles
          WHERE id = auth.uid()
            AND organization_id IS NOT NULL
        )
    )
  )
  WITH CHECK (true);

CREATE POLICY offer_requests_admin_full_access ON public.offer_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_superadmin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_superadmin = true
    )
  );

COMMIT;

