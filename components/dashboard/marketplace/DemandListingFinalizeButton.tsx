'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/providers/ToastProvider'

export function DemandListingFinalizeButton({
  demandId,
  disabled,
}: {
  demandId: string
  disabled?: boolean
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFinalize = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/marketplace/demand/${demandId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status: 'finalized',
          is_open_for_bidding: false,
        }),
      })
      const data: unknown = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          data && typeof data === 'object' && 'error' in data
            ? String((data as Record<string, unknown>).error)
            : 'Failed to finalize demand listing'
        toast({ title: 'Finalize failed', description: msg, variant: 'error' })
        return
      }

      toast({
        title: 'Demand finalized',
        description: 'Bidding has been closed for this listing.',
      })
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleFinalize}
      disabled={disabled || isSubmitting}
    >
      {isSubmitting ? (
        <span className="inline-flex items-center gap-2">
          <Spinner /> Finalizing...
        </span>
      ) : (
        'Finalize'
      )}
    </Button>
  )
}

