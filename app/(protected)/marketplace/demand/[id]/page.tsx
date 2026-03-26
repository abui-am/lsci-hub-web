import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  BadgeCheck,
  CalendarClock,
  CircleDollarSign,
  Factory,
  Globe2,
  ListChecks,
  Package2,
  Scale,
  ScanSearch,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { relationOne } from '@/lib/supabase/relation'
import { requireSession } from '@/lib/rbac/guards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCreditScore, formatCurrencyIDR, formatCurrencyRangeIDR } from '@/lib/utils'

type RfqRow = {
  id: string
  quantity_offer: number | null
  price_offer: number | null
  status: 'pending' | 'accepted' | 'rejected'
  organizations: { name: string } | { name: string }[] | null
}

export default async function MarketplaceDemandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireSession()
  if (
    !session.profile.is_platform_superadmin &&
    !session.profile.is_supplier &&
    !session.profile.is_buyer
  ) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        <h2 className="text-base font-semibold">Not allowed</h2>
        <p className="mt-2 text-muted-foreground">
          Your account cannot access demand listing details.
        </p>
      </div>
    )
  }

  const { id } = await params
  const supabase = await createClient()
  const { data: row, error } = await supabase
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
      specifications,
      certifications_required,
      image_url,
      is_open_for_bidding,
      status,
      created_at,
      products ( name, unit ),
      organizations ( id, name, type, sector, logo_image, buyer_credit_score ),
      rfq_responses (
        id,
        quantity_offer,
        price_offer,
        status,
        organizations ( name )
      )
    `
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !row) {
    notFound()
  }

  const product = relationOne(
    row.products as
      | { name: string; unit: string }
      | { name: string; unit: string }[]
      | null
  )
  const buyer = relationOne(
    row.organizations as
      | {
          id: string
          name: string
          type: string
          sector: string | null
          logo_image: string | null
          buyer_credit_score: number | null
        }
      | {
          id: string
          name: string
          type: string
          sector: string | null
          logo_image: string | null
          buyer_credit_score: number | null
        }[]
      | null
  )
  const accepted = ((row.rfq_responses as RfqRow[] | null) ?? []).filter(
    (item) => item.status === 'accepted'
  )
  const specs =
    row.specifications && typeof row.specifications === 'object'
      ? (row.specifications as Record<string, unknown>)
      : {}
  const certs = Array.isArray(row.certifications_required)
    ? (row.certifications_required as string[])
    : []
  const priceBand = formatCurrencyRangeIDR(row.price_range_from, row.price_range_to)

  return (
    <div className="space-y-4">
      <Link
        href="/supplier/marketplace"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        Back to supplier marketplace
      </Link>

      <Card>
        <div className="relative aspect-[16/6] max-h-[360px] w-full overflow-hidden rounded-t-xl">
          <Image
            src={row.image_url ?? '/dummy-cabe.png'}
            alt={product?.name ?? 'Demand product'}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 70vw"
          />
        </div>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{product?.name ?? 'Demand listing'}</CardTitle>
            <Badge variant={row.is_open_for_bidding ? 'success' : 'outline'}>
              {row.is_open_for_bidding ? 'Open for bidding' : 'Closed'}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="relative h-6 w-6 overflow-hidden rounded-full border">
              <Image
                src={buyer?.logo_image ?? '/dummy-cabe.png'}
                alt={buyer?.name ?? 'Buyer logo'}
                fill
                className="object-cover"
                sizes="24px"
              />
            </div>
            <p className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Buyer:{' '}
              {buyer?.id ? (
                <Link href={`/marketplace/account/${buyer.id}`} className="hover:underline">
                  {buyer?.name ?? '-'}
                </Link>
              ) : (
                (buyer?.name ?? '-')
              )}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Buyer credit score:{' '}
            {formatCreditScore(buyer?.buyer_credit_score)}
          </p>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          <div className="grid gap-2 md:grid-cols-2">
            <p>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <ScanSearch className="h-3.5 w-3.5" />
                Demand ID:
              </span>{' '}
              {row.id}
            </p>
            <p>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                Created:
              </span>{' '}
              {row.created_at ? new Date(row.created_at).toLocaleString() : '-'}
            </p>
            <p>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Scale className="h-3.5 w-3.5" />
                Required qty:
              </span>{' '}
              {row.required_quantity ?? '-'} {product?.unit ?? ''}
            </p>
            <p>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                Required by:
              </span>{' '}
              {row.required_by ?? '-'}
            </p>
            <p>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <CircleDollarSign className="h-3.5 w-3.5" />
                Price band:
              </span>{' '}
              {priceBand}
            </p>
            <p>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <BadgeCheck className="h-3.5 w-3.5" />
                Status:
              </span>{' '}
              {row.status ?? '-'}
            </p>
            <p>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Globe2 className="h-3.5 w-3.5" />
                Target:
              </span>{' '}
              {[row.target_location, row.incoterms].filter(Boolean).join(' / ') || '-'}
            </p>
            <p>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Factory className="h-3.5 w-3.5" />
                Buyer type:
              </span>{' '}
              {buyer?.type ?? '-'}{' '}
              {buyer?.sector ? `(${buyer.sector})` : ''}
            </p>
          </div>

          <div>
            <h3 className="mb-2 inline-flex items-center gap-1 font-medium">
              <BadgeCheck className="h-4 w-4" />
              Certifications required
            </h3>
            <p>{certs.length ? certs.join(', ') : '-'}</p>
          </div>

          <div>
            <h3 className="mb-2 inline-flex items-center gap-1 font-medium">
              <ListChecks className="h-4 w-4" />
              Specifications
            </h3>
            {Object.keys(specs).length === 0 ? (
              <p>-</p>
            ) : (
              <ul className="space-y-1">
                {Object.entries(specs).map(([key, value]) => (
                  <li key={key}>
                    <span className="text-muted-foreground">{key}:</span> {String(value)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="mb-2 inline-flex items-center gap-1 font-medium">
              <Package2 className="h-4 w-4" />
              Accepted quotes
            </h3>
            {accepted.length === 0 ? (
              <p>-</p>
            ) : (
              <ul className="space-y-1">
                {accepted.map((quote) => {
                  const supplier = relationOne(
                    quote.organizations as
                      | { name: string }
                      | { name: string }[]
                      | null
                  )
                  return (
                    <li key={quote.id}>
                      {supplier?.name ?? 'Supplier'}: {quote.quantity_offer ?? '-'}
                      {quote.price_offer != null ? ` @ ${formatCurrencyIDR(quote.price_offer)}` : ''}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
