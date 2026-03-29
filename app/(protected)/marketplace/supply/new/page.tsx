import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/rbac/guards'
import { SupplyListingForm } from '@/components/dashboard/marketplace/SupplyListingForm'

export default async function MarketplaceSupplyNewPage() {
  const session = await requireSession()
  const canCreateProducts = true

  if (!session.organization) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        <h2 className="text-base font-semibold">Belum ada organisasi</h2>
        <p className="mt-2 text-muted-foreground">
          Untuk membuat listing pasokan, akun harus ditautkan ke organisasi pemasok.
        </p>
      </div>
    )
  }

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
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, unit')
    .is('deleted_at', null)
    .order('name')

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        Gagal memuat produk: {error.message}
      </div>
    )
  }

  return (
    <SupplyListingForm
      mode="create"
      products={(products ?? []) as Array<{ id: string; name: string; unit: string }>}
      canCreateProducts={canCreateProducts}
      backHref="/marketplace/supply"
      successRedirectPath="/marketplace/supply"
    />
  )
}
