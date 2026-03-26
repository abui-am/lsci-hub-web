'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/providers/ToastProvider'

export function MatchWithMySupplyButton({
  demandListingId,
  disabled,
}: {
  demandListingId: string
  disabled?: boolean
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleMatch = async () => {
    setIsSubmitting(true)
    setMessage(null)

    try {
      const res = await fetch('/api/marketplace/matches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ demand_listing_id: demandListingId }),
      })

      const json: unknown = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (json && typeof json === 'object' && 'error' in json) {
          const msg = String((json as Record<string, unknown>).error)
          setMessage(msg)
          toast({
            title: 'Failed to create match',
            description: msg,
            variant: 'error',
          })
        } else {
          setMessage('Failed to create match')
          toast({
            title: 'Failed to create match',
            variant: 'error',
          })
        }
        return
      }

      setMessage('Matched. Status: accepted')
      toast({
        title: 'Match created',
        description: 'Status: accepted',
      })
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleMatch}
        disabled={disabled || isSubmitting}
      >
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <Spinner />
            Matching…
          </span>
        ) : (
          'Match with my supply'
        )}
      </Button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  )
}

