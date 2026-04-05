import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/lib/rbac/session'

type TradeChatPayload =
  | {
      type: 'rfq'
      demand_listing_id: string
      supplier_organization_id: string
      buyer_organization_id?: string | null
    }
  | {
      type: 'offer'
      offer_request_id: string
    }

function looksLikeUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

function parsePayload(v: unknown): TradeChatPayload | null {
  if (!v || typeof v !== 'object') return null
  const payload = v as Record<string, unknown>
  if (payload.type === 'rfq') {
    if (
      typeof payload.demand_listing_id !== 'string' ||
      typeof payload.supplier_organization_id !== 'string'
    ) {
      return null
    }
    return {
      type: 'rfq',
      demand_listing_id: payload.demand_listing_id,
      supplier_organization_id: payload.supplier_organization_id,
      buyer_organization_id:
        typeof payload.buyer_organization_id === 'string'
          ? payload.buyer_organization_id
          : null,
    }
  }
  if (payload.type === 'offer') {
    if (typeof payload.offer_request_id !== 'string') return null
    return {
      type: 'offer',
      offer_request_id: payload.offer_request_id,
    }
  }
  return null
}

type ConversationRow = {
  id: string
  demand_listing_id: string | null
  offer_request_id: string | null
  buyer_organization_id: string
  supplier_organization_id: string
  created_at: string
  updated_at: string
}

async function findOrCreateRfqConversation(args: {
  supabase: Awaited<ReturnType<typeof createClient>>
  demandListingId: string
  buyerOrganizationId: string
  supplierOrganizationId: string
}): Promise<{ conversation: ConversationRow | null; error: string | null }> {
  const { supabase, demandListingId, buyerOrganizationId, supplierOrganizationId } = args

  const { data: existing, error: existingErr } = await supabase
    .from('trade_conversations')
    .select(
      'id, demand_listing_id, offer_request_id, buyer_organization_id, supplier_organization_id, created_at, updated_at'
    )
    .eq('demand_listing_id', demandListingId)
    .eq('supplier_organization_id', supplierOrganizationId)
    .maybeSingle()

  if (existingErr) {
    return { conversation: null, error: existingErr.message }
  }
  if (existing) {
    return { conversation: existing as ConversationRow, error: null }
  }

  const { data: created, error: createErr } = await supabase
    .from('trade_conversations')
    .insert({
      demand_listing_id: demandListingId,
      offer_request_id: null,
      buyer_organization_id: buyerOrganizationId,
      supplier_organization_id: supplierOrganizationId,
    })
    .select(
      'id, demand_listing_id, offer_request_id, buyer_organization_id, supplier_organization_id, created_at, updated_at'
    )
    .single()

  if (!createErr && created) {
    return { conversation: created as ConversationRow, error: null }
  }

  const { data: afterConflict, error: afterConflictErr } = await supabase
    .from('trade_conversations')
    .select(
      'id, demand_listing_id, offer_request_id, buyer_organization_id, supplier_organization_id, created_at, updated_at'
    )
    .eq('demand_listing_id', demandListingId)
    .eq('supplier_organization_id', supplierOrganizationId)
    .maybeSingle()

  if (afterConflictErr) {
    return {
      conversation: null,
      error: createErr?.message ?? afterConflictErr.message,
    }
  }
  if (afterConflict) {
    return { conversation: afterConflict as ConversationRow, error: null }
  }

  return {
    conversation: null,
    error: createErr?.message ?? 'gagal membuat percakapan',
  }
}

async function findOrCreateOfferConversation(args: {
  supabase: Awaited<ReturnType<typeof createClient>>
  offerRequestId: string
  demandListingId: string
  buyerOrganizationId: string
  supplierOrganizationId: string
}): Promise<{ conversation: ConversationRow | null; error: string | null }> {
  const {
    supabase,
    offerRequestId,
    demandListingId,
    buyerOrganizationId,
    supplierOrganizationId,
  } = args

  const { data: existing, error: existingErr } = await supabase
    .from('trade_conversations')
    .select(
      'id, demand_listing_id, offer_request_id, buyer_organization_id, supplier_organization_id, created_at, updated_at'
    )
    .eq('offer_request_id', offerRequestId)
    .maybeSingle()

  if (existingErr) {
    return { conversation: null, error: existingErr.message }
  }
  if (existing) {
    return { conversation: existing as ConversationRow, error: null }
  }

  const { data: created, error: createErr } = await supabase
    .from('trade_conversations')
    .insert({
      offer_request_id: offerRequestId,
      demand_listing_id: demandListingId,
      buyer_organization_id: buyerOrganizationId,
      supplier_organization_id: supplierOrganizationId,
    })
    .select(
      'id, demand_listing_id, offer_request_id, buyer_organization_id, supplier_organization_id, created_at, updated_at'
    )
    .single()

  if (!createErr && created) {
    return { conversation: created as ConversationRow, error: null }
  }

  const { data: afterConflict, error: afterConflictErr } = await supabase
    .from('trade_conversations')
    .select(
      'id, demand_listing_id, offer_request_id, buyer_organization_id, supplier_organization_id, created_at, updated_at'
    )
    .eq('offer_request_id', offerRequestId)
    .maybeSingle()

  if (afterConflictErr) {
    return {
      conversation: null,
      error: createErr?.message ?? afterConflictErr.message,
    }
  }
  if (afterConflict) {
    return { conversation: afterConflict as ConversationRow, error: null }
  }

  return {
    conversation: null,
    error: createErr?.message ?? 'gagal membuat percakapan',
  }
}

