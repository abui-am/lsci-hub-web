'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, Package, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/providers/ToastProvider'
import { formatCurrencyIDR } from '@/lib/utils'

type OpenRfqForResponse = {
  demandListingId: string
  productName: string
  buyerOrgName: string
  requiredQuantity: number | null
  priceBandLabel: string
}

type SubmitPayload = {
  demand_listing_id: string
  supply_listing_id: string | null
  price_offer: number
  quantity_offer: number | null
  lead_time_days: number | null
  message: string | null
}

type SupplyOption = {
  id: string
  quantity: number | null
  price_estimate: number | null
  min_order_quantity: number | null
  lead_time_days: number | null
  price_type: string | null
  supplier_location: string | null
  expiration_date: string | null
  available_from: string | null
  available_until: string | null
  status: string | null
  created_at?: string | null
  products:
    | {
        name: string | null
        unit: string | null
      }
    | {
        name: string | null
        unit: string | null
      }[]
    | null
}

function formatSupplyDate(option: SupplyOption): string {
  const source = option.available_from ?? option.created_at ?? null
  if (!source) return '-'
  const date = new Date(source)
  if (Number.isNaN(date.getTime())) return source
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

async function createRfqResponse(payload: SubmitPayload) {
  const res = await fetch('/api/marketplace/rfq/responses', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const json: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (json && typeof json === 'object' && 'error' in json) {
      return { ok: false as const, error: (json as Record<string, unknown>).error }
    }
    return { ok: false as const, error: 'Permintaan gagal' }
  }

  return { ok: true as const }
}

export function RfqRespondSheet({
  rfq,
  triggerLabel = 'Kirim penawaran',
  triggerClassName,
}: {
  rfq: OpenRfqForResponse
  triggerLabel?: string
  triggerClassName?: string
}) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [priceOffer, setPriceOffer] = useState('')
  const [quantityOffer, setQuantityOffer] = useState('')
  const [leadTimeDays, setLeadTimeDays] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  const [selectedSupplyListingId, setSelectedSupplyListingId] = useState('auto')
  const [supplyOptions, setSupplyOptions] = useState<SupplyOption[]>([])
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const maxDemandQuantity = rfq.requiredQuantity

  const loadSupplyOptions = async () => {
    setIsLoadingOptions(true)
    try {
      const res = await fetch(
        `/api/marketplace/rfq/supply-options?demand_listing_id=${encodeURIComponent(
          rfq.demandListingId
        )}`
      )
      const data: unknown = await res.json().catch(() => ({}))
      if (!res.ok) return

      const options =
        data && typeof data === 'object' && 'options' in data
          ? ((data as { options?: SupplyOption[] }).options ?? [])
          : []
      setSupplyOptions(options)
    } finally {
      setIsLoadingOptions(false)
    }
  }

  const handleSheetOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      void loadSupplyOptions()
    }
  }

  const handleSupplyListingChange = (nextValue: string) => {
    setSelectedSupplyListingId(nextValue)
    if (nextValue === 'auto') return

    const selected = supplyOptions.find((opt) => opt.id === nextValue)
    if (!selected) return

    // Prefill from selected supply listing, but keep fields editable by user.
    if (selected.quantity != null) {
      const nextQty =
        maxDemandQuantity != null
          ? Math.min(selected.quantity, maxDemandQuantity)
          : selected.quantity
      setQuantityOffer(String(nextQty))
    }
    if (selected.price_estimate != null) {
      setPriceOffer(String(selected.price_estimate))
    }
  }

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
    if (!isLoadingOptions && supplyOptions.length === 0) return false
    if (priceOfferNumber == null || priceOfferNumber <= 0) return false
    if (quantityOfferNumber != null && quantityOfferNumber <= 0) return false
    if (maxDemandQuantity != null && quantityOfferNumber != null && quantityOfferNumber > maxDemandQuantity) {
      return false
    }
    if (leadTimeDaysNumber != null && leadTimeDaysNumber < 0) return false
    return true
  }, [
    isLoadingOptions,
    supplyOptions.length,
    priceOfferNumber,
    quantityOfferNumber,
    maxDemandQuantity,
    leadTimeDaysNumber,
  ])

  const activeSupplyDetail = useMemo(() => {
    if (!supplyOptions.length) return null
    if (selectedSupplyListingId === 'auto') return supplyOptions[0] ?? null
    return supplyOptions.find((opt) => opt.id === selectedSupplyListingId) ?? null
  }, [selectedSupplyListingId, supplyOptions])

  const activeSupplyProduct = useMemo(() => {
    if (!activeSupplyDetail?.products) return null
    return Array.isArray(activeSupplyDetail.products)
      ? activeSupplyDetail.products[0] ?? null
      : activeSupplyDetail.products
  }, [activeSupplyDetail])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoadingOptions && supplyOptions.length === 0) {
      setResultMessage(
        'Belum ada pasokan aktif untuk produk ini. Buat pasokan dulu sebelum kirim penawaran.'
      )
      return
    }
    if (!canSubmit) {
      setResultMessage(
        'Masukkan harga yang valid (> 0). Jumlah tidak boleh melebihi permintaan RFQ.'
      )
      return
    }

    setIsSubmitting(true)
    setResultMessage(null)

    try {
      const payload: SubmitPayload = {
        demand_listing_id: rfq.demandListingId,
        supply_listing_id:
          selectedSupplyListingId === 'auto' ? null : selectedSupplyListingId,
        price_offer: priceOfferNumber ?? 0,
        quantity_offer: quantityOfferNumber,
        lead_time_days: leadTimeDaysNumber,
        message: message.trim() ? message.trim() : null,
      }

      const out = await createRfqResponse(payload)
      if (!out.ok) {
        setResultMessage(String(out.error ?? 'Gagal mengirim'))
        toast({
          title: 'Gagal mengirim penawaran',
          description: String(out.error ?? 'Silakan coba lagi.'),
          variant: 'error',
        })
        return
      }

      toast({
        title: 'Penawaran terkirim',
        description: 'Jawaban RFQ Anda menunggu evaluasi pembeli.',
        variant: 'success',
      })
      setResultMessage('Penawaran terkirim. Jawaban RFQ Anda sedang dievaluasi.')
      setOpen(false)
      setPriceOffer('')
      setQuantityOffer('')
      setLeadTimeDays('')
      setMessage('')
      setSelectedSupplyListingId('auto')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetTrigger asChild>
        <Button variant="default" size="sm" className={triggerClassName}>
          {triggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto pb-4">
        <SheetHeader>
          <SheetTitle>Kirim penawaran RFQ</SheetTitle>
          <SheetDescription>
            {rfq.productName} diminta oleh {rfq.buyerOrgName}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground mx-4">
          <p>
            <span className="font-medium text-foreground">Jml:</span>{' '}
            {rfq.requiredQuantity ?? '—'}
          </p>
          <p>
            <span className="font-medium text-foreground">Rentang harga:</span>{' '}
            {rfq.priceBandLabel}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 mx-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Pasokan</label>
            <Select
              value={selectedSupplyListingId}
              onValueChange={handleSupplyListingChange}
              disabled={isLoadingOptions}
            >
              <SelectTrigger className="w-full min-w-0" size="default">
                <SelectValue
                  placeholder={
                    isLoadingOptions
                      ? 'Memuat opsi pasokan...'
                      : 'Pilih tanggal pasokan'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Pilih otomatis yang paling cocok</SelectItem>
                {supplyOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5 text-primary" />
                        {formatSupplyDate(opt)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Package className="h-3.5 w-3.5" />
                        {opt.quantity ?? '—'}
                      </span>
                      {opt.price_estimate != null ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Wallet className="h-3.5 w-3.5" />
                          {formatCurrencyIDR(opt.price_estimate)}
                        </span>
                      ) : null}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Otomatis pakai pasokan aktif terbaru untuk produk yang sama.
            </p>
          </div>

          {!isLoadingOptions && supplyOptions.length === 0 ? (
            <div className="rounded-lg border border-amber-300/70 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
              Belum ada pasokan aktif untuk produk ini. Buat pasokan dulu sebelum kirim penawaran.
            </div>
          ) : null}

          {activeSupplyDetail ? (
            <div className="rounded-lg border bg-muted/20 p-3 text-sm">
              <p className="font-medium text-foreground">
                Detail pasokan {selectedSupplyListingId === 'auto' ? '(pratinjau otomatis)' : ''}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Produk:</span>{' '}
                  {activeSupplyProduct?.name ?? rfq.productName}
                </p>
                <p>
                  <span className="font-medium text-foreground">Status:</span>{' '}
                  {activeSupplyDetail.status ?? '—'}
                </p>
                <p>
                  <span className="font-medium text-foreground">Jml:</span>{' '}
                  {activeSupplyDetail.quantity ?? '—'} {activeSupplyProduct?.unit ?? ''}
                </p>
                <p>
                  <span className="font-medium text-foreground">MOQ:</span>{' '}
                  {activeSupplyDetail.min_order_quantity ?? '—'}
                </p>
                <p>
                  <span className="font-medium text-foreground">Harga:</span>{' '}
                  {formatCurrencyIDR(activeSupplyDetail.price_estimate)}{' '}
                  {activeSupplyDetail.price_type ? `(${activeSupplyDetail.price_type})` : ''}
                </p>
                <p>
                  <span className="font-medium text-foreground">Lead time:</span>{' '}
                  {activeSupplyDetail.lead_time_days != null
                    ? `${activeSupplyDetail.lead_time_days} hari`
                    : '—'}
                </p>
                <p>
                  <span className="font-medium text-foreground">Lokasi:</span>{' '}
                  {activeSupplyDetail.supplier_location ?? '—'}
                </p>
                <p>
                  <span className="font-medium text-foreground">Kedaluwarsa:</span>{' '}
                  {activeSupplyDetail.expiration_date ?? '—'}
                </p>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="priceOffer">
              Harga penawaran
            </label>
            <Input
              id="priceOffer"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              placeholder="e.g. 45000"
              value={priceOffer}
              onChange={(e) => setPriceOffer(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="quantityOffer">
              Jumlah penawaran (opsional)
            </label>
            <Input
              id="quantityOffer"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              max={maxDemandQuantity ?? undefined}
              placeholder={
                rfq.requiredQuantity != null
                  ? `default: ${rfq.requiredQuantity}`
                  : 'mis. 1000'
              }
              value={quantityOffer}
              onChange={(e) => setQuantityOffer(e.target.value)}
            />
            {maxDemandQuantity != null ? (
              <p className="text-xs text-muted-foreground">
                Maksimum: {maxDemandQuantity}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="leadTimeDays">
              Lead time (hari, opsional)
            </label>
            <Input
              id="leadTimeDays"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              placeholder="e.g. 14"
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="message">
              Pesan (opsional)
            </label>
            <Textarea
              id="message"
              placeholder="Tambahkan syarat, sertifikasi, atau catatan pengiriman..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
            />
          </div>

          {resultMessage ? (
            <p className="text-sm text-muted-foreground">{resultMessage}</p>
          ) : null}

          <div className="pt-2">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner /> Mengirim...
                </span>
              ) : (
                'Kirim penawaran'
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}