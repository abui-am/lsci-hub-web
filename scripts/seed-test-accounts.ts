/**
 * Seeds RBAC test users + organizations + profiles (service role).
 *
 * Usage: pnpm run seed:test-accounts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env
 * Requires: TRD migrations applied (core + marketplace + profile trigger + ensure_my_profile).
 *
 * Password for every test login (local/dev only): TestPassword123!
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  const missing = []
  if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  console.error('Missing in .env:', missing.join(', '))
  process.exit(1)
}

const supabaseUrl = url
const supabaseServiceRoleKey = serviceRoleKey

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function printErrorWithCause(prefix: string, error: unknown) {
  if (error instanceof Error) {
    const cause =
      typeof error.cause === 'object' && error.cause
        ? JSON.stringify(error.cause)
        : String(error.cause ?? '')
    console.error(`${prefix}: ${error.name}: ${error.message}`)
    if (cause && cause !== 'undefined') {
      console.error('cause:', cause)
    }
    return
  }
  console.error(prefix, error)
}

async function runConnectivityPreflight() {
  const host = new URL(supabaseUrl).host
  try {
    // Fast check to surface DNS / networking issues before any DB call.
    await fetch(`${supabaseUrl}/auth/v1/health`, { method: 'GET' })
  } catch (error) {
    printErrorWithCause('Supabase connectivity check failed', error)
    console.error('host:', host)
    console.error(
      'Tip: this usually means DNS/network cannot reach your Supabase project from this machine.'
    )
    process.exit(1)
  }
}

/** Stable org ids so re-runs stay consistent */
const ORG_IDS = {
  farmer: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  umkm: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
  hotel: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
  government: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
} as const

/** Stable IDs for marketplace demo rows (seed.sql uses the same values). */
const DEMO_IDS = {
  location: 'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  productChili: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  productCoffee: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
  supplyListing: 'dddddddd-dddd-dddd-dddd-ddddddddddd1',
  demandListing: 'dddddddd-dddd-dddd-dddd-ddddddddddd2',
  match: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
} as const

const TEST_PASSWORD = 'TestPassword123!'

type MembershipRole = 'admin' | 'manager' | 'member'

type TestAccount = {
  email: string
  name: string
  organizationId: string | null
  role: MembershipRole
  isPlatformSuperadmin: boolean
  isSupplier: boolean
  isBuyer: boolean
}

const ACCOUNTS: TestAccount[] = [
  {
    email: 'superadmin@test.local',
    name: 'Test Platform Superadmin',
    organizationId: null,
    role: 'admin',
    isPlatformSuperadmin: true,
    isSupplier: true,
    isBuyer: true,
  },
  {
    email: 'farmer-admin@test.local',
    name: 'Test Farmer Admin',
    organizationId: ORG_IDS.farmer,
    role: 'admin',
    isPlatformSuperadmin: false,
    isSupplier: true,
    isBuyer: false,
  },
  {
    email: 'farmer-member@test.local',
    name: 'Test Farmer Member',
    organizationId: ORG_IDS.farmer,
    role: 'member',
    isPlatformSuperadmin: false,
    isSupplier: true,
    isBuyer: false,
  },
  {
    email: 'umkm-manager@test.local',
    name: 'Test UMKM Manager',
    organizationId: ORG_IDS.umkm,
    role: 'manager',
    isPlatformSuperadmin: false,
    isSupplier: true,
    isBuyer: false,
  },
  {
    email: 'hotel-admin@test.local',
    name: 'Test Hotel Admin',
    organizationId: ORG_IDS.hotel,
    role: 'admin',
    isPlatformSuperadmin: false,
    isSupplier: false,
    isBuyer: true,
  },
  {
    email: 'gov-member@test.local',
    name: 'Test Government Member',
    organizationId: ORG_IDS.government,
    role: 'member',
    isPlatformSuperadmin: false,
    isSupplier: false,
    isBuyer: true,
  },
]

