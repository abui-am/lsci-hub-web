import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { relationOne } from '@/lib/supabase/relation'
import { requireSession } from '@/lib/rbac/guards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OrganizationIdentityBadge } from '@/components/marketplace-vibe/OrganizationIdentityBadge'
import { formatCurrencyIDR } from '@/lib/utils'

function resolveImageSrc(value: string | null | undefined): string | null {
  const raw = typeof value === 'string' ? value.trim().replace(/^['"]|['"]$/g, '') : ''
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return encodeURI(raw)
  if (raw.startsWith('//')) return `https:${encodeURI(raw)}`
  if (raw.startsWith('/')) return raw
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw)) return `https://${encodeURI(raw)}`
  return `/${raw.replace(/^\/+/, '')}`
}

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
        <h2 className="text-base font-semibold">Tidak diizinkan</h2>
        <p className="mt-2 text-muted-foreground">
          Akun Anda tidak dapat mengakses detail listing pasokan.
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
  const imageSrc = resolveImageSrc(row.image_url) ?? '/dummy-cabe.png'

  return (
    <div className="space-y-4">
      <Link
        href="/buyer/marketplace"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        Kembali ke marketplace pembeli
      </Link>

      <Card>
        <div className="relative aspect-16/6 max-h-[360px] w-full overflow-hidden rounded-t-xl">
          <Image
            src={imageSrc}
            alt={product?.name ?? 'Produk pasokan'}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 70vw"
          />
        </div>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{product?.name ?? 'Produk'}</CardTitle>
            <Badge variant={row.status === 'active' ? 'success' : 'outline'}>{row.status}</Badge>
          </div>
          <OrganizationIdentityBadge
            name={supplier?.name ?? '-'}
            logoUrl={supplier?.logo_image}
            accountHref={supplier?.id ? `/marketplace/account/${supplier.id}` : undefined}
            creditScore={supplier?.supplier_credit_score}
            roleLabel="Pemasok"
            containerClassName="rounded-none bg-transparent p-0"
          />
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          <div className="grid gap-2 md:grid-cols-2">
            <p>
              <span className="text-muted-foreground">ID listing:</span> {row.id}
            </p>
            <p>
              <span className="text-muted-foreground">Dibuat pada:</span>{' '}
              {row.created_at ? new Date(row.created_at).toLocaleString() : '-'}
            </p>
            <p>
              <span className="text-muted-foreground">ID organisasi:</span>{' '}
              {row.organization_id ?? '-'}
            </p>
            <p>
              <span className="text-muted-foreground">Dibuat oleh:</span> {row.created_by ?? '-'}
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-medium">Detail komersial</h3>
            <div className="grid gap-2 md:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Jumlah:</span> {row.quantity ?? '-'}{' '}
                {product?.unit ?? ''}
              </p>
              <p>
                <span className="text-muted-foreground">Perkiraan harga:</span>{' '}
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
                <span className="text-muted-foreground">Kemampuan ekspor:</span>{' '}
                {row.export_capability ? 'Ya' : 'Tidak'}
              </p>
              <p>
                <span className="text-muted-foreground">Status:</span> {row.status ?? '-'}
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-medium">Ketersediaan dan logistik</h3>
            <div className="grid gap-2 md:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Tersedia dari:</span>{' '}
                {row.available_from ?? '-'}
              </p>
              <p>
                <span className="text-muted-foreground">Tersedia hingga:</span>{' '}
                {row.available_until ?? '-'}
              </p>
              <p>
                <span className="text-muted-foreground">Lokasi pemasok:</span>{' '}
                {row.supplier_location ?? '-'}
              </p>
              <p>
                <span className="text-muted-foreground">Tanggal kedaluwarsa:</span>{' '}
                {row.expiration_date ?? '-'}
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-medium">Profil produk dan pemasok</h3>
            <div className="grid gap-2 md:grid-cols-2">
              <p>
                <span className="text-muted-foreground">ID produk:</span> {row.product_id ?? '-'}
              </p>
              <p>
                <span className="text-muted-foreground">Kategori produk:</span>{' '}
                {product?.category ?? '-'}
              </p>
              <p>
                <span className="text-muted-foreground">Jenis produk:</span>{' '}
                {product?.is_raw_material ? 'Bahan baku' : 'Produk jadi'}
              </p>
              <p>
                <span className="text-muted-foreground">Jenis organisasi:</span>{' '}
                {supplier?.type ?? '-'}
              </p>
              <p>
                <span className="text-muted-foreground">Sektor organisasi:</span>{' '}
                {supplier?.sector ?? '-'}
              </p>
            </div>
            <p className="mt-2">
              <span className="text-muted-foreground">Deskripsi produk:</span>{' '}
              {product?.description ?? '-'}
            </p>
            <p className="mt-1">
              <span className="text-muted-foreground">Deskripsi organisasi:</span>{' '}
              {supplier?.description ?? '-'}
            </p>
          </div>

          <p>
            <span className="text-muted-foreground">Sertifikasi:</span>{' '}
            {certifications.length ? certifications.join(', ') : '-'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
