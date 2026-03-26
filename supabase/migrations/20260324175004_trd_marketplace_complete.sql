-- TRD v2 — full marketplace layer: locations, org trust fields, listing detail,
-- demand lifecycle, match AI fields, RFQ responses, conversations & messages.
-- Supersedes / extends 20260321120000_trd_core_schema.sql (does not replace profiles-as-users).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE public.org_verification_status AS ENUM (
  'pending',
  'verified'
);

CREATE TYPE public.price_type AS ENUM (
  'fixed',
  'negotiable'
);

CREATE TYPE public.demand_listing_status AS ENUM (
  'draft',
  'active',
  'receiving_quotes',
  'negotiating',
  'finalized',
  'closed'
);

CREATE TYPE public.rfq_response_status AS ENUM (
  'pending',
  'accepted',
  'rejected'
);

-- ---------------------------------------------------------------------------
-- Locations (TRD organizations.location_id)
-- ---------------------------------------------------------------------------
CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  region text,
  city text,
  address_line text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.locations IS 'Geographic anchor for organizations (TRD §1 location_id).';

-- Orphan FK values would block FK; clear before attach.
UPDATE public.organizations SET location_id = NULL WHERE location_id IS NOT NULL;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_location_id_fkey
  FOREIGN KEY (location_id) REFERENCES public.locations (id) ON DELETE SET NULL;

ALTER TABLE public.organizations
  ADD COLUMN country text,
  ADD COLUMN verification_status public.org_verification_status NOT NULL DEFAULT 'pending',
  ADD COLUMN rating double precision NOT NULL DEFAULT 0,
  ADD COLUMN total_transactions integer NOT NULL DEFAULT 0,
  ADD COLUMN export_markets jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.organizations.export_markets IS 'JSON array of supported export country codes or names (TRD §1).';

-- ---------------------------------------------------------------------------
-- Product sources — certifications
-- ---------------------------------------------------------------------------
ALTER TABLE public.product_sources
  ADD COLUMN certifications jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.product_sources.certifications IS 'e.g. ISO, Halal (TRD §4).';

-- ---------------------------------------------------------------------------
-- Supply listings — TRD §5 fields
-- ---------------------------------------------------------------------------
ALTER TABLE public.supply_listings
  ADD COLUMN min_order_quantity numeric,
  ADD COLUMN lead_time_days integer,
  ADD COLUMN certifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN export_capability boolean NOT NULL DEFAULT false,
  ADD COLUMN price_type public.price_type NOT NULL DEFAULT 'negotiable';

-- ---------------------------------------------------------------------------
-- Demand listings — TRD §6 lifecycle + RFQ fields
-- ---------------------------------------------------------------------------
ALTER TABLE public.demand_listings
  ADD COLUMN specifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN certifications_required jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN target_location text,
  ADD COLUMN incoterms text,
  ADD COLUMN is_open_for_bidding boolean NOT NULL DEFAULT true;

ALTER TABLE public.demand_listings
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.demand_listings
  ALTER COLUMN status TYPE public.demand_listing_status
  USING (
    CASE status
      WHEN 'active'::public.listing_status THEN 'active'::public.demand_listing_status
      WHEN 'closed'::public.listing_status THEN 'closed'::public.demand_listing_status
      WHEN 'matched'::public.listing_status THEN 'negotiating'::public.demand_listing_status
      ELSE 'active'::public.demand_listing_status
    END
  );

ALTER TABLE public.demand_listings
  ALTER COLUMN status SET DEFAULT 'draft'::public.demand_listing_status;

-- ---------------------------------------------------------------------------
-- Matches — AI breakdown (TRD §7)
-- ---------------------------------------------------------------------------
ALTER TABLE public.matches
  ADD COLUMN match_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN ai_reason text;

COMMENT ON COLUMN public.matches.match_breakdown IS 'Scores: product, capacity, price, location, certs (TRD §10).';
COMMENT ON COLUMN public.matches.ai_reason IS 'Human-readable match explanation (TRD §7).';

-- ---------------------------------------------------------------------------
-- RFQ responses (TRD §8)
-- ---------------------------------------------------------------------------
CREATE TABLE public.rfq_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_listing_id uuid NOT NULL REFERENCES public.demand_listings (id) ON DELETE CASCADE,
  supplier_organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  price_offer numeric NOT NULL,
  quantity_offer numeric,
  lead_time_days integer,
  message text,
  status public.rfq_response_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rfq_responses_demand ON public.rfq_responses (demand_listing_id);
CREATE INDEX idx_rfq_responses_supplier ON public.rfq_responses (supplier_organization_id);

COMMENT ON TABLE public.rfq_responses IS 'TRD §8 — supplier bids on a demand / RFQ.';

