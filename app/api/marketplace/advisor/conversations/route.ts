import { NextRequest, NextResponse } from 'next/server'
import { getSessionContext } from '@/lib/rbac/session'
import { createClient as createUserSupabaseClient } from '@/lib/supabase/server'

function parseTitle(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const trimmed = v.trim()
  return trimmed.length > 0 ? trimmed.slice(0, 120) : null
}

function canAccessAdvisor(session: NonNullable<Awaited<ReturnType<typeof getSessionContext>>>) {
  return (
    session.profile.is_platform_superadmin ||
    session.profile.is_supplier ||
    session.profile.is_buyer
  )
}

export async function GET() {
  const session = await getSessionContext()
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (!canAccessAdvisor(session)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const supabase = await createUserSupabaseClient()
  const { data, error } = await supabase
    .from('marketplace_advisor_conversations')
    .select('id, title, created_at, updated_at, last_message_at')
    .is('deleted_at', null)
    .order('last_message_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, conversations: data ?? [] })
}

export async function POST(request: NextRequest) {
  const session = await getSessionContext()
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (!canAccessAdvisor(session)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ error: 'invalid content-type' }, { status: 400 })
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const title = parseTitle(body?.title) ?? 'Chat baru'

  const supabase = await createUserSupabaseClient()
  const { data, error } = await supabase
    .from('marketplace_advisor_conversations')
    .insert({
      profile_id: session.profile.id,
      organization_id: session.organization?.id ?? null,
      title,
    })
    .select('id, title, created_at, updated_at, last_message_at')
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'failed to create conversation' },
      { status: 400 }
    )
  }

  return NextResponse.json({ ok: true, conversation: data })
}
