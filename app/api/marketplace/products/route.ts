import { NextRequest, NextResponse } from 'next/server'
import { createClient as createUserSupabaseClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/lib/rbac/session'

type ProductUnit = 'kg' | 'ton' | 'liter' | 'pcs'

function parseBoolean(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    if (v === 'true') return true
    if (v === 'false') return false
  }
  return null
}

function parseString(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s ? s : null
}

export async function GET() {
  const session = await getSessionContext()
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const supabase = await createUserSupabaseClient()
  const { data, error } = await supabase
    .from('products')
    .select('id, name, unit')
    .is('deleted_at', null)
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, products: data ?? [] })
}

export async function POST(request: NextRequest) {
  const session = await getSessionContext()
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ error: 'invalid content-type' }, { status: 400 })
  }

  const body: unknown = await request.json()
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const { name, unit, is_raw_material } = body as Record<string, unknown>

  const nameN = parseString(name)
  const unitS = parseString(unit)
  const isRaw = parseBoolean(is_raw_material) ?? false

  const allowedUnits: ProductUnit[] = ['kg', 'ton', 'liter', 'pcs']
  const unitN = unitS && allowedUnits.includes(unitS as ProductUnit) ? (unitS as ProductUnit) : null

  if (!nameN) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!unitN) return NextResponse.json({ error: 'invalid unit' }, { status: 400 })

  const supabase = await createUserSupabaseClient()
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: nameN,
      unit: unitN,
      category: 'other',
      is_raw_material: isRaw,
    })
    .select('id, name, unit')
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'failed to create product' },
      { status: 400 }
    )
  }

  return NextResponse.json({ ok: true, product: data })
}

