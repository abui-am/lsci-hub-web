'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  BadgeCheck,
  CalendarClock,
  CircleDollarSign,
  Globe2,
  Pencil,
  Scale,
  UserRound,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrencyIDR, formatCurrencyRangeIDR } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type DemandListItem = {
  id: string
  productName: string
  productUnit: string | null
  buyerName: string
  requiredQuantity: number | null
  priceFrom: number | null
  priceTo: number | null
  targetLabel: string
  requiredBy: string | null
  imageUrl: string | null
  isOpenForBidding: boolean
  createdAt: string | null
  acceptedQuotes: Array<{
    id: string
    supplierName: string
    quantityOffer: number | null
    priceOffer: number | null
  }>
}

type SortMode = 'newest' | 'qty_desc' | 'qty_asc' | 'required_by_asc'

export function DemandAdvancedList({ items }: { items: DemandListItem[] }) {
  const [query, setQuery] = useState('')
  const [bidding, setBidding] = useState<'all' | 'open' | 'closed'>('all')
  const [minQty, setMinQty] = useState('')
  const [maxQty, setMaxQty] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sortBy, setSortBy] = useState<SortMode>('newest')

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
          item.targetLabel.toLowerCase().includes(q)
        )
      })
    }

    if (bidding !== 'all') {
      out = out.filter((item) => (bidding === 'open' ? item.isOpenForBidding : !item.isOpenForBidding))
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
      return (
        new Date(a.requiredBy ?? '9999-12-31').getTime() -
        new Date(b.requiredBy ?? '9999-12-31').getTime()
      )
    })
    return out
  }, [items, query, bidding, minQty, maxQty, minPrice, maxPrice, sortBy])

  const clearFilters = () => {
    setQuery('')
    setBidding('all')
    setMinQty('')
    setMaxQty('')
    setMinPrice('')
    setMaxPrice('')
    setSortBy('newest')
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari permintaan menurut produk, pembeli, atau tujuan"
          />
          <select
            value={bidding}
            onChange={(e) => setBidding(e.target.value as 'all' | 'open' | 'closed')}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">Semua status lelang</option>
            <option value="open">Terbuka</option>
            <option value="closed">Ditutup</option>
          </select>
          <Input value={minQty} onChange={(e) => setMinQty(e.target.value)} placeholder="Jml min" />
          <Input value={maxQty} onChange={(e) => setMaxQty(e.target.value)} placeholder="Jml maks" />
          <Input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Harga min" />
          <Input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Harga maks" />
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Urutkan
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy('newest')}>Terbaru</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('qty_desc')}>
                  Jumlah tinggi ke rendah
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('qty_asc')}>
                  Jumlah rendah ke tinggi
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('required_by_asc')}>
                  Deadline paling dekat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Hapus
            </Button>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} listing permintaan</p>

      {filtered.length === 0 ? (
        <p className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          Tidak ada listing permintaan yang cocok dengan filter Anda.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => {
            const band =
              formatCurrencyRangeIDR(item.priceFrom, item.priceTo)
            return (
              <li key={item.id}>
                <Card className="h-full">
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-xl">
                    <Image
                      src={item.imageUrl ?? '/dummy-cabe.png'}
                      alt={item.productName}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{item.productName}</CardTitle>
                      <Badge variant={item.isOpenForBidding ? 'success' : 'outline'}>
                        {item.isOpenForBidding ? 'Terbuka' : 'Ditutup'}
                      </Badge>
                    </div>
                    <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <UserRound className="h-3.5 w-3.5" />
                      {item.buyerName}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Scale className="h-3.5 w-3.5" />
                        Jumlah yang dibutuhkan:
                      </span>{' '}
                      {item.requiredQuantity ?? '-'} {item.productUnit ?? ''}
                    </p>
                    <p>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <CircleDollarSign className="h-3.5 w-3.5" />
                        Rentang harga:
                      </span>{' '}
                      {band}
                    </p>
                    <p>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Globe2 className="h-3.5 w-3.5" />
                        Tujuan:
                      </span>{' '}
                      {item.targetLabel || '-'}
                    </p>
                    <p>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Dibutuhkan pada:
                      </span>{' '}
                      {item.requiredBy ?? '-'}
                    </p>
                    <div>
                      <p className="inline-flex items-center gap-1 text-muted-foreground">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        Penawaran diterima:
                      </p>
                      {item.acceptedQuotes.length === 0 ? (
                        <p>-</p>
                      ) : (
                        <div className="space-y-1">
                          {item.acceptedQuotes.map((q) => (
                            <p key={q.id}>
                              {q.supplierName}: {q.quantityOffer ?? '-'}
                              {q.priceOffer != null ? ` @ ${formatCurrencyIDR(q.priceOffer)}` : ''}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/marketplace/demand/${item.id}`}>Detail</Link>
                      </Button>
                      <Button asChild size="sm">
                        <Link href={`/marketplace/demand/edit/${item.id}`}>
                          <Pencil className="size-3.5" aria-hidden />
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
