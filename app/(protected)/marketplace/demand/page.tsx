import { createClient } from '@/lib/supabase/server'
import { relationOne } from '@/lib/supabase/relation'
import { requireSession } from '@/lib/rbac/guards'
import Link from 'next/link'
import { CircleCheckBig, ClipboardList, Plus, ShoppingCart } from 'lucide-react'
import { MarketplaceHeader } from '@/components/marketplace-vibe/MarketplaceHeader'
import { DemandAdvancedList } from '@/components/marketplace-vibe/DemandAdvancedList'

type RfqRow = {
  id: string
  quantity_offer: number | null
  price_offer: number | null
  status: 'pending' | 'accepted' | 'rejected'
  organizations: { name: string } | { name: string }[] | null
}

export default async function MarketplaceDemandListPage() {
  const session = await requireSession()
  if (!session.profile.is_platform_superadmin && !session.profile.is_buyer) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        <h2 className="text-base font-semibold">Tidak diizinkan</h2>
        <p className="mt-2 text-muted-foreground">
          Akun Anda tidak ditandai sebagai pembeli.
        </p>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: rows, error } = await supabase
    .from('demand_listings')
    .select(
      `
      id,
      required_quantity,
      required_by,
      price_range_from,
      price_range_to,
      target_location,
      incoterms,
      image_url,
      is_open_for_bidding,
      status,
      created_at,
      products ( name, unit ),
      organizations ( name ),
      rfq_responses (
        id,
        quantity_offer,
        price_offer,
        status,
        organizations ( name )
      )
    `
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(40)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Link
          href="/marketplace/demand/new"
          className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
        >
          <Plus className="size-4" aria-hidden />
          Tambah permintaan
        </Link>
      </div>

      <MarketplaceHeader
        title="Listing permintaan"
        description="Permintaan pembeli dengan status lelang dan ringkasan penawaran diterima."
        stats={[
          {
            label: 'Total RFQ',
            value: rows?.length ?? 0,
            icon: <ClipboardList className="h-3.5 w-3.5 text-primary" />,
          },
          {
            label: 'RFQ terbuka',
            value: (rows ?? []).filter((row) => row.is_open_for_bidding).length,
            icon: <ShoppingCart className="h-3.5 w-3.5 text-primary" />,
          },
          {
            label: 'RFQ ditutup',
            value: (rows ?? []).filter((row) => row.status === 'closed').length,
            icon: <CircleCheckBig className="h-3.5 w-3.5 text-primary" />,
          },
        ]}
      />

      {error ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </p>
      ) : !rows?.length ? (
        <p className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          Belum ada listing permintaan.
        </p>
      ) : (
        <DemandAdvancedList
          items={rows.map((row) => {
            const product = relationOne(
              row.products as
                | { name: string; unit: string }
                | { name: string; unit: string }[]
                | null
            )
            const org = relationOne(
              row.organizations as { name: string } | { name: string }[] | null
            )
            const accepted = ((row.rfq_responses as RfqRow[] | null) ?? []).filter(
              (item) => item.status === 'accepted'
            )
            return {
              id: row.id,
              productName: product?.name ?? 'Produk',
              productUnit: product?.unit ?? null,
              buyerName: org?.name ?? 'Pembeli',
              requiredQuantity: row.required_quantity ?? null,
              priceFrom: row.price_range_from ?? null,
              priceTo: row.price_range_to ?? null,
              targetLabel: [row.target_location, row.incoterms].filter(Boolean).join(' / '),
              requiredBy: row.required_by ?? null,
              imageUrl: row.image_url ?? null,
              isOpenForBidding: !!row.is_open_for_bidding,
              createdAt: row.created_at ?? null,
              acceptedQuotes: accepted.map((quote) => {
                const supplier = relationOne(
                  quote.organizations as
                    | { name: string }
                    | { name: string }[]
                    | null
                )
                return {
                  id: quote.id,
                  supplierName: supplier?.name ?? 'Pemasok',
                  quantityOffer: quote.quantity_offer ?? null,
                  priceOffer: quote.price_offer ?? null,
                }
              }),
            }
          })}
        />
      )}
    </div>
  )
}
