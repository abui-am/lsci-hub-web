import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SupplyListingForm } from '@/components/dashboard/marketplace/SupplyListingForm'
import { requireSession } from '@/lib/rbac/guards'

export default async function SupplyListingEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireSession()
  const canCreateProducts = true

  const { id } = await params

  if (!session.organization && !session.profile.is_platform_superadmin) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        <h2 className="text-base font-semibold">Belum ada organisasi</h2>
        <p className="mt-2 text-muted-foreground">
          Minta admin platform mendaftarkan akun Anda ke organisasi pemasok sebelum mengedit listing pasokan.
        </p>
      </div>
    )
  }

  if (!session.profile.is_platform_superadmin && !session.profile.is_supplier) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        <h2 className="text-base font-semibold">Tidak diizinkan</h2>
        <p className="mt-2 text-muted-foreground">
          Akun Anda tidak ditandai sebagai <span className="font-medium">pemasok</span>.
        </p>
      </div>
    )
  }

  const supabase = await createClient()

  const { data: listing, error: listingError } = await supabase
    .from('supply_listings')
    .select(
      'id, product_id, quantity, price_estimate, min_order_quantity, lead_time_days, export_capability, price_type, certifications, available_from, available_until, image_url, supplier_location, expiration_date, status'
    )
    .eq('id', id)
    .maybeSingle()

  if (listingError || !listing) {
    notFound()
  }

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, unit')
    .is('deleted_at', null)
    .order('name')

  if (productsError) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        Gagal memuat produk: {productsError.message}
      </div>
    )
  }

  const certs = Array.isArray(listing.certifications)
    ? (listing.certifications as string[])
    : []

  return (
    <SupplyListingForm
      mode="edit"
      products={(products ?? []) as Array<{ id: string; name: string; unit: string }>}
      canCreateProducts={canCreateProducts}
      initial={{
        id: listing.id,
        product_id: listing.product_id,
        quantity: listing.quantity,
        price_estimate: listing.price_estimate,
        min_order_quantity: listing.min_order_quantity,
        lead_time_days: listing.lead_time_days,
        export_capability: listing.export_capability,
        price_type: listing.price_type,
        certifications: certs,
        available_from: listing.available_from,
        available_until: listing.available_until,
        image_url: listing.image_url,
        supplier_location: listing.supplier_location,
        expiration_date: listing.expiration_date,
        status: listing.status,
      }}
    />
  )
}

