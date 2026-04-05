import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/lib/rbac/session'

function looksLikeUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

function parseBody(v: unknown): string | null {
  if (!v || typeof v !== 'object') return null
  const body = (v as Record<string, unknown>).body
  if (typeof body !== 'string') return null
  const trimmed = body.trim()
  if (!trimmed) return null
  return trimmed.slice(0, 4000)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionContext()
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const requesterOrgId = session.organization?.id ?? null
  if (!session.profile.is_platform_superadmin && !requesterOrgId) {
    return NextResponse.json(
      { error: 'akun Anda belum terhubung ke organisasi' },
      { status: 400 }
    )
  }

  const conversationId = (await params).id
  if (!looksLikeUuid(conversationId)) {
    return NextResponse.json({ error: 'invalid conversation id' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: conversation, error: convoErr } = await supabase
    .from('trade_conversations')
    .select('id, buyer_organization_id, supplier_organization_id')
    .eq('id', conversationId)
    .maybeSingle()

  if (convoErr || !conversation) {
    return NextResponse.json(
      { error: convoErr?.message ?? 'percakapan tidak ditemukan' },
      { status: 404 }
    )
  }

  const isParticipant =
    requesterOrgId === conversation.buyer_organization_id ||
    requesterOrgId === conversation.supplier_organization_id

  if (!session.profile.is_platform_superadmin && !isParticipant) {
    return NextResponse.json(
      { error: 'Anda bukan pihak pada percakapan ini' },
      { status: 403 }
    )
  }

  const markRead = request.nextUrl.searchParams.get('mark_read') === '1'

  if (markRead) {
    await supabase.from('trade_message_reads').upsert(
      {
        conversation_id: conversationId,
        profile_id: session.profile.id,
        last_read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'conversation_id,profile_id', ignoreDuplicates: false }
    )
  }

  const { data: messages, error: msgErr } = await supabase
    .from('trade_messages')
    .select('id, sender_profile_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 400 })
  }

  const { data: readState } = await supabase
    .from('trade_message_reads')
    .select('last_read_at')
    .eq('conversation_id', conversationId)
    .eq('profile_id', session.profile.id)
    .maybeSingle()

  const lastReadAt = readState?.last_read_at
    ? new Date(readState.last_read_at).getTime()
    : 0
  const unreadCount = (messages ?? []).filter((message) => {
    if (message.sender_profile_id === session.profile.id) return false
    const createdAtTs = new Date(message.created_at).getTime()
    return Number.isFinite(createdAtTs) && createdAtTs > lastReadAt
  }).length

  return NextResponse.json({
    ok: true,
    messages: messages ?? [],
    unread_count: unreadCount,
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionContext()
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const requesterOrgId = session.organization?.id ?? null
  if (!session.profile.is_platform_superadmin && !requesterOrgId) {
    return NextResponse.json(
      { error: 'akun Anda belum terhubung ke organisasi' },
      { status: 400 }
    )
  }

  const conversationId = (await params).id
  if (!looksLikeUuid(conversationId)) {
    return NextResponse.json({ error: 'invalid conversation id' }, { status: 400 })
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ error: 'invalid content-type' }, { status: 400 })
  }

  const body = parseBody(await request.json().catch(() => null))
  if (!body) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: conversation, error: convoErr } = await supabase
    .from('trade_conversations')
    .select('id, buyer_organization_id, supplier_organization_id')
    .eq('id', conversationId)
    .maybeSingle()

  if (convoErr || !conversation) {
    return NextResponse.json(
      { error: convoErr?.message ?? 'percakapan tidak ditemukan' },
      { status: 404 }
    )
  }

  const isParticipant =
    requesterOrgId === conversation.buyer_organization_id ||
    requesterOrgId === conversation.supplier_organization_id

  if (!session.profile.is_platform_superadmin && !isParticipant) {
    return NextResponse.json(
      { error: 'Anda bukan pihak pada percakapan ini' },
      { status: 403 }
    )
  }

  const { data: message, error: msgErr } = await supabase
    .from('trade_messages')
    .insert({
      conversation_id: conversationId,
      sender_profile_id: session.profile.id,
      body,
    })
    .select('id, sender_profile_id, body, created_at')
    .single()

  if (msgErr || !message) {
    return NextResponse.json(
      { error: msgErr?.message ?? 'gagal mengirim pesan' },
      { status: 400 }
    )
  }

  await supabase.from('trade_message_reads').upsert(
    {
      conversation_id: conversationId,
      profile_id: session.profile.id,
      last_read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'conversation_id,profile_id', ignoreDuplicates: false }
  )

  return NextResponse.json({ ok: true, message })
}
