import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { relationOne } from '@/lib/supabase/relation'
import { requireSession } from '@/lib/rbac/guards'
import { ArrowLeft } from 'lucide-react'
import { RfqRespondSheet } from '@/components/dashboard/marketplace/RfqRespondSheet'
import { formatCurrencyRangeIDR } from '@/lib/utils'

export default async function MarketplaceOpenRfqPage() {
  const session = await requireSession()

  if (!session.profile.is_platform_superadmin && !session.profile.is_supplier) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        <h2 className="text-base font-semibold">Tidak diizinkan</h2>
        <p className="mt-2 text-muted-foreground">
          Akun Anda tidak ditandai sebagai <span className="font-medium">pemasok</span>.
        </p>
      </div>
    )
  }

  const canSendQuotes = !!session.organization

  const supabase = await createClient()

  const { data: openDemandRows, error } = await supabase
    .from('demand_listings')
    .select(
      `
      id,
      required_quantity,
      required_by,
      price_range_from,
      price_range_to,
      is_open_for_bidding,
      status,
      created_at,
      products ( name, unit ),
      organizations ( name )
    `
    )
    .is('deleted_at', null)
    .eq('is_open_for_bidding', true)
    .in('status', ['active', 'receiving_quotes'])
    .order('created_at', { ascending: false })
    .limit(40)

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/marketplace"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Marketplace
          </Link>
        </div>
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </p>
      </div>
    )
  }

  const openDemandIds = (openDemandRows ?? []).map((r) => r.id)

  const { data: suggestedMatches } = openDemandIds.length
    ? await supabase
        .from('matches')
        .select('demand_listing_id')
        .in('demand_listing_id', openDemandIds)
        .eq('status', 'suggested')
        .is('deleted_at', null)
    : { data: null }

  const suggestedIds = new Set(
    (suggestedMatches ?? []).map((m: { demand_listing_id: string }) => m.demand_listing_id)
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/marketplace"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Marketplace
        </Link>
        <Link
          href="/dashboard/marketplace/rfq"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Respons RFQ Anda
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">RFQ terbuka</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Semua listing permintaan yang terbuka untuk penawaran. Kirim penawaran untuk merespons.
        </p>
      </div>

      {!openDemandRows?.length ? (
        <p className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          Saat ini tidak ada RFQ terbuka.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-4 xl:grid-cols-6">
          {openDemandRows.map((row) => {
            const product = relationOne(
              row.products as
                | { name: string; unit: string }[]
                | { name: string; unit: string }
                | null
            )
            const buyer = relationOne(
              row.organizations as { name: string }[] | { name: string } | null
            )
            const priceBand =
              formatCurrencyRangeIDR(row.price_range_from, row.price_range_to)

            return (
              <li
                key={row.id}
                className="overflow-hidden rounded-lg border bg-card shadow-sm"
              >
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src="/dummy-cabe.png"
                    alt="Placeholder produk RFQ"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  />
                  {suggestedIds.has(row.id) ? (
                    <span className="absolute top-3 right-3 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
                      Rekomendasi AI
                    </span>
                  ) : null}
                </div>

                <div className="space-y-3 p-4">
                  <div>
                    <p className="text-base font-semibold">{product?.name ?? '—'}</p>
                    <p className="text-sm text-muted-foreground">
                      Pembeli: {buyer?.name ?? '—'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-md bg-muted/40 px-2 py-1.5">
                      <p className="text-xs text-muted-foreground">Jumlah</p>
                      <p className="font-medium">
                        {row.required_quantity ?? '—'} {product?.unit ?? ''}
                      </p>
                    </div>
                    <div className="rounded-md bg-muted/40 px-2 py-1.5">
                      <p className="text-xs text-muted-foreground">Rentang harga</p>
                      <p className="font-medium">{priceBand}</p>
                    </div>
                    <div className="rounded-md bg-muted/40 px-2 py-1.5">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="font-medium capitalize">{row.status}</p>
                    </div>
                    <div className="rounded-md bg-muted/40 px-2 py-1.5">
                      <p className="text-xs text-muted-foreground">Dibutuhkan</p>
                      <p className="font-medium">{row.required_by ?? '—'}</p>
                    </div>
                  </div>

                  <div>
                    {canSendQuotes ? (
                      <RfqRespondSheet
                        rfq={{
                          demandListingId: row.id,
                          productName: product?.name ?? 'Produk',
                          buyerOrgName: buyer?.name ?? 'Pembeli',
                          requiredQuantity: row.required_quantity ?? null,
                          priceBandLabel: priceBand,
                        }}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Tautkan organisasi pemasok terlebih dahulu
                      </span>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

