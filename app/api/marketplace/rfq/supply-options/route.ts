import { NextRequest, NextResponse } from 'next/server'
import { createClient as createUserSupabaseClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/lib/rbac/session'

function looksLikeUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    v
  )
}

export async function GET(request: NextRequest) {
  const session = await getSessionContext()
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (!session.profile.is_platform_superadmin && !session.profile.is_supplier) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const demandListingId =
    request.nextUrl.searchParams.get('demand_listing_id')?.trim() ?? ''
  if (!demandListingId || !looksLikeUuid(demandListingId)) {
    return NextResponse.json({ error: 'invalid demand_listing_id' }, { status: 400 })
  }
  if (!session.organization?.id) {
    return NextResponse.json({ options: [] })
  }

  const supabase = await createUserSupabaseClient()

  const { data: demand, error: demandErr } = await supabase
    .from('demand_listings')
    .select('id, product_id')
    .eq('id', demandListingId)
    .is('deleted_at', null)
    .maybeSingle()

  if (demandErr || !demand) {
    return NextResponse.json(
      { error: demandErr?.message ?? 'demand listing not found' },
      { status: 400 }
    )
  }

  const { data: listings, error } = await supabase
    .from('supply_listings')
    .select(
      `
      id,
      quantity,
      price_estimate,
      min_order_quantity,
      lead_time_days,
      price_type,
      supplier_location,
      expiration_date,
      available_from,
      available_until,
      status,
      created_at,
      products(name, unit)
    `
    )
    .eq('organization_id', session.organization.id)
    .eq('product_id', demand.product_id)
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, options: listings ?? [] })
}

