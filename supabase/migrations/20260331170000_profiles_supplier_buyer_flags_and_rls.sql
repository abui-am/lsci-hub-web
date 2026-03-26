-- Enable a single account/org to act as both supplier and buyer.
-- Adds boolean flags on profiles and updates marketplace RLS policies + signup triggers.

BEGIN;
-- ---------------------------------------------------------------------------
-- 1) Columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_supplier boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_buyer boolean NOT NULL DEFAULT false;
-- Backfill from organization type and/or existing account_class.
-- (Public signup sets flags explicitly; this is for existing users.)
UPDATE public.profiles p
SET
  is_supplier = true,
  is_buyer = false
FROM public.organizations o
WHERE p.organization_id = o.id
  AND p.deleted_at IS NULL
  AND o.deleted_at IS NULL
  AND o.type IN ('farmer', 'umkm');
UPDATE public.profiles p
SET
  is_buyer = true,
  is_supplier = false
FROM public.organizations o
WHERE p.organization_id = o.id
  AND p.deleted_at IS NULL
  AND o.deleted_at IS NULL
  AND o.type IN ('industry', 'hotel');
UPDATE public.profiles p
SET
  is_supplier = true,
  is_buyer = false
WHERE p.deleted_at IS NULL
  AND p.account_class = 'supplier';
UPDATE public.profiles p
SET
  is_supplier = false,
  is_buyer = true
WHERE p.deleted_at IS NULL
  AND p.account_class = 'buyer';
-- Internal/platform superadmin/government => no supplier/buyer flags by default.
UPDATE public.profiles p
SET
  is_supplier = false,
  is_buyer = false
WHERE p.deleted_at IS NULL
  AND (
    p.is_platform_superadmin = true
    OR EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = p.organization_id
        AND o.deleted_at IS NULL
        AND o.type = 'government'
    )
    OR p.account_class = 'internal'
  );
-- ---------------------------------------------------------------------------
-- 2) Signup trigger (auth.users AFTER INSERT)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  display_name text;
  meta_account_class text;
  meta_is_supplier text;
  meta_is_buyer text;

  is_supplier_value boolean;
  is_buyer_value boolean;
  account_class_value public.account_class;