async function findUserIdByEmail(email: string): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })
  if (error) {
    printErrorWithCause('listUsers', error)
    return null
  }
  const lower = email.toLowerCase()
  const u = data.users.find((x) => x.email?.toLowerCase() === lower)
  return u?.id ?? null
}

async function getOrCreateAuthUser(
  email: string,
  password: string
): Promise<string> {
  const existing = await findUserIdByEmail(email)
  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing, {
      password,
      email_confirm: true,
    })
    if (error) {
      printErrorWithCause(`Password reset skipped for ${email}`, error)
    }
    return existing
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) {
    printErrorWithCause(`createUser ${email}`, error ?? new Error('no user'))
    process.exit(1)
  }
  return data.user.id
}

async function seedOrganizations() {
  const rows = [
    {
      id: ORG_IDS.farmer,
      name: '[TEST] Gapoktan Lombok',
      type: 'farmer' as const,
      sector: 'agriculture' as const,
      description: 'Seeded farmer org for RBAC tests',
    },
    {
      id: ORG_IDS.umkm,
      name: '[TEST] UMKM Olahan Lokal',
      type: 'umkm' as const,
      sector: 'processing' as const,
      description: 'Seeded UMKM org for RBAC tests',
    },
    {
      id: ORG_IDS.hotel,
      name: '[TEST] Hotel Supply Desk',
      type: 'hotel' as const,
      sector: 'tourism' as const,
      description: 'Seeded hotel org for RBAC tests',
    },
    {
      id: ORG_IDS.government,
      name: '[TEST] Pemda NTB (demo)',
      type: 'government' as const,
      sector: null,
      description: 'Seeded government org for RBAC tests',
    },
  ]

  const { error } = await supabase.from('organizations').upsert(rows, {
    onConflict: 'id',
  })
  if (error) {
    printErrorWithCause('organizations upsert', error)
    process.exit(1)
  }
}

