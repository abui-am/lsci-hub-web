import { NextRequest, NextResponse } from 'next/server'
import { createClient as createUserSupabaseClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/lib/rbac/session'

function looksLikeUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    v
  )
}

function parseString(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s ? s : null
}

export async function POST(request: NextRequest) {
  const session = await getSessionContext()
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  if (!session.profile.is_platform_superadmin && !session.profile.is_supplier) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ error: 'invalid content-type' }, { status: 400 })
  }

  const body: unknown = await request.json()
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const payload = body as Record<string, unknown>
  const demandListingId = parseString(payload.demand_listing_id)
  const supplyListingId = parseString(payload.supply_listing_id)

  if (!demandListingId) {
    return NextResponse.json(
      { error: 'demand_listing_id is required' },
      { status: 400 }
    )
  }
  if (!looksLikeUuid(demandListingId)) {
    return NextResponse.json(
      { error: 'invalid demand_listing_id' },
      { status: 400 }
    )
  }

  const supabase = await createUserSupabaseClient()

  // Fetch demand to validate "open" and get product_id for auto-pick.
  const { data: demand, error: demandErr } = await supabase
    .from('demand_listings')
    .select(
      'id, product_id, is_open_for_bidding, status, deleted_at'
    )
    .eq('id', demandListingId)
    .is('deleted_at', null)
    .maybeSingle()

  if (demandErr || !demand) {
    return NextResponse.json(
      { error: demandErr?.message ?? 'demand listing not found' },
      { status: 400 }
    )
  }

  if (!demand.is_open_for_bidding) {
    return NextResponse.json(
      { error: 'demand listing is not open for bidding' },
      { status: 400 }
    )
  }

  // Validate status server-side for better UX; RLS also enforces this via policy.
  if (
    demand.status !== 'active' &&
    demand.status !== 'receiving_quotes'
  ) {
    return NextResponse.json(
      { error: 'demand listing is not in an open bidding status' },
      { status: 400 }
    )
  }

  let chosenSupplyListingId: string | null = null

  if (supplyListingId) {
    if (!looksLikeUuid(supplyListingId)) {
      return NextResponse.json(
        { error: 'invalid supply_listing_id' },
        { status: 400 }
      )
    }

    // Ensure the supply listing belongs to supplier org (unless superadmin).
    if (!session.profile.is_platform_superadmin) {
      const { data: supplyCheck, error: supplyCheckErr } = await supabase
        .from('supply_listings')
        .select('id')
        .eq('id', supplyListingId)
        .eq('organization_id', session.organization?.id)
        .is('deleted_at', null)
        .maybeSingle()

      if (supplyCheckErr || !supplyCheck) {
        return NextResponse.json(
          { error: 'supply_listing not found for your organization' },
          { status: 400 }
        )
      }
    }

    chosenSupplyListingId = supplyListingId
  } else {
    if (!session.organization?.id) {
      return NextResponse.json(
        { error: 'supplier organization is required' },
        { status: 400 }
      )
    }

    const { data: supplyRows, error: supplyErr } = await supabase
      .from('supply_listings')
      .select('id, product_id')
      .eq('organization_id', session.organization.id)
      .eq('product_id', demand.product_id)
      .is('deleted_at', null)
      .eq('status', 'active')
      .limit(1)

    if (supplyErr) {
      return NextResponse.json(
        { error: supplyErr.message },
        { status: 400 }
      )
    }

    chosenSupplyListingId = supplyRows?.[0]?.id ?? null
  }

  if (!chosenSupplyListingId) {
    return NextResponse.json(
      {
        error:
          'No matching active supply listing found for this RFQ. Create a supply listing first or pass supply_listing_id.',
      },
      { status: 400 }
    )
  }

  const { data: match, error: insertErr } = await supabase
    .from('matches')
    .upsert(
      {
        supply_listing_id: chosenSupplyListingId,
        demand_listing_id: demandListingId,
        status: 'accepted',
        // match_score + match_breakdown have defaults / may be set by AI jobs later.
      },
      { onConflict: 'supply_listing_id,demand_listing_id' }
    )
    .select('id, supply_listing_id, demand_listing_id, status, match_score, match_breakdown, ai_reason, created_at')
    .maybeSingle()

  if (insertErr || !match) {
    return NextResponse.json(
      { error: insertErr?.message ?? 'failed to create match' },
      { status: 400 }
    )
  }

  return NextResponse.json({ ok: true, match })
}

