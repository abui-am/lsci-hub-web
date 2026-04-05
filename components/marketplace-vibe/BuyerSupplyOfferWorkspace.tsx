'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/providers/ToastProvider'
import { formatCurrencyIDR } from '@/lib/utils'
import { TradeChatSheet } from '@/components/marketplace-vibe/TradeChatSheet'

export type BuyerDemandSummary = {
  id: string
  productName: string
  status: string
  requiredQuantity: number | null
  priceBandLabel: string | null
  targetLocation: string | null
  requiredBy: string | null
}

export type SupplyListingSummary = {
  id: string
  productId: string | null
  productName: string
  unit: string | null
  priceEstimate: number | null
  quantity: number | null
  status: string
  imageUrl: string | null
  supplierName: string
}

interface BuyerSupplyOfferWorkspaceProps {
  activeDemand: BuyerDemandSummary
  supplies: SupplyListingSummary[]
  viewerProfileId: string
}

export function BuyerSupplyOfferWorkspace({
  activeDemand,
  supplies,
  viewerProfileId,
}: BuyerSupplyOfferWorkspaceProps) {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [openDialogForSupplyId, setOpenDialogForSupplyId] = useState<string | null>(null)
  const [priceOffer, setPriceOffer] = useState('')
  const [quantityOffer, setQuantityOffer] = useState('')
  const [leadTimeDays, setLeadTimeDays] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdOfferRequest, setCreatedOfferRequest] = useState<{
    id: string
    supplierName: string
  } | null>(null)

  const priceOfferNumber = useMemo(() => {
    const n = Number(priceOffer.trim())
    return Number.isFinite(n) ? n : null
  }, [priceOffer])

  const quantityOfferNumber = useMemo(() => {
    const t = quantityOffer.trim()
    if (!t) return null
    const n = Number(t)
    return Number.isFinite(n) ? n : null
  }, [quantityOffer])

  const leadTimeDaysNumber = useMemo(() => {
    const t = leadTimeDays.trim()
    if (!t) return null
    const n = Number(t)
    return Number.isFinite(n) && Number.isInteger(n) ? n : null
  }, [leadTimeDays])

  const canSubmit = useMemo(() => {
    if (priceOfferNumber == null || priceOfferNumber <= 0) return false
    if (quantityOfferNumber != null && quantityOfferNumber <= 0) return false
    if (leadTimeDaysNumber != null && leadTimeDaysNumber < 0) return false
    return true
  }, [priceOfferNumber, quantityOfferNumber, leadTimeDaysNumber])

  const filteredSupplies = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return supplies
    return supplies.filter((s) => {
      const haystack = [s.productName, s.supplierName, s.status, s.unit ?? ''].join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [search, supplies])

  const handleOpenDialog = (supplyId: string) => {
    setOpenDialogForSupplyId(supplyId)
    setPriceOffer('')
    setQuantityOffer('')
    setLeadTimeDays('')
    setMessage('')
  }

  const handleSubmit = async () => {
    if (!openDialogForSupplyId || !canSubmit) {
      return
    }
    setIsSubmitting(true)
    try {
      const selectedSupply =
        supplies.find((item) => item.id === openDialogForSupplyId) ?? null

      const res = await fetch('/api/marketplace/offer-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          demand_listing_id: activeDemand.id,
          supply_listing_id: openDialogForSupplyId,
          price_offer: priceOfferNumber,
          quantity_offer: quantityOfferNumber,
          lead_time_days: leadTimeDaysNumber,
          message: message.trim() || null,
        }),
      })
      const json: unknown = await res.json().catch(() => ({}))
      if (!res.ok) {
        const err =
          json && typeof json === 'object' && 'error' in json
            ? String((json as Record<string, unknown>).error)
            : 'Gagal mengirim Offer Request'
        toast({
          title: 'Gagal mengirim Offer Request',
          description: err,
          variant: 'error',
        })
        return
      }
      const offerRequestId =
        json &&
        typeof json === 'object' &&
        'offerRequest' in json &&
        (json as Record<string, unknown>).offerRequest &&
        typeof (json as Record<string, unknown>).offerRequest === 'object' &&
        'id' in ((json as Record<string, unknown>).offerRequest as Record<string, unknown>)
          ? String(
              (((json as Record<string, unknown>).offerRequest as Record<string, unknown>)
                .id ?? '')
            )
          : ''

      toast({
        title: 'Offer Request terkirim',
        description: 'Permintaan penawaran Anda telah dikirim ke pemasok.',
        variant: 'success',
      })
      if (offerRequestId) {
        setCreatedOfferRequest({
          id: offerRequestId,
          supplierName: selectedSupply?.supplierName ?? 'Pemasok',
        })
      }
      setOpenDialogForSupplyId(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {createdOfferRequest ? (
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-medium">
            Offer request ke {createdOfferRequest.supplierName} berhasil dikirim.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Anda bisa langsung lanjut negosiasi lewat chat demo.
          </p>
          <div className="mt-3">
            <TradeChatSheet
              viewerProfileId={viewerProfileId}
              otherPartyName={createdOfferRequest.supplierName}
              triggerLabel="Chat supplier sekarang"
              context={{
                type: 'offer',
                offerRequestId: createdOfferRequest.id,
              }}
            />
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Langkah 2 dari 2 · Pilih pemasok
        </p>
        <div className="mt-2 rounded-md border bg-muted/20 p-3 text-xs">
          <p className="text-[11px] font-semibold text-muted-foreground">
            RFQ aktif yang sedang Anda tawarkan
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {activeDemand.productName}
          </p>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-4">
            <p>
              <span className="text-muted-foreground">Status:</span> {activeDemand.status}
            </p>
            <p>
              <span className="text-muted-foreground">Jumlah:</span>{' '}
              {activeDemand.requiredQuantity ?? '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Target harga:</span>{' '}
              {activeDemand.priceBandLabel ?? '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Lokasi:</span>{' '}
              {activeDemand.targetLocation ?? '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Cari pemasok
        </p>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari berdasarkan produk, nama pemasok, unit, atau status"
          className="sm:max-w-md"
        />
      </div>

      {filteredSupplies.length === 0 ? (
        <p className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          {supplies.length === 0
            ? 'Belum ada listing pasokan yang cocok untuk produk RFQ ini.'
            : 'Tidak ada pemasok yang cocok dengan pencarian Anda.'}
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Supplier yang relevan untuk RFQ ini
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSupplies.map((s) => (
              <li key={s.id}>
                <Card className="h-full">
                  <div className="relative aspect-video w-full overflow-hidden rounded-t-xl">
                    <Image
                      src={s.imageUrl ?? '/dummy-cabe.png'}
                      alt={s.productName}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{s.productName}</CardTitle>
                        <p className="text-xs text-muted-foreground">{s.supplierName}</p>
                      </div>
                      <Badge variant={s.status === 'active' ? 'success' : 'outline'}>
                        {s.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="rounded-md bg-muted/30 p-2">
                      <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
                        RFQ vs pemasok
                      </p>
                      <div className="grid grid-cols-2 gap-1">
                        <p>
                          <span className="text-muted-foreground">Qty RFQ:</span>{' '}
                          {activeDemand.requiredQuantity ?? '—'}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Qty pasokan:</span>{' '}
                          {s.quantity ?? '—'} {s.unit ?? ''}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Target harga:</span>{' '}
                          {activeDemand.priceBandLabel ?? '—'}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Harga indikatif:</span>{' '}
                          {formatCurrencyIDR(s.priceEstimate)}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      className="mt-1.5 w-full text-xs"
                      onClick={() => handleOpenDialog(s.id)}
                    >
                      Tawarkan RFQ ini
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog
        open={openDialogForSupplyId != null}
        onOpenChange={(open) => !open && setOpenDialogForSupplyId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kirim Offer Request</DialogTitle>
            <DialogDescription>
              Tawarkan RFQ Anda ke pemasok ini dengan harga dan kuantitas yang Anda inginkan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">RFQ terpilih</p>
              <p className="text-sm font-medium">{activeDemand?.productName}</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium" htmlFor="priceOffer">
                Harga offer (IDR)
              </label>
              <Input
                id="priceOffer"
                inputMode="decimal"
                value={priceOffer}
                onChange={(e) => setPriceOffer(e.target.value)}
                placeholder="contoh: 45000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium" htmlFor="quantityOffer">
                Jumlah offer (opsional)
              </label>
              <Input
                id="quantityOffer"
                inputMode="decimal"
                value={quantityOffer}
                onChange={(e) => setQuantityOffer(e.target.value)}
                placeholder="contoh: 1000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium" htmlFor="leadTimeDays">
                Lead time (hari, opsional)
              </label>
              <Input
                id="leadTimeDays"
                inputMode="numeric"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                placeholder="contoh: 7"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium" htmlFor="message">
                Catatan untuk pemasok (opsional)
              </label>
              <Textarea
                id="message"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Syarat pembayaran, kebutuhan sertifikasi, atau detail lain."
              />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={!canSubmit || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? 'Mengirim...' : 'Kirim Offer Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