export async function POST(request: NextRequest) {
  const session = await getSessionContext()
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  if (
    !session.profile.is_platform_superadmin &&
    !session.profile.is_supplier &&
    !session.profile.is_buyer
  ) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const requesterOrgId = session.organization?.id ?? null
  if (!session.profile.is_platform_superadmin && !requesterOrgId) {
    return NextResponse.json(
      { error: 'akun Anda belum terhubung ke organisasi' },
      { status: 400 }
    )
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ error: 'invalid content-type' }, { status: 400 })
  }

  const payload = parsePayload(await request.json().catch(() => null))
  if (!payload) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const supabase = await createClient()

  if (payload.type === 'rfq') {
    if (
      !looksLikeUuid(payload.demand_listing_id) ||
      !looksLikeUuid(payload.supplier_organization_id)
    ) {
      return NextResponse.json(
        { error: 'demand_listing_id / supplier_organization_id tidak valid' },
        { status: 400 }
      )
    }

    let buyerOrganizationId =
      payload.buyer_organization_id && looksLikeUuid(payload.buyer_organization_id)
        ? payload.buyer_organization_id
        : null

    if (!buyerOrganizationId) {
      const { data: demand, error: demandErr } = await supabase
        .from('demand_listings')
        .select('id, organization_id, deleted_at')
        .eq('id', payload.demand_listing_id)
        .maybeSingle()

      if (demandErr || !demand || demand.deleted_at != null) {
        return NextResponse.json(
          { error: demandErr?.message ?? 'demand listing tidak ditemukan' },
          { status: 404 }
        )
      }

      buyerOrganizationId = demand.organization_id as string
    }
    if (!buyerOrganizationId) {
      return NextResponse.json(
        { error: 'buyer organization tidak ditemukan' },
        { status: 400 }
      )
    }

    const supplierOrganizationId = payload.supplier_organization_id
    if (buyerOrganizationId === supplierOrganizationId) {
      return NextResponse.json(
        { error: 'buyer dan supplier organisasi tidak boleh sama' },
        { status: 400 }
      )
    }

    const isParticipant =
      requesterOrgId === buyerOrganizationId || requesterOrgId === supplierOrganizationId
    if (!session.profile.is_platform_superadmin && !isParticipant) {
      return NextResponse.json(
        { error: 'Anda bukan pihak pada percakapan ini' },
        { status: 403 }
      )
    }

    const { conversation, error } = await findOrCreateRfqConversation({
      supabase,
      demandListingId: payload.demand_listing_id,
      buyerOrganizationId,
      supplierOrganizationId,
    })

    if (error || !conversation) {
      return NextResponse.json(
        { error: error ?? 'gagal membuat percakapan' },
        { status: 400 }
      )
    }

    return NextResponse.json({ ok: true, conversation })
  }

  if (!looksLikeUuid(payload.offer_request_id)) {
    return NextResponse.json({ error: 'offer_request_id tidak valid' }, { status: 400 })
  }

  const { data: offer, error: offerErr } = await supabase
    .from('offer_requests')
    .select(
      `
      id,
      demand_listing_id,
      buyer_organization_id,
      supply_listings (
        organization_id
      )
    `
    )
    .eq('id', payload.offer_request_id)
    .maybeSingle()

  if (offerErr || !offer) {
    return NextResponse.json(
      { error: offerErr?.message ?? 'offer request tidak ditemukan' },
      { status: 404 }
    )
  }

  const supplyListing =
    offer.supply_listings && Array.isArray(offer.supply_listings)
      ? offer.supply_listings[0]
      : offer.supply_listings

  const supplierOrganizationId = supplyListing?.organization_id as string | undefined
  if (!supplierOrganizationId) {
    return NextResponse.json(
      { error: 'offer request tidak memiliki supplier organization yang valid' },
      { status: 400 }
    )
  }

  const buyerOrganizationId = offer.buyer_organization_id as string
  const isParticipant =
    requesterOrgId === buyerOrganizationId || requesterOrgId === supplierOrganizationId
  if (!session.profile.is_platform_superadmin && !isParticipant) {
    return NextResponse.json(
      { error: 'Anda bukan pihak pada percakapan ini' },
      { status: 403 }
    )
  }

  const demandListingId = offer.demand_listing_id as string
  const { conversation, error } = await findOrCreateOfferConversation({
    supabase,
    offerRequestId: payload.offer_request_id,
    demandListingId,
    buyerOrganizationId,
    supplierOrganizationId,
  })

  if (error || !conversation) {
    return NextResponse.json(
      { error: error ?? 'gagal membuat percakapan' },
      { status: 400 }
    )
  }

  return NextResponse.json({ ok: true, conversation })
}
