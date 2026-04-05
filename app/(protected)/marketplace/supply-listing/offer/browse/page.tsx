import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { relationOne } from '@/lib/supabase/relation'
import { requireSession } from '@/lib/rbac/guards'
import { Button } from '@/components/ui/button'
import { MarketplaceHeader } from '@/components/marketplace-vibe/MarketplaceHeader'
import {
  BuyerSupplyOfferWorkspace,
  type BuyerDemandSummary,
  type SupplyListingSummary,
} from '@/components/marketplace-vibe/BuyerSupplyOfferWorkspace'
import { formatCurrencyRangeIDR } from '@/lib/utils'

export default async function SupplyListingOfferBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ rfqId?: string }>
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

  const { rfqId } = await searchParams
  if (!rfqId) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          RFQ belum dipilih.
        </p>
        <div>
          <Button asChild size="sm">
            <Link href="/marketplace/supply-listing/offer">Kembali pilih RFQ</Link>
          </Button>
        </div>
      </div>
    )
  }

  const supabase = await createClient()

  const { data: demandRow } = await supabase
    .from('demand_listings')
    .select(
      `
      id,
      product_id,
      required_quantity,
      price_range_from,
      price_range_to,
      target_location,
      required_by,
      status,
      products ( name )
    `
    )
    .is('deleted_at', null)
    .eq('organization_id', session.organization?.id ?? '')
    .in('status', ['active', 'receiving_quotes'])
    .eq('id', rfqId)
    .maybeSingle()

  if (!demandRow) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          RFQ tidak ditemukan atau tidak dapat ditawarkan.
        </p>
        <div>
          <Button asChild size="sm">
            <Link href="/marketplace/supply-listing/offer">Kembali pilih RFQ</Link>
          </Button>
        </div>
      </div>
    )
  }

  const { data: supplyRows } = await supabase
    .from('supply_listings')
    .select(
      `
      id,
      product_id,
      quantity,
      price_estimate,
      image_url,
      status,
      products ( name, unit ),
      organizations ( name )
    `
    )
    .is('deleted_at', null)
    .eq('status', 'active')
    .eq('product_id', demandRow.product_id)
    .order('created_at', { ascending: false })
    .limit(60)

  const product = relationOne(
    demandRow.products as { name: string | null } | { name: string | null }[] | null
  )
  const activeDemand: BuyerDemandSummary = {
    id: demandRow.id as string,
    productName: product?.name ?? 'Produk',
    status: demandRow.status as string,
    requiredQuantity: (demandRow.required_quantity as number | null) ?? null,
    priceBandLabel: formatCurrencyRangeIDR(
      (demandRow.price_range_from as number | null) ?? null,
      (demandRow.price_range_to as number | null) ?? null,
      'Tidak ditentukan'
    ),
    targetLocation: (demandRow.target_location as string | null) ?? null,
    requiredBy: (demandRow.required_by as string | null) ?? null,
  }

  const supplies: SupplyListingSummary[] =
    supplyRows?.map((row) => {
      const supplyProduct = relationOne(
        row.products as
          | { name: string | null; unit: string | null }
          | { name: string | null; unit: string | null }[]
          | null
      )
      const org = relationOne(
        row.organizations as
          | { name: string | null }
          | { name: string | null }[]
          | null
      )
      return {
        id: row.id as string,
        productId: (row.product_id as string | null) ?? null,
        productName: supplyProduct?.name ?? 'Produk',
        unit: supplyProduct?.unit ?? null,
        priceEstimate: (row.price_estimate as number | null) ?? null,
        quantity: (row.quantity as number | null) ?? null,
        status: row.status as string,
        imageUrl: (row.image_url as string | null) ?? null,
        supplierName: org?.name ?? 'Pemasok',
      }
    }) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="outline" size="sm">
          <Link href="/marketplace/supply-listing/offer">Ganti RFQ</Link>
        </Button>
      </div>

      <MarketplaceHeader
        title="Browse pemasok untuk RFQ"
        description="Langkah 2 dari 2: pilih pemasok yang paling cocok lalu kirim Offer Request."
        statsColumns={2}
        stats={[
          { label: 'RFQ aktif', value: activeDemand.productName },
          { label: 'Supplier relevan', value: supplies.length },
        ]}
      />

      <BuyerSupplyOfferWorkspace
        activeDemand={activeDemand}
        supplies={supplies}
        viewerProfileId={session.profile.id}
      />
    </div>
  )
}

