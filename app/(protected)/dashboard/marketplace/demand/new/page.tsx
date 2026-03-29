import { createClient } from '@/lib/supabase/server'
import { DemandListingForm } from '@/components/dashboard/marketplace/DemandListingForm'
import { requireSession } from '@/lib/rbac/guards'

export default async function DemandListingNewPage() {
  const session = await requireSession()
  const canCreateProducts = true

  if (!session.organization) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        <h2 className="text-base font-semibold">Belum ada organisasi</h2>
        <p className="mt-2 text-muted-foreground">
          Untuk membuat listing permintaan, Anda harus ditautkan ke organisasi pembeli.
        </p>
        <p className="mt-3">
          Buka <a className="underline" href="/dashboard/settings">Pengaturan</a> dan tunggu persetujuan admin.
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
    <div>
      <DemandListingForm
        mode="create"
        products={(products ?? []) as Array<{ id: string; name: string; unit: string }>}
        canCreateProducts={canCreateProducts}
      />
    </div>
  )
}

