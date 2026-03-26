import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/lib/rbac/session'

type DemandListingStatus =
  | 'draft'
  | 'active'
  | 'receiving_quotes'
  | 'negotiating'
  | 'finalized'
  | 'closed'

function parseNumber(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function parseBoolean(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    if (v === 'true') return true
    if (v === 'false') return false
  }
  return null
}

function normalizeStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean)
  if (typeof v === 'string')
    return v
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
  return []
}

function normalizeJsonObject(v: unknown): Record<string, unknown> | null {
  if (v == null) return null
  if (typeof v === 'object' && !Array.isArray(v)) {
    return v as Record<string, unknown>
  }
  if (typeof v === 'string' && v.trim() !== '') {
    try {
      const parsed = JSON.parse(v)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return null
    }
  }
  return null
}

export async function POST(request: NextRequest) {
  const session = await getSessionContext()
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (!session.organization) {
    return NextResponse.json({ error: 'no organization' }, { status: 400 })
  }

  const supabase = await createClient()

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ error: 'invalid content-type' }, { status: 400 })
  }

  const body: unknown = await request.json()
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const {
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
    image_url,
    status,
  } = body as Record<string, unknown>

  const productId = typeof product_id === 'string' ? product_id : null
  const requiredQtyN = parseNumber(required_quantity)
  const priceFromN = parseNumber(price_range_from)
  const priceToN = parseNumber(price_range_to)
  const openBidding = parseBoolean(is_open_for_bidding)
  const certsRequired = normalizeStringArray(certifications_required)
  const specsObj = normalizeJsonObject(specifications) ?? {}

  const st =
    status === 'draft' ||
    status === 'active' ||
    status === 'receiving_quotes' ||
    status === 'negotiating' ||
    status === 'finalized' ||
    status === 'closed'
      ? (status as DemandListingStatus)
      : 'draft'

  const requiredByStr = typeof required_by === 'string' ? required_by : null
  const targetLocationStr =
    typeof target_location === 'string' ? target_location : null
  const incotermsStr = typeof incoterms === 'string' ? incoterms : null
  const imageUrl =
    typeof image_url === 'string' && image_url.trim() !== '' ? image_url.trim() : null

  if (!productId) return NextResponse.json({ error: 'product_id is required' }, { status: 400 })
  if (requiredQtyN == null) return NextResponse.json({ error: 'required_quantity is required' }, { status: 400 })
  if (openBidding == null) return NextResponse.json({ error: 'is_open_for_bidding is required' }, { status: 400 })

  if (!session.profile.is_platform_superadmin && !session.profile.is_buyer) {
    return NextResponse.json(
      { error: 'your account cannot create demand listings' },
      { status: 403 }
    )
  }

  const { data, error } = await supabase
    .from('demand_listings')
    .insert({
      organization_id: session.organization.id,
      product_id: productId,
      required_quantity: requiredQtyN,
      required_by: requiredByStr,
      price_range_from: priceFromN,
      price_range_to: priceToN,
      specifications: specsObj,
      certifications_required: certsRequired,
      target_location: targetLocationStr,
      incoterms: incotermsStr,
      image_url: imageUrl,
      is_open_for_bidding: openBidding,
      status: st,
    })
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'failed to create demand listing' }, { status: 400 })
  }

  return NextResponse.json({ ok: true, id: data.id })
}

