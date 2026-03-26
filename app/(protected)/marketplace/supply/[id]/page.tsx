import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { relationOne } from '@/lib/supabase/relation'
import { requireSession } from '@/lib/rbac/guards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCreditScore, formatCurrencyIDR } from '@/lib/utils'

export default async function MarketplaceSupplyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireSession()
  if (
    !session.profile.is_platform_superadmin &&
    !session.profile.is_buyer &&
    !session.profile.is_supplier
  ) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        <h2 className="text-base font-semibold">Not allowed</h2>
        <p className="mt-2 text-muted-foreground">
          Your account cannot access supply listing details.
        </p>
      </div>
    )
  }

  const { id } = await params
  const supabase = await createClient()

  const { data: row, error } = await supabase
    .from('supply_listings')
    .select(
      `
      id,
      organization_id,
      product_id,
      quantity,
      price_estimate,
      available_from,
      available_until,
      min_order_quantity,
      lead_time_days,
      export_capability,
      price_type,
      certifications,
      supplier_location,
      expiration_date,
      image_url,
      created_by,
      created_at,
      status,
      products ( name, unit, category, is_raw_material, description ),
      organizations ( id, name, type, sector, description, logo_image, supplier_credit_score )
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
      | {
          name: string
          unit: string
          category: string
          is_raw_material: boolean
          description: string | null
        }
      | {
          name: string
          unit: string
          category: string
          is_raw_material: boolean
          description: string | null
        }[]
      | null
  )
  const supplier = relationOne(
    row.organizations as
      | {
          id: string
          name: string
          type: string
          sector: string | null
          description: string | null
          logo_image: string | null
          supplier_credit_score: number | null
        }
      | {
          id: string
          name: string
          type: string
          sector: string | null
          description: string | null
          logo_image: string | null
          supplier_credit_score: number | null
        }[]
      | null
  )
  const certifications = Array.isArray(row.certifications)
    ? (row.certifications as string[])
    : []

  return (
    <div className="space-y-4">
      <Link
        href="/buyer/marketplace"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        Back to buyer marketplace
      </Link>

      <Card>
        <div className="relative aspect-[16/6] max-h-[360px] w-full overflow-hidden rounded-t-xl">
          <Image
            src={row.image_url ?? '/dummy-cabe.png'}
            alt={product?.name ?? 'Supply product'}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 70vw"
          />
        </div>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{product?.name ?? 'Product'}</CardTitle>
            <Badge variant={row.status === 'active' ? 'success' : 'outline'}>{row.status}</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="relative h-6 w-6 overflow-hidden rounded-full border">
              <Image
                src={supplier?.logo_image ?? '/dummy-cabe.png'}
                alt={supplier?.name ?? 'Supplier logo'}
                fill
                className="object-cover"
                sizes="24px"
              />
            </div>
            <p>
              Supplier:{' '}
              {supplier?.id ? (
                <Link href={`/marketplace/account/${supplier.id}`} className="hover:underline">
                  {supplier?.name ?? '-'}
                </Link>
              ) : (
                (supplier?.name ?? '-')
              )}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Supplier credit score:{' '}
            {formatCreditScore(supplier?.supplier_credit_score)}
          </p>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          <div className="grid gap-2 md:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Listing ID:</span> {row.id}
            </p>
            <p>
              <span className="text-muted-foreground">Created at:</span>{' '}
              {row.created_at ? new Date(row.created_at).toLocaleString() : '-'}
            </p>
            <p>
              <span className="text-muted-foreground">Organization ID:</span>{' '}
              {row.organization_id ?? '-'}
            </p>
            <p>
              <span className="text-muted-foreground">Created by:</span> {row.created_by ?? '-'}
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-medium">Commercial details</h3>
            <div className="grid gap-2 md:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Quantity:</span> {row.quantity ?? '-'}{' '}
                {product?.unit ?? ''}
              </p>
              <p>
                <span className="text-muted-foreground">Price estimate:</span>{' '}
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
                <span className="text-muted-foreground">Export capability:</span>{' '}
                {row.export_capability ? 'Yes' : 'No'}
              </p>
              <p>
                <span className="text-muted-foreground">Status:</span> {row.status ?? '-'}
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-medium">Availability and logistics</h3>
            <div className="grid gap-2 md:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Available from:</span>{' '}
                {row.available_from ?? '-'}
              </p>
              <p>
                <span className="text-muted-foreground">Available until:</span>{' '}
                {row.available_until ?? '-'}
              </p>
              <p>
                <span className="text-muted-foreground">Supplier location:</span>{' '}
                {row.supplier_location ?? '-'}
              </p>
              <p>
                <span className="text-muted-foreground">Expiration date:</span>{' '}
                {row.expiration_date ?? '-'}
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-medium">Product and supplier profile</h3>
            <div className="grid gap-2 md:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Product ID:</span> {row.product_id ?? '-'}
              </p>
              <p>
                <span className="text-muted-foreground">Product category:</span>{' '}
                {product?.category ?? '-'}
              </p>
              <p>
                <span className="text-muted-foreground">Product type:</span>{' '}
                {product?.is_raw_material ? 'Raw material' : 'Finished product'}
              </p>
              <p>
                <span className="text-muted-foreground">Organization type:</span>{' '}
                {supplier?.type ?? '-'}
              </p>
              <p>
                <span className="text-muted-foreground">Organization sector:</span>{' '}
                {supplier?.sector ?? '-'}
              </p>
            </div>
            <p className="mt-2">
              <span className="text-muted-foreground">Product description:</span>{' '}
              {product?.description ?? '-'}
            </p>
            <p className="mt-1">
              <span className="text-muted-foreground">Organization description:</span>{' '}
              {supplier?.description ?? '-'}
            </p>
          </div>

          <p>
            <span className="text-muted-foreground">Certifications:</span>{' '}
            {certifications.length ? certifications.join(', ') : '-'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
