import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionContext } from '@/lib/rbac/session'
import type { MembershipRole, OrgSector, OrgType } from '@/lib/rbac/types'

type SupplierBuyerKind = 'supplier' | 'buyer' | 'internal'

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function pickOrgTypeForKind(kind: SupplierBuyerKind, orgType: unknown): OrgType | null {
  if (kind === 'supplier') {
    if (orgType === 'farmer' || orgType === 'umkm') return orgType
    return null
  }
  if (kind === 'buyer') {
    if (orgType === 'industry' || orgType === 'hotel') return orgType
    return null
  }
  if (kind === 'internal') {
    if (orgType === 'government') return orgType
    return null
  }
  return null
}

function isOrgSector(v: unknown): v is OrgSector {
  return v === 'agriculture' || v === 'tourism' || v === 'processing' || v === 'mining'
}

function isMembershipRole(v: unknown): v is MembershipRole {
  return v === 'admin' || v === 'manager' || v === 'member'
}

export async function POST(request: NextRequest) {
  const session = await getSessionContext()
  if (!session?.profile) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  if (request.headers.get('content-type')?.includes('application/json') !== true) {
    return NextResponse.json({ error: 'invalid content-type' }, { status: 400 })
  }

  const body: unknown = await request.json()
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const {
    kind,
    orgType: rawOrgType,
    orgName,
    sector: rawSector,
    orgDescription,
    userFullName,
    userEmail,
    password,
    membershipRole,
  } = body as {
    kind?: SupplierBuyerKind
    orgType?: OrgType
    orgName?: string
    sector?: OrgSector | null
    orgDescription?: string | null
    userFullName?: string
    userEmail?: string
    password?: string
    membershipRole?: MembershipRole
  }

  if (kind !== 'supplier' && kind !== 'buyer' && kind !== 'internal') {
    return NextResponse.json(
      { error: 'kind must be supplier, buyer, or internal' },
      { status: 400 }
    )
  }

  if (!isNonEmptyString(userFullName) || !isNonEmptyString(userEmail)) {
    return NextResponse.json({ error: 'missing userFullName/userEmail' }, { status: 400 })
  }
  if (!isNonEmptyString(password) || password.trim().length < 8) {
    return NextResponse.json({ error: 'password must be at least 8 characters' }, { status: 400 })
  }
  if (!isMembershipRole(membershipRole)) {
    return NextResponse.json({ error: 'invalid membershipRole' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'server misconfigured' }, { status: 500 })
  }

  const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const isPlatformSuperadmin = session.profile.is_platform_superadmin

  const supplierOrgTypes: OrgType[] = ['farmer', 'umkm']
  const buyerOrgTypes: OrgType[] = ['industry', 'hotel']
  const internalOrgTypes: OrgType[] = ['government']

  let orgId: string | null = null
  let orgType: OrgType | null = null
  let sector: OrgSector | null = null
  let orgDescriptionValue: string | null = null

  if (isPlatformSuperadmin) {
    // Platform superadmin can create a NEW organization + user
    if (!isNonEmptyString(orgName)) {
      return NextResponse.json({ error: 'missing orgName' }, { status: 400 })
    }

    const pickedOrgType = pickOrgTypeForKind(kind, rawOrgType) // validates supplier/buyer mapping
    if (!pickedOrgType) {
      return NextResponse.json({ error: 'invalid orgType for kind' }, { status: 400 })
    }

    orgType = pickedOrgType

    if (rawSector != null) {
      if (!isOrgSector(rawSector)) {
        return NextResponse.json({ error: 'invalid sector' }, { status: 400 })
      }
      sector = rawSector
    }

    orgDescriptionValue = orgDescription ?? null
  } else {
    // Org admin/manager can create users inside THEIR organization only
    if (!session.organization) {
      return NextResponse.json({ error: 'no organization on session' }, { status: 400 })
    }

    if (session.profile.role !== 'admin' && session.profile.role !== 'manager') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    orgId = session.organization.id
    const currentOrgType = session.organization.type
    orgType = currentOrgType
    sector = session.organization.sector

    const orgAcceptsKind =
      (supplierOrgTypes.includes(currentOrgType) && kind === 'supplier') ||
      (buyerOrgTypes.includes(currentOrgType) && kind === 'buyer') ||
      (internalOrgTypes.includes(currentOrgType) && kind === 'internal')

    if (!orgAcceptsKind) {
      return NextResponse.json(
        { error: 'this organization type does not match supplier/buyer kind' },
        { status: 400 }
      )
    }

    // Non-superadmin cannot create other admins; keep roles limited.
    const allowedMembershipRoles: MembershipRole[] =
      session.profile.role === 'admin' ? ['manager', 'member'] : ['member']

    if (!allowedMembershipRoles.includes(membershipRole)) {
      return NextResponse.json({ error: 'invalid membershipRole for your permission level' }, { status: 403 })
    }
  }

  // 1) Create auth user
  const {
    data: userData,
    error: userError,
  } = await adminSupabase.auth.admin.createUser({
    email: userEmail.trim(),
    password,
    email_confirm: true,
  })

  if (userError || !userData?.user) {
    const msg = userError?.message ?? 'unknown error'
    const isDup = msg.toLowerCase().includes('already been registered')
    return NextResponse.json(
      { error: isDup ? 'email already registered' : 'failed to create user' },
      { status: isDup ? 409 : 400 }
    )
  }

  const userId = userData.user.id

  // 2) Create organization (platform superadmin only)
  if (isPlatformSuperadmin) {
    const {
      data: orgData,
      error: orgError,
    } = await adminSupabase
      .from('organizations')
      .insert({
        name: orgName?.trim(),
        type: orgType,
        sector,
        description: orgDescriptionValue,
      })
      .select('id')
      .single()

    if (orgError || !orgData?.id) {
      return NextResponse.json(
        { error: 'failed to create organization' },
        { status: 400 }
      )
    }
    orgId = orgData.id as string
  }

  if (!orgId) {
    return NextResponse.json({ error: 'missing orgId' }, { status: 500 })
  }

  // 3) Upsert profile into the resolved organization
  const accountClass: 'supplier' | 'buyer' | 'internal' =
    kind === 'supplier' ? 'supplier' : kind === 'buyer' ? 'buyer' : 'internal'
  const isSupplier = kind === 'supplier'
  const isBuyer = kind === 'buyer'

  const { error: profileError } = await adminSupabase.from('profiles').upsert(
    {
      id: userId,
      name: userFullName.trim(),
      organization_id: orgId,
      role: membershipRole,
      is_platform_superadmin: false,
      account_class: accountClass,
      is_supplier: isSupplier,
      is_buyer: isBuyer,
      phone: null,
      deleted_at: null,
    },
    { onConflict: 'id' }
  )

  if (profileError) {
    return NextResponse.json({ error: 'failed to create profile' }, { status: 400 })
  }

  return NextResponse.json({
    ok: true,
    userId,
    organizationId: orgId,
  })
}

