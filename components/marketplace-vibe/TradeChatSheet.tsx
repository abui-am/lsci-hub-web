'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MessageSquare, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

type TradeChatContext =
  | {
      type: 'rfq'
      demandListingId: string
      supplierOrganizationId: string
    }
  | {
      type: 'offer'
      offerRequestId: string
    }

type TradeMessage = {
  id: string
  sender_profile_id: string
  body: string
  created_at: string
}

type MessagesResponse = {
  messages: TradeMessage[]
  unread_count?: number
}

type TradeConversationResponse = {
  id: string
}

function formatWhen(v: string): string {
  const date = new Date(v)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

export function TradeChatSheet({
  context,
  otherPartyName,
  viewerProfileId,
  triggerLabel = 'Chat',
}: {
  context: TradeChatContext
  otherPartyName: string
  viewerProfileId: string
  triggerLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<TradeMessage[]>([])
  const [draft, setDraft] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSend = useMemo(
    () => draft.trim().length > 0 && !isSending && conversationId != null,
    [draft, isSending, conversationId]
  )

  const ensureConversation = useCallback(async (): Promise<string> => {
    const body =
      context.type === 'rfq'
        ? {
            type: 'rfq',
            demand_listing_id: context.demandListingId,
            supplier_organization_id: context.supplierOrganizationId,
          }
        : {
            type: 'offer',
            offer_request_id: context.offerRequestId,
          }

    const res = await fetch('/api/marketplace/trade-chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json: unknown = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message =
        json && typeof json === 'object' && 'error' in json
          ? String((json as Record<string, unknown>).error)
          : 'Gagal membuka chat'
      throw new Error(message)
    }
    const conversation =
      json && typeof json === 'object' && 'conversation' in json
        ? ((json as Record<string, unknown>).conversation as TradeConversationResponse)
        : null
    if (!conversation?.id) {
      throw new Error('Percakapan tidak ditemukan')
    }
    return conversation.id
  }, [context])

  const loadMessages = useCallback(async (id: string, options?: { markRead?: boolean }) => {
    const query = options?.markRead ? '?mark_read=1' : ''
    const res = await fetch(`/api/marketplace/trade-chat/${id}/messages${query}`, {
      method: 'GET',
      cache: 'no-store',
    })
    const json: unknown = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message =
        json && typeof json === 'object' && 'error' in json
          ? String((json as Record<string, unknown>).error)
          : 'Gagal memuat pesan'
      throw new Error(message)
    }
    const payload =
      json && typeof json === 'object' && 'messages' in json
        ? (json as MessagesResponse)
        : ({ messages: [] } as MessagesResponse)

    setMessages(payload.messages ?? [])
    setUnreadCount(payload.unread_count ?? 0)
  }, [])

  const refreshChat = useCallback(
    async (options?: { markRead?: boolean }) => {
      const id = conversationId ?? (await ensureConversation())
      if (!conversationId) {
        setConversationId(id)
      }
      await loadMessages(id, options)
      return id
    },
    [conversationId, ensureConversation, loadMessages]
  )

  useEffect(() => {
    if (!open) return
    let ignore = false
    const bootstrap = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const id = await refreshChat({ markRead: true })
        if (ignore) return
        setConversationId(id)
      } catch (err) {
        if (ignore) return
        setError(err instanceof Error ? err.message : 'Gagal membuka chat')
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }
    void bootstrap()
    return () => {
      ignore = true
    }
  }, [open, refreshChat])

  useEffect(() => {
    const onWindowFocus = () => {
      void refreshChat({ markRead: open ? true : false }).catch(() => {
        // ignore in background focus refresh
      })
    }
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      void refreshChat({ markRead: open ? true : false }).catch(() => {
        // ignore in background focus refresh
      })
    }

    window.addEventListener('focus', onWindowFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)
    void refreshChat({ markRead: open ? true : false }).catch(() => {
      // ignore first background refresh error
    })

    return () => {
      window.removeEventListener('focus', onWindowFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [open, refreshChat])

  const sendMessage = async () => {
    if (!conversationId || !draft.trim() || isSending) return
    try {
      setIsSending(true)
      setError(null)
      const res = await fetch(`/api/marketplace/trade-chat/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: draft.trim() }),
      })
      const json: unknown = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message =
          json && typeof json === 'object' && 'error' in json
            ? String((json as Record<string, unknown>).error)
            : 'Gagal mengirim pesan'
        setError(message)
        return
      }
      setDraft('')
      await loadMessages(conversationId, { markRead: true })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="relative">
          <MessageSquare className="mr-1.5 h-4 w-4" />
          {triggerLabel}
          {unreadCount > 0 ? (
            <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Chat dengan {otherPartyName}</SheetTitle>
          <SheetDescription>
            Demo chat via REST. Pesan diperbarui saat tab/window kembali fokus.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4">
          <div className="h-[58vh] overflow-y-auto rounded-md border bg-muted/20 p-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Memuat chat...</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada pesan. Mulai percakapan sekarang.
              </p>
            ) : (
              <ul className="space-y-2">
                {messages.map((msg) => {
                  const mine = msg.sender_profile_id === viewerProfileId
                  return (
                    <li
                      key={msg.id}
                      className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                          mine
                            ? 'bg-primary text-primary-foreground'
                            : 'border bg-background text-foreground'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.body}</p>
                        <p
                          className={`mt-1 text-[10px] ${
                            mine ? 'text-primary-foreground/80' : 'text-muted-foreground'
                          }`}
                        >
                          {formatWhen(msg.created_at)}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <div className="flex items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Tulis pesan..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void sendMessage()
                }
              }}
            />
            <Button type="button" size="icon" disabled={!canSend} onClick={() => void sendMessage()}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Kirim</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
