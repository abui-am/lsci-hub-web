import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

export async function POST(request: NextRequest) {
  const session = await getSessionContext()
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  if (!session.profile.is_platform_superadmin && !session.profile.is_buyer) {
    return NextResponse.json(
      { error: 'hanya akun buyer yang dapat membuat permintaan penawaran' },
      { status: 403 }
    )
  }

  const buyerOrgId = session.organization?.id ?? null
  if (!buyerOrgId || !looksLikeUuid(buyerOrgId)) {
    return NextResponse.json(
      { error: 'akun Anda belum terhubung ke organisasi pembeli' },
      { status: 400 }
    )
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
  const priceOffer = parseNumber(payload.price_offer)
  const quantityOffer = parseNumber(payload.quantity_offer)
  const leadTimeDays = parseInteger(payload.lead_time_days)
  const message = parseString(payload.message)

  if (!demandListingId || !looksLikeUuid(demandListingId)) {
    return NextResponse.json({ error: 'demand_listing_id tidak valid' }, { status: 400 })
  }

  if (!supplyListingId || !looksLikeUuid(supplyListingId)) {
    return NextResponse.json({ error: 'supply_listing_id tidak valid' }, { status: 400 })
  }

  if (priceOffer == null || priceOffer <= 0) {
    return NextResponse.json(
      { error: 'price_offer harus lebih besar dari 0' },
      { status: 400 }
    )
  }

  if (quantityOffer == null || quantityOffer <= 0) {
    return NextResponse.json(
      { error: 'quantity_offer harus lebih besar dari 0' },
      { status: 400 }
    )
  }

  if (leadTimeDays != null && leadTimeDays < 0) {
    return NextResponse.json(
      { error: 'lead_time_days harus lebih besar atau sama dengan 0' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  const { data: demand, error: demandErr } = await supabase
    .from('demand_listings')
    .select('id, product_id, organization_id, is_open_for_bidding, status, deleted_at')
    .eq('id', demandListingId)
    .maybeSingle()

  if (demandErr || !demand) {
    return NextResponse.json(
      { error: demandErr?.message ?? 'demand listing tidak ditemukan' },
      { status: 400 }
    )
  }

  if (
    demand.deleted_at != null ||
    !demand.is_open_for_bidding ||
    (demand.status !== 'active' && demand.status !== 'receiving_quotes')
  ) {
    return NextResponse.json(
      { error: 'demand listing ini tidak aktif untuk penawaran' },
      { status: 400 }
    )
  }

  if (demand.organization_id !== buyerOrgId) {
    return NextResponse.json(
      { error: 'Anda hanya dapat membuat offer untuk RFQ milik organisasi Anda' },
      { status: 403 }
    )
  }

  const { data: listing, error: listingErr } = await supabase
    .from('supply_listings')
    .select('id, product_id, organization_id, status, deleted_at')
    .eq('id', supplyListingId)
    .maybeSingle()

  if (listingErr || !listing) {
    return NextResponse.json(
      { error: listingErr?.message ?? 'supply listing tidak ditemukan' },
      { status: 400 }
    )
  }

  if (listing.deleted_at != null || listing.status !== 'active') {
    return NextResponse.json(
      { error: 'supply listing ini tidak aktif untuk penawaran' },
      { status: 400 }
    )
  }

  if (listing.product_id !== demand.product_id) {
    return NextResponse.json(
      { error: 'produk supply listing tidak cocok dengan produk RFQ' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('offer_requests')
    .insert({
      demand_listing_id: demand.id,
      supply_listing_id: listing.id,
      buyer_organization_id: buyerOrgId,
      created_by_profile_id: session.profile.id,
      price_offer: priceOffer,
      quantity_offer: quantityOffer,
      lead_time_days: leadTimeDays ?? null,
      message: message ?? null,
      status: 'pending',
    })
    .select('id, demand_listing_id, supply_listing_id, buyer_organization_id, price_offer, quantity_offer, lead_time_days, message, status, created_at')
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'gagal membuat permintaan penawaran' },
      { status: 400 }
    )
  }

  return NextResponse.json({ ok: true, offerRequest: data })
}