-- ---------------------------------------------------------------------------
-- Conversations & messages (TRD §9)
-- ---------------------------------------------------------------------------
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_listing_id uuid NOT NULL REFERENCES public.demand_listings (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversations_one_per_demand UNIQUE (demand_listing_id)
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON public.messages (conversation_id, created_at);

COMMENT ON TABLE public.conversations IS 'TRD §9 — negotiation thread per demand.';
COMMENT ON TABLE public.messages IS 'TRD §9 messages; sender is auth user (maps TRD users).';

-- ---------------------------------------------------------------------------
-- updated_at touch for rfq_responses & conversations
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER rfq_responses_set_updated_at
  BEFORE UPDATE ON public.rfq_responses
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER conversations_set_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_locations_country_city ON public.locations (country, city);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- locations: readable marketplace context; writes superadmin only
CREATE POLICY locations_select_authenticated
  ON public.locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY locations_write_superadmin
  ON public.locations FOR ALL
  USING (public.is_platform_superadmin())
  WITH CHECK (public.is_platform_superadmin());

-- rfq_responses
CREATE POLICY rfq_select
  ON public.rfq_responses FOR SELECT
  USING (
    public.is_platform_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.demand_listings d
      WHERE d.id = rfq_responses.demand_listing_id
        AND d.organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid() AND p.deleted_at IS NULL)
    )
    OR supplier_organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid() AND p.deleted_at IS NULL)
  );

CREATE POLICY rfq_insert_supplier
  ON public.rfq_responses FOR INSERT
  WITH CHECK (
    public.is_platform_superadmin()
    OR (
      supplier_organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid() AND p.deleted_at IS NULL)
      AND EXISTS (
        SELECT 1 FROM public.demand_listings d
        WHERE d.id = rfq_responses.demand_listing_id
          AND d.is_open_for_bidding = true
          AND d.status IN ('active'::public.demand_listing_status, 'receiving_quotes'::public.demand_listing_status)
      )
    )
  );

CREATE POLICY rfq_update_parties
  ON public.rfq_responses FOR UPDATE
  USING (
    public.is_platform_superadmin()
    OR supplier_organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid() AND p.deleted_at IS NULL)
    OR EXISTS (
      SELECT 1 FROM public.demand_listings d
      WHERE d.id = rfq_responses.demand_listing_id
        AND d.organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid() AND p.deleted_at IS NULL)
    )
  )
  WITH CHECK (
    public.is_platform_superadmin()
    OR supplier_organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid() AND p.deleted_at IS NULL)
    OR EXISTS (
      SELECT 1 FROM public.demand_listings d
      WHERE d.id = rfq_responses.demand_listing_id
        AND d.organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid() AND p.deleted_at IS NULL)
    )
  );

CREATE POLICY rfq_delete_super
  ON public.rfq_responses FOR DELETE
  USING (public.is_platform_superadmin());

-- conversations
CREATE POLICY conversations_select
  ON public.conversations FOR SELECT
  USING (
    public.is_platform_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.demand_listings d
      WHERE d.id = conversations.demand_listing_id
        AND d.organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid() AND p.deleted_at IS NULL)
    )
    OR EXISTS (
      SELECT 1 FROM public.rfq_responses r
      WHERE r.demand_listing_id = conversations.demand_listing_id
        AND r.supplier_organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid() AND p.deleted_at IS NULL)
    )
  );

CREATE POLICY conversations_insert
  ON public.conversations FOR INSERT
  WITH CHECK (
    public.is_platform_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.demand_listings d
      WHERE d.id = conversations.demand_listing_id
        AND d.organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid() AND p.deleted_at IS NULL)
        AND (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid() AND p.deleted_at IS NULL) IN ('admin', 'manager')
    )
  );

CREATE POLICY conversations_update_parties
  ON public.conversations FOR UPDATE
  USING (
    public.is_platform_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.demand_listings d
      WHERE d.id = conversations.demand_listing_id
        AND d.organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid() AND p.deleted_at IS NULL)
    )
    OR EXISTS (
      SELECT 1 FROM public.rfq_responses r
      WHERE r.demand_listing_id = conversations.demand_listing_id
        AND r.supplier_organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid() AND p.deleted_at IS NULL)
    )
  );

CREATE POLICY conversations_delete_super
  ON public.conversations FOR DELETE
  USING (public.is_platform_superadmin());

-- messages
CREATE POLICY messages_select
  ON public.messages FOR SELECT
  USING (
    public.is_platform_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.demand_listings d ON d.id = c.demand_listing_id
      WHERE c.id = messages.conversation_id
        AND d.organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid() AND p.deleted_at IS NULL)
    )
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.rfq_responses r ON r.demand_listing_id = c.demand_listing_id
      WHERE c.id = messages.conversation_id
        AND r.supplier_organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid() AND p.deleted_at IS NULL)
    )
  );

CREATE POLICY messages_insert
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      public.is_platform_superadmin()
      OR EXISTS (
        SELECT 1 FROM public.conversations c
        JOIN public.demand_listings d ON d.id = c.demand_listing_id
        WHERE c.id = messages.conversation_id
          AND d.organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid() AND p.deleted_at IS NULL)
      )
      OR EXISTS (
        SELECT 1 FROM public.conversations c
        JOIN public.rfq_responses r ON r.demand_listing_id = c.demand_listing_id
        WHERE c.id = messages.conversation_id
          AND r.supplier_organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid() AND p.deleted_at IS NULL)
      )
    )
  );

CREATE POLICY messages_delete_super
  ON public.messages FOR DELETE
  USING (public.is_platform_superadmin());;
