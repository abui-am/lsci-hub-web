import Link from 'next/link'
import { Store } from 'lucide-react'

interface MarketplaceNavbarProps {
  isSupplier: boolean
  isBuyer: boolean
  isSuperadmin: boolean
}

export function MarketplaceNavbar({
  isSupplier,
  isBuyer,
  isSuperadmin,
}: MarketplaceNavbarProps) {
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4">
        <Link href="/marketplace" className="flex items-center gap-2 font-semibold">
          <Store className="size-4" />
          <span>Indosourcing Marketplace</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {(isSupplier || isSuperadmin) && (
            <Link
              href="/supplier/marketplace"
              className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Supplier
            </Link>
          )}
          {(isBuyer || isSuperadmin) && (
            <Link
              href="/buyer/marketplace"
              className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Buyer
            </Link>
          )}
          {(isSupplier || isSuperadmin) && (
            <Link
              href="/marketplace/supply"
              className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Supply list
            </Link>
          )}
          {(isBuyer || isSuperadmin) && (
            <Link
              href="/marketplace/demand"
              className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Demand listing
            </Link>
          )}
          {(isSupplier || isBuyer || isSuperadmin) && (
            <Link
              href="/marketplace/advisor"
              className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              AI Advisor
            </Link>
          )}
          <Link href="/marketplace/account" className="rounded-md border px-2.5 py-1 hover:bg-muted">
            Account
          </Link>
        </nav>
      </div>
    </header>
  )
}
