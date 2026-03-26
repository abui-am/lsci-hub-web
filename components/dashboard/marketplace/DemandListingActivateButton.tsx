'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/providers/ToastProvider'

export function DemandListingActivateButton({
  demandId,
  disabled,
}: {
  demandId: string
  disabled?: boolean
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleActivate = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/marketplace/demand/${demandId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status: 'active',
          is_open_for_bidding: true,
        }),
      })
      const data: unknown = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          data && typeof data === 'object' && 'error' in data
            ? String((data as Record<string, unknown>).error)
            : 'Failed to activate demand listing'
        toast({ title: 'Activate failed', description: msg, variant: 'error' })
        return
      }

      toast({
        title: 'Demand activated',
        description: 'Listing is now open for supplier quotes.',
      })
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Button
      type="button"
      variant="default"
      size="sm"
      onClick={handleActivate}
      disabled={disabled || isSubmitting}
    >
      {isSubmitting ? (
        <span className="inline-flex items-center gap-2">
          <Spinner /> Activating...
        </span>
      ) : (
        'Activate'
      )}
    </Button>
  )
}

