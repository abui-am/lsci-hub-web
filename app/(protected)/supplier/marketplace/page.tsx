import { createClient } from '@/lib/supabase/server'
import { relationOne } from '@/lib/supabase/relation'
import { requireSession } from '@/lib/rbac/guards'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  CalendarClock,
  CircleDollarSign,
  FileText,
  MessageSquare,
  ShoppingCart,
  Truck,
} from 'lucide-react'
import { MarketplaceHeader } from '@/components/marketplace-vibe/MarketplaceHeader'
import { SupplierResponseActions } from '@/components/marketplace-vibe/SupplierResponseActions'
import { SupplierRfqAdvancedList } from '@/components/marketplace-vibe/SupplierRfqAdvancedList'
import { SupplierOfferRequestActions } from '@/components/marketplace-vibe/SupplierOfferRequestActions'
import { QuoteStatusBadge } from '@/components/marketplace-vibe/QuoteStatusBadge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { formatCurrencyIDR } from '@/lib/utils'

export default async function SupplierMarketplacePage() {
  const session = await requireSession()
  if (!session.profile.is_platform_superadmin && !session.profile.is_supplier) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        <h2 className="text-base font-semibold">Tidak diizinkan</h2>
        <p className="mt-2 text-muted-foreground">
          Akun Anda tidak ditandai sebagai pemasok.
        </p>
      </div>
    )
  }

  const supabase = await createClient()

  const { data: openDemandRows } = await supabase
    .from('demand_listings')
    .select(
      `
      id,
      required_quantity,
      required_by,
      price_range_from,
      price_range_to,
      specifications,
      target_location,
      incoterms,
      image_url,
      certifications_required,
      payment_terms,
      rfq_expires_at,
      status,
      created_at,
      products ( name, unit, category ),
      organizations ( id, name, logo_image, buyer_credit_score, is_verified_business, completed_deals_count, type, sector )
    `
    )
    .is('deleted_at', null)
    .eq('is_open_for_bidding', true)
    .in('status', ['active', 'receiving_quotes'])
    .order('created_at', { ascending: false })
    .limit(24)

  const openDemandIds = (openDemandRows ?? []).map((row) => row.id)
  const { data: suggestedMatches } = openDemandIds.length
    ? await supabase
        .from('matches')
        .select('demand_listing_id')
        .in('demand_listing_id', openDemandIds)
        .eq('status', 'suggested')
        .is('deleted_at', null)
    : { data: null }
  const suggestedIds = new Set(
    (suggestedMatches ?? []).map((match: { demand_listing_id: string }) => match.demand_listing_id)
  )
  const { data: intelligenceRows } = openDemandIds.length
    ? await supabase
        .from('rfq_supplier_intelligence_v1')
        .select('demand_listing_id, quotes_count, estimated_deal_value, market_gap_percent, win_probability')
        .in('demand_listing_id', openDemandIds)
    : { data: null }
  const intelligenceMap = new Map(
    (intelligenceRows ?? []).map(
      (row: {
        demand_listing_id: string
        quotes_count: number | null
        estimated_deal_value: number | null
        market_gap_percent: number | null
        win_probability: number | null
      }) => [row.demand_listing_id, row]
    )
  )

  const { data: responseRows } = await supabase
    .from('rfq_responses')
    .select(
      `
      id,
      status,
      price_offer,
      quantity_offer,
      lead_time_days,
      message,
      created_at,
      demand_listings (
        id,
        required_by,
        image_url,
        products ( name ),
        organizations ( id, name, logo_image )
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(30)

  const { data: offerRequestRows } = await supabase
    .from('offer_requests')
    .select(
      `
      id,
      status,
      price_offer,
      quantity_offer,
      lead_time_days,
      message,
      created_at,
      demand_listings (
        id,
        required_by,
        products ( name ),
        organizations ( id, name, logo_image )
      ),
      supply_listings (
        id,
        image_url,
        supplier_location,
        products ( name, unit )
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(50)

  const { count: activeSupplyListingCount } = await supabase
    .from('supply_listings')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .eq('status', 'active')

  const pendingCount = (responseRows ?? []).filter((item) => item.status === 'pending').length
  const acceptedCount = (responseRows ?? []).filter((item) => item.status === 'accepted').length
  const rejectedCount = (responseRows ?? []).filter((item) => item.status === 'rejected').length
  const offerPendingCount = (offerRequestRows ?? []).filter((item) => item.status === 'pending').length
  const openRfqItems = (openDemandRows ?? []).map((row) => {
    const product = relationOne(
      row.products as
        | { name: string; unit: string }[]
        | { name: string; unit: string }
        | null
    )
    const buyer = relationOne(
      row.organizations as
        | {
            id?: string
            name: string
            logo_image?: string | null
            buyer_credit_score?: number | null
            is_verified_business?: boolean | null
            completed_deals_count?: number | null
            type?: string | null
            sector?: string | null
          }[]
        | {
            id?: string
            name: string
            logo_image?: string | null
            buyer_credit_score?: number | null
            is_verified_business?: boolean | null
            completed_deals_count?: number | null
            type?: string | null
            sector?: string | null
          }
        | null
    )
    const intelligence = intelligenceMap.get(row.id)

    return {
      id: row.id,
      productName: product?.name ?? 'Produk',
      productUnit: product?.unit ?? null,
      productCategory:
        (product as { category?: string } | null)?.category ?? null,
      buyerName: buyer?.name ?? 'Pembeli',
      buyerOrganizationId: (buyer as { id?: string } | null)?.id ?? null,
      buyerLogoUrl:
        (buyer as { logo_image?: string | null } | null)?.logo_image ?? null,
      buyerCreditScore:
        (buyer as { buyer_credit_score?: number | null } | null)?.buyer_credit_score ?? null,
      requiredQuantity: row.required_quantity ?? null,
      priceFrom: row.price_range_from ?? null,
      priceTo: row.price_range_to ?? null,
      requiredBy: row.required_by ?? null,
      specSummary:
        row.specifications && typeof row.specifications === 'object'
          ? Object.entries(row.specifications as Record<string, unknown>)
              .slice(0, 2)
              .map(([key, value]) => `${key}: ${String(value)}`)
              .join(' | ')
          : null,
      targetLocation: row.target_location ?? null,
      incoterms: row.incoterms ?? null,
      imageUrl: row.image_url ?? null,
      paymentTerms: row.payment_terms ?? null,
      rfqExpiresAt: row.rfq_expires_at ?? null,
      certifications: Array.isArray(row.certifications_required)
        ? (row.certifications_required as string[])
        : [],
      status: row.status,
      createdAt: row.created_at ?? null,
      recommended: suggestedIds.has(row.id),
      buyerIsVerified: (buyer as { is_verified_business?: boolean | null } | null)?.is_verified_business ?? false,
      buyerCompletedDeals: (buyer as { completed_deals_count?: number | null } | null)?.completed_deals_count ?? null,
      buyerOrgType: (buyer as { type?: string | null } | null)?.type ?? null,
      buyerSector: (buyer as { sector?: string | null } | null)?.sector ?? null,
      quotesCount: intelligence?.quotes_count ?? 0,
      estimatedDealValue: intelligence?.estimated_deal_value ?? null,
      marketGapPercent: intelligence?.market_gap_percent ?? null,
      winProbability: intelligence?.win_probability ?? null,
    }
  })

  return (
    <div className="space-y-8 md:space-y-10">
      <MarketplaceHeader
        title="Marketplace pemasok"
        description="Temukan permintaan pembeli, kirim penawaran lebih cepat, dan pantau hasil di satu tempat."
        statsColumns={3}
        stats={[
          {
            label: 'RFQ terbuka',
            value: openDemandRows?.length ?? 0,
            icon: <ShoppingCart className="h-3.5 w-3.5 text-primary" />,
          },
          {
            label: 'Penawaran menunggu',
            value: pendingCount,
            icon: <CalendarClock className="h-3.5 w-3.5 text-primary" />,
          },
          {
            label: 'Penawaran diterima',
            value: acceptedCount,
            icon: <CircleDollarSign className="h-3.5 w-3.5 text-primary" />,
          },
        ]}
      />

      <Tabs defaultValue="open-rfq" className="space-y-5">
        <TabsList>
          <TabsTrigger value="open-rfq">RFQ terbuka ({openRfqItems.length})</TabsTrigger>
          <TabsTrigger value="my-responses">
            Bidding diajukan ({pendingCount + acceptedCount + rejectedCount})
          </TabsTrigger>
          <TabsTrigger value="offer-requests">Offer pembeli ({offerPendingCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="open-rfq" className="space-y-5">
          <SupplierRfqAdvancedList
            items={openRfqItems}
            hasActiveSupplyListings={(activeSupplyListingCount ?? 0) > 0}
          />
        </TabsContent>

        <TabsContent value="my-responses" className="space-y-5">
          {!responseRows?.length ? (
            <p className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
              Anda belum mengirim penawaran.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2 rounded-xl border border-border/70 bg-card/90 p-3 shadow-sm md:grid-cols-5 md:items-center">
                <div className="rounded-md bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">RFQ terbuka</p>
                  <p className="text-xl font-semibold">{openDemandRows?.length ?? 0}</p>
                </div>
                <div className="hidden justify-center md:flex">
                  <ArrowRight className="h-4 w-4 text-primary" />
                </div>
                <div className="rounded-md bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Penawaran terkirim</p>
                  <p className="text-xl font-semibold">{pendingCount + acceptedCount + rejectedCount}</p>
                  <p className="text-xs text-muted-foreground">
                    {pendingCount} menunggu, {rejectedCount} ditolak
                  </p>
                </div>
                <div className="hidden justify-center md:flex">
                  <ArrowRight className="h-4 w-4 text-primary" />
                </div>
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">Diterima (menang)</p>
                  <p className="text-xl font-semibold text-emerald-700 dark:text-emerald-200">
                    {acceptedCount}
                  </p>
                </div>
              </div>

              <ul className="grid gap-3">
                {responseRows.map((row) => {
                  const demand = relationOne(
                    row.demand_listings as
                      | {
                          id: string
                          required_by: string | null
                          image_url: string | null
                          products: { name: string } | { name: string }[] | null
                          organizations:
                            | { id?: string; name: string; logo_image?: string | null }
                            | { id?: string; name: string; logo_image?: string | null }[]
                            | null
                        }
                      | Array<{
                          id: string
                          required_by: string | null
                          image_url: string | null
                          products: { name: string } | { name: string }[] | null
                          organizations:
                            | { id?: string; name: string; logo_image?: string | null }
                            | { id?: string; name: string; logo_image?: string | null }[]
                            | null
                        }>
                      | null
                  )
                  const product = relationOne(demand?.products ?? null)
                  const buyer = relationOne(demand?.organizations ?? null)
                  const isAccepted = row.status === 'accepted'
                  const demandImageSrc =
                    demand?.image_url &&
                    (/^https?:\/\//.test(demand.image_url) || demand.image_url.startsWith('/')) &&
                    /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i.test(demand.image_url)
                      ? demand.image_url
                      : '/dummy-cabe.png'
                  const totalValue =
                    row.price_offer != null && row.quantity_offer != null
                      ? row.price_offer * row.quantity_offer
                      : null

                  return (
                    <li key={row.id}>
                      <Card
                        className={
                          isAccepted
                            ? 'border-emerald-300/70'
                            : undefined
                        }
                      >
                        <CardContent className="space-y-3 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="relative h-12 w-14 overflow-hidden rounded-md border">
                                <Image
                                  src={demandImageSrc}
                                  alt={product?.name ?? 'Produk permintaan'}
                                  fill
                                  className="object-cover"
                                  sizes="56px"
                                />
                              </div>
                              <div>
                                <p className="font-semibold">{product?.name ?? 'Produk tanpa nama'}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="relative h-5 w-5 overflow-hidden rounded-full border">
                                    <Image
                                      src={
                                        (buyer as { logo_image?: string | null } | null)?.logo_image ??
                                        '/dummy-cabe.png'
                                      }
                                      alt={buyer?.name ?? 'Logo pembeli'}
                                      fill
                                      className="object-cover"
                                      sizes="20px"
                                    />
                                  </div>
                                  <span>
                                    Pembeli:{' '}
                                    {(buyer as { id?: string; name?: string } | null)?.id ? (
                                      <Link
                                        href={`/marketplace/account/${(buyer as { id: string }).id}`}
                                        className="hover:underline"
                                      >
                                        {buyer?.name ?? 'Tidak ditentukan'}
                                      </Link>
                                    ) : (
                                      (buyer?.name ?? 'Tidak ditentukan')
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isAccepted ? <Badge variant="success">Deal menang</Badge> : null}
                              <QuoteStatusBadge
                                status={row.status as 'pending' | 'accepted' | 'rejected'}
                              />
                            </div>
                          </div>

                          <div className="grid gap-2 md:grid-cols-4">
                            <div className="rounded-md bg-muted/40 p-2">
                              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <CircleDollarSign className="h-3.5 w-3.5 text-primary" />
                                Penawaran
                              </p>
                              <p className="text-sm font-medium">
                                {formatCurrencyIDR(row.price_offer)}
                                {row.quantity_offer != null ? ` x ${row.quantity_offer}` : ''}
                              </p>
                            </div>
                            <div className="rounded-md bg-muted/40 p-2">
                              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <CircleDollarSign className="h-3.5 w-3.5 text-primary" />
                                Nilai deal
                              </p>
                              <p className="text-sm font-medium">
                                {totalValue != null
                                  ? formatCurrencyIDR(totalValue)
                                  : 'Data kurang'}
                              </p>
                            </div>
                            <div className="rounded-md bg-muted/40 p-2">
                              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Truck className="h-3.5 w-3.5 text-primary" />
                                Lead time
                              </p>
                              <p className="text-sm font-medium">
                                {row.lead_time_days != null ? `${row.lead_time_days} hari` : 'Tidak ditentukan'}
                              </p>
                            </div>
                            <div className="rounded-md bg-muted/40 p-2">
                              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <CalendarClock className="h-3.5 w-3.5 text-primary" />
                                Tenggat pembeli
                              </p>
                              <p className="text-sm font-medium">{demand?.required_by ?? 'Tidak ditentukan'}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {demand?.id ? (
                              <SupplierResponseActions
                                responseId={row.id}
                                demandId={demand.id}
                                buyerOrganizationId={
                                  (buyer as { id?: string } | null)?.id ?? null
                                }
                                supplierOrganizationId={session.organization?.id ?? null}
                                buyerName={buyer?.name ?? 'Pembeli'}
                                viewerProfileId={session.profile.id}
                                isAccepted={isAccepted}
                                isPending={row.status === 'pending'}
                                initialPriceOffer={row.price_offer ?? null}
                                initialQuantityOffer={row.quantity_offer ?? null}
                                initialLeadTimeDays={row.lead_time_days ?? null}
                                initialMessage={row.message ?? null}
                              />
                            ) : null}
                          </div>

                          {row.message ? (
                            <p className="text-xs text-muted-foreground">Catatan: {row.message}</p>
                          ) : null}
                        </CardContent>
                      </Card>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </TabsContent>

        <TabsContent value="offer-requests" className="space-y-5">
          {!offerRequestRows?.length ? (
            <p className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
              Belum ada offer request dari buyer.
            </p>
          ) : (
            <ul className="grid gap-3">
              {offerRequestRows.map((row) => {
                const demand = relationOne(
                  row.demand_listings as
                    | {
                        id: string
                        required_by: string | null
                        products: { name: string } | { name: string }[] | null
                        organizations:
                          | { id?: string; name: string; logo_image?: string | null }
                          | { id?: string; name: string; logo_image?: string | null }[]
                          | null
                      }
                    | Array<{
                        id: string
                        required_by: string | null
                        products: { name: string } | { name: string }[] | null
                        organizations:
                          | { id?: string; name: string; logo_image?: string | null }
                          | { id?: string; name: string; logo_image?: string | null }[]
                          | null
                      }>
                    | null
                )
                const product = relationOne(demand?.products ?? null)
                const buyer = relationOne(demand?.organizations ?? null)
                const supply = relationOne(
                  row.supply_listings as
                    | {
                        id: string
                        image_url: string | null
                        supplier_location: string | null
                        products:
                          | { name: string; unit: string | null }
                          | { name: string; unit: string | null }[]
                          | null
                      }
                    | Array<{
                        id: string
                        image_url: string | null
                        supplier_location: string | null
                        products:
                          | { name: string; unit: string | null }
                          | { name: string; unit: string | null }[]
                          | null
                      }>
                    | null
                )
                const supplyProduct = relationOne(supply?.products ?? null)
                const imageSrc =
                  supply?.image_url &&
                  (/^https?:\/\//.test(supply.image_url) ||
                    supply.image_url.startsWith('/'))
                    ? supply.image_url
                    : '/dummy-cabe.png'

                return (
                  <li key={row.id}>
                    <Card>
                      <CardContent className="space-y-3 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-14 overflow-hidden rounded-md border">
                              <Image
                                src={imageSrc}
                                alt={supplyProduct?.name ?? 'Produk supply'}
                                fill
                                className="object-cover"
                                sizes="56px"
                              />
                            </div>
                            <div>
                              <p className="font-semibold">
                                {product?.name ?? supplyProduct?.name ?? 'Produk'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Buyer:{' '}
                                {(buyer as { id?: string; name?: string } | null)?.id ? (
                                  <Link
                                    href={`/marketplace/account/${(buyer as { id: string }).id}`}
                                    className="hover:underline"
                                  >
                                    {buyer?.name ?? 'Tidak ditentukan'}
                                  </Link>
                                ) : (
                                  buyer?.name ?? 'Tidak ditentukan'
                                )}
                              </p>
                            </div>
                          </div>
                          <QuoteStatusBadge
                            status={row.status as 'pending' | 'accepted' | 'rejected'}
                          />
                        </div>

                        <div className="grid gap-2 md:grid-cols-4">
                          <div className="rounded-md bg-muted/40 p-2 text-sm">
                            <p className="text-xs text-muted-foreground">Harga offer</p>
                            <p className="font-medium">{formatCurrencyIDR(row.price_offer)}</p>
                          </div>
                          <div className="rounded-md bg-muted/40 p-2 text-sm">
                            <p className="text-xs text-muted-foreground">Jumlah offer</p>
                            <p className="font-medium">
                              {row.quantity_offer ?? '-'} {supplyProduct?.unit ?? ''}
                            </p>
                          </div>
                          <div className="rounded-md bg-muted/40 p-2 text-sm">
                            <p className="text-xs text-muted-foreground">Lead time</p>
                            <p className="font-medium">
                              {row.lead_time_days != null
                                ? `${row.lead_time_days} hari`
                                : 'Tidak ditentukan'}
                            </p>
                          </div>
                          <div className="rounded-md bg-muted/40 p-2 text-sm">
                            <p className="text-xs text-muted-foreground">Tenggat RFQ</p>
                            <p className="font-medium">
                              {demand?.required_by ?? 'Tidak ditentukan'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {demand?.id ? (
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/marketplace/demand/${demand.id}`}>Lihat RFQ</Link>
                            </Button>
                          ) : null}
                          <SupplierOfferRequestActions
                            offerRequestId={row.id}
                            buyerName={buyer?.name ?? 'Pembeli'}
                            viewerProfileId={session.profile.id}
                            disabled={row.status !== 'pending'}
                          />
                        </div>

                        {row.message ? (
                          <p className="text-xs text-muted-foreground">Catatan: {row.message}</p>
                        ) : null}
                      </CardContent>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
