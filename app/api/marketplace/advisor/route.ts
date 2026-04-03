import { NextRequest, NextResponse } from 'next/server'
import { getSessionContext } from '@/lib/rbac/session'

type OpenAIResponse = {
  output?: Array<{
    content?: Array<{
      type?: string
      text?: string
    }>
  }>
}

function parsePrompt(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const prompt = (body as Record<string, unknown>).prompt
  if (typeof prompt !== 'string') return null
  const trimmed = prompt.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function POST(request: NextRequest) {
  const session = await getSessionContext()
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const canAccess =
    session.profile.is_platform_superadmin ||
    session.profile.is_supplier ||
    session.profile.is_buyer

  if (!canAccess) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ error: 'invalid content-type' }, { status: 400 })
  }

  const body: unknown = await request.json().catch(() => null)
  const prompt = parsePrompt(body)
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
        { role: 'user', content: prompt },
      ],
      max_output_tokens: 500,
    }),
  })

  if (!openAiRes.ok) {
    const errText = await openAiRes.text().catch(() => '')
    return NextResponse.json(
      { error: `openai request failed: ${openAiRes.status} ${errText}` },
      { status: 502 }
    )
  }

  const data = (await openAiRes.json()) as OpenAIResponse
  const reply =
    data.output
      ?.flatMap((item) => item.content ?? [])
      .filter((item) => item.type === 'output_text')
      .map((item) => item.text ?? '')
      .join('\n')
      .trim() ?? ''

  if (!reply) {
    return NextResponse.json({ error: 'empty advisor response' }, { status: 502 })
  }

  return NextResponse.json({ reply })
}
