import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/lib/rbac/session'

type OfferRequestStatus = 'accepted' | 'rejected'

function parseStatus(v: unknown): OfferRequestStatus | null {
  if (v === 'accepted' || v === 'rejected') return v
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (s === 'accepted') return 'accepted'
    if (s === 'rejected') return 'rejected'
  }
  return null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionContext()
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  if (!session.profile.is_platform_superadmin && !session.profile.is_supplier) {
    return NextResponse.json(
      { error: 'hanya pemasok yang dapat mengubah status permintaan penawaran' },
      { status: 403 }
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
  const status = parseStatus(payload.status)

  if (!status) {
    return NextResponse.json(
      { error: 'status harus salah satu dari: accepted, rejected' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  const offerId = (await params).id

  const { data: offer, error: offerErr } = await supabase
    .from('offer_requests')
    .select(
      `
      id,
      demand_listing_id,
      supply_listing_id,
      status,
      price_offer,
      quantity_offer,
      lead_time_days,
      message,
      demand_listings (
        id,
        is_open_for_bidding,
        status,
        deleted_at
      ),
      supply_listings (
        id,
        organization_id,
        status,
        deleted_at,
        price_estimate,
        quantity,
        lead_time_days
      )
    `
    )
    .eq('id', offerId)
    .maybeSingle()

  if (offerErr || !offer) {
    return NextResponse.json(
      { error: offerErr?.message ?? 'offer request tidak ditemukan' },
      { status: 404 }
    )
  }

  const supply =
    offer.supply_listings && Array.isArray(offer.supply_listings)
      ? offer.supply_listings[0]
      : offer.supply_listings
  const demand =
    offer.demand_listings && Array.isArray(offer.demand_listings)
      ? offer.demand_listings[0]
      : offer.demand_listings

  if (!supply || !demand) {
    return NextResponse.json(
      { error: 'data RFQ atau supply listing untuk offer ini tidak lengkap' },
      { status: 400 }
    )
  }

  if (
    !session.profile.is_platform_superadmin &&
    session.organization?.id !== supply.organization_id
  ) {
    return NextResponse.json(
      { error: 'Anda tidak berhak mengubah offer untuk listing ini' },
      { status: 403 }
    )
  }

  if (offer.status !== 'pending') {
    return NextResponse.json(
      { error: 'hanya offer dengan status pending yang dapat diubah' },
      { status: 400 }
    )
  }

  if (supply.deleted_at != null || supply.status !== 'active') {
    return NextResponse.json(
      { error: 'supply listing ini tidak lagi aktif' },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('offer_requests')
    .update({ status })
    .eq('id', offerId)

  if (error) {
    return NextResponse.json(
      { error: error.message ?? 'gagal mengubah status offer request' },
      { status: 400 }
    )
  }

  if (status === 'accepted') {
    const price =
      offer.price_offer != null ? offer.price_offer : supply.price_estimate ?? null
    const qty =
      offer.quantity_offer != null ? offer.quantity_offer : supply.quantity ?? null

    const { error: rfqErr } = await supabase.from('rfq_responses').insert({
      demand_listing_id: offer.demand_listing_id,
      supplier_organization_id: supply.organization_id,
      supply_listing_id: supply.id,
      price_offer: price,
      quantity_offer: qty,
      lead_time_days: offer.lead_time_days ?? supply.lead_time_days ?? null,
      message: offer.message ?? null,
      status: 'pending',
    })

    if (rfqErr) {
      return NextResponse.json(
        { error: rfqErr.message ?? 'gagal membuat RFQ response dari offer ini' },
        { status: 400 }
      )
    }
  }

  return NextResponse.json({ ok: true })
}

