import { NextRequest, NextResponse } from 'next/server'
import { getSessionContext } from '@/lib/rbac/session'
import { createClient as createUserSupabaseClient } from '@/lib/supabase/server'

type OpenAIResponse = {
  output?: Array<{
    content?: Array<{
      type?: string
      text?: string
    }>
  }>
}

type AdvisorMessage = {
  role: 'user' | 'assistant'
  content: string
}

function looksLikeUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

function parsePrompt(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const trimmed = v.trim()
  return trimmed.length > 0 ? trimmed : null
}

function canAccessAdvisor(session: NonNullable<Awaited<ReturnType<typeof getSessionContext>>>) {
  return (
    session.profile.is_platform_superadmin ||
    session.profile.is_supplier ||
    session.profile.is_buyer
  )
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionContext()
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (!canAccessAdvisor(session)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const conversationId = (await params).id
  if (!looksLikeUuid(conversationId)) {
    return NextResponse.json({ error: 'invalid conversation id' }, { status: 400 })
  }

  const supabase = await createUserSupabaseClient()
  const { data, error } = await supabase
    .from('marketplace_advisor_messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, messages: data ?? [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionContext()
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (!canAccessAdvisor(session)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const conversationId = (await params).id
  if (!looksLikeUuid(conversationId)) {
    return NextResponse.json({ error: 'invalid conversation id' }, { status: 400 })
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ error: 'invalid content-type' }, { status: 400 })
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const prompt = parsePrompt(body?.prompt)
  if (!prompt) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured' },
      { status: 500 }
    )
  }

  const supabase = await createUserSupabaseClient()

  const { data: createdUserMessage, error: userMsgError } = await supabase
    .from('marketplace_advisor_messages')
    .insert({
      conversation_id: conversationId,
      role: 'user',
      content: prompt,
    })
    .select('id, role, content, created_at')
    .single()

  if (userMsgError || !createdUserMessage) {
    return NextResponse.json(
      { error: userMsgError?.message ?? 'failed to save user message' },
      { status: 400 }
    )
  }

  const { data: historyRows, error: historyError } = await supabase
    .from('marketplace_advisor_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(20)

  if (historyError) {
    return NextResponse.json({ error: historyError.message }, { status: 400 })
  }

  const history = (historyRows ?? []) as AdvisorMessage[]
  const systemPrompt = [
    'Anda adalah Penasihat AI untuk marketplace B2B Indonesia.',
    'Berikan jawaban praktis, ringkas, dan terstruktur.',
    'Fokus pada sourcing, evaluasi pemasok, negosiasi, dan mitigasi risiko.',
    'Gunakan Bahasa Indonesia.',
  ].join(' ')

  const openAiRes = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      input: [
        { role: 'system', content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ],
      max_output_tokens: 600,
    }),
  })

  if (!openAiRes.ok) {
    const errText = await openAiRes.text().catch(() => '')
    return NextResponse.json(
      { error: `openai request failed: ${openAiRes.status} ${errText}` },
      { status: 502 }
    )
  }

  const openAiData = (await openAiRes.json()) as OpenAIResponse
  const assistantReply =
    openAiData.output
      ?.flatMap((item) => item.content ?? [])
      .filter((item) => item.type === 'output_text')
      .map((item) => item.text ?? '')
      .join('\n')
      .trim() ?? ''

  if (!assistantReply) {
    return NextResponse.json({ error: 'empty advisor response' }, { status: 502 })
  }

  const { data: assistantMessage, error: assistantMsgError } = await supabase
    .from('marketplace_advisor_messages')
    .insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: assistantReply,
    })
    .select('id, role, content, created_at')
    .single()

  if (assistantMsgError || !assistantMessage) {
    return NextResponse.json(
      { error: assistantMsgError?.message ?? 'failed to save assistant message' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    ok: true,
    user_message: createdUserMessage,
    assistant_message: assistantMessage,
  })
}
