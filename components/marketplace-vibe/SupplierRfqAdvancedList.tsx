'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowDownUp,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

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
  paymentTerms: string | null
  rfqExpiresAt: string | null
  certifications: string[]
  status: string
  createdAt: string | null
  recommended: boolean
  buyerIsVerified: boolean
  buyerCompletedDeals: number | null
  buyerOrgType: string | null
  buyerSector: string | null
  quotesCount: number
  estimatedDealValue: number | null
  marketGapPercent: number | null
  winProbability: number | null
}

type SortMode =
  | 'urgency'
  | 'newest'
  | 'value_desc'
  | 'win_desc'
  | 'competition_asc'
  | 'competition_desc'

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
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [highMarginOnly, setHighMarginOnly] = useState(false)
  const [lowCompetitionOnly, setLowCompetitionOnly] = useState(false)
  const [nearbyOnly, setNearbyOnly] = useState(false)
  const [countryFilter, setCountryFilter] = useState('')
  const [incotermFilter, setIncotermFilter] = useState('')
  const [certificationFilter, setCertificationFilter] = useState('')
  const [minQty, setMinQty] = useState('')
  const [maxQty, setMaxQty] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minWinChance, setMinWinChance] = useState('')
  const [sortBy, setSortBy] = useState<SortMode>('urgency')
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')

  const filtered = useMemo(() => {
    let out = [...items]
    const q = query.trim().toLowerCase()
    const minQtyN = minQty.trim() ? Number(minQty) : null
    const maxQtyN = maxQty.trim() ? Number(maxQty) : null
    const minPriceN = minPrice.trim() ? Number(minPrice) : null
    const maxPriceN = maxPrice.trim() ? Number(maxPrice) : null
    const minWinChanceN = minWinChance.trim() ? Number(minWinChance) : null

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
    if (verifiedOnly) {
      out = out.filter((item) => item.buyerIsVerified)
    }
    if (highMarginOnly) {
      out = out.filter((item) => (item.marketGapPercent ?? 0) >= 10)
    }
    if (lowCompetitionOnly) {
      out = out.filter((item) => item.quotesCount <= 3)
    }

    if (countryFilter.trim()) {
      const country = countryFilter.trim().toLowerCase()
      out = out.filter((item) => (item.targetLocation ?? '').toLowerCase().includes(country))
    }
    if (nearbyOnly && countryFilter.trim()) {
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
    if (minWinChanceN != null && Number.isFinite(minWinChanceN)) {
      out = out.filter((item) => (item.winProbability ?? 0) >= minWinChanceN)
    }

    out.sort((a, b) => {
      if (sortBy === 'urgency') {
        const aDays = getDaysLeft(a.rfqExpiresAt ?? a.requiredBy)
        const bDays = getDaysLeft(b.rfqExpiresAt ?? b.requiredBy)
        return (aDays ?? Number.POSITIVE_INFINITY) - (bDays ?? Number.POSITIVE_INFINITY)
      }
      if (sortBy === 'newest') {
        return (
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
        )
      }
      if (sortBy === 'value_desc') return (b.estimatedDealValue ?? 0) - (a.estimatedDealValue ?? 0)
      if (sortBy === 'win_desc') return (b.winProbability ?? 0) - (a.winProbability ?? 0)
      if (sortBy === 'competition_desc') return b.quotesCount - a.quotesCount
      return a.quotesCount - b.quotesCount
    })

    return out
  }, [
    items,
    query,
    status,
    recommendedOnly,
    verifiedOnly,
    highMarginOnly,
    lowCompetitionOnly,
    nearbyOnly,
    countryFilter,
    incotermFilter,
    certificationFilter,
    minQty,
    maxQty,
    minPrice,
    maxPrice,
    minWinChance,
    sortBy,
  ])

  const clearFilters = () => {
    setQuery('')
    setStatus('all')
    setRecommendedOnly(false)
    setVerifiedOnly(false)
    setHighMarginOnly(false)
    setLowCompetitionOnly(false)
    setNearbyOnly(false)
    setCountryFilter('')
    setIncotermFilter('')
    setCertificationFilter('')
    setMinQty('')
    setMaxQty('')
    setMinPrice('')
    setMaxPrice('')
    setMinWinChance('')
    setSortBy('urgency')
  }

  const filterInputClass = ''

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-card p-4">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="mb-3 flex w-full items-center gap-2"
          role="search"
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari produk, pembeli, atau lokasi tujuan"
            className="h-11 min-w-48 flex-1 text-base"
          />
          <Button type="submit" size="default" className="h-11 shrink-0 px-4">
            <Search className="mr-2 h-4 w-4" />
            Cari
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-11 w-11 shrink-0"
                aria-label="Pencarian AI"
                onClick={() => setIsAiModalOpen(true)}
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pencarian AI</TooltipContent>
          </Tooltip>
        </form>

        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Filter lanjutan
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as 'all' | 'active' | 'receiving_quotes')
            }
            className={`rounded-md border bg-background px-2 ${filterInputClass}`}
          >
            <option value="all">Semua status</option>
            <option value="active">Aktif</option>
            <option value="receiving_quotes">Menerima penawaran</option>
          </select>
          <Input
            value={minQty}
            onChange={(e) => setMinQty(e.target.value)}
            placeholder="Jml min"
            className={filterInputClass}
          />
          <Input
            value={maxQty}
            onChange={(e) => setMaxQty(e.target.value)}
            placeholder="Jml maks"
            className={filterInputClass}
          />
          <Input
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Harga min (IDR)"
            className={filterInputClass}
          />
          <Input
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Harga maks (IDR)"
            className={filterInputClass}
          />
          <Input
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            placeholder="Negara / lokasi tujuan"
            className={filterInputClass}
          />
          <Input
            value={minWinChance}
            onChange={(e) => setMinWinChance(e.target.value)}
            placeholder="Peluang menang min (%)"
            className={filterInputClass}
          />
          <Input
            value={incotermFilter}
            onChange={(e) => setIncotermFilter(e.target.value)}
            placeholder="Incoterm (FOB/CIF)"
            className={filterInputClass}
          />
          <Input
            value={certificationFilter}
            onChange={(e) => setCertificationFilter(e.target.value)}
            placeholder="Sertifikasi"
            className={filterInputClass}
          />
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-[10px] text-muted-foreground">Cepat</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant={recommendedOnly ? 'secondary' : 'outline'}
                  className="h-8 w-8"
                  aria-pressed={recommendedOnly}
                  onClick={() => setRecommendedOnly((v) => !v)}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Direkomendasikan</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant={verifiedOnly ? 'secondary' : 'outline'}
                  className="h-8 w-8"
                  aria-pressed={verifiedOnly}
                  onClick={() => setVerifiedOnly((v) => !v)}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Pembeli terverifikasi</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant={highMarginOnly ? 'secondary' : 'outline'}
                  className="h-8 w-8"
                  aria-pressed={highMarginOnly}
                  onClick={() => setHighMarginOnly((v) => !v)}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Margin tinggi</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant={lowCompetitionOnly ? 'secondary' : 'outline'}
                  className="h-8 w-8"
                  aria-pressed={lowCompetitionOnly}
                  onClick={() => setLowCompetitionOnly((v) => !v)}
                >
                  <Users className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Kompetisi rendah</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant={nearbyOnly ? 'secondary' : 'outline'}
                  className="h-8 w-8"
                  aria-pressed={nearbyOnly}
                  onClick={() => setNearbyOnly((v) => !v)}
                >
                  <MapPin className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Pengiriman terdekat (pakai filter lokasi tujuan)
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <ArrowDownUp className="h-3.5 w-3.5 text-primary" />
                  Urutkan
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy('urgency')}>Paling mendesak</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('newest')}>Terbaru</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('value_desc')}>Nilai deal tertinggi</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('win_desc')}>Peluang menang tertinggi</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('competition_asc')}>Kompetisi terendah</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('competition_desc')}>Kompetisi tertinggi</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
              Hapus filter
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{filtered.length} RFQ</span>
        {recommendedOnly ? <Badge variant="secondary">Direkomendasikan</Badge> : null}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          Tidak ada RFQ yang cocok dengan filter Anda.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((item) => {
            const priceBand =
              formatCurrencyRangeIDR(item.priceFrom, item.priceTo, 'Tidak ditentukan')
            const daysLeft = getDaysLeft(item.requiredBy)
            const tags: string[] = []
            if (daysLeft != null && daysLeft <= 3 && daysLeft >= 0) {
              tags.push(`Mendesak (tersisa ${daysLeft} hr)`)
            }
            if (item.recommended) {
              tags.push('Permintaan tinggi')
            }
            if ((item.priceTo ?? 0) > 0 && (item.priceTo ?? 0) >= 1000) {
              tags.push('Di atas harga pasar')
            }
            if ((item.estimatedDealValue ?? 0) >= 100000000) {
              tags.push('Nilai tinggi')
            }
            if (item.quotesCount <= 2) {
              tags.push('Kompetisi rendah')
            }
            const ctaLabel =
              daysLeft != null && daysLeft <= 1
                ? `Ajukan (tutup ${Math.max(daysLeft, 0)} hr)`
                : item.quotesCount <= 2
                  ? 'Ajukan (kompetisi rendah)'
                  : `Ajukan (${item.quotesCount} bidding)`

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
                  quantityLabel={`${item.requiredQuantity && item.requiredQuantity > 0 ? item.requiredQuantity : 'Belum ditentukan'} ${item.productUnit ?? ''}`}
                  priceBandLabel={priceBand}
                  statusLabel={item.status}
                  targetCountry={item.targetLocation}
                  incoterms={item.incoterms}
                  requiredBy={item.requiredBy}
                  paymentTerms={item.paymentTerms}
                  rfqExpiresAt={item.rfqExpiresAt}
                  specSummary={item.specSummary}
                  certifications={item.certifications}
                  productCategory={item.productCategory}
                  opportunityTags={tags}
                  recommended={item.recommended}
                  buyerIsVerified={item.buyerIsVerified}
                  buyerCompletedDeals={item.buyerCompletedDeals}
                  buyerOrgType={item.buyerOrgType}
                  buyerSector={item.buyerSector}
                  quotesCount={item.quotesCount}
                  estimatedDealValue={item.estimatedDealValue}
                  marketGapPercent={item.marketGapPercent}
                  winProbability={item.winProbability}
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
                        triggerLabel={ctaLabel}
                        triggerClassName="h-10 w-full text-sm font-semibold"
                      />
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <Link href={`/marketplace/demand/${item.id}`}>Lihat detail</Link>
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
            <DialogTitle>Pencarian AI</DialogTitle>
            <DialogDescription>
              Jelaskan apa yang ingin Anda cari.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Contoh: Cari RFQ mendesak dengan skor pembeli tinggi dan lead time di bawah 7 hari."
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
