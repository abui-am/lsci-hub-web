-- LSCI-Hub — example data (reference only)
-- Run manually after migration `20260324174948_trd_core_schema.sql`.
--
-- Why not a default seed migration?
-- - `profiles.id` must match real `auth.users.id` rows.
-- - Create users first (Dashboard → Authentication, Admin API, or `pnpm run seed:admin`).
--
-- How to run safely
-- 1) Apply migration (Supabase CLI: `supabase db push` / SQL editor).
-- 2) Create Auth users in Supabase (copy their UUIDs).
-- 3) Replace ALL placeholder UUIDs below.
-- 4) Execute in SQL editor as **service role** (bypasses RLS) OR as `super_admin` profile
--    for inserts that RLS allows (orgs/products still need superadmin).

BEGIN;

-- ---------------------------------------------------------------------------
-- Placeholders — replace before running
-- ---------------------------------------------------------------------------
-- Superadmin auth user (from seed:admin or your own)
-- \set super_user_id '00000000-0000-0000-0000-000000000001'
-- Farmer org admin
-- \set farmer_admin_id '00000000-0000-0000-0000-000000000002'
-- Hotel org admin
-- \set hotel_admin_id '00000000-0000-0000-0000-000000000003'

-- Example fixed UUIDs for orgs + catalog (optional — you can use gen_random_uuid() instead)
-- org_farmer  : aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1
-- org_hotel   : aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2
-- org_gov     : aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3
-- product_cof : bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1

-- ---------------------------------------------------------------------------
-- 1) Organizations
-- ---------------------------------------------------------------------------
INSERT INTO public.organizations (id, name, type, sector, description)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'Gapoktan Sumber Organik Lombok',
    'farmer',
    'agriculture',
    'Kelompok petani organik NTB — cabai, kopi, madu.'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'Resort Mandalika Supply Desk',
    'hotel',
    'tourism',
    'Kebutuhan bahan pangan lokal untuk F&B.'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    'Disperindag Provinsi NTB (demo)',
    'government',
    NULL,
    'Akun contoh pemerintah daerah — akses agregat.'
  )
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2) Product catalog (requires platform superadmin in app; use service_role here)
-- ---------------------------------------------------------------------------
INSERT INTO public.products (id, name, category, description, unit, is_raw_material)
VALUES
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    'Cabai merah segar',
    'agriculture',
    'Cabai merah grade A',
    'kg',
    true
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    'Kopi arabika sangrai',
    'agriculture',
    'Biji sangrai medium roast',
    'kg',
    false
  )
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3) Profiles — MUST match auth.users.id
-- ---------------------------------------------------------------------------
-- Uncomment and paste real UUIDs from Authentication → Users.
/*
INSERT INTO public.profiles (id, name, organization_id, role, is_platform_superadmin, phone)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Platform Admin',
    NULL,
    'admin',
    true,
    NULL
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Ibu Siti — Ketua Gapoktan',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'admin',
    false,
    '+6281234567001'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Bapak Eko — Procurement',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'admin',
    false,
    '+6281234567002'
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'Staff Disperindag',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    'member',
    false,
    NULL
  );
*/

-- ---------------------------------------------------------------------------
-- 4) Operational rows (after profiles exist — run as org member or service_role)
-- ---------------------------------------------------------------------------
/*
INSERT INTO public.product_sources (
  organization_id,
  product_id,
  description,
  capacity_per_month,
  production_method_description
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'Lahan organik sertifikasi lokal',
  1200,
  'Pertanian organik, panen manual, sortasi basah.'
);

INSERT INTO public.supply_listings (
  organization_id,
  product_id,
  quantity,
  price_estimate,
  available_from,
  available_until,
  status,
  created_by
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  500,
  45000,
  CURRENT_DATE,
  CURRENT_DATE + interval '90 days',
  'active',
  '00000000-0000-0000-0000-000000000002'
);

INSERT INTO public.demand_listings (
  organization_id,
  product_id,
  required_quantity,
  required_by,
  price_range_from,
  price_range_to,
  status,
  created_by
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  200,
  CURRENT_DATE + interval '30 days',
  40000,
  55000,
  'active',
  '00000000-0000-0000-0000-000000000003'
);

INSERT INTO public.matches (
  supply_listing_id,
  demand_listing_id,
  match_score,
  status
)
SELECT
  s.id,
  d.id,
  0.87,
  'suggested'
FROM public.supply_listings s
JOIN public.demand_listings d
  ON d.product_id = s.product_id
 AND d.organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'
WHERE s.organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
LIMIT 1;
*/

ROLLBACK;

-- Tip: change ROLLBACK → COMMIT when you are ready to persist (and fix UUIDs).
