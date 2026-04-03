'use client'

import { useRouter } from 'next/navigation'
import { useToast } from '@/providers/ToastProvider'
import { ActionConfirmDialog } from '@/components/marketplace-vibe/ActionConfirmDialog'

async function updateOfferRequestStatus(id: string, status: 'accepted' | 'rejected') {
  const res = await fetch(`/api/marketplace/offer-requests/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status }),
  })

  const payload: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as Record<string, unknown>).error)
        : 'Gagal memperbarui status offer request'
    throw new Error(err)
  }
}

export function SupplierOfferRequestActions({
  offerRequestId,
  disabled = false,
}: {
  offerRequestId: string
  disabled?: boolean
}) {
  const router = useRouter()
  const { toast } = useToast()

  if (disabled) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ActionConfirmDialog
        triggerLabel="Terima"
        title="Terima Offer Request?"
        description="Sistem akan membuat RFQ response otomatis dari offer ini."
        confirmLabel="Ya, terima"
        onConfirm={async () => {
          try {
            await updateOfferRequestStatus(offerRequestId, 'accepted')
            toast({
              title: 'Offer Request diterima',
              description: 'RFQ response berhasil dibuat untuk offer ini.',
              variant: 'success',
            })
            router.refresh()
          } catch (error) {
            toast({
              title: 'Gagal menerima offer',
              description:
                error instanceof Error ? error.message : 'Silakan coba lagi.',
              variant: 'error',
            })
          }
        }}
      />

      <ActionConfirmDialog
        triggerLabel="Tolak"
        title="Tolak Offer Request?"
        description="Offer request akan ditandai sebagai ditolak."
        confirmLabel="Ya, tolak"
        variant="outline"
        onConfirm={async () => {
          try {
            await updateOfferRequestStatus(offerRequestId, 'rejected')
            toast({
              title: 'Offer Request ditolak',
              description: 'Status offer berhasil diperbarui.',
              variant: 'success',
            })
            router.refresh()
          } catch (error) {
            toast({
              title: 'Gagal menolak offer',
              description:
                error instanceof Error ? error.message : 'Silakan coba lagi.',
              variant: 'error',
            })
          }
        }}
      />
    </div>
  )
}

