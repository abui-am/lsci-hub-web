'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  CalendarClock,
  CircleDollarSign,
  MapPin,
  Package2,
  Search,
  Sparkles,
  Truck,
} from 'lucide-react'
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
import { TradeChatSheet } from '@/components/marketplace-vibe/TradeChatSheet'
import { OrganizationIdentityBadge } from '@/components/marketplace-vibe/OrganizationIdentityBadge'
import { formatCreditScore, formatCurrencyIDR } from '@/lib/utils'

type QuoteItem = {
  id: string
  demandListingId: string | null
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
  buyerLogoUrl: string | null
  buyerCreditScore: number | null
  productName: string
  imageUrl: string | null
  demandImageUrl: string | null
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

function resolveImageSrc(value: string | null | undefined): string | null {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return null
  if (/^https?:\/\//.test(raw) || raw.startsWith('/')) return raw
  return `/${raw.replace(/^\/+/, '')}`
}

export function BuyerQuotesAdvancedList({
  items,
  canDecide,
  viewerProfileId,
}: {
  items: QuoteItem[]
  canDecide: boolean
  viewerProfileId: string
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
              placeholder="Cari pemasok, pembeli, atau produk"
              className="h-11 text-base"
            />
            <Button type="submit" size="default" className="h-11 px-4">
              <Search className="mr-2 h-4 w-4" />
              Cari
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-11 w-11"
              aria-label="Pencarian AI"
              onClick={() => setIsAiModalOpen(true)}
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </form>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Harga min (IDR)" />
          <Input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Harga maks (IDR)" />
          <Input value={minQty} onChange={(e) => setMinQty(e.target.value)} placeholder="Jml min" />
          <Input value={maxQty} onChange={(e) => setMaxQty(e.target.value)} placeholder="Jml maks" />
          <Input value={maxLeadTime} onChange={(e) => setMaxLeadTime(e.target.value)} placeholder="Lead time maks (hari)" />
          <Input value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} placeholder="Lokasi pemasok" />
          <Input
            value={minSupplierScore}
            onChange={(e) => setMinSupplierScore(e.target.value)}
            placeholder="Skor pemasok min"
          />
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Urutkan
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy('latest')}>Terbaru</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('price_desc')}>Harga tinggi ke rendah</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('price_asc')}>Harga rendah ke tinggi</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('qty_desc')}>Jumlah tinggi ke rendah</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('lead_time_asc')}>Lead time tercepat</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('score_desc')}>Skor pemasok tinggi ke rendah</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Hapus
            </Button>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} penawaran</p>

      <ul className="grid gap-3">
        {filtered.map((item) => {
          const supplyImageSrc = resolveImageSrc(item.imageUrl) ?? '/dummy-cabe.png'
          const demandImageSrc = resolveImageSrc(item.demandImageUrl) ?? '/dummy-cabe.png'
          return (
            <li key={item.id}>
              <Card>
                <CardContent className="p-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          RFQ
                        </p>
                        <div className="relative h-16 w-20 overflow-hidden rounded-md border">
                          <Image
                            src={demandImageSrc}
                            alt={`RFQ ${item.productName || 'produk'}`}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Pasokan
                        </p>
                        <div className="relative h-16 w-20 overflow-hidden rounded-md border">
                          <Image
                            src={supplyImageSrc}
                            alt={`Pasokan ${item.productName || 'produk'}`}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        </div>
                      </div>
                    </div>
                  <div className="space-y-1">
                    <p className="font-medium">{item.productName || 'Produk'}</p>
                    <div className="grid gap-1 md:grid-cols-2">
                      <OrganizationIdentityBadge
                        name={item.buyerName}
                        logoUrl={item.buyerLogoUrl}
                        accountHref={
                          item.buyerOrganizationId
                            ? `/marketplace/account/${item.buyerOrganizationId}`
                            : undefined
                        }
                        creditScore={item.buyerCreditScore}
                        roleLabel="Pembeli"
                        containerClassName="bg-muted/30 p-1.5"
                      />
                      <OrganizationIdentityBadge
                        name={item.supplierName}
                        logoUrl={item.supplierLogoUrl}
                        accountHref={
                          item.supplierOrganizationId
                            ? `/marketplace/account/${item.supplierOrganizationId}`
                            : undefined
                        }
                        creditScore={item.supplierCreditScore}
                        roleLabel="Pemasok"
                        containerClassName="bg-muted/30 p-1.5"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground sm:text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <CircleDollarSign className="h-3.5 w-3.5 text-primary" />
                        <span>
                          Penawaran: {formatCurrencyIDR(item.priceOffer)}
                          {item.quantityOffer != null ? ` x ${item.quantityOffer}` : ''}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5 text-primary" />
                        <span>
                          Lead time: {item.leadTimeDays != null ? `${item.leadTimeDays} hari` : '-'}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Package2 className="h-3.5 w-3.5 text-primary" />
                        <span>Skor: {formatCreditScore(item.supplierCreditScore)}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        <span>{item.supplierLocation ?? '-'}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5 text-primary" />
                        <span>Kedaluwarsa: {item.expirationDate ?? '-'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <QuoteStatusBadge status={item.status} />
                  {item.supplyListingId ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/marketplace/supply/${item.supplyListingId}`}>Lihat detail pasokan</Link>
                    </Button>
                  ) : null}
                  {item.demandListingId && item.supplierOrganizationId ? (
                    <TradeChatSheet
                      viewerProfileId={viewerProfileId}
                      otherPartyName={item.supplierName}
                      triggerLabel="Chat supplier"
                      context={{
                        type: 'rfq',
                        demandListingId: item.demandListingId,
                        supplierOrganizationId: item.supplierOrganizationId,
                      }}
                    />
                  ) : null}
                  {canDecide ? <RfqResponseDecisionActions responseId={item.id} /> : null}
                </div>
                </CardContent>
              </Card>
            </li>
          )
        })}
      </ul>

      {filtered.length === 0 ? (
        <p className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          Tidak ada penawaran yang cocok dengan filter Anda.
        </p>
      ) : null}

      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pencarian AI</DialogTitle>
            <DialogDescription>
              Jelaskan apa yang ingin Anda cari.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Contoh: Cari pemasok terpercaya dengan lead time di bawah 7 hari dan skor di atas 90."
            rows={5}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAiModalOpen(false)}>
              Tutup
            </Button>
            <Button type="button" onClick={() => setIsAiModalOpen(false)}>
              Cari dengan AI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
