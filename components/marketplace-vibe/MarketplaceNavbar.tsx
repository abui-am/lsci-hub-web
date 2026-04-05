import Link from 'next/link'
import Image from 'next/image'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { MarketplaceNotificationMenu } from '@/components/marketplace-vibe/MarketplaceNotificationMenu'

interface MarketplaceNavbarProps {
  isSupplier: boolean
  isBuyer: boolean
  isSuperadmin: boolean
  userLabel: string
  accountImageUrl?: string | null
}

export function MarketplaceNavbar({
  isSupplier,
  isBuyer,
  isSuperadmin,
  userLabel,
  accountImageUrl,
}: MarketplaceNavbarProps) {
  const normalizedAccountImageUrl =
    accountImageUrl &&
    (/^https?:\/\//.test(accountImageUrl) || accountImageUrl.startsWith('/'))
      ? accountImageUrl
      : null
  const accountInitial = userLabel.trim().charAt(0).toUpperCase() || 'U'

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4">
        <Link href="/marketplace" className="flex shrink-0 items-center gap-2 rounded-md px-1 py-1">
          <Image
            src="/indosourcing_new.png"
            alt="Logo Indosourcing"
            width={36}
            height={36}
            className="h-9 w-9 rounded-sm object-contain"
            priority
          />
          <span className="leading-tight">
            <span className="block text-sm font-semibold tracking-tight text-primary">
              Indosourcing
            </span>
            <span className="block text-xs font-medium text-muted-foreground">
              Marketplace B2B
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-1.5 text-sm">
          {(isSupplier || isSuperadmin) && (
            <Link
              href="/supplier/marketplace"
              className="rounded-full px-3 py-1.5 font-medium text-foreground/70 hover:bg-primary/8 hover:text-foreground"
            >
              Dashboard Pemasok
            </Link>
          )}
          {(isBuyer || isSuperadmin) && (
            <Link
              href="/buyer/marketplace"
              className="rounded-full px-3 py-1.5 font-medium text-foreground/70 hover:bg-primary/8 hover:text-foreground"
            >
              Dashboard Pembeli
            </Link>
          )}
          {(isSupplier || isSuperadmin) && (
            <Link
              href="/marketplace/supply"
              className="rounded-full px-3 py-1.5 font-medium text-foreground/70 hover:bg-primary/8 hover:text-foreground"
            >
              Daftar pasokan
            </Link>
          )}
          {(isBuyer || isSuperadmin) && (
            <>
              <Link
                href="/marketplace/demand"
                className="rounded-full px-3 py-1.5 font-medium text-foreground/70 hover:bg-primary/8 hover:text-foreground"
              >
                Listing permintaan
              </Link>
              <Link
                href="/marketplace/supply-listing/offer"
                className="rounded-full px-3 py-1.5 font-medium text-foreground/70 hover:bg-primary/8 hover:text-foreground"
              >
                Offer Request
              </Link>
            </>
          )}
          {(isSupplier || isBuyer || isSuperadmin) && (
            <Link
              href="/marketplace/advisor"
              className="rounded-full px-3 py-1.5 font-medium text-foreground/70 hover:bg-primary/8 hover:text-foreground"
            >
              Penasihat AI
            </Link>
          )}
          <Link
            href="/marketplace/account"
            className="ml-2 inline-flex h-9 max-w-48 items-center gap-2 truncate rounded-full border border-primary/25 bg-background/90 px-2.5 text-sm font-medium text-foreground/70 hover:border-primary/45 hover:bg-primary/8 hover:text-foreground"
            title={userLabel}
          >
            <span className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-[11px] font-semibold text-foreground">
              {normalizedAccountImageUrl ? (
                <Image
                  src={normalizedAccountImageUrl}
                  alt={userLabel}
                  fill
                  className="object-cover"
                  sizes="24px"
                />
              ) : (
                accountInitial
              )}
            </span>
            <span className="truncate">{userLabel}</span>
          </Link>
          <div className="ml-1">
            <MarketplaceNotificationMenu />
          </div>
          <div className="ml-1">
            <SignOutButton className="h-9 rounded-full border-primary/25 bg-background/90 px-3 font-medium hover:border-primary/45 hover:bg-primary/8" />
          </div>
        </nav>
      </div>
    </header>
  )
}
