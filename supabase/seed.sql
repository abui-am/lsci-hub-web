-- Local `supabase db reset` seed (runs as DB superuser; bypasses RLS).
-- Matches stable UUIDs in `scripts/seed-test-accounts.ts`.
-- Auth users are NOT created here — run `pnpm run seed:test-accounts` with service role for login accounts + the same demo rows (idempotent).

BEGIN;

INSERT INTO public.locations (id, country, region, city, address_line)
VALUES (
  'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  'Indonesia',
  'Nusa Tenggara Barat',
  'Mataram',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organizations (id, name, type, sector, description)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '[TEST] Gapoktan Lombok',
    'farmer',
    'agriculture',
    'Seeded farmer org for RBAC tests'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
    '[TEST] UMKM Olahan Lokal',
    'umkm',
    'processing',
    'Seeded UMKM org for RBAC tests'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    '[TEST] Hotel Supply Desk',
    'hotel',
    'tourism',
    'Seeded hotel org for RBAC tests'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    '[TEST] Pemda NTB (demo)',
    'government',
    NULL,
    'Seeded government org for RBAC tests'
  )
ON CONFLICT (id) DO NOTHING;

UPDATE public.organizations
SET
  location_id = 'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  country = 'Indonesia',
  verification_status = 'verified'
WHERE id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'
);

INSERT INTO public.products (id, name, category, description, unit, is_raw_material)
VALUES
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    '[DEMO] Cabai merah segar',
    'agriculture',
    'Grade A — seed demo',
    'kg',
    true
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    '[DEMO] Kopi arabika sangrai',
    'agriculture',
    'Medium roast — seed demo',
    'kg',
    false
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.product_sources (
  id,
  organization_id,
  product_id,
  description,
  capacity_per_month,
  production_method_description,
  certifications
)
VALUES (
  'ffffffff-ffff-ffff-ffff-fffffffffff1',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'Lahan organik — demo',
  1200,
  'Panen manual, sortasi basah.',
  '["local-organic"]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.supply_listings (
  id,
  organization_id,
  product_id,
  quantity,
  price_estimate,
  min_order_quantity,
  lead_time_days,
  export_capability,
  price_type,
  certifications,
  available_from,
  available_until,
  status,
  created_by
)
VALUES (
  'dddddddd-dddd-dddd-dddd-ddddddddddd1',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  500,
  45000,
  50,
  7,
  true,
  'negotiable',
  '["ISO-like-demo"]'::jsonb,
  CURRENT_DATE,
  CURRENT_DATE + 90,
  'active',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.demand_listings (
  id,
  organization_id,
  product_id,
  required_quantity,
  required_by,
  price_range_from,
  price_range_to,
  specifications,
  certifications_required,
  target_location,
  incoterms,
  is_open_for_bidding,
  status,
  created_by
)
VALUES (
  'dddddddd-dddd-dddd-dddd-ddddddddddd2',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  200,
  CURRENT_DATE + 30,
  40000,
  55000,
  '{"grade":"A","packaging":"10kg crates"}'::jsonb,
  '[]'::jsonb,
  'Mandalika',
  'FOB',
  true,
  'active',
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.matches (
  id,
  supply_listing_id,
  demand_listing_id,
  match_score,
  match_breakdown,
  ai_reason,
  status
)
VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
  'dddddddd-dddd-dddd-dddd-ddddddddddd1',
  'dddddddd-dddd-dddd-dddd-ddddddddddd2',
  0.87,
  '{"product":0.95,"capacity":0.85,"price":0.82,"location":0.8,"certifications":0.9}'::jsonb,
  'Demo match: same product, quantity fits, price band overlap, NTB corridor.',
  'suggested'
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
