-- LSCI-Hub TRD core schema + RBAC baseline
-- Aligns with: .cursor/project/domain/rbac-matrix.md
-- Notes:
-- - App users live in public.profiles (id = auth.users.id). TRD "users" table is modeled as profiles.
-- - Platform operators use profiles.is_platform_superadmin (TRD does not define this; required for governance).

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE public.org_type AS ENUM (
  'farmer',
  'umkm',
  'industry',
  'hotel',
  'government'
);

CREATE TYPE public.org_sector AS ENUM (
  'agriculture',
  'tourism',
  'processing',
  'mining'
);

CREATE TYPE public.membership_role AS ENUM (
  'admin',
  'manager',
  'member'
);

CREATE TYPE public.product_category AS ENUM (
  'mining',
  'agriculture',
  'tourism',
  'processing',
  'other'
);

CREATE TYPE public.unit AS ENUM (
  'kg',
  'ton',
  'liter',
  'pcs'
);

CREATE TYPE public.listing_status AS ENUM (
  'active',
  'matched',
  'closed'
);

CREATE TYPE public.match_status AS ENUM (
  'suggested',
  'accepted',
  'rejected'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type public.org_type NOT NULL,
  sector public.org_sector,
  location_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  organization_id uuid REFERENCES public.organizations (id) ON DELETE SET NULL,
  role public.membership_role NOT NULL DEFAULT 'member',
  is_platform_superadmin boolean NOT NULL DEFAULT false,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT profiles_superadmin_org_check CHECK (
    (is_platform_superadmin = false)
    OR (is_platform_superadmin = true AND organization_id IS NULL)
  )
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category public.product_category NOT NULL DEFAULT 'other',
  description text,
  unit public.unit NOT NULL,
  is_raw_material boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE public.product_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  description text,
  capacity_per_month numeric,
  production_method_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE public.supply_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  quantity numeric NOT NULL,
  price_estimate numeric,
  available_from date,
  available_until date,
  status public.listing_status NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE public.demand_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  required_quantity numeric NOT NULL,
  required_by date,
  price_range_from numeric,
  price_range_to numeric,
  status public.listing_status NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- TRD p.4 mislabels this as demand_listings; dedicated matches table.
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_listing_id uuid NOT NULL REFERENCES public.supply_listings (id) ON DELETE CASCADE,
  demand_listing_id uuid NOT NULL REFERENCES public.demand_listings (id) ON DELETE CASCADE,
  match_score double precision,
  status public.match_status NOT NULL DEFAULT 'suggested',
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT matches_supply_demand_unique UNIQUE (supply_listing_id, demand_listing_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_profiles_organization_id ON public.profiles (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_sources_org ON public.product_sources (organization_id);
CREATE INDEX idx_supply_listings_org ON public.supply_listings (organization_id);
CREATE INDEX idx_demand_listings_org ON public.demand_listings (organization_id);
CREATE INDEX idx_matches_supply ON public.matches (supply_listing_id);
CREATE INDEX idx_matches_demand ON public.matches (demand_listing_id);

-- ---------------------------------------------------------------------------
-- Helper functions (RLS)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_platform_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.deleted_at IS NULL
      AND p.is_platform_superadmin = true
  );
$$;

CREATE OR REPLACE FUNCTION public.current_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.*
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.deleted_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_org_type()
RETURNS public.org_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.type
  FROM public.profiles p
  JOIN public.organizations o ON o.id = p.organization_id
  WHERE p.id = auth.uid()
    AND p.deleted_at IS NULL
    AND o.deleted_at IS NULL
  LIMIT 1;
$$;

-- Used in RLS policies: read caller’s profile without re-entering profiles RLS (avoids infinite recursion).
CREATE OR REPLACE FUNCTION public.auth_profile_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.organization_id
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.deleted_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.auth_profile_role()
RETURNS public.membership_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.deleted_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.auth_profile_org_type()
RETURNS public.org_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.type
  FROM public.profiles p
  JOIN public.organizations o ON o.id = p.organization_id
  WHERE p.id = auth.uid()
    AND p.deleted_at IS NULL
    AND o.deleted_at IS NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.auth_profile_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_profile_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_profile_org_type() TO authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select_self_or_super
  ON public.profiles FOR SELECT
  USING (
    public.is_platform_superadmin()
    OR id = auth.uid()
    OR (
      organization_id IS NOT NULL
      AND organization_id = public.auth_profile_org_id()
    )
  );

CREATE POLICY profiles_update_self_or_super
  ON public.profiles FOR UPDATE
  USING (public.is_platform_superadmin() OR id = auth.uid())
  WITH CHECK (
    public.is_platform_superadmin()
    OR (
      id = auth.uid()
      AND is_platform_superadmin = false
    )
  );

CREATE POLICY profiles_insert_own_or_super
  ON public.profiles FOR INSERT
  WITH CHECK (
    public.is_platform_superadmin()
    OR (
      id = auth.uid()
      AND is_platform_superadmin = false
    )
  );

-- organizations
CREATE POLICY orgs_select_policy
  ON public.organizations FOR SELECT
  USING (
    public.is_platform_superadmin()
    OR id = public.auth_profile_org_id()
    OR (
      public.auth_profile_org_type() IN ('industry', 'hotel')
      AND type IN ('farmer', 'umkm')
    )
    OR (public.auth_profile_org_type() = 'government')
  );

CREATE POLICY orgs_insert_super
  ON public.organizations FOR INSERT
  WITH CHECK (public.is_platform_superadmin());

CREATE POLICY orgs_update_super_or_org_admin
  ON public.organizations FOR UPDATE
  USING (
    public.is_platform_superadmin()
    OR (
      id = public.auth_profile_org_id()
      AND public.auth_profile_role() = 'admin'
    )
  )
  WITH CHECK (
    public.is_platform_superadmin()
    OR (
      id = public.auth_profile_org_id()
      AND public.auth_profile_role() = 'admin'
    )
  );

CREATE POLICY orgs_delete_super
  ON public.organizations FOR DELETE
  USING (public.is_platform_superadmin());

-- products: global catalog — read all authenticated; write superadmin only (adjust when catalog is crowdsourced)
CREATE POLICY products_select_authenticated
  ON public.products FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY products_insert_super
  ON public.products FOR INSERT
  WITH CHECK (public.is_platform_superadmin());

CREATE POLICY products_update_super
  ON public.products FOR UPDATE
  USING (public.is_platform_superadmin())
  WITH CHECK (public.is_platform_superadmin());

CREATE POLICY products_delete_super
  ON public.products FOR DELETE
  USING (public.is_platform_superadmin());

-- product_sources: org members + superadmin
CREATE POLICY product_sources_select
  ON public.product_sources FOR SELECT
  USING (
    public.is_platform_superadmin()
    OR organization_id = public.auth_profile_org_id()
  );

CREATE POLICY product_sources_write
  ON public.product_sources FOR INSERT
  WITH CHECK (
    public.is_platform_superadmin()
    OR (
      organization_id = public.auth_profile_org_id()
      AND public.auth_profile_role() IN ('admin', 'manager')
    )
  );

CREATE POLICY product_sources_update
  ON public.product_sources FOR UPDATE
  USING (
    public.is_platform_superadmin()
    OR organization_id = public.auth_profile_org_id()
  )
  WITH CHECK (
    public.is_platform_superadmin()
    OR organization_id = public.auth_profile_org_id()
  );

CREATE POLICY product_sources_delete
  ON public.product_sources FOR DELETE
  USING (
    public.is_platform_superadmin()
    OR (
      organization_id = public.auth_profile_org_id()
      AND public.auth_profile_role() = 'admin'
    )
  );

-- supply_listings
CREATE POLICY supply_select
  ON public.supply_listings FOR SELECT
  USING (
    public.is_platform_superadmin()
    OR organization_id = public.auth_profile_org_id()
    OR (
      status = 'active'
      AND public.auth_profile_org_type() IN ('industry', 'hotel')
      AND EXISTS (
        SELECT 1 FROM public.organizations seller
        WHERE seller.id = supply_listings.organization_id
          AND seller.type IN ('farmer', 'umkm')
          AND seller.deleted_at IS NULL
      )
    )
  );

CREATE POLICY supply_write
  ON public.supply_listings FOR INSERT
  WITH CHECK (
    public.is_platform_superadmin()
    OR (
      organization_id = public.auth_profile_org_id()
      AND EXISTS (
        SELECT 1
        FROM public.organizations o
        WHERE o.id = supply_listings.organization_id
          AND o.type IN ('farmer', 'umkm')
          AND o.deleted_at IS NULL
      )
    )
  );

CREATE POLICY supply_update
  ON public.supply_listings FOR UPDATE
  USING (
    public.is_platform_superadmin()
    OR organization_id = public.auth_profile_org_id()
  )
  WITH CHECK (
    public.is_platform_superadmin()
    OR organization_id = public.auth_profile_org_id()
  );

CREATE POLICY supply_delete
  ON public.supply_listings FOR DELETE
  USING (
    public.is_platform_superadmin()
    OR (
      organization_id = public.auth_profile_org_id()
      AND public.auth_profile_role() IN ('admin', 'manager')
    )
  );

-- demand_listings
CREATE POLICY demand_select
  ON public.demand_listings FOR SELECT
  USING (
    public.is_platform_superadmin()
    OR organization_id = public.auth_profile_org_id()
  );

CREATE POLICY demand_write
  ON public.demand_listings FOR INSERT
  WITH CHECK (
    public.is_platform_superadmin()
    OR (
      organization_id = public.auth_profile_org_id()
      AND EXISTS (
        SELECT 1
        FROM public.organizations o
        WHERE o.id = demand_listings.organization_id
          AND o.type IN ('industry', 'hotel', 'umkm')
          AND o.deleted_at IS NULL
      )
    )
  );

CREATE POLICY demand_update
  ON public.demand_listings FOR UPDATE
  USING (
    public.is_platform_superadmin()
    OR organization_id = public.auth_profile_org_id()
  )
  WITH CHECK (
    public.is_platform_superadmin()
    OR organization_id = public.auth_profile_org_id()
  );

CREATE POLICY demand_delete
  ON public.demand_listings FOR DELETE
  USING (
    public.is_platform_superadmin()
    OR (
      organization_id = public.auth_profile_org_id()
      AND public.auth_profile_role() IN ('admin', 'manager')
    )
  );

-- matches: participants + superadmin (government read via join — tighten with aggregate views later)
CREATE POLICY matches_select
  ON public.matches FOR SELECT
  USING (
    public.is_platform_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.supply_listings s
      WHERE s.id = matches.supply_listing_id
        AND s.organization_id = public.auth_profile_org_id()
    )
    OR EXISTS (
      SELECT 1 FROM public.demand_listings d
      WHERE d.id = matches.demand_listing_id
        AND d.organization_id = public.auth_profile_org_id()
    )
    OR (public.auth_profile_org_type() = 'government')
  );

CREATE POLICY matches_write_super
  ON public.matches FOR INSERT
  WITH CHECK (public.is_platform_superadmin());

CREATE POLICY matches_update_participants
  ON public.matches FOR UPDATE
  USING (
    public.is_platform_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.supply_listings s
      WHERE s.id = matches.supply_listing_id
        AND s.organization_id = public.auth_profile_org_id()
    )
    OR EXISTS (
      SELECT 1 FROM public.demand_listings d
      WHERE d.id = matches.demand_listing_id
        AND d.organization_id = public.auth_profile_org_id()
    )
  )
  WITH CHECK (
    public.is_platform_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.supply_listings s
      WHERE s.id = matches.supply_listing_id
        AND s.organization_id = public.auth_profile_org_id()
    )
    OR EXISTS (
      SELECT 1 FROM public.demand_listings d
      WHERE d.id = matches.demand_listing_id
        AND d.organization_id = public.auth_profile_org_id()
    )
  );

CREATE POLICY matches_delete_super
  ON public.matches FOR DELETE
  USING (public.is_platform_superadmin());

COMMENT ON TABLE public.organizations IS 'TRD §1 — org actor type drives RBAC scope.';
COMMENT ON TABLE public.profiles IS 'App user row (TRD §2 users); id references auth.users.';
COMMENT ON TABLE public.matches IS 'TRD §7 — corrected name (TRD PDF mistakenly reused demand_listings).';
