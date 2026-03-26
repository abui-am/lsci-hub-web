-- Only platform superadmin can set organizations to `verified`.
-- For public signup, orgs created during `auth.users` INSERT trigger
-- are always created as `pending`, regardless of any client metadata.

BEGIN;

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

  -- Organization metadata (optional; for public signup)
  meta_org_name text;
  meta_org_type text;
  meta_org_description text;
  meta_sector text;
  meta_is_verified text;

  org_type_value public.org_type;
  sector_value public.org_sector;
  verification_status_value public.org_verification_status;
  org_id uuid;
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

  -- Organization metadata
  meta_org_name := nullif(trim(NEW.raw_user_meta_data->>'org_name'), '');
  meta_org_type := lower(coalesce(NEW.raw_user_meta_data->>'org_type', ''));
  meta_org_description := nullif(trim(NEW.raw_user_meta_data->>'org_description'), '');
  meta_sector := lower(coalesce(NEW.raw_user_meta_data->>'sector', ''));
  meta_is_verified := lower(coalesce(NEW.raw_user_meta_data->>'is_verified', ''));

  -- Public signup must never create verified organizations.
  verification_status_value := 'pending'::public.org_verification_status;

  -- Parse sector safely
  IF meta_sector IN ('agriculture', 'tourism', 'processing', 'mining') THEN
    sector_value := meta_sector::public.org_sector;
  ELSE
    sector_value := NULL;
  END IF;

  -- Enforce org_type mapping for supplier/buyer selections
  org_type_value := NULL;
  IF is_supplier_value AND NOT is_buyer_value AND meta_org_type IN ('farmer', 'umkm') THEN
    org_type_value := meta_org_type::public.org_type;
  ELSIF is_buyer_value AND NOT is_supplier_value AND meta_org_type IN ('industry', 'hotel') THEN
    org_type_value := meta_org_type::public.org_type;
  ELSIF is_supplier_value AND is_buyer_value AND meta_org_type = 'government' THEN
    org_type_value := 'government'::public.org_type;
  END IF;

  -- Don't set sector for government
  IF org_type_value = 'government'::public.org_type THEN
    sector_value := NULL;
  END IF;

  -- Create organization if metadata is present and mapping is valid
  org_id := NULL;
  IF meta_org_name IS NOT NULL AND org_type_value IS NOT NULL THEN
    BEGIN
      INSERT INTO public.organizations (name, type, sector, description, verification_status)
      VALUES (
        meta_org_name,
        org_type_value,
        sector_value,
        meta_org_description,
        verification_status_value
      )
      RETURNING id INTO org_id;
    EXCEPTION WHEN OTHERS THEN
      -- Best-effort: keep auth user signup working even if org creation fails.
      org_id := NULL;
    END;
  END IF;

  INSERT INTO public.profiles (
    id,
    name,
    organization_id,
    role,
    is_platform_superadmin,
    account_class,
    is_supplier,
    is_buyer
  )
  VALUES (
    NEW.id,
    display_name,
    org_id,
    'member',
    false,
    account_class_value,
    is_supplier_value,
    is_buyer_value
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    organization_id = COALESCE(public.profiles.organization_id, EXCLUDED.organization_id),
    account_class = EXCLUDED.account_class,
    is_supplier = EXCLUDED.is_supplier,
    is_buyer = EXCLUDED.is_buyer;

  RETURN NEW;
END;
$$;

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

  meta_org_name text;
  meta_org_type text;
  meta_org_description text;
  meta_sector text;
  meta_is_verified text;

  org_type_value public.org_type;
  sector_value public.org_sector;
  verification_status_value public.org_verification_status;
  org_id uuid;
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
    lower(coalesce(raw_user_meta_data->>'is_buyer', '')),
    nullif(trim(raw_user_meta_data->>'org_name'), ''),
    lower(coalesce(raw_user_meta_data->>'org_type', '')),
    nullif(trim(raw_user_meta_data->>'org_description'), ''),
    lower(coalesce(raw_user_meta_data->>'sector', '')),
    lower(coalesce(raw_user_meta_data->>'is_verified', ''))
  INTO
    meta_account_class,
    meta_is_supplier,
    meta_is_buyer,
    meta_org_name,
    meta_org_type,
    meta_org_description,
    meta_sector,
    meta_is_verified
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

  -- Public signup must never create verified organizations.
  verification_status_value := 'pending'::public.org_verification_status;

  IF meta_sector IN ('agriculture', 'tourism', 'processing', 'mining') THEN
    sector_value := meta_sector::public.org_sector;
  ELSE
    sector_value := NULL;
  END IF;

  org_type_value := NULL;
  IF is_supplier_value AND NOT is_buyer_value AND meta_org_type IN ('farmer', 'umkm') THEN
    org_type_value := meta_org_type::public.org_type;
  ELSIF is_buyer_value AND NOT is_supplier_value AND meta_org_type IN ('industry', 'hotel') THEN
    org_type_value := meta_org_type::public.org_type;
  ELSIF is_supplier_value AND is_buyer_value AND meta_org_type = 'government' THEN
    org_type_value := 'government'::public.org_type;
  END IF;

  IF org_type_value = 'government'::public.org_type THEN
    sector_value := NULL;
  END IF;

  org_id := NULL;
  IF meta_org_name IS NOT NULL AND org_type_value IS NOT NULL THEN
    BEGIN
      INSERT INTO public.organizations (name, type, sector, description, verification_status)
      VALUES (
        meta_org_name,
        org_type_value,
        sector_value,
        meta_org_description,
        verification_status_value
      )
      RETURNING id INTO org_id;
    EXCEPTION WHEN OTHERS THEN
      org_id := NULL;
    END;
  END IF;

  INSERT INTO public.profiles (
    id,
    name,
    organization_id,
    role,
    is_platform_superadmin,
    account_class,
    is_supplier,
    is_buyer
  )
  VALUES (
    auth.uid(),
    uname,
    org_id,
    'member',
    false,
    account_class_value,
    is_supplier_value,
    is_buyer_value
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    organization_id = COALESCE(public.profiles.organization_id, EXCLUDED.organization_id),
    account_class = EXCLUDED.account_class,
    is_supplier = EXCLUDED.is_supplier,
    is_buyer = EXCLUDED.is_buyer;
END;
$$;

COMMIT;

