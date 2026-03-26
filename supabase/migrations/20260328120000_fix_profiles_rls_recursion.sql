-- Fix: "infinite recursion detected in policy for relation profiles"
-- Inline subqueries to public.profiles inside RLS policies re-enter profiles SELECT policies.
-- Helpers are SECURITY DEFINER so they read profiles without RLS.

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
-- Drop policies that still reference profiles via inline subqueries (idempotent refresh).
DROP POLICY IF EXISTS profiles_select_self_or_super ON public.profiles;
DROP POLICY IF EXISTS profiles_update_self_or_super ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own_or_super ON public.profiles;
DROP POLICY IF EXISTS orgs_select_policy ON public.organizations;
DROP POLICY IF EXISTS orgs_insert_super ON public.organizations;
DROP POLICY IF EXISTS orgs_update_super_or_org_admin ON public.organizations;
DROP POLICY IF EXISTS orgs_delete_super ON public.organizations;
DROP POLICY IF EXISTS products_select_authenticated ON public.products;
DROP POLICY IF EXISTS products_insert_super ON public.products;
DROP POLICY IF EXISTS products_update_super ON public.products;
DROP POLICY IF EXISTS products_delete_super ON public.products;
DROP POLICY IF EXISTS product_sources_select ON public.product_sources;
DROP POLICY IF EXISTS product_sources_write ON public.product_sources;
DROP POLICY IF EXISTS product_sources_update ON public.product_sources;
DROP POLICY IF EXISTS product_sources_delete ON public.product_sources;
DROP POLICY IF EXISTS supply_select ON public.supply_listings;
DROP POLICY IF EXISTS supply_write ON public.supply_listings;
DROP POLICY IF EXISTS supply_update ON public.supply_listings;
DROP POLICY IF EXISTS supply_delete ON public.supply_listings;
DROP POLICY IF EXISTS demand_select ON public.demand_listings;
DROP POLICY IF EXISTS demand_write ON public.demand_listings;
DROP POLICY IF EXISTS demand_update ON public.demand_listings;
DROP POLICY IF EXISTS demand_delete ON public.demand_listings;
DROP POLICY IF EXISTS matches_select ON public.matches;
DROP POLICY IF EXISTS matches_write_super ON public.matches;
DROP POLICY IF EXISTS matches_update_participants ON public.matches;
DROP POLICY IF EXISTS matches_delete_super ON public.matches;
DROP POLICY IF EXISTS locations_select_authenticated ON public.locations;
DROP POLICY IF EXISTS locations_write_superadmin ON public.locations;
DROP POLICY IF EXISTS rfq_select ON public.rfq_responses;
DROP POLICY IF EXISTS rfq_insert_supplier ON public.rfq_responses;
DROP POLICY IF EXISTS rfq_update_parties ON public.rfq_responses;
DROP POLICY IF EXISTS rfq_delete_super ON public.rfq_responses;
DROP POLICY IF EXISTS conversations_select ON public.conversations;
DROP POLICY IF EXISTS conversations_insert ON public.conversations;
DROP POLICY IF EXISTS conversations_update_parties ON public.conversations;
DROP POLICY IF EXISTS conversations_delete_super ON public.conversations;
DROP POLICY IF EXISTS messages_select ON public.messages;
DROP POLICY IF EXISTS messages_insert ON public.messages;
DROP POLICY IF EXISTS messages_delete_super ON public.messages;
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
-- products
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
-- product_sources
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
-- matches
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
-- marketplace (tables may be absent on very old DBs — guard with DO blocks not portable; assume TRD marketplace migration applied)
CREATE POLICY locations_select_authenticated
  ON public.locations FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY locations_write_superadmin
  ON public.locations FOR ALL
  USING (public.is_platform_superadmin())
  WITH CHECK (public.is_platform_superadmin());
CREATE POLICY rfq_select
  ON public.rfq_responses FOR SELECT
  USING (
    public.is_platform_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.demand_listings d
      WHERE d.id = rfq_responses.demand_listing_id
        AND d.organization_id = public.auth_profile_org_id()
    )
    OR supplier_organization_id = public.auth_profile_org_id()
  );
CREATE POLICY rfq_insert_supplier
  ON public.rfq_responses FOR INSERT
  WITH CHECK (
    public.is_platform_superadmin()
    OR (
      supplier_organization_id = public.auth_profile_org_id()
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
    OR supplier_organization_id = public.auth_profile_org_id()
    OR EXISTS (
      SELECT 1 FROM public.demand_listings d
      WHERE d.id = rfq_responses.demand_listing_id
        AND d.organization_id = public.auth_profile_org_id()
    )
  )
  WITH CHECK (
    public.is_platform_superadmin()
    OR supplier_organization_id = public.auth_profile_org_id()
    OR EXISTS (
      SELECT 1 FROM public.demand_listings d
      WHERE d.id = rfq_responses.demand_listing_id
        AND d.organization_id = public.auth_profile_org_id()
    )
  );
CREATE POLICY rfq_delete_super
  ON public.rfq_responses FOR DELETE
  USING (public.is_platform_superadmin());
CREATE POLICY conversations_select
  ON public.conversations FOR SELECT
  USING (
    public.is_platform_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.demand_listings d
      WHERE d.id = conversations.demand_listing_id
        AND d.organization_id = public.auth_profile_org_id()
    )
    OR EXISTS (
      SELECT 1 FROM public.rfq_responses r
      WHERE r.demand_listing_id = conversations.demand_listing_id
        AND r.supplier_organization_id = public.auth_profile_org_id()
    )
  );
CREATE POLICY conversations_insert
  ON public.conversations FOR INSERT
  WITH CHECK (
    public.is_platform_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.demand_listings d
      WHERE d.id = conversations.demand_listing_id
        AND d.organization_id = public.auth_profile_org_id()
        AND public.auth_profile_role() IN ('admin', 'manager')
    )
  );
CREATE POLICY conversations_update_parties
  ON public.conversations FOR UPDATE
  USING (
    public.is_platform_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.demand_listings d
      WHERE d.id = conversations.demand_listing_id
        AND d.organization_id = public.auth_profile_org_id()
    )
    OR EXISTS (
      SELECT 1 FROM public.rfq_responses r
      WHERE r.demand_listing_id = conversations.demand_listing_id
        AND r.supplier_organization_id = public.auth_profile_org_id()
    )
  );
CREATE POLICY conversations_delete_super
  ON public.conversations FOR DELETE
  USING (public.is_platform_superadmin());
CREATE POLICY messages_select
  ON public.messages FOR SELECT
  USING (
    public.is_platform_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.demand_listings d ON d.id = c.demand_listing_id
      WHERE c.id = messages.conversation_id
        AND d.organization_id = public.auth_profile_org_id()
    )
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.rfq_responses r ON r.demand_listing_id = c.demand_listing_id
      WHERE c.id = messages.conversation_id
        AND r.supplier_organization_id = public.auth_profile_org_id()
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
          AND d.organization_id = public.auth_profile_org_id()
      )
      OR EXISTS (
        SELECT 1 FROM public.conversations c
        JOIN public.rfq_responses r ON r.demand_listing_id = c.demand_listing_id
        WHERE c.id = messages.conversation_id
          AND r.supplier_organization_id = public.auth_profile_org_id()
      )
    )
  );
CREATE POLICY messages_delete_super
  ON public.messages FOR DELETE
  USING (public.is_platform_superadmin());
