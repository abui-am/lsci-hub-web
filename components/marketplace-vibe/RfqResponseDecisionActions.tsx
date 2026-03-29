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
      toast({ title: 'Penawaran diterima', variant: 'success' })
      router.refresh()
    } catch (error) {
      toast({
        title: 'Tidak dapat menerima penawaran',
        description: error instanceof Error ? error.message : 'Silakan coba lagi.',
        variant: 'error',
      })
    }
  }

  const handleReject = async () => {
    try {
      await patchStatus(responseId, 'rejected')
      toast({ title: 'Penawaran ditolak', variant: 'success' })
      router.refresh()
    } catch (error) {
      toast({
        title: 'Tidak dapat menolak penawaran',
        description: error instanceof Error ? error.message : 'Silakan coba lagi.',
        variant: 'error',
      })
    }
  }

  return (
    <div className="flex items-center gap-2">
      <ActionConfirmDialog
        triggerLabel="Terima"
        title="Terima penawaran ini?"
        description="Ini akan mengurangi jumlah permintaan dan jumlah pasokan yang tertaut."
        confirmLabel="Terima penawaran"
        onConfirm={handleAccept}
      />
      <ActionConfirmDialog
        triggerLabel="Tolak"
        title="Tolak penawaran ini?"
        description="Anda masih dapat meninjau penawaran pemasok lain setelah menolak yang ini."
        confirmLabel="Tolak penawaran"
        onConfirm={handleReject}
        variant="outline"
      />
    </div>
  )
}
