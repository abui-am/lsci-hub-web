import { requireSession } from '@/lib/rbac/guards'
import { MarketplaceNavbar } from '@/components/marketplace-vibe/MarketplaceNavbar'
import { MarketplaceFooter } from '@/components/marketplace-vibe/MarketplaceFooter'

export async function MarketplaceShell({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireSession()
  const userLabel =
    session.profile.name?.trim() ||
    session.email?.trim() ||
    'Pengguna'
  const accountImageUrl = session.organization?.logo_image ?? null

  return (
    <div className="relative min-h-svh overflow-x-hidden bg-background">
      <MarketplaceNavbar
        isSupplier={session.profile.is_supplier}
        isBuyer={session.profile.is_buyer}
        isSuperadmin={session.profile.is_platform_superadmin}
        userLabel={userLabel}
        accountImageUrl={accountImageUrl}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-8 z-0 h-[440px] w-[620px] blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse at top left, rgba(34, 197, 94, 0.14) 0%, rgba(34, 197, 94, 0.06) 42%, rgba(34, 197, 94, 0) 76%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 top-10 z-0 h-[380px] w-[560px] blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse at top right, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.04) 40%, rgba(34, 197, 94, 0) 76%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-14 z-0 h-40"
        style={{
          background:
            'linear-gradient(to bottom, rgba(34, 197, 94, 0.04) 0%, rgba(34, 197, 94, 0.02) 36%, rgba(34, 197, 94, 0) 100%)',
        }}
      />
      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 md:py-8">
        {children}
      </main>
      <MarketplaceFooter />
    </div>
  )
}
