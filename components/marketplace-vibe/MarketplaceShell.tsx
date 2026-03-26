import { requireSession } from '@/lib/rbac/guards'
import { MarketplaceNavbar } from '@/components/marketplace-vibe/MarketplaceNavbar'
import { MarketplaceFooter } from '@/components/marketplace-vibe/MarketplaceFooter'

export async function MarketplaceShell({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireSession()

  return (
    <div className="min-h-svh bg-background">
      <MarketplaceNavbar
        isSupplier={session.profile.is_supplier}
        isBuyer={session.profile.is_buyer}
        isSuperadmin={session.profile.is_platform_superadmin}
      />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:py-8">{children}</main>
      <MarketplaceFooter />
    </div>
  )
}
