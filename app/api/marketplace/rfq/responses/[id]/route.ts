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

function parseOptionalNumber(v: unknown): number | null | undefined {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  const n = Number(v)
  if (!Number.isFinite(n)) return undefined
  return n
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionContext()
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
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

  const payload = body as Record<string, unknown>
  const hasStatus = payload.status !== undefined
  const hasRevisionPayload =
    payload.price_offer !== undefined ||
    payload.quantity_offer !== undefined ||
    payload.lead_time_days !== undefined ||
    payload.message !== undefined

  const supabase = await createUserSupabaseClient()

  if (hasStatus) {
    if (!session.profile.is_platform_superadmin && !session.profile.is_buyer) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const status = parseStatus(payload.status)
    if (!status) {
      return NextResponse.json(
        { error: 'status must be accepted or rejected' },
        { status: 400 }
      )
    }

    // Ensure acceptance always carries an effective quantity for downstream mutations.
    let effectiveQuantityOffer: number | null = null
    let resolvedSupplyListingId: string | null = null
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

  if (!hasRevisionPayload) {
    return NextResponse.json(
      { error: 'payload harus berisi status atau field revisi' },
      { status: 400 }
    )
  }

  if (!session.profile.is_platform_superadmin && !session.profile.is_supplier) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { data: rfqOwned, error: rfqOwnedErr } = await supabase
    .from('rfq_responses')
    .select('id, status, supplier_organization_id')
    .eq('id', id)
    .single()

  if (rfqOwnedErr || !rfqOwned) {
    return NextResponse.json(
      { error: rfqOwnedErr?.message ?? 'rfq response not found' },
      { status: 404 }
    )
  }

  if (
    !session.profile.is_platform_superadmin &&
    session.organization?.id !== rfqOwned.supplier_organization_id
  ) {
    return NextResponse.json(
      { error: 'Anda tidak berhak merevisi bidding ini' },
      { status: 403 }
    )
  }

  if (rfqOwned.status !== 'pending') {
    return NextResponse.json(
      { error: 'Hanya bidding status pending yang bisa direvisi' },
      { status: 400 }
    )
  }

  const next: Record<string, unknown> = {}

  if (payload.price_offer !== undefined) {
    const price = parseOptionalNumber(payload.price_offer)
    if (price === undefined || price == null || price <= 0) {
      return NextResponse.json(
        { error: 'price_offer harus berupa angka lebih dari 0' },
        { status: 400 }
      )
    }
    next.price_offer = price
  }

  if (payload.quantity_offer !== undefined) {
    const quantity = parseOptionalNumber(payload.quantity_offer)
    if (quantity === undefined) {
      return NextResponse.json(
        { error: 'quantity_offer harus berupa angka atau null' },
        { status: 400 }
      )
    }
    if (quantity != null && quantity <= 0) {
      return NextResponse.json(
        { error: 'quantity_offer harus lebih dari 0 jika diisi' },
        { status: 400 }
      )
    }
    next.quantity_offer = quantity
  }

  if (payload.lead_time_days !== undefined) {
    const leadTime = parseOptionalNumber(payload.lead_time_days)
    if (leadTime === undefined) {
      return NextResponse.json(
        { error: 'lead_time_days harus berupa angka atau null' },
        { status: 400 }
      )
    }
    if (leadTime != null && (!Number.isInteger(leadTime) || leadTime < 0)) {
      return NextResponse.json(
        { error: 'lead_time_days harus bilangan bulat >= 0 jika diisi' },
        { status: 400 }
      )
    }
    next.lead_time_days = leadTime
  }

  if (payload.message !== undefined) {
    const message = typeof payload.message === 'string' ? payload.message.trim() : ''
    next.message = message.length > 0 ? message : null
  }

  if (Object.keys(next).length === 0) {
    return NextResponse.json(
      { error: 'tidak ada perubahan yang bisa disimpan' },
      { status: 400 }
    )
  }

  const { data: revised, error: reviseErr } = await supabase
    .from('rfq_responses')
    .update(next)
    .eq('id', id)
    .select('id, price_offer, quantity_offer, lead_time_days, message, updated_at')
    .single()

  if (reviseErr || !revised) {
    return NextResponse.json(
      { error: reviseErr?.message ?? 'gagal merevisi bidding' },
      { status: 400 }
    )
  }

  return NextResponse.json({ ok: true, rfqResponse: revised })
}

