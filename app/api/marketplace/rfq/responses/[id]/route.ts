import { NextRequest, NextResponse } from 'next/server'
import { createClient as createUserSupabaseClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/lib/rbac/session'

type RfqResponseStatus = 'accepted' | 'rejected'

function parseStatus(v: unknown): RfqResponseStatus | null {
  if (v === 'accepted' || v === 'rejected') return v
  return null
}

function looksLikeUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    v
  )
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionContext()
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  if (!session.profile.is_platform_superadmin && !session.profile.is_buyer) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { id } = await params
  if (!looksLikeUuid(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ error: 'invalid content-type' }, { status: 400 })
  }

  const body: unknown = await request.json()
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const status = parseStatus((body as Record<string, unknown>).status)
  if (!status) {
    return NextResponse.json(
      { error: 'status must be accepted or rejected' },
      { status: 400 }
    )
  }

  const supabase = await createUserSupabaseClient()

  // Ensure acceptance always carries an effective quantity for downstream mutations.
  let effectiveQuantityOffer: number | null = null
  let resolvedSupplyListingId: string | null = null
  if (status === 'accepted') {
    const { data: rfq, error: rfqErr } = await supabase
      .from('rfq_responses')
      .select(
        `
        id,
        supply_listing_id,
        supplier_organization_id,
        quantity_offer,
        demand_listings (
          id,
          product_id,
          required_quantity
        )
      `
      )
      .eq('id', id)
      .single()

    if (rfqErr || !rfq) {
      return NextResponse.json(
        { error: rfqErr?.message ?? 'rfq response not found' },
        { status: 400 }
      )
    }

    const demand = Array.isArray(rfq.demand_listings)
      ? rfq.demand_listings[0]
      : rfq.demand_listings
    const requiredQty =
      demand && typeof demand === 'object' && 'required_quantity' in demand
        ? Number((demand as { required_quantity: unknown }).required_quantity)
        : null
    const currentQty =
      rfq.quantity_offer != null ? Number(rfq.quantity_offer) : null

    effectiveQuantityOffer =
      currentQty != null && Number.isFinite(currentQty) && currentQty > 0
        ? currentQty
        : requiredQty != null && Number.isFinite(requiredQty) && requiredQty > 0
          ? requiredQty
          : null

    // Ensure accepted RFQ is linked to a concrete supplier listing so
    // downstream inventory mutation always applies to supplier stock.
    const currentSupplyListingId =
      typeof rfq.supply_listing_id === 'string' ? rfq.supply_listing_id : null
    if (currentSupplyListingId) {
      resolvedSupplyListingId = currentSupplyListingId
    } else {
      const demandProductId =
        demand && typeof demand === 'object' && 'product_id' in demand
          ? String((demand as { product_id: unknown }).product_id ?? '')
          : ''
      const supplierOrgId =
        typeof rfq.supplier_organization_id === 'string'
          ? rfq.supplier_organization_id
          : ''

      if (demandProductId && supplierOrgId) {
        const { data: supplyRows, error: supplyErr } = await supabase
          .from('supply_listings')
          .select('id')
          .eq('organization_id', supplierOrgId)
          .eq('product_id', demandProductId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)

        if (supplyErr) {
          return NextResponse.json({ error: supplyErr.message }, { status: 400 })
        }
        resolvedSupplyListingId = supplyRows?.[0]?.id ?? null
      }
    }

    if (!resolvedSupplyListingId) {
      return NextResponse.json(
        {
          error:
            'Cannot accept this RFQ: no linked supply listing found for supplier. Please ask supplier to resend quote with a supply listing.',
        },
        { status: 400 }
      )
    }
  }

  const { data, error } = await supabase
    .from('rfq_responses')
    .update({
      status,
      ...(status === 'accepted' && effectiveQuantityOffer != null
        ? { quantity_offer: effectiveQuantityOffer }
        : {}),
      ...(status === 'accepted' && resolvedSupplyListingId
        ? { supply_listing_id: resolvedSupplyListingId }
        : {}),
    })
    .eq('id', id)
    .select('id, status, quantity_offer, updated_at')
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'failed to update response status' },
      { status: 400 }
    )
  }

  return NextResponse.json({ ok: true, rfqResponse: data })
}

