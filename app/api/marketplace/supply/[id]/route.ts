import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/lib/rbac/session'

type PriceType = 'fixed' | 'negotiable'
type ListingStatus = 'active' | 'matched' | 'closed'

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionContext()
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
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
    quantity,
    price_estimate,
    min_order_quantity,
    lead_time_days,
    export_capability,
    price_type,
    certifications,
    available_from,
    available_until,
    image_url,
    supplier_location,
    expiration_date,
    status,
  } = body as Record<string, unknown>

  const productId =
    typeof product_id === 'string' ? product_id : undefined
  const quantityN = parseNumber(quantity)
  const priceEstimateN = parseNumber(price_estimate)
  const minOrderQtyN = parseNumber(min_order_quantity)
  const leadTimeDaysN = parseNumber(lead_time_days)
  const exportCap = parseBoolean(export_capability)
  const certs = normalizeStringArray(certifications)

  if (!session.profile.is_platform_superadmin && !session.profile.is_supplier) {
    return NextResponse.json(
      { error: 'your account cannot update supply listings' },
      { status: 403 }
    )
  }

  const pt =
    price_type === 'fixed' || price_type === 'negotiable'
      ? price_type
      : undefined
  const st =
    status === 'active' || status === 'matched' || status === 'closed'
      ? status
      : undefined

  const update: Record<string, unknown> = {}
  if (productId) update.product_id = productId
  if (quantityN != null) update.quantity = quantityN
  if (priceEstimateN != null) update.price_estimate = priceEstimateN
  if (minOrderQtyN != null) update.min_order_quantity = minOrderQtyN
  if (leadTimeDaysN != null)
    update.lead_time_days = Math.trunc(leadTimeDaysN)
  if (exportCap != null) update.export_capability = exportCap
  if (pt) update.price_type = pt as PriceType
  if (certs) update.certifications = certs
  if (typeof available_from === 'string') update.available_from = available_from
  if (typeof available_until === 'string') update.available_until = available_until
  if ('image_url' in (body as Record<string, unknown>)) {
    update.image_url =
      typeof image_url === 'string' && image_url.trim() !== '' ? image_url.trim() : null
  }
  if ('supplier_location' in (body as Record<string, unknown>)) {
    update.supplier_location =
      typeof supplier_location === 'string' && supplier_location.trim() !== ''
        ? supplier_location.trim()
        : null
  }
  if ('expiration_date' in (body as Record<string, unknown>)) {
    update.expiration_date =
      typeof expiration_date === 'string' && expiration_date.trim() !== ''
        ? expiration_date.trim()
        : null
  }
  if (st) update.status = st as ListingStatus

  const { error } = await supabase
    .from('supply_listings')
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
    (session.profile.is_supplier && ['admin', 'manager'].includes(session.profile.role))
  if (!canDelete) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('supply_listings')
    .delete()
    .eq('id', (await params).id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

