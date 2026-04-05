'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, MessageSquare, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/providers/ToastProvider'
import { TradeChatSheet } from '@/components/marketplace-vibe/TradeChatSheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type SupplierResponseActionsProps = {
  responseId: string
  demandId: string
  buyerOrganizationId: string | null
  supplierOrganizationId: string | null
  buyerName: string
  viewerProfileId: string
  isAccepted: boolean
  isPending: boolean
  initialPriceOffer: number | null
  initialQuantityOffer: number | null
  initialLeadTimeDays: number | null
  initialMessage: string | null
}

export function SupplierResponseActions({
  responseId,
  demandId,
  buyerOrganizationId,
  supplierOrganizationId,
  buyerName,
  viewerProfileId,
  isAccepted,
  isPending,
  initialPriceOffer,
  initialQuantityOffer,
  initialLeadTimeDays,
  initialMessage,
}: SupplierResponseActionsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isReviseOpen, setIsReviseOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [priceOffer, setPriceOffer] = useState(
    initialPriceOffer != null ? String(initialPriceOffer) : ''
  )
  const [quantityOffer, setQuantityOffer] = useState(
    initialQuantityOffer != null ? String(initialQuantityOffer) : ''
  )
  const [leadTimeDays, setLeadTimeDays] = useState(
    initialLeadTimeDays != null ? String(initialLeadTimeDays) : ''
  )
  const [message, setMessage] = useState(initialMessage ?? '')

  const handleReviseBid = async () => {
    const price = Number(priceOffer)
    if (!Number.isFinite(price) || price <= 0) {
      toast({
        title: 'Harga offer tidak valid',
        description: 'Harga offer harus lebih dari 0.',
        variant: 'error',
      })
      return
    }

    const quantity =
      quantityOffer.trim().length > 0
        ? Number(quantityOffer)
        : null
    if (quantity != null && (!Number.isFinite(quantity) || quantity <= 0)) {
      toast({
        title: 'Jumlah offer tidak valid',
        description: 'Jumlah offer harus lebih dari 0 jika diisi.',
        variant: 'error',
      })
      return
    }

    const leadTime =
      leadTimeDays.trim().length > 0
        ? Number(leadTimeDays)
        : null
    if (
      leadTime != null &&
      (!Number.isFinite(leadTime) || !Number.isInteger(leadTime) || leadTime < 0)
    ) {
      toast({
        title: 'Lead time tidak valid',
        description: 'Lead time harus bilangan bulat >= 0 jika diisi.',
        variant: 'error',
      })
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(`/api/marketplace/rfq/responses/${responseId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          price_offer: price,
          quantity_offer: quantity,
          lead_time_days: leadTime,
          message,
        }),
      })
      const payload: unknown = await res.json().catch(() => ({}))
      if (!res.ok) {
        const err =
          payload && typeof payload === 'object' && 'error' in payload
            ? String((payload as Record<string, unknown>).error)
            : 'Gagal merevisi bidding.'
        throw new Error(err)
      }

      toast({
        title: 'Bidding berhasil direvisi',
        description: 'Buyer akan melihat nilai penawaran terbaru Anda.',
        variant: 'success',
      })
      setIsReviseOpen(false)
      router.refresh()
    } catch (error) {
      toast({
        title: 'Gagal merevisi bidding',
        description: error instanceof Error ? error.message : 'Silakan coba lagi.',
        variant: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href={`/marketplace/demand/${demandId}`}>
          <FileText className="mr-1.5 h-4 w-4 text-primary" />
          Lihat detail RFQ
        </Link>
      </Button>

      {buyerOrganizationId ? (
        <Button asChild size="sm" variant="outline">
          <Link href={`/marketplace/account/${buyerOrganizationId}`}>
            <MessageSquare className="mr-1.5 h-4 w-4 text-primary" />
            Lihat detail pembeli
          </Link>
        </Button>
      ) : null}

      {supplierOrganizationId ? (
        <TradeChatSheet
          viewerProfileId={viewerProfileId}
          otherPartyName={buyerName || 'Pembeli'}
          triggerLabel="Chat pembeli"
          context={{
            type: 'rfq',
            demandListingId: demandId,
            supplierOrganizationId,
          }}
        />
      ) : null}

      {isPending ? (
        <Button type="button" size="sm" variant="outline" onClick={() => setIsReviseOpen(true)}>
          Revisi bidding
        </Button>
      ) : null}

      {isAccepted ? (
        <Button
          type="button"
          size="sm"
          onClick={() =>
            toast({
              title: 'Pelacakan pengiriman (akan datang)',
              description: 'Modul pelacakan pengiriman sedang dikembangkan.',
            })
          }
        >
          <Truck className="mr-1.5 h-4 w-4" />
          Lacak pengiriman
        </Button>
      ) : null}

      <Dialog open={isReviseOpen} onOpenChange={setIsReviseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revisi bidding</DialogTitle>
            <DialogDescription>
              Ubah harga, jumlah, atau lead time sebelum buyer membuat keputusan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <label htmlFor={`revise-price-${responseId}`} className="text-xs font-medium">
                Harga offer (IDR)
              </label>
              <Input
                id={`revise-price-${responseId}`}
                type="number"
                min={0}
                step="0.01"
                value={priceOffer}
                onChange={(e) => setPriceOffer(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`revise-qty-${responseId}`} className="text-xs font-medium">
                Jumlah offer
              </label>
              <Input
                id={`revise-qty-${responseId}`}
                type="number"
                min={0}
                step="0.01"
                value={quantityOffer}
                onChange={(e) => setQuantityOffer(e.target.value)}
                placeholder="Opsional"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`revise-lead-${responseId}`} className="text-xs font-medium">
                Lead time (hari)
              </label>
              <Input
                id={`revise-lead-${responseId}`}
                type="number"
                min={0}
                step={1}
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                placeholder="Opsional"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`revise-message-${responseId}`} className="text-xs font-medium">
                Catatan
              </label>
              <Textarea
                id={`revise-message-${responseId}`}
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Opsional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsReviseOpen(false)}>
              Batal
            </Button>
            <Button type="button" onClick={handleReviseBid} disabled={isSaving}>
              {isSaving ? 'Menyimpan...' : 'Simpan revisi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
