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
import { OrganizationIdentityBadge } from '@/components/marketplace-vibe/OrganizationIdentityBadge'
import { formatCurrencyIDR } from '@/lib/utils'

export default async function MarketplaceSupplyListPage() {
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
          Tambah pasokan
        </Link>
      </div>

      <MarketplaceHeader
        title="Daftar pasokan"
        description="Inventori marketplace dari pemasok, dengan jumlah, harga, dan kesiapan."
        stats={[
          { label: 'Total listing', value: rows?.length ?? 0 },
          {
            label: 'Listing terbuka',
            value: (rows ?? []).filter((row) => row.status === 'active').length,
          },
          {
            label: 'Siap ekspor',
            value: (rows ?? []).filter((row) => row.export_capability).length,
          },
        ]}
      />

      <MarketplaceFilterBar searchPlaceholder="Cari pasokan menurut produk atau pemasok" />

      {error ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </p>
      ) : !rows?.length ? (
        <p className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          Belum ada listing pasokan.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-3 xl:grid-cols-4">
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
                      alt={product?.name ?? 'Produk pasokan'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{product?.name ?? 'Produk'}</CardTitle>
                      <Badge variant={row.status === 'active' ? 'success' : 'outline'}>
                        {row.status}
                      </Badge>
                    </div>
                    <OrganizationIdentityBadge
                      name={org?.name ?? 'Pemasok'}
                      logoUrl={org?.logo_image}
                      accountHref={org?.id ? `/marketplace/account/${org.id}` : undefined}
                      creditScore={
                        (org as { supplier_credit_score?: number | null } | null)
                          ?.supplier_credit_score
                      }
                      roleLabel="Pemasok"
                      containerClassName="rounded-none bg-transparent p-0"
                    />
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Jumlah:</span>{' '}
                      {row.quantity ?? '-'} {product?.unit ?? ''}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Harga:</span>{' '}
                      {formatCurrencyIDR(row.price_estimate)} {row.price_type ? `(${row.price_type})` : ''}
                    </p>
                    <p>
                      <span className="text-muted-foreground">MOQ:</span>{' '}
                      {row.min_order_quantity ?? '-'}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Lead time:</span>{' '}
                      {row.lead_time_days ?? '-'} hari
                    </p>
                    <p>
                      <span className="text-muted-foreground">Ekspor:</span>{' '}
                      {row.export_capability ? 'Ya' : 'Tidak'}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Lokasi:</span>{' '}
                      {row.supplier_location ?? '-'}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Kedaluwarsa:</span>{' '}
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
