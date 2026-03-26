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

  const { orgName, orgType, sector, orgDescription } = body as Record<string, unknown>

  if (typeof orgName !== 'string' || orgName.trim().length < 3) {
    return NextResponse.json({ error: 'orgName is required (min 3 chars)' }, { status: 400 })
  }

  if (!isOrgType(orgType)) {
    return NextResponse.json({ error: 'invalid orgType' }, { status: 400 })
  }

  const descriptionValue =
    typeof orgDescription === 'string' && orgDescription.trim().length > 0 ? orgDescription.trim() : null

  // internal organizations (government) don't use sector.
  const sectorValue: OrgSector | null =
    orgType === 'government' ? null : typeof sector === 'string' ? (isOrgSector(sector) ? sector : null) : null

  if (orgType !== 'government' && sectorValue == null) {
    return NextResponse.json({ error: 'sector is required for this orgType' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('organizations')
    .insert({
      name: orgName.trim(),
      type: orgType,
      sector: sectorValue,
      description: descriptionValue,
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    return NextResponse.json({ error: error?.message ?? 'failed to create organization' }, { status: 400 })
  }

  return NextResponse.json({ ok: true, organizationId: data.id })
}

