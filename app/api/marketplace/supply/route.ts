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
  if (Array.isArray(v)) {
    return v.map((x) => String(x).trim()).filter(Boolean)
  }
  if (typeof v === 'string') {
    return v
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
  }
  return []
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
    quantity,
    price_estimate,
    min_order_quantity,
    lead_time_days,
    export_capability,
    price_type,
    certifications,
    available_from,
    available_until,
    status,
  } = body as Record<string, unknown>

  const productId = typeof product_id === 'string' ? product_id : null
  const quantityN = parseNumber(quantity)
  const priceEstimateN = parseNumber(price_estimate)
  const minOrderQtyN = parseNumber(min_order_quantity)
  const leadTimeDaysN = parseNumber(lead_time_days)
  const exportCap = parseBoolean(export_capability)
  const certs = normalizeStringArray(certifications)

  if (!productId) return NextResponse.json({ error: 'product_id is required' }, { status: 400 })
  if (quantityN == null) return NextResponse.json({ error: 'quantity is required' }, { status: 400 })
  if (exportCap == null) return NextResponse.json({ error: 'export_capability is required' }, { status: 400 })

  const pt = price_type === 'fixed' || price_type === 'negotiable' ? price_type : 'negotiable'
  const st = status === 'active' || status === 'matched' || status === 'closed' ? status : 'active'

  if (!session.profile.is_platform_superadmin && !session.profile.is_supplier) {
    return NextResponse.json({ error: 'your account cannot create supply listings' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('supply_listings')
    .insert({
      organization_id: session.organization.id,
      product_id: productId,
      quantity: quantityN,
      price_estimate: priceEstimateN,
      min_order_quantity: minOrderQtyN,
      lead_time_days: leadTimeDaysN != null ? Math.trunc(leadTimeDaysN) : null,
      export_capability: exportCap,
      price_type: pt as PriceType,
      certifications: certs,
      available_from: typeof available_from === 'string' ? available_from : null,
      available_until: typeof available_until === 'string' ? available_until : null,
      status: st as ListingStatus,
    })
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'failed to create supply listing' }, { status: 400 })
  }

  return NextResponse.json({ ok: true, id: data.id })
}

