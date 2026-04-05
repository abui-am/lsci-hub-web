import { createClient } from '@/lib/supabase/server'
import { relationOne } from '@/lib/supabase/relation'
import { requireSession } from '@/lib/rbac/guards'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { MarketplaceHeader } from '@/components/marketplace-vibe/MarketplaceHeader'
import { formatCurrencyRangeIDR } from '@/lib/utils'

function resolveImageSrc(value: string | null | undefined): string {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return '/dummy-cabe.png'
  if (/^https?:\/\//.test(raw) || raw.startsWith('/')) return raw
  return `/${raw.replace(/^\/+/, '')}`
}

export default async function SupplyListingOfferPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const session = await requireSession()
  if (!session.profile.is_platform_superadmin && !session.profile.is_buyer) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        <h2 className="text-base font-semibold">Tidak diizinkan</h2>
        <p className="mt-2 text-muted-foreground">
          Halaman ini hanya untuk akun pembeli.
        </p>
      </div>
    )
  }

  const supabase = await createClient()

  const { data: demandRows } = await supabase
    .from('demand_listings')
    .select(
      `
      id,
      required_quantity,
      price_range_from,
      price_range_to,
      target_location,
      required_by,
      image_url,
      status,
      products ( name )
    `
    )
    .is('deleted_at', null)
    .eq('organization_id', session.organization?.id ?? '')
    .in('status', ['active', 'receiving_quotes'])
    .order('created_at', { ascending: false })
    .limit(30)

  const demands =
    demandRows?.map((row) => {
      const product = relationOne(
        row.products as { name: string | null } | { name: string | null }[] | null
      )
      return {
        id: row.id as string,
        requiredQuantity: (row.required_quantity as number | null) ?? null,
        priceBandLabel: formatCurrencyRangeIDR(
          (row.price_range_from as number | null) ?? null,
          (row.price_range_to as number | null) ?? null,
          'Tidak ditentukan'
        ),
        targetLocation: (row.target_location as string | null) ?? null,
        requiredBy: (row.required_by as string | null) ?? null,
        imageUrl: (row.image_url as string | null) ?? null,
        productName: product?.name ?? 'Produk',
        status: row.status as string,
      }
    }) ?? []
  const { q } = await searchParams
  const query = (q ?? '').trim().toLowerCase()
  const filteredDemands = query
    ? demands.filter((demand) => {
        const haystack = [
          demand.productName,
          demand.targetLocation ?? '',
          demand.status,
          demand.requiredBy ?? '',
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(query)
      })
    : demands

  return (
    <div className="space-y-6">
      <MarketplaceHeader
        title="Offer Request ke pemasok"
        description="Langkah 1 dari 2: pilih RFQ yang ingin Anda tawarkan ke pemasok."
        statsColumns={2}
        stats={[
          {
            label: 'RFQ Anda',
            value: demands.length,
          },
          {
            label: 'RFQ aktif',
            value: demands.filter((d) => d.status === 'active').length,
          },
        ]}
      />

      <form className="flex flex-col gap-2 sm:flex-row" action="/marketplace/supply-listing/offer">
        <Input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Cari RFQ (produk, lokasi, status, tanggal)"
          className="sm:max-w-md"
        />
        <div className="flex gap-2">
          <Button type="submit" size="sm">
            Cari
          </Button>
          {q ? (
            <Button asChild type="button" size="sm" variant="outline">
              <Link href="/marketplace/supply-listing/offer">Reset</Link>
            </Button>
          ) : null}
        </div>
      </form>

      {!filteredDemands.length ? (
        <p className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          {demands.length
            ? 'Tidak ada RFQ yang cocok dengan pencarian.'
            : 'Anda belum memiliki RFQ aktif untuk ditawarkan.'}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredDemands.map((demand) => (
            <li key={demand.id}>
              <Card className="h-full">
                <div className="relative h-36 w-full overflow-hidden rounded-t-xl border-b">
                  <Image
                    src={resolveImageSrc(demand.imageUrl)}
                    alt={demand.productName}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  />
                </div>
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{demand.productName}</CardTitle>
                    <Badge variant={demand.status === 'active' ? 'success' : 'outline'}>
                      {demand.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  <p>
                    <span className="text-muted-foreground">Jumlah:</span>{' '}
                    {demand.requiredQuantity ?? 'Tidak ditentukan'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Target harga:</span>{' '}
                    {demand.priceBandLabel}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Lokasi:</span>{' '}
                    {demand.targetLocation ?? 'Tidak ditentukan'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Dibutuhkan pada:</span>{' '}
                    {demand.requiredBy ?? 'Tidak ditentukan'}
                  </p>
                  <Button asChild className="mt-3 w-full" size="sm">
                    <Link
                      href={`/marketplace/supply-listing/offer/browse?rfqId=${demand.id}`}
                    >
                      Pilih RFQ ini
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

