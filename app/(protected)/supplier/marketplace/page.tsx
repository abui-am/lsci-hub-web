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
        <h2 className="text-base font-semibold">Not allowed</h2>
        <p className="mt-2 text-muted-foreground">
          Your account is not marked as supplier.
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
      certifications_required,
      status,
      created_at,
      products ( name, unit, category ),
      organizations ( id, name, logo_image, buyer_credit_score )
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

  const pendingCount = (responseRows ?? []).filter((item) => item.status === 'pending').length
  const acceptedCount = (responseRows ?? []).filter((item) => item.status === 'accepted').length
  const rejectedCount = (responseRows ?? []).filter((item) => item.status === 'rejected').length
  const openRfqItems = (openDemandRows ?? []).map((row) => {
    const product = relationOne(
      row.products as
        | { name: string; unit: string }[]
        | { name: string; unit: string }
        | null
    )
    const buyer = relationOne(
      row.organizations as
        | { name: string; buyer_credit_score?: number | null }[]
        | { name: string; buyer_credit_score?: number | null }
        | null
    )

    return {
      id: row.id,
      productName: product?.name ?? 'Product',
      productUnit: product?.unit ?? null,
      productCategory:
        (product as { category?: string } | null)?.category ?? null,
      buyerName: buyer?.name ?? 'Buyer',
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
      certifications: Array.isArray(row.certifications_required)
        ? (row.certifications_required as string[])
        : [],
      status: row.status,
      createdAt: row.created_at ?? null,
      recommended: suggestedIds.has(row.id),
    }
  })

  return (
    <div className="space-y-6">
      <MarketplaceHeader
        title="Supplier marketplace"
        description="Find buyer requests, send quotes faster, and track outcomes in one place."
        stats={[
          {
            label: 'Open RFQs',
            value: openDemandRows?.length ?? 0,
            icon: <ShoppingCart className="h-3.5 w-3.5" />,
          },
          {
            label: 'Pending quotes',
            value: pendingCount,
            icon: <CalendarClock className="h-3.5 w-3.5" />,
          },
          {
            label: 'Accepted quotes',
            value: acceptedCount,
            icon: <CircleDollarSign className="h-3.5 w-3.5" />,
          },
        ]}
      />

      <Tabs defaultValue="open-rfq">
        <TabsList>
          <TabsTrigger value="open-rfq">Open RFQs</TabsTrigger>
          <TabsTrigger value="my-responses">My responses</TabsTrigger>
        </TabsList>

        <TabsContent value="open-rfq" className="space-y-4">
          <SupplierRfqAdvancedList items={openRfqItems} />
        </TabsContent>

        <TabsContent value="my-responses">
          {!responseRows?.length ? (
            <p className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
              You have not submitted quotes yet.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2 rounded-lg border bg-card p-3 md:grid-cols-5 md:items-center">
                <div className="rounded-md bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Open RFQs</p>
                  <p className="text-xl font-semibold">{openDemandRows?.length ?? 0}</p>
                </div>
                <div className="hidden justify-center md:flex">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="rounded-md bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Quotes sent</p>
                  <p className="text-xl font-semibold">{pendingCount + acceptedCount + rejectedCount}</p>
                  <p className="text-xs text-muted-foreground">
                    {pendingCount} pending, {rejectedCount} rejected
                  </p>
                </div>
                <div className="hidden justify-center md:flex">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">Accepted (won)</p>
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
                      <Card className={isAccepted ? 'border-emerald-300/70' : undefined}>
                        <CardContent className="space-y-3 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="relative h-12 w-14 overflow-hidden rounded-md border">
                                <Image
                                  src={demandImageSrc}
                                  alt={product?.name ?? 'Demand product'}
                                  fill
                                  className="object-cover"
                                  sizes="56px"
                                />
                              </div>
                              <div>
                                <p className="font-semibold">{product?.name ?? 'Unnamed product'}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="relative h-5 w-5 overflow-hidden rounded-full border">
                                    <Image
                                      src={
                                        (buyer as { logo_image?: string | null } | null)?.logo_image ??
                                        '/dummy-cabe.png'
                                      }
                                      alt={buyer?.name ?? 'Buyer logo'}
                                      fill
                                      className="object-cover"
                                      sizes="20px"
                                    />
                                  </div>
                                  <span>
                                    Buyer:{' '}
                                    {(buyer as { id?: string; name?: string } | null)?.id ? (
                                      <Link
                                        href={`/marketplace/account/${(buyer as { id: string }).id}`}
                                        className="hover:underline"
                                      >
                                        {buyer?.name ?? 'Not specified'}
                                      </Link>
                                    ) : (
                                      (buyer?.name ?? 'Not specified')
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isAccepted ? <Badge variant="success">Money won</Badge> : null}
                              <QuoteStatusBadge
                                status={row.status as 'pending' | 'accepted' | 'rejected'}
                              />
                            </div>
                          </div>

                          <div className="grid gap-2 md:grid-cols-4">
                            <div className="rounded-md bg-muted/40 p-2">
                              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <CircleDollarSign className="h-3.5 w-3.5" />
                                Offer
                              </p>
                              <p className="text-sm font-medium">
                                {formatCurrencyIDR(row.price_offer)}
                                {row.quantity_offer != null ? ` x ${row.quantity_offer}` : ''}
                              </p>
                            </div>
                            <div className="rounded-md bg-muted/40 p-2">
                              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <CircleDollarSign className="h-3.5 w-3.5" />
                                Deal value
                              </p>
                              <p className="text-sm font-medium">
                                {totalValue != null
                                  ? formatCurrencyIDR(totalValue)
                                  : 'Not enough data'}
                              </p>
                            </div>
                            <div className="rounded-md bg-muted/40 p-2">
                              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Truck className="h-3.5 w-3.5" />
                                Lead time
                              </p>
                              <p className="text-sm font-medium">
                                {row.lead_time_days != null ? `${row.lead_time_days} days` : 'Not specified'}
                              </p>
                            </div>
                            <div className="rounded-md bg-muted/40 p-2">
                              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <CalendarClock className="h-3.5 w-3.5" />
                                Buyer deadline
                              </p>
                              <p className="text-sm font-medium">{demand?.required_by ?? 'Not specified'}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {demand?.id ? (
                              <SupplierResponseActions
                                demandId={demand.id}
                                buyerOrganizationId={
                                  (buyer as { id?: string } | null)?.id ?? null
                                }
                                isAccepted={isAccepted}
                              />
                            ) : null}
                          </div>

                          {row.message ? (
                            <p className="text-xs text-muted-foreground">Note: {row.message}</p>
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
      </Tabs>
    </div>
  )
}
