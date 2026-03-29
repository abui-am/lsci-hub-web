import { createClient } from '@/lib/supabase/server'
import { relationOne } from '@/lib/supabase/relation'
import { requireSession } from '@/lib/rbac/guards'
import Image from 'next/image'
import Link from 'next/link'
import { CircleDollarSign, Clock3, Plus, ShoppingCart } from 'lucide-react'
import { MarketplaceHeader } from '@/components/marketplace-vibe/MarketplaceHeader'
import { BuyerQuotesAdvancedList } from '@/components/marketplace-vibe/BuyerQuotesAdvancedList'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function BuyerMarketplacePage() {
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
  const { data: demandRows } = await supabase
    .from('demand_listings')
    .select('id, status')
    .is('deleted_at', null)
    .limit(100)

  const { data: responseRows } = await supabase
    .from('rfq_responses')
    .select(
      `
      id,
      status,
      supply_listing_id,
      price_offer,
      quantity_offer,
      lead_time_days,
      organizations ( id, name ),
      supply_listings (
        id,
        image_url,
        supplier_location,
        expiration_date,
        products ( name, unit ),
        organizations ( id, name, logo_image, supplier_credit_score )
      ),
      demand_listings (
        products ( name ),
        organizations ( id, name )
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(200)

  const activeDemandCount = (demandRows ?? []).filter((row) => row.status === 'active').length
  const incomingCount = (responseRows ?? []).filter((row) => row.status === 'pending').length
  const acceptedCount = (responseRows ?? []).filter((row) => row.status === 'accepted').length
  const rejectedCount = (responseRows ?? []).filter((row) => row.status === 'rejected').length

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
        title="Marketplace pembeli"
        description="Tinjau penawaran pemasok masuk dan putuskan cepat dengan konteks lengkap."
        stats={[
          {
            label: 'Permintaan aktif',
            value: activeDemandCount,
            icon: <ShoppingCart className="h-3.5 w-3.5" />,
          },
          {
            label: 'Penawaran masuk',
            value: incomingCount,
            icon: <Clock3 className="h-3.5 w-3.5" />,
          },
          {
            label: 'Penawaran diterima',
            value: acceptedCount,
            icon: <CircleDollarSign className="h-3.5 w-3.5" />,
          },
        ]}
      />

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Menunggu ({incomingCount})</TabsTrigger>
          <TabsTrigger value="accepted">Diterima ({acceptedCount})</TabsTrigger>
          <TabsTrigger value="rejected">Ditolak ({rejectedCount})</TabsTrigger>
        </TabsList>

        {(['pending', 'accepted', 'rejected'] as const).map((status) => (
          <TabsContent key={status} value={status} className="space-y-4">
            <BuyerQuotesAdvancedList
              canDecide={status === 'pending'}
              items={((responseRows ?? [])
                .filter((row) => row.status === status)
                .map((row) => {
                  const demand = relationOne(
                    row.demand_listings as
                      | {
                          products: { name: string } | { name: string }[] | null
                          organizations: { id: string; name: string } | { id: string; name: string }[] | null
                        }
                      | Array<{
                          products: { name: string } | { name: string }[] | null
                          organizations: { id: string; name: string } | { id: string; name: string }[] | null
                        }>
                      | null
                  )
                  const product = relationOne(demand?.products ?? null)
                  const buyer = relationOne(
                    demand?.organizations as
                      | { id: string; name: string }
                      | { id: string; name: string }[]
                      | null
                  )
                  const supplier = relationOne(
                    row.organizations as
                      | { id: string; name: string }
                      | { id: string; name: string }[]
                      | null
                  )
                  const supplyListing = relationOne(
                    row.supply_listings as
                      | {
                          id: string
                          image_url: string | null
                          supplier_location: string | null
                          expiration_date: string | null
                          organizations:
                            | { id: string; name: string; logo_image?: string | null; supplier_credit_score?: number | null }
                            | { id: string; name: string; logo_image?: string | null; supplier_credit_score?: number | null }[]
                            | null
                        }
                      | Array<{
                          id: string
                          image_url: string | null
                          supplier_location: string | null
                          expiration_date: string | null
                          organizations:
                            | { id: string; name: string; logo_image?: string | null; supplier_credit_score?: number | null }
                            | { id: string; name: string; logo_image?: string | null; supplier_credit_score?: number | null }[]
                            | null
                        }>
                      | null
                  )
                  const supplyOrg = relationOne(
                    supplyListing?.organizations as
                      | { id: string; name: string; logo_image?: string | null; supplier_credit_score?: number | null }
                      | { id: string; name: string; logo_image?: string | null; supplier_credit_score?: number | null }[]
                      | null
                  )

                  return {
                    id: row.id,
                    status: row.status as 'pending' | 'accepted' | 'rejected',
                    supplyListingId: row.supply_listing_id ?? null,
                    priceOffer: row.price_offer ?? null,
                    quantityOffer: row.quantity_offer ?? null,
                    leadTimeDays: row.lead_time_days ?? null,
                    supplierName: supplier?.name ?? 'Pemasok',
                    supplierOrganizationId: supplyOrg?.id ?? null,
                    supplierLogoUrl: supplyOrg?.logo_image ?? null,
                    supplierCreditScore: supplyOrg?.supplier_credit_score ?? null,
                    buyerName: buyer?.name ?? 'Pembeli',
                    buyerOrganizationId: buyer?.id ?? null,
                    productName: product?.name ?? 'Produk',
                    imageUrl: supplyListing?.image_url ?? null,
                    supplierLocation: supplyListing?.supplier_location ?? null,
                    expirationDate: supplyListing?.expiration_date ?? null,
                  }
                })) ?? []}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