async function seedMarketplaceDemo() {
  const { error: locErr } = await supabase.from('locations').upsert(
    {
      id: DEMO_IDS.location,
      country: 'Indonesia',
      region: 'Nusa Tenggara Barat',
      city: 'Mataram',
      address_line: null,
    },
    { onConflict: 'id' }
  )
  if (locErr) {
    printErrorWithCause('locations upsert', locErr)
    process.exit(1)
  }

  for (const orgId of [ORG_IDS.farmer, ORG_IDS.hotel] as const) {
    const { error } = await supabase
      .from('organizations')
      .update({
        location_id: DEMO_IDS.location,
        country: 'Indonesia',
        verification_status: 'verified',
      })
      .eq('id', orgId)
    if (error) {
      printErrorWithCause(`organizations location update ${orgId}`, error)
      process.exit(1)
    }
  }

  const { error: prodErr } = await supabase.from('products').upsert(
    [
      {
        id: DEMO_IDS.productChili,
        name: '[DEMO] Cabai merah segar',
        category: 'agriculture',
        description: 'Grade A — seed demo',
        unit: 'kg',
        is_raw_material: true,
        deleted_at: null,
      },
      {
        id: DEMO_IDS.productCoffee,
        name: '[DEMO] Kopi arabika sangrai',
        category: 'agriculture',
        description: 'Medium roast — seed demo',
        unit: 'kg',
        is_raw_material: false,
        deleted_at: null,
      },
    ],
    { onConflict: 'id' }
  )
  if (prodErr) {
    printErrorWithCause('products upsert', prodErr)
    process.exit(1)
  }

  const { error: srcErr } = await supabase.from('product_sources').upsert(
    {
      id: 'ffffffff-ffff-ffff-ffff-fffffffffff1',
      organization_id: ORG_IDS.farmer,
      product_id: DEMO_IDS.productChili,
      description: 'Lahan organik — demo',
      capacity_per_month: 1200,
      production_method_description: 'Panen manual, sortasi basah.',
      certifications: ['local-organic'],
      deleted_at: null,
    },
    { onConflict: 'id' }
  )
  if (srcErr) {
    printErrorWithCause('product_sources upsert', srcErr)
    process.exit(1)
  }

  const { error: supErr } = await supabase.from('supply_listings').upsert(
    {
      id: DEMO_IDS.supplyListing,
      organization_id: ORG_IDS.farmer,
      product_id: DEMO_IDS.productChili,
      quantity: 500,
      price_estimate: 45000,
      min_order_quantity: 50,
      lead_time_days: 7,
      export_capability: true,
      price_type: 'negotiable',
      certifications: ['ISO-like-demo'],
      available_from: new Date().toISOString().slice(0, 10),
      available_until: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      status: 'active',
      created_by: null,
      deleted_at: null,
    },
    { onConflict: 'id' }
  )
  if (supErr) {
    printErrorWithCause('supply_listings upsert', supErr)
    process.exit(1)
  }

  const { error: demErr } = await supabase.from('demand_listings').upsert(
    {
      id: DEMO_IDS.demandListing,
      organization_id: ORG_IDS.hotel,
      product_id: DEMO_IDS.productChili,
      required_quantity: 200,
      required_by: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      price_range_from: 40000,
      price_range_to: 55000,
      specifications: { grade: 'A', packaging: '10kg crates' },
      certifications_required: [],
      target_location: 'Mandalika',
      incoterms: 'FOB',
      is_open_for_bidding: true,
      status: 'active',
      created_by: null,
      deleted_at: null,
    },
    { onConflict: 'id' }
  )
  if (demErr) {
    printErrorWithCause('demand_listings upsert', demErr)
    process.exit(1)
  }

  const { error: matErr } = await supabase.from('matches').upsert(
    {
      id: DEMO_IDS.match,
      supply_listing_id: DEMO_IDS.supplyListing,
      demand_listing_id: DEMO_IDS.demandListing,
      match_score: 0.87,
      match_breakdown: {
        product: 0.95,
        capacity: 0.85,
        price: 0.82,
        location: 0.8,
        certifications: 0.9,
      },
      ai_reason:
        'Demo match: same product, quantity fits, price band overlap, NTB corridor.',
      status: 'suggested',
      deleted_at: null,
    },
    { onConflict: 'id' }
  )
  if (matErr) {
    printErrorWithCause('matches upsert', matErr)
    process.exit(1)
  }
}

async function seedProfiles() {
  for (const a of ACCOUNTS) {
    const userId = await getOrCreateAuthUser(a.email, TEST_PASSWORD)

    if (a.isPlatformSuperadmin && a.organizationId !== null) {
      console.error('Invalid config: superadmin must have null org')
      process.exit(1)
    }

    const { error } = await supabase.from('profiles').upsert(
      {
        id: userId,
        name: a.name,
        organization_id: a.organizationId,
        role: a.role,
        is_platform_superadmin: a.isPlatformSuperadmin,
        is_supplier: a.isSupplier,
        is_buyer: a.isBuyer,
        phone: null,
        deleted_at: null,
      },
      { onConflict: 'id' }
    )
    if (error) {
      printErrorWithCause(`profiles upsert ${a.email}`, error)
      process.exit(1)
    }
    console.log('OK', a.email, '→', userId.slice(0, 8) + '…')
  }
}

async function main() {
  await runConnectivityPreflight()
  console.log('Seeding test organizations…')
  await seedOrganizations()
  console.log('Seeding auth users + profiles…')
  await seedProfiles()
  console.log('Seeding marketplace demo (locations, products, listings, match)…')
  await seedMarketplaceDemo()
  console.log('\nDone. Login password for all test accounts:', TEST_PASSWORD)
  console.log('Emails:', ACCOUNTS.map((a) => a.email).join(', '))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
