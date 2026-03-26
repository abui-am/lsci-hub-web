import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getSessionContext } from '@/lib/rbac/session'

function parseEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().toLowerCase()
  if (!s) return null
  return s
}

function parseBool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    if (v === 'true') return true
    if (v === 'false') return false
  }
  return null
}

export async function POST(request: NextRequest) {
  const session = await getSessionContext()
  if (!session?.profile) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (!session.profile.is_platform_superadmin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ error: 'invalid content-type' }, { status: 400 })
  }

  const body: unknown = await request.json()
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const { email, is_supplier, is_buyer } = body as Record<string, unknown>

  const emailN = parseEmail(email)
  const isSupplier = parseBool(is_supplier)
  const isBuyer = parseBool(is_buyer)

  if (!emailN) return NextResponse.json({ error: 'email is required' }, { status: 400 })
  if (isSupplier == null) return NextResponse.json({ error: 'is_supplier is required' }, { status: 400 })
  if (isBuyer == null) return NextResponse.json({ error: 'is_buyer is required' }, { status: 400 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'server misconfigured' }, { status: 500 })
  }

  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Find auth user id by email
  const { data: users, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })
  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 400 })
  }

  const u = users.users.find((x) => x.email?.toLowerCase() === emailN)
  if (!u?.id) {
    return NextResponse.json({ error: 'user not found' }, { status: 404 })
  }

  const accountClass: 'supplier' | 'buyer' | 'internal' =
    isSupplier && isBuyer ? 'internal' : isSupplier ? 'supplier' : isBuyer ? 'buyer' : 'internal'

  const { data: profile, error: upsertErr } = await admin
    .from('profiles')
    .upsert(
      {
        id: u.id,
        is_supplier: isSupplier,
        is_buyer: isBuyer,
        account_class: accountClass,
      },
      { onConflict: 'id' }
    )
    .select('id, name, organization_id, role, is_platform_superadmin, is_supplier, is_buyer, account_class')
    .single()

  if (upsertErr || !profile) {
    return NextResponse.json({ error: upsertErr?.message ?? 'failed to update profile' }, { status: 400 })
  }

  return NextResponse.json({ ok: true, profile })
}

