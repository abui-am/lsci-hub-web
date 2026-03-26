import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/lib/rbac/session'
import type { OrgSector, OrgType } from '@/lib/rbac/types'

function isOrgSector(v: unknown): v is OrgSector {
  return v === 'agriculture' || v === 'tourism' || v === 'processing' || v === 'mining'
}

function isOrgType(v: unknown): v is OrgType {
  return v === 'farmer' || v === 'umkm' || v === 'industry' || v === 'hotel' || v === 'government'
}

function isOrgVerificationStatus(
  v: unknown
): v is 'pending' | 'verified' {
  return v === 'pending' || v === 'verified'
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionContext()
  if (!session?.profile) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const orgId = (await params).id

  const canEdit =
    session.profile.is_platform_superadmin ||
    (session.organization?.id === orgId && session.profile.role === 'admin')

  if (!canEdit) {
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

  const { name, type, sector, description, verification_status } =
    body as Record<string, unknown>

  const update: Record<string, unknown> = {}

  if (typeof name === 'string') {
    const n = name.trim()
    if (n.length < 3) return NextResponse.json({ error: 'name too short' }, { status: 400 })
    update.name = n
  }

  // Only platform superadmin can change org type.
  if (type !== undefined) {
    if (!session.profile.is_platform_superadmin) {
      return NextResponse.json({ error: 'only superadmin can change type' }, { status: 403 })
    }
    if (!isOrgType(type)) {
      return NextResponse.json({ error: 'invalid type' }, { status: 400 })
    }
    update.type = type
  }

  if (description !== undefined) {
    if (description == null) {
      update.description = null
    } else if (typeof description === 'string') {
      update.description = description.trim() ? description.trim() : null
    } else {
      return NextResponse.json({ error: 'invalid description' }, { status: 400 })
    }
  }

  if (sector !== undefined) {
    if (sector == null) {
      update.sector = null
    } else if (typeof sector === 'string') {
      if (!isOrgSector(sector)) return NextResponse.json({ error: 'invalid sector' }, { status: 400 })
      update.sector = sector
    } else {
      return NextResponse.json({ error: 'invalid sector' }, { status: 400 })
    }
  }

  if (verification_status !== undefined) {
    if (!session.profile.is_platform_superadmin) {
      return NextResponse.json(
        { error: 'only superadmin can change verification status' },
        { status: 403 }
      )
    }
    if (!isOrgVerificationStatus(verification_status)) {
      return NextResponse.json({ error: 'invalid verification_status' }, { status: 400 })
    }
    update.verification_status = verification_status
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no changes' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase.from('organizations').update(update).eq('id', orgId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