BEGIN
  display_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(split_part(NEW.email, '@', 1), ''),
    'User'
  );

  meta_account_class := lower(coalesce(NEW.raw_user_meta_data->>'account_class', 'internal'));
  meta_is_supplier := lower(coalesce(NEW.raw_user_meta_data->>'is_supplier', ''));
  meta_is_buyer := lower(coalesce(NEW.raw_user_meta_data->>'is_buyer', ''));

  -- Prefer explicit flags when present; fall back to legacy account_class.
  is_supplier_value := CASE
    WHEN meta_is_supplier <> '' THEN meta_is_supplier IN ('true', '1', 'yes')
    WHEN meta_account_class = 'supplier' THEN true
    ELSE false
  END;

  is_buyer_value := CASE
    WHEN meta_is_buyer <> '' THEN meta_is_buyer IN ('true', '1', 'yes')
    WHEN meta_account_class = 'buyer' THEN true
    ELSE false
  END;

  account_class_value := CASE
    WHEN is_supplier_value AND is_buyer_value THEN 'internal'::public.account_class
    WHEN is_supplier_value THEN 'supplier'::public.account_class
    WHEN is_buyer_value THEN 'buyer'::public.account_class
    ELSE 'internal'::public.account_class
  END;

  INSERT INTO public.profiles (id, name, role, is_platform_superadmin, account_class, is_supplier, is_buyer)
  VALUES (
    NEW.id,
    display_name,
    'member',
    false,
    account_class_value,
    is_supplier_value,
    is_buyer_value
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
-- Trigger definition (idempotent if it already exists).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
-- ---------------------------------------------------------------------------
-- 3) Ensure profile row exists (fallback)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_my_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uemail text;
  uname text;
  meta_account_class text;
  meta_is_supplier text;
  meta_is_buyer text;
  is_supplier_value boolean;
  is_buyer_value boolean;
  account_class_value public.account_class;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT email INTO uemail FROM auth.users WHERE id = auth.uid();
  uname := COALESCE(
    NULLIF(trim(split_part(uemail, '@', 1)), ''),
    'User'
  );

  -- Metadata lives in raw_user_meta_data (jsonb).
  SELECT
    lower(coalesce(raw_user_meta_data->>'account_class', 'internal')),
    lower(coalesce(raw_user_meta_data->>'is_supplier', '')),
    lower(coalesce(raw_user_meta_data->>'is_buyer', ''))
  INTO meta_account_class, meta_is_supplier, meta_is_buyer
  FROM auth.users
  WHERE id = auth.uid();

  is_supplier_value := CASE
    WHEN meta_is_supplier <> '' THEN meta_is_supplier IN ('true', '1', 'yes')
    WHEN meta_account_class = 'supplier' THEN true
    ELSE false
  END;

  is_buyer_value := CASE
    WHEN meta_is_buyer <> '' THEN meta_is_buyer IN ('true', '1', 'yes')
    WHEN meta_account_class = 'buyer' THEN true
    ELSE false
  END;

  account_class_value := CASE
    WHEN is_supplier_value AND is_buyer_value THEN 'internal'::public.account_class
    WHEN is_supplier_value THEN 'supplier'::public.account_class
    WHEN is_buyer_value THEN 'buyer'::public.account_class
    ELSE 'internal'::public.account_class
  END;

  INSERT INTO public.profiles (id, name, role, is_platform_superadmin, account_class, is_supplier, is_buyer)
  VALUES (
    auth.uid(),
    uname,
    'member',
    false,
    account_class_value,
    is_supplier_value,
    is_buyer_value
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_my_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;
-- ---------------------------------------------------------------------------
-- 4) RLS helper functions (avoid recursion)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_profile_is_supplier()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.is_supplier
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.deleted_at IS NULL
  LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public.auth_profile_is_buyer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.is_buyer
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.deleted_at IS NULL
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.auth_profile_is_supplier() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_profile_is_buyer() TO authenticated;
-- ---------------------------------------------------------------------------
-- 5) RLS policies for marketplace write actions
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS supply_write ON public.supply_listings;
CREATE POLICY supply_write
  ON public.supply_listings FOR INSERT
  WITH CHECK (
    public.is_platform_superadmin()
    OR (
      organization_id = public.auth_profile_org_id()
      AND public.auth_profile_is_supplier()
    )
  );
DROP POLICY IF EXISTS supply_update ON public.supply_listings;
CREATE POLICY supply_update
  ON public.supply_listings FOR UPDATE
  USING (
    public.is_platform_superadmin()
    OR (
      organization_id = public.auth_profile_org_id()
      AND public.auth_profile_is_supplier()
    )
  )
  WITH CHECK (
    public.is_platform_superadmin()
    OR (
      organization_id = public.auth_profile_org_id()
      AND public.auth_profile_is_supplier()
    )
  );
DROP POLICY IF EXISTS supply_delete ON public.supply_listings;
CREATE POLICY supply_delete
  ON public.supply_listings FOR DELETE
  USING (
    public.is_platform_superadmin()
    OR (
      organization_id = public.auth_profile_org_id()
      AND public.auth_profile_role() IN ('admin', 'manager')
      AND public.auth_profile_is_supplier()
    )
  );
DROP POLICY IF EXISTS demand_write ON public.demand_listings;
CREATE POLICY demand_write
  ON public.demand_listings FOR INSERT
  WITH CHECK (
    public.is_platform_superadmin()
    OR (
      organization_id = public.auth_profile_org_id()
      AND public.auth_profile_is_buyer()
    )
  );
DROP POLICY IF EXISTS demand_update ON public.demand_listings;
CREATE POLICY demand_update
  ON public.demand_listings FOR UPDATE
  USING (
    public.is_platform_superadmin()
    OR (
      organization_id = public.auth_profile_org_id()
      AND public.auth_profile_is_buyer()
    )
  )
  WITH CHECK (
    public.is_platform_superadmin()
    OR (
      organization_id = public.auth_profile_org_id()
      AND public.auth_profile_is_buyer()
    )
  );
DROP POLICY IF EXISTS demand_delete ON public.demand_listings;
CREATE POLICY demand_delete
  ON public.demand_listings FOR DELETE
  USING (
    public.is_platform_superadmin()
    OR (
      organization_id = public.auth_profile_org_id()
      AND public.auth_profile_role() IN ('admin', 'manager')
      AND public.auth_profile_is_buyer()
    )
  );
COMMIT;
