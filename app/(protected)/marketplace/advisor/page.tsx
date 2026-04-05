import { requireSession } from '@/lib/rbac/guards'
import { MarketplaceAdvisorWorkspace } from '@/components/marketplace-vibe/MarketplaceAdvisorWorkspace'

export default async function MarketplaceAdvisorPage() {
  const session = await requireSession()
  const canAccess =
    session.profile.is_platform_superadmin ||
    session.profile.is_supplier ||
    session.profile.is_buyer

  if (!canAccess) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        <h2 className="text-base font-semibold">Tidak diizinkan</h2>
        <p className="mt-2 text-muted-foreground">
          Akun Anda tidak dapat mengakses Penasihat AI.
        </p>
      </div>
    )
  }

  const userLabel =
    session.profile.name?.trim() ||
    session.email?.trim() ||
    'Pengguna'
  const userImageUrl = session.organization?.logo_image ?? null

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Penasihat AI</h1>
          <p className="text-sm text-muted-foreground">
            Dapatkan panduan sourcing, rekomendasi shortlist, dan persiapan negosiasi.
          </p>
        </div>
      </div>

      <MarketplaceAdvisorWorkspace
        userLabel={userLabel}
        userImageUrl={userImageUrl}
      />
    </div>
  )
}
