import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/lib/rbac/session'

export async function PATCH(request: NextRequest) {
  const session = await getSessionContext()
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (!session.organization) {
    return NextResponse.json({ error: 'no organization' }, { status: 400 })
  }

  const canEdit =
    session.profile.is_platform_superadmin ||
    ['admin', 'manager'].includes(session.profile.role)
  if (!canEdit) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ error: 'invalid content-type' }, { status: 400 })
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const organizationName =
    typeof body.name === 'string' && body.name.trim() ? body.name.trim() : null
  const description =
    typeof body.description === 'string' && body.description.trim()
      ? body.description.trim()
      : null
  const brandStory =
    typeof body.brand_story === 'string' && body.brand_story.trim()
      ? body.brand_story.trim()
      : null
  const logoImage =
    typeof body.logo_image === 'string' && body.logo_image.trim()
      ? body.logo_image.trim()
      : null
  const operationCountry =
    typeof body.operation_country === 'string' && body.operation_country.trim()
      ? body.operation_country.trim()
      : null
  const buyerCreditScoreRaw =
    typeof body.buyer_credit_score === 'number'
      ? body.buyer_credit_score
      : typeof body.buyer_credit_score === 'string' && body.buyer_credit_score.trim()
        ? Number(body.buyer_credit_score)
        : null
  const supplierCreditScoreRaw =
    typeof body.supplier_credit_score === 'number'
      ? body.supplier_credit_score
      : typeof body.supplier_credit_score === 'string' && body.supplier_credit_score.trim()
        ? Number(body.supplier_credit_score)
        : null

  if (
    (buyerCreditScoreRaw != null &&
      (!Number.isFinite(buyerCreditScoreRaw) ||
        buyerCreditScoreRaw < 0 ||
        buyerCreditScoreRaw > 100)) ||
    (supplierCreditScoreRaw != null &&
      (!Number.isFinite(supplierCreditScoreRaw) ||
        supplierCreditScoreRaw < 0 ||
        supplierCreditScoreRaw > 100))
  ) {
    return NextResponse.json(
      { error: 'credit score must be between 0 and 100' },
      { status: 400 }
    )
  }

  const update: Record<string, unknown> = {
    description,
    brand_story: brandStory,
    logo_image: logoImage,
    operation_country: operationCountry,
  }
  if (organizationName) {
    update.name = organizationName
  }
  if (session.profile.is_platform_superadmin) {
    update.buyer_credit_score = buyerCreditScoreRaw
    update.supplier_credit_score = supplierCreditScoreRaw
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('organizations')
    .update(update)
    .eq('id', session.organization.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
