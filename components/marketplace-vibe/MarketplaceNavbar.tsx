import Link from 'next/link'
import Image from 'next/image'
import { SignOutButton } from '@/components/auth/SignOutButton'

interface MarketplaceNavbarProps {
  isSupplier: boolean
  isBuyer: boolean
  isSuperadmin: boolean
  userLabel: string
}

export function MarketplaceNavbar({
  isSupplier,
  isBuyer,
  isSuperadmin,
  userLabel,
}: MarketplaceNavbarProps) {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4">
        <Link href="/marketplace" className="flex items-center gap-2 rounded-md px-2 py-1 font-semibold">
          <Image
            src="/indosourcing.png"
            alt="Logo Indosourcing"
            width={20}
            height={20}
            className="rounded-sm"
          />
          <span>Indosourcing</span>
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
            className="ml-2 inline-flex h-9 max-w-40 items-center truncate rounded-full border border-primary/25 bg-background/90 px-3 text-sm font-medium text-foreground/70 hover:border-primary/45 hover:bg-primary/8 hover:text-foreground"
            title={userLabel}
          >
            {userLabel}
          </Link>
          <div className="ml-1">
            <SignOutButton className="h-9 rounded-full border-primary/25 bg-background/90 px-3 font-medium hover:border-primary/45 hover:bg-primary/8" />
          </div>
        </nav>
      </div>
    </header>
  )
}
