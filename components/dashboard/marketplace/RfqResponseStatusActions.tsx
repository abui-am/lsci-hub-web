'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/providers/ToastProvider'

type RfqResponseStatus = 'pending' | 'accepted' | 'rejected'

async function updateStatus(id: string, status: 'accepted' | 'rejected') {
  const res = await fetch(`/api/marketplace/rfq/responses/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  const json: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (json && typeof json === 'object' && 'error' in json) {
      return { ok: false as const, error: (json as Record<string, unknown>).error }
    }
    return { ok: false as const, error: 'Request failed' }
  }
  return { ok: true as const }
}

export function RfqResponseStatusActions({
  id,
  status,
  canManage,
}: {
  id: string
  status: RfqResponseStatus
  canManage: boolean
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!canManage) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  if (status !== 'pending') {
    return (
      <span className="text-xs text-muted-foreground">
        Finalized
      </span>
    )
  }

  const handle = async (next: 'accepted' | 'rejected') => {
    setIsSubmitting(true)
    setError(null)
    try {
      const out = await updateStatus(id, next)
      if (!out.ok) {
        setError(String(out.error ?? 'Failed'))
        toast({
          title: 'Failed to update response',
          description: String(out.error ?? 'Please try again.'),
          variant: 'error',
        })
        return
      }
      toast({
        title: next === 'accepted' ? 'Quote accepted' : 'Quote rejected',
        variant: 'success',
      })
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="default"
          onClick={() => handle('accepted')}
          disabled={isSubmitting}
        >
          {isSubmitting ? <Spinner /> : 'Accept'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => handle('rejected')}
          disabled={isSubmitting}
        >
          Reject
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

