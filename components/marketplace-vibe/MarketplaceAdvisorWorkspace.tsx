'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bot, MessageSquare, Plus, Send } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type Conversation = {
  id: string
  title: string
  created_at: string
  updated_at: string
  last_message_at: string
}

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
  created_at?: string
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none text-current prose-headings:my-2 prose-headings:text-current prose-p:my-2 prose-p:text-current prose-strong:text-current prose-a:text-current prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-li:text-current prose-code:text-current prose-pre:text-current">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

export function MarketplaceAdvisorWorkspace() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [prompt, setPrompt] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSend = useMemo(() => prompt.trim().length > 0 && !isSending, [prompt, isSending])

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  )

  const loadConversations = async () => {
    setIsLoadingConversations(true)
    setError(null)
    try {
      const res = await fetch('/api/marketplace/advisor/conversations', { method: 'GET' })
      const json: unknown = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          json && typeof json === 'object' && 'error' in json
            ? String((json as Record<string, unknown>).error)
            : 'Gagal memuat riwayat chat'
        setError(msg)
        return
      }

      const rows =
        json && typeof json === 'object' && 'conversations' in json
          ? ((json as Record<string, unknown>).conversations as Conversation[])
          : []

      setConversations(rows)

      if (rows.length === 0) {
        setActiveConversationId(null)
        setMessages([
          {
            id: makeId(),
            role: 'assistant',
            content: 'Klik "Mulai chat baru" untuk memulai percakapan.',
          },
        ])
        return
      }

      setActiveConversationId((prev) => prev ?? rows[0].id)
    } finally {
      setIsLoadingConversations(false)
    }
  }

  const loadMessages = async (conversationId: string) => {
    setIsLoadingMessages(true)
    setError(null)
    try {
      const res = await fetch(`/api/marketplace/advisor/conversations/${conversationId}/messages`)
      const json: unknown = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          json && typeof json === 'object' && 'error' in json
            ? String((json as Record<string, unknown>).error)
            : 'Gagal memuat pesan'
        setError(msg)
        return
      }

      const rows =
        json && typeof json === 'object' && 'messages' in json
          ? ((json as Record<string, unknown>).messages as ChatMessage[])
          : []

      if (rows.length === 0) {
        setMessages([
          {
            id: makeId(),
            role: 'assistant',
            content:
              'Halo! Saya siap bantu shortlist pemasok, strategi negosiasi, dan evaluasi risiko transaksi.',
          },
        ])
        return
      }

      setMessages(rows)
    } finally {
      setIsLoadingMessages(false)
    }
  }

  const handleCreateConversation = async () => {
    if (isCreatingConversation) return
    setIsCreatingConversation(true)
    setError(null)
    try {
      const res = await fetch('/api/marketplace/advisor/conversations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Chat baru' }),
      })
      const json: unknown = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          json && typeof json === 'object' && 'error' in json
            ? String((json as Record<string, unknown>).error)
            : 'Gagal membuat chat baru'
        setError(msg)
        return
      }

      const conversation =
        json && typeof json === 'object' && 'conversation' in json
          ? ((json as Record<string, unknown>).conversation as Conversation)
          : null

      if (!conversation) {
        setError('Gagal membuat chat baru')
        return
      }

      setConversations((prev) => [conversation, ...prev])
      setActiveConversationId(conversation.id)
      setMessages([
        {
          id: makeId(),
          role: 'assistant',
          content:
            'Halo! Saya siap bantu shortlist pemasok, strategi negosiasi, dan evaluasi risiko transaksi.',
        },
      ])
    } finally {
      setIsCreatingConversation(false)
    }
  }

  const handleSend = async () => {
    const trimmed = prompt.trim()
    if (!trimmed || isSending || !activeConversationId) return

    const userMsg: ChatMessage = {
      id: makeId(),
      role: 'user',
      content: trimmed,
    }

    setMessages((prev) => [...prev, userMsg])
    setPrompt('')
    setError(null)
    setIsSending(true)

    try {
      const res = await fetch(`/api/marketplace/advisor/conversations/${activeConversationId}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed }),
      })
      const json: unknown = await res.json().catch(() => ({}))

      if (!res.ok) {
        const msg =
          json && typeof json === 'object' && 'error' in json
            ? String((json as Record<string, unknown>).error)
            : 'Gagal mendapatkan jawaban penasihat'
        setError(msg)
        return
      }

      const assistantMessage =
        json && typeof json === 'object' && 'assistant_message' in json
          ? ((json as Record<string, unknown>).assistant_message as ChatMessage)
          : null

      if (!assistantMessage?.content?.trim()) {
        setError('Penasihat tidak mengembalikan jawaban.')
        return
      }

      setMessages((prev) => [...prev, assistantMessage])
      await loadConversations()
    } finally {
      setIsSending(false)
    }
  }

  useEffect(() => {
    void loadConversations()
  }, [])

  useEffect(() => {
    if (!activeConversationId) return
    void loadMessages(activeConversationId)
  }, [activeConversationId])

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Riwayat chat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full justify-start gap-2"
            onClick={() => void handleCreateConversation()}
            disabled={isCreatingConversation}
          >
            <Plus className="h-4 w-4" />
            {isCreatingConversation ? 'Membuat...' : 'Mulai chat baru'}
          </Button>
          <div className="space-y-1">
            {isLoadingConversations ? (
              <p className="text-sm text-muted-foreground">Memuat riwayat...</p>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada percakapan.</p>
            ) : (
              conversations.map((c) => {
                const isActive = c.id === activeConversationId
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveConversationId(c.id)}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                      isActive
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <p className="truncate font-medium text-foreground">{c.title || 'Chat baru'}</p>
                    <p className="text-xs">{new Date(c.last_message_at).toLocaleString('id-ID')}</p>
                  </button>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {activeConversation?.title ? `Papan chat - ${activeConversation.title}` : 'Papan chat'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 rounded-lg border p-3">
            {isLoadingMessages ? (
              <p className="text-sm text-muted-foreground">Memuat pesan...</p>
            ) : (
              messages.map((m) =>
                m.role === 'assistant' ? (
                  <div key={m.id} className="flex items-start gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="rounded-md bg-muted px-3 py-2 text-sm">
                      <MarkdownMessage content={m.content} />
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex items-start justify-end gap-2">
                    <div className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
                      <MarkdownMessage content={m.content} />
                    </div>
                    <Avatar className="h-7 w-7">
                      <AvatarFallback>
                        <MessageSquare className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )
              )
            )}
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex items-center gap-2">
            <Input
              placeholder="Ketik permintaan Anda untuk Penasihat AI..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={!activeConversationId}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleSend()
                }
              }}
            />
            <Button
              type="button"
              className="gap-1.5"
              disabled={!canSend || !activeConversationId}
              onClick={() => void handleSend()}
            >
              <Send className="h-4 w-4" />
              {isSending ? 'Mengirim...' : 'Kirim'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
