'use client'

import { useMemo, useState } from 'react'
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
    return { ok: false as const, error: 'Request failed' }
  }

  return { ok: true as const }
}

export function RfqRespondSheet({ rfq }: { rfq: OpenRfqForResponse }) {
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
    if (priceOfferNumber == null || priceOfferNumber <= 0) return false
    if (quantityOfferNumber != null && quantityOfferNumber <= 0) return false
    if (maxDemandQuantity != null && quantityOfferNumber != null && quantityOfferNumber > maxDemandQuantity) {
      return false
    }
    if (leadTimeDaysNumber != null && leadTimeDaysNumber < 0) return false
    return true
  }, [priceOfferNumber, quantityOfferNumber, maxDemandQuantity, leadTimeDaysNumber])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) {
      setResultMessage(
        'Please enter a valid price (> 0). Quantity must not exceed the RFQ demand quantity.'
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
        setResultMessage(String(out.error ?? 'Failed to submit'))
        toast({
          title: 'Failed to send quote',
          description: String(out.error ?? 'Please try again.'),
          variant: 'error',
        })
        return
      }

      toast({
        title: 'Quote sent',
        description: 'Your RFQ response is now pending buyer evaluation.',
        variant: 'success',
      })
      setResultMessage('Quote sent. Your RFQ response is pending evaluation.')
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
        <Button variant="default" size="sm">
          Send quote
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Send RFQ quote</SheetTitle>
          <SheetDescription>
            {rfq.productName} requested by {rfq.buyerOrgName}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground mx-4">
          <p>
            <span className="font-medium text-foreground">Qty:</span>{' '}
            {rfq.requiredQuantity ?? '—'}
          </p>
          <p>
            <span className="font-medium text-foreground">Price band:</span>{' '}
            {rfq.priceBandLabel}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 mx-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Supply listing</label>
            <Select
              value={selectedSupplyListingId}
              onValueChange={handleSupplyListingChange}
              disabled={isLoadingOptions}
            >
              <SelectTrigger className="w-full min-w-0" size="default">
                <SelectValue
                  placeholder={
                    isLoadingOptions
                      ? 'Loading supply options...'
                      : 'Select supply listing'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto select best match</SelectItem>
                {supplyOptions.map((opt, index) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    Listing #{index + 1} - qty {opt.quantity ?? '—'}
                    {opt.price_estimate != null ? ` - price ${opt.price_estimate}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Auto mode picks your latest active listing for the same product.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="priceOffer">
              Price offer
            </label>
            <Input
              id="priceOffer"
              inputMode="decimal"
              placeholder="e.g. 45000"
              value={priceOffer}
              onChange={(e) => setPriceOffer(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="quantityOffer">
              Quantity offer (optional)
            </label>
            <Input
              id="quantityOffer"
              inputMode="decimal"
              max={maxDemandQuantity ?? undefined}
              placeholder={
                rfq.requiredQuantity != null
                  ? `default: ${rfq.requiredQuantity}`
                  : 'e.g. 1000'
              }
              value={quantityOffer}
              onChange={(e) => setQuantityOffer(e.target.value)}
            />
            {maxDemandQuantity != null ? (
              <p className="text-xs text-muted-foreground">
                Max allowed: {maxDemandQuantity}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="leadTimeDays">
              Lead time (days, optional)
            </label>
            <Input
              id="leadTimeDays"
              inputMode="numeric"
              placeholder="e.g. 14"
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="message">
              Message (optional)
            </label>
            <Textarea
              id="message"
              placeholder="Add conditions, certifications, or delivery notes..."
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
                  <Spinner /> Sending...
                </span>
              ) : (
                'Send quote'
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}