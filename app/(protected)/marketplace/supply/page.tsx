import { createClient } from '@/lib/supabase/server'
import { relationOne } from '@/lib/supabase/relation'
import { requireSession } from '@/lib/rbac/guards'
import Image from 'next/image'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MarketplaceHeader } from '@/components/marketplace-vibe/MarketplaceHeader'
import { MarketplaceFilterBar } from '@/components/marketplace-vibe/MarketplaceFilterBar'
import { formatCreditScore, formatCurrencyIDR } from '@/lib/utils'

export default async function MarketplaceSupplyListPage() {
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
  const { data: rows, error } = await supabase
    .from('supply_listings')
    .select(
      `
      id,
      quantity,
      price_estimate,
      min_order_quantity,
      lead_time_days,
      export_capability,
      price_type,
      image_url,
      supplier_location,
      expiration_date,
      status,
      products ( name, unit ),
      organizations ( id, name, logo_image, supplier_credit_score )
    `
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(40)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Link
          href="/marketplace/supply/new"
          className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
        >
          <Plus className="size-4" aria-hidden />
          Add supply
        </Link>
      </div>

      <MarketplaceHeader
        title="Supply list"
        description="Marketplace inventory from suppliers, with quantity, pricing, and readiness details."
        stats={[
          { label: 'Total listings', value: rows?.length ?? 0 },
          {
            label: 'Open listings',
            value: (rows ?? []).filter((row) => row.status === 'active').length,
          },
          {
            label: 'Export ready',
            value: (rows ?? []).filter((row) => row.export_capability).length,
          },
        ]}
      />

      <MarketplaceFilterBar searchPlaceholder="Search supply by product or supplier" />

      {error ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </p>
      ) : !rows?.length ? (
        <p className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          No supply listings available yet.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const product = relationOne(
              row.products as
                | { name: string; unit: string }
                | { name: string; unit: string }[]
                | null
            )
            const org = relationOne(
              row.organizations as
                | { id: string; name: string; logo_image?: string | null; supplier_credit_score?: number | null }
                | { id: string; name: string; logo_image?: string | null; supplier_credit_score?: number | null }[]
                | null
            )

            return (
              <li key={row.id}>
                <Card className="h-full">
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-xl">
                    <Image
                      src={row.image_url ?? '/dummy-cabe.png'}
                      alt={product?.name ?? 'Supply product'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{product?.name ?? 'Product'}</CardTitle>
                      <Badge variant={row.status === 'active' ? 'success' : 'outline'}>
                        {row.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="relative h-6 w-6 overflow-hidden rounded-full border">
                        <Image
                          src={org?.logo_image ?? '/dummy-cabe.png'}
                          alt={org?.name ?? 'Supplier logo'}
                          fill
                          className="object-cover"
                          sizes="24px"
                        />
                      </div>
                      {org?.id ? (
                        <Link href={`/marketplace/account/${org.id}`} className="hover:underline">
                          {org?.name ?? 'Supplier'}
                        </Link>
                      ) : (
                        <p>{org?.name ?? 'Supplier'}</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Credit score:{' '}
                      {formatCreditScore(
                        (org as { supplier_credit_score?: number | null } | null)
                          ?.supplier_credit_score
                      )}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Quantity:</span>{' '}
                      {row.quantity ?? '-'} {product?.unit ?? ''}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Price:</span>{' '}
                      {formatCurrencyIDR(row.price_estimate)} {row.price_type ? `(${row.price_type})` : ''}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Min order:</span>{' '}
                      {row.min_order_quantity ?? '-'}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Lead time:</span>{' '}
                      {row.lead_time_days ?? '-'} days
                    </p>
                    <p>
                      <span className="text-muted-foreground">Export:</span>{' '}
                      {row.export_capability ? 'Yes' : 'No'}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Location:</span>{' '}
                      {row.supplier_location ?? '-'}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Expires:</span>{' '}
                      {row.expiration_date ?? '-'}
                    </p>
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
