import { NextRequest, NextResponse } from 'next/server'
import { createClient as createUserSupabaseClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/lib/rbac/session'

function parseNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.trim())
    if (Number.isFinite(n)) return n
  }
  return null
}

function parseInteger(v: unknown): number | null {
  const n = parseNumber(v)
  if (n == null) return null
  if (!Number.isInteger(n)) return null
  return n
}

function parseString(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s ? s : null
}

function looksLikeUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    v
  )
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
  const demandListingId = payload.demand_listing_id
  const manualSupplyListingId = parseString(payload.supply_listing_id)
  const priceOffer = parseNumber(payload.price_offer)
  const quantityOffer = parseNumber(payload.quantity_offer)
  const leadTimeDays = parseInteger(payload.lead_time_days)
  const message = parseString(payload.message)

  const supplierOrganizationId =
    session.profile.is_platform_superadmin
      ? (parseString(payload.supplier_organization_id) ??
          session.organization?.id ??
          null)
      : session.organization?.id ?? null

  if (!demandListingId || typeof demandListingId !== 'string') {
    return NextResponse.json({ error: 'demand_listing_id is required' }, { status: 400 })
  }
  if (!looksLikeUuid(demandListingId)) {
    return NextResponse.json({ error: 'invalid demand_listing_id' }, { status: 400 })
  }

  if (priceOffer == null || priceOffer <= 0) {
    return NextResponse.json({ error: 'price_offer must be > 0' }, { status: 400 })
  }

  if (quantityOffer != null && quantityOffer <= 0) {
    return NextResponse.json({ error: 'quantity_offer must be > 0' }, { status: 400 })
  }

  if (leadTimeDays != null && leadTimeDays < 0) {
    return NextResponse.json({ error: 'lead_time_days must be >= 0' }, { status: 400 })
  }

  if (!supplierOrganizationId || !looksLikeUuid(supplierOrganizationId)) {
    return NextResponse.json(
      { error: 'supplier organization is required' },
      { status: 400 }
    )
  }

  const supabase = await createUserSupabaseClient()

  const { data: demand, error: demandErr } = await supabase
    .from('demand_listings')
    .select('id, product_id, required_quantity, is_open_for_bidding, status')
    .eq('id', demandListingId)
    .is('deleted_at', null)
    .maybeSingle()

  if (demandErr || !demand) {
    return NextResponse.json(
      { error: demandErr?.message ?? 'demand listing not found' },
      { status: 400 }
    )
  }

  if (
    !demand.is_open_for_bidding ||
    (demand.status !== 'active' && demand.status !== 'receiving_quotes')
  ) {
    return NextResponse.json(
      { error: 'demand listing is not open for bidding' },
      { status: 400 }
    )
  }

  if (
    quantityOffer != null &&
    demand.required_quantity != null &&
    quantityOffer > Number(demand.required_quantity)
  ) {
    return NextResponse.json(
      { error: `quantity_offer cannot exceed demand quantity (${demand.required_quantity})` },
      { status: 400 }
    )
  }

  const demandRequiredQty =
    demand.required_quantity != null ? Number(demand.required_quantity) : null
  const effectiveQuantityOffer =
    quantityOffer != null ? quantityOffer : demandRequiredQty

  let chosenSupplyListingId: string | null = null

  if (manualSupplyListingId) {
    if (!looksLikeUuid(manualSupplyListingId)) {
      return NextResponse.json(
        { error: 'invalid supply_listing_id' },
        { status: 400 }
      )
    }

    const check = await supabase
      .from('supply_listings')
      .select('id, product_id')
      .eq('id', manualSupplyListingId)
      .eq('organization_id', supplierOrganizationId)
      .is('deleted_at', null)
      .maybeSingle()

    if (check.error || !check.data) {
      return NextResponse.json(
        { error: 'selected supply listing not found for your organization' },
        { status: 400 }
      )
    }

    if (check.data.product_id !== demand.product_id) {
      return NextResponse.json(
        { error: 'selected supply listing product does not match RFQ product' },
        { status: 400 }
      )
    }

    chosenSupplyListingId = check.data.id
  } else {
    const { data: autoListings, error: autoErr } = await supabase
      .from('supply_listings')
      .select('id')
      .eq('organization_id', supplierOrganizationId)
      .eq('product_id', demand.product_id)
      .is('deleted_at', null)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)

    if (autoErr) {
      return NextResponse.json({ error: autoErr.message }, { status: 400 })
    }
    chosenSupplyListingId = autoListings?.[0]?.id ?? null
  }

  if (!chosenSupplyListingId) {
    return NextResponse.json(
      {
        error:
          'No active supply listing found for this product. Create one first or select another listing.',
      },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('rfq_responses')
    .insert({
      demand_listing_id: demandListingId,
      supply_listing_id: chosenSupplyListingId,
      supplier_organization_id: supplierOrganizationId,
      price_offer: priceOffer,
      quantity_offer: effectiveQuantityOffer ?? null,
      lead_time_days: leadTimeDays ?? null,
      message: message ?? null,
      status: 'pending',
    })
    .select('id, demand_listing_id, supplier_organization_id, price_offer, quantity_offer, lead_time_days, message, status, created_at')
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'failed to create rfq response' },
      { status: 400 }
    )
  }

  return NextResponse.json({ ok: true, rfqResponse: data })
}

