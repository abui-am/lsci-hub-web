import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DemandListingForm } from '@/components/dashboard/marketplace/DemandListingForm'
import { requireSession } from '@/lib/rbac/guards'

export default async function MarketplaceDemandListingEditPage({
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
          Minta admin platform mendaftarkan akun Anda ke organisasi pembeli sebelum mengedit listing permintaan.
        </p>
      </div>
    )
  }

  if (!session.profile.is_platform_superadmin && !session.profile.is_buyer) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        <h2 className="text-base font-semibold">Tidak diizinkan</h2>
        <p className="mt-2 text-muted-foreground">
          Akun Anda tidak ditandai sebagai <span className="font-medium">pembeli</span>.
        </p>
      </div>
    )
  }

  const supabase = await createClient()

  const { data: listing, error: listingError } = await supabase
    .from('demand_listings')
    .select(
      'id, product_id, required_quantity, required_by, price_range_from, price_range_to, specifications, certifications_required, target_location, incoterms, image_url, is_open_for_bidding, status'
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

  const specs =
    listing.specifications && typeof listing.specifications === 'object'
      ? (listing.specifications as Record<string, unknown>)
      : {}

  const certs = Array.isArray(listing.certifications_required)
    ? (listing.certifications_required as string[])
    : []

  return (
    <DemandListingForm
      mode="edit"
      products={(products ?? []) as Array<{ id: string; name: string; unit: string }>}
      canCreateProducts={canCreateProducts}
      backHref="/marketplace/demand"
      successRedirectPath="/marketplace/demand"
      initial={{
        id: listing.id,
        product_id: listing.product_id,
        required_quantity: listing.required_quantity,
        required_by: listing.required_by,
        price_range_from: listing.price_range_from,
        price_range_to: listing.price_range_to,
        specifications: specs,
        certifications_required: certs,
        target_location: listing.target_location,
        incoterms: listing.incoterms,
        image_url: listing.image_url,
        is_open_for_bidding: listing.is_open_for_bidding,
        status: listing.status,
      }}
    />
  )
}
