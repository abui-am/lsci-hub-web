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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionContext()
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (!session.organization && !session.profile.is_platform_superadmin) {
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
    status,
  } = body as Record<string, unknown>

  const productId =
    typeof product_id === 'string' ? product_id : undefined
  const requiredQtyN = parseNumber(required_quantity)
  const priceFromN = parseNumber(price_range_from)
  const priceToN = parseNumber(price_range_to)
  const openBidding = parseBoolean(is_open_for_bidding)
  const certsRequired = normalizeStringArray(certifications_required)
  const specsObj = normalizeJsonObject(specifications)

  const st =
    status === 'draft' ||
    status === 'active' ||
    status === 'receiving_quotes' ||
    status === 'negotiating' ||
    status === 'finalized' ||
    status === 'closed'
      ? (status as DemandListingStatus)
      : undefined

  const requiredByStr =
    typeof required_by === 'string' ? required_by : undefined
  const targetLocationStr =
    typeof target_location === 'string' ? target_location : undefined
  const incotermsStr =
    typeof incoterms === 'string' ? incoterms : undefined

  if (!session.profile.is_platform_superadmin && !session.profile.is_buyer) {
    return NextResponse.json(
      { error: 'your account cannot update demand listings' },
      { status: 403 }
    )
  }

  const update: Record<string, unknown> = {}
  if (productId) update.product_id = productId
  if (requiredQtyN != null) update.required_quantity = requiredQtyN
  if (requiredByStr !== undefined) update.required_by = requiredByStr
  if (priceFromN != null) update.price_range_from = priceFromN
  if (priceToN != null) update.price_range_to = priceToN
  if (specsObj != null) update.specifications = specsObj
  if (certsRequired) update.certifications_required = certsRequired
  if (targetLocationStr !== undefined) update.target_location = targetLocationStr
  if (incotermsStr !== undefined) update.incoterms = incotermsStr
  if (openBidding != null) update.is_open_for_bidding = openBidding
  if (st) update.status = st

  const { error } = await supabase
    .from('demand_listings')
    .update(update)
    .eq('id', (await params).id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionContext()
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const canDelete =
    session.profile.is_platform_superadmin ||
    (session.profile.is_buyer && ['admin', 'manager'].includes(session.profile.role))
  if (!canDelete) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('demand_listings')
    .delete()
    .eq('id', (await params).id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

