'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { QuoteStatusBadge } from '@/components/marketplace-vibe/QuoteStatusBadge'
import { RfqResponseDecisionActions } from '@/components/marketplace-vibe/RfqResponseDecisionActions'
import { formatCreditScore, formatCurrencyIDR } from '@/lib/utils'

type QuoteItem = {
  id: string
  status: 'pending' | 'accepted' | 'rejected'
  supplyListingId: string | null
  priceOffer: number | null
  quantityOffer: number | null
  leadTimeDays: number | null
  supplierName: string
  supplierOrganizationId: string | null
  supplierLogoUrl: string | null
  supplierCreditScore: number | null
  buyerName: string
  buyerOrganizationId: string | null
  productName: string
  imageUrl: string | null
  supplierLocation: string | null
  expirationDate: string | null
}

type SortMode =
  | 'latest'
  | 'price_desc'
  | 'price_asc'
  | 'qty_desc'
  | 'lead_time_asc'
  | 'score_desc'

export function BuyerQuotesAdvancedList({
  items,
  canDecide,
}: {
  items: QuoteItem[]
  canDecide: boolean
}) {
  const [query, setQuery] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minQty, setMinQty] = useState('')
  const [maxQty, setMaxQty] = useState('')
  const [maxLeadTime, setMaxLeadTime] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [minSupplierScore, setMinSupplierScore] = useState('')
  const [sortBy, setSortBy] = useState<SortMode>('latest')
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')

  const filtered = useMemo(() => {
    let out = [...items]
    const q = query.trim().toLowerCase()
    const minPriceN = minPrice.trim() ? Number(minPrice) : null
    const maxPriceN = maxPrice.trim() ? Number(maxPrice) : null
    const minQtyN = minQty.trim() ? Number(minQty) : null
    const maxQtyN = maxQty.trim() ? Number(maxQty) : null
    const maxLeadTimeN = maxLeadTime.trim() ? Number(maxLeadTime) : null
    const minSupplierScoreN = minSupplierScore.trim() ? Number(minSupplierScore) : null

    if (q) {
      out = out.filter((item) => {
        return (
          item.productName.toLowerCase().includes(q) ||
          item.supplierName.toLowerCase().includes(q) ||
          item.buyerName.toLowerCase().includes(q)
        )
      })
    }

    if (locationFilter.trim()) {
      const loc = locationFilter.trim().toLowerCase()
      out = out.filter((item) => (item.supplierLocation ?? '').toLowerCase().includes(loc))
    }

    if (minPriceN != null && Number.isFinite(minPriceN)) {
      out = out.filter((item) => (item.priceOffer ?? 0) >= minPriceN)
    }
    if (maxPriceN != null && Number.isFinite(maxPriceN)) {
      out = out.filter((item) => (item.priceOffer ?? 0) <= maxPriceN)
    }
    if (minQtyN != null && Number.isFinite(minQtyN)) {
      out = out.filter((item) => (item.quantityOffer ?? 0) >= minQtyN)
    }
    if (maxQtyN != null && Number.isFinite(maxQtyN)) {
      out = out.filter((item) => (item.quantityOffer ?? 0) <= maxQtyN)
    }
    if (maxLeadTimeN != null && Number.isFinite(maxLeadTimeN)) {
      out = out.filter((item) => (item.leadTimeDays ?? Number.MAX_SAFE_INTEGER) <= maxLeadTimeN)
    }
    if (minSupplierScoreN != null && Number.isFinite(minSupplierScoreN)) {
      out = out.filter(
        (item) => (item.supplierCreditScore ?? 95) >= Math.max(0, Math.min(100, minSupplierScoreN))
      )
    }

    out.sort((a, b) => {
      if (sortBy === 'price_desc') return (b.priceOffer ?? 0) - (a.priceOffer ?? 0)
      if (sortBy === 'price_asc') return (a.priceOffer ?? 0) - (b.priceOffer ?? 0)
      if (sortBy === 'qty_desc') return (b.quantityOffer ?? 0) - (a.quantityOffer ?? 0)
      if (sortBy === 'lead_time_asc') {
        return (a.leadTimeDays ?? Number.MAX_SAFE_INTEGER) - (b.leadTimeDays ?? Number.MAX_SAFE_INTEGER)
      }
      if (sortBy === 'score_desc') return (b.supplierCreditScore ?? 95) - (a.supplierCreditScore ?? 95)
      return 0
    })

    return out
  }, [
    items,
    query,
    minPrice,
    maxPrice,
    minQty,
    maxQty,
    maxLeadTime,
    locationFilter,
    minSupplierScore,
    sortBy,
  ])

  const clearFilters = () => {
    setQuery('')
    setMinPrice('')
    setMaxPrice('')
    setMinQty('')
    setMaxQty('')
    setMaxLeadTime('')
    setLocationFilter('')
    setMinSupplierScore('')
    setSortBy('latest')
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3">
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex w-full items-center gap-2"
            role="search"
          >
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search supplier, buyer, or product"
              className="h-11 text-base"
            />
            <Button type="submit" size="default" className="h-11 px-4">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-11 w-11"
              aria-label="AI Search"
              onClick={() => setIsAiModalOpen(true)}
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </form>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min price (IDR)" />
          <Input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max price (IDR)" />
          <Input value={minQty} onChange={(e) => setMinQty(e.target.value)} placeholder="Min qty" />
          <Input value={maxQty} onChange={(e) => setMaxQty(e.target.value)} placeholder="Max qty" />
          <Input value={maxLeadTime} onChange={(e) => setMaxLeadTime(e.target.value)} placeholder="Max lead time (days)" />
          <Input value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} placeholder="Supplier location" />
          <Input
            value={minSupplierScore}
            onChange={(e) => setMinSupplierScore(e.target.value)}
            placeholder="Min supplier score"
          />
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy('latest')}>Latest</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('price_desc')}>Price high to low</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('price_asc')}>Price low to high</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('qty_desc')}>Qty high to low</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('lead_time_asc')}>Lead time fastest</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('score_desc')}>Supplier score high to low</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} quote(s)</p>

      <ul className="grid gap-3">
        {filtered.map((item) => (
          <li key={item.id}>
            <Card>
              <CardContent className="p-4 flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="relative h-16 w-20 overflow-hidden rounded-md border">
                    <Image
                      src={item.imageUrl ?? '/dummy-cabe.png'}
                      alt={item.productName || 'Supply product'}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">{item.productName || 'Product'}</p>
                    <p className="text-sm text-muted-foreground">
                      Buyer:{' '}
                      {item.buyerOrganizationId ? (
                        <Link href={`/marketplace/account/${item.buyerOrganizationId}`} className="hover:underline">
                          {item.buyerName}
                        </Link>
                      ) : (
                        item.buyerName
                      )}{' '}
                      | Supplier:{' '}
                      {item.supplierOrganizationId ? (
                        <Link href={`/marketplace/account/${item.supplierOrganizationId}`} className="hover:underline">
                          {item.supplierName}
                        </Link>
                      ) : (
                        item.supplierName
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supplier credit score: {formatCreditScore(item.supplierCreditScore)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Offer: {formatCurrencyIDR(item.priceOffer)}
                      {item.quantityOffer != null ? ` x ${item.quantityOffer}` : ''}
                      {item.leadTimeDays != null ? ` | Lead time: ${item.leadTimeDays} days` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Location: {item.supplierLocation ?? '-'} | Expires: {item.expirationDate ?? '-'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <QuoteStatusBadge status={item.status} />
                  {item.supplyListingId ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/marketplace/supply/${item.supplyListingId}`}>View supply details</Link>
                    </Button>
                  ) : null}
                  {canDecide ? <RfqResponseDecisionActions responseId={item.id} /> : null}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <p className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          No quotes match your filters.
        </p>
      ) : null}

      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Search</DialogTitle>
            <DialogDescription>
              Describe what you want to search.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Example: Find reliable suppliers with fast lead time under 7 days and score above 90."
            rows={5}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAiModalOpen(false)}>
              Close
            </Button>
            <Button type="button" onClick={() => setIsAiModalOpen(false)}>
              Search with AI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
