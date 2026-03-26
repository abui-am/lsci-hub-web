'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrencyRangeIDR } from '@/lib/utils'
import { RfqCard } from '@/components/marketplace-vibe/RfqCard'
import { RfqRespondSheet } from '@/components/dashboard/marketplace/RfqRespondSheet'
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

type OpenRfqItem = {
  id: string
  productName: string
  productUnit: string | null
  productCategory: string | null
  buyerName: string
  buyerOrganizationId: string | null
  buyerLogoUrl: string | null
  buyerCreditScore: number | null
  requiredQuantity: number | null
  priceFrom: number | null
  priceTo: number | null
  requiredBy: string | null
  specSummary: string | null
  targetLocation: string | null
  incoterms: string | null
  certifications: string[]
  status: string
  createdAt: string | null
  recommended: boolean
}

type SortMode = 'newest' | 'qty_desc' | 'qty_asc' | 'price_desc' | 'price_asc'

function getDaysLeft(requiredBy: string | null): number | null {
  if (!requiredBy) return null
  const requiredDate = new Date(requiredBy)
  if (Number.isNaN(requiredDate.getTime())) return null
  const now = new Date()
  const diffMs = requiredDate.getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export function SupplierRfqAdvancedList({ items }: { items: OpenRfqItem[] }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'receiving_quotes'>('all')
  const [recommendedOnly, setRecommendedOnly] = useState(false)
  const [countryFilter, setCountryFilter] = useState('')
  const [incotermFilter, setIncotermFilter] = useState('')
  const [certificationFilter, setCertificationFilter] = useState('')
  const [minQty, setMinQty] = useState('')
  const [maxQty, setMaxQty] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sortBy, setSortBy] = useState<SortMode>('newest')
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')

  const filtered = useMemo(() => {
    let out = [...items]
    const q = query.trim().toLowerCase()
    const minQtyN = minQty.trim() ? Number(minQty) : null
    const maxQtyN = maxQty.trim() ? Number(maxQty) : null
    const minPriceN = minPrice.trim() ? Number(minPrice) : null
    const maxPriceN = maxPrice.trim() ? Number(maxPrice) : null

    if (q) {
      out = out.filter((item) => {
        return (
          item.productName.toLowerCase().includes(q) ||
          item.buyerName.toLowerCase().includes(q) ||
          (item.targetLocation ?? '').toLowerCase().includes(q)
        )
      })
    }

    if (status !== 'all') {
      out = out.filter((item) => item.status === status)
    }

    if (recommendedOnly) {
      out = out.filter((item) => item.recommended)
    }

    if (countryFilter.trim()) {
      const country = countryFilter.trim().toLowerCase()
      out = out.filter((item) => (item.targetLocation ?? '').toLowerCase().includes(country))
    }
    if (incotermFilter.trim()) {
      const term = incotermFilter.trim().toLowerCase()
      out = out.filter((item) => (item.incoterms ?? '').toLowerCase().includes(term))
    }
    if (certificationFilter.trim()) {
      const cert = certificationFilter.trim().toLowerCase()
      out = out.filter((item) =>
        item.certifications.some((c) => c.toLowerCase().includes(cert))
      )
    }

    if (minQtyN != null && Number.isFinite(minQtyN)) {
      out = out.filter((item) => (item.requiredQuantity ?? 0) >= minQtyN)
    }
    if (maxQtyN != null && Number.isFinite(maxQtyN)) {
      out = out.filter((item) => (item.requiredQuantity ?? 0) <= maxQtyN)
    }

    if (minPriceN != null && Number.isFinite(minPriceN)) {
      out = out.filter((item) => (item.priceFrom ?? 0) >= minPriceN)
    }
    if (maxPriceN != null && Number.isFinite(maxPriceN)) {
      out = out.filter((item) => (item.priceTo ?? 0) <= maxPriceN)
    }

    out.sort((a, b) => {
      if (sortBy === 'newest') {
        return (
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
        )
      }
      if (sortBy === 'qty_desc') return (b.requiredQuantity ?? 0) - (a.requiredQuantity ?? 0)
      if (sortBy === 'qty_asc') return (a.requiredQuantity ?? 0) - (b.requiredQuantity ?? 0)
      if (sortBy === 'price_desc') return (b.priceTo ?? 0) - (a.priceTo ?? 0)
      return (a.priceFrom ?? 0) - (b.priceFrom ?? 0)
    })

    return out
  }, [
    items,
    query,
    status,
    recommendedOnly,
    countryFilter,
    incotermFilter,
    certificationFilter,
    minQty,
    maxQty,
    minPrice,
    maxPrice,
    sortBy,
  ])

  const clearFilters = () => {
    setQuery('')
    setStatus('all')
    setRecommendedOnly(false)
    setCountryFilter('')
    setIncotermFilter('')
    setCertificationFilter('')
    setMinQty('')
    setMaxQty('')
    setMinPrice('')
    setMaxPrice('')
    setSortBy('newest')
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
              placeholder="Search product, buyer, or target location"
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
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as 'all' | 'active' | 'receiving_quotes')
            }
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="receiving_quotes">Receiving quotes</option>
          </select>
          <Input
            value={minQty}
            onChange={(e) => setMinQty(e.target.value)}
            placeholder="Min qty"
          />
          <Input
            value={maxQty}
            onChange={(e) => setMaxQty(e.target.value)}
            placeholder="Max qty"
          />
          <Input
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Min price"
          />
          <Input
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Max price"
          />
          <Input
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            placeholder="Country / target location"
          />
          <Input
            value={incotermFilter}
            onChange={(e) => setIncotermFilter(e.target.value)}
            placeholder="Incoterm (FOB/CIF)"
          />
          <Input
            value={certificationFilter}
            onChange={(e) => setCertificationFilter(e.target.value)}
            placeholder="Certification"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-md border px-3 text-sm"
              onClick={() => setRecommendedOnly((v) => !v)}
            >
              {recommendedOnly ? 'Recommended only: on' : 'Recommended only: off'}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy('newest')}>Newest</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('qty_desc')}>
                  Qty high to low
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('qty_asc')}>
                  Qty low to high
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('price_desc')}>
                  Price high to low
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('price_asc')}>
                  Price low to high
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{filtered.length} RFQ</span>
        {recommendedOnly ? <Badge variant="secondary">Recommended</Badge> : null}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          No RFQs match your filters.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => {
            const priceBand =
              formatCurrencyRangeIDR(item.priceFrom, item.priceTo, 'Not specified')
            const daysLeft = getDaysLeft(item.requiredBy)
            const tags: string[] = []
            if (daysLeft != null && daysLeft <= 3 && daysLeft >= 0) {
              tags.push(`Urgent (${daysLeft}d left)`)
            }
            if (item.recommended) {
              tags.push('High demand')
            }
            if ((item.priceTo ?? 0) > 0 && (item.priceTo ?? 0) >= 1000) {
              tags.push('Above market price')
            }

            return (
              <li key={item.id}>
                <RfqCard
                  productName={item.productName}
                  buyerName={item.buyerName}
                  buyerAccountHref={
                    item.buyerOrganizationId
                      ? `/marketplace/account/${item.buyerOrganizationId}`
                      : undefined
                  }
                  buyerLogoUrl={item.buyerLogoUrl}
                  buyerCreditScore={item.buyerCreditScore}
                  quantityLabel={`${item.requiredQuantity && item.requiredQuantity > 0 ? item.requiredQuantity : 'TBD'} ${item.productUnit ?? ''}`}
                  priceBandLabel={priceBand}
                  statusLabel={item.status}
                  targetCountry={item.targetLocation}
                  incoterms={item.incoterms}
                  requiredBy={item.requiredBy}
                  specSummary={item.specSummary}
                  certifications={item.certifications}
                  productCategory={item.productCategory}
                  opportunityTags={tags}
                  recommended={item.recommended}
                  action={
                    <div className="grid w-full gap-2">
                      <RfqRespondSheet
                        rfq={{
                          demandListingId: item.id,
                          productName: item.productName,
                          buyerOrgName: item.buyerName,
                          requiredQuantity: item.requiredQuantity,
                          priceBandLabel: priceBand,
                        }}
                        triggerLabel="Quote now"
                        triggerClassName="w-full h-10 text-sm font-semibold"
                      />
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <Link href={`/marketplace/demand/${item.id}`}>View detail</Link>
                      </Button>
                    </div>
                  }
                />
              </li>
            )
          })}
        </ul>
      )}

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
            placeholder="Example: Find urgent RFQs with high buyer score and lead time under 7 days."
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
