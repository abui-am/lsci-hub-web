"use client"

import { useRouter } from 'next/navigation'
import { useToast } from '@/providers/ToastProvider'
import { ActionConfirmDialog } from '@/components/marketplace-vibe/ActionConfirmDialog'

async function patchStatus(id: string, status: 'accepted' | 'rejected') {
  const response = await fetch(`/api/marketplace/rfq/responses/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status }),
  })

  const json: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (json && typeof json === 'object' && 'error' in json) {
      throw new Error(String((json as { error?: unknown }).error ?? 'Request failed'))
    }
    throw new Error('Request failed')
  }
}

export function RfqResponseDecisionActions({ responseId }: { responseId: string }) {
  const router = useRouter()
  const { toast } = useToast()

  const handleAccept = async () => {
    try {
      await patchStatus(responseId, 'accepted')
      toast({ title: 'Quote accepted', variant: 'success' })
      router.refresh()
    } catch (error) {
      toast({
        title: 'Unable to accept quote',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      })
    }
  }

  const handleReject = async () => {
    try {
      await patchStatus(responseId, 'rejected')
      toast({ title: 'Quote rejected', variant: 'success' })
      router.refresh()
    } catch (error) {
      toast({
        title: 'Unable to reject quote',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      })
    }
  }

  return (
    <div className="flex items-center gap-2">
      <ActionConfirmDialog
        triggerLabel="Accept"
        title="Accept this quote?"
        description="This will decrement demand quantity and the linked supply quantity."
        confirmLabel="Accept quote"
        onConfirm={handleAccept}
      />
      <ActionConfirmDialog
        triggerLabel="Reject"
        title="Reject this quote?"
        description="You can still review other supplier quotes after rejecting this one."
        confirmLabel="Reject quote"
        onConfirm={handleReject}
        variant="outline"
      />
    </div>
  )
}
