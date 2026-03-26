import Link from 'next/link'
import { GitMerge, ClipboardList, MessagesSquare, Package } from 'lucide-react'
import { requireSession } from '@/lib/rbac/guards'

const sections = [
  {
    href: '/dashboard/marketplace/supply',
    title: 'Supply listings',
    description:
      'Supplier offers: quantity, pricing, lead time, export and certifications (TRD block 5).',
    icon: Package,
  },
  {
    href: '/dashboard/marketplace/demand',
    title: 'Demand / RFQ',
    description:
      'Buyer requirements, specs, Incoterms, and bidding workflow (TRD block 6).',
    icon: ClipboardList,
  },
  {
    href: '/dashboard/marketplace/matches',
    title: 'AI matches',
    description:
      'Suggested supply–demand pairs with scores and explanations (TRD blocks 7–10).',
    icon: GitMerge,
  },
  {
    href: '/dashboard/marketplace/rfq/open',
    title: 'Open RFQs',
    description:
      'Supplier can send quotes to any open RFQ. AI is a recommender only (TRD block 8).',
    icon: MessagesSquare,
  },
  {
    href: '/dashboard/marketplace/rfq',
    title: 'RFQ responses',
    description: 'Your submitted supplier quotes and their evaluation.',
    icon: MessagesSquare,
  },
] as const

export default async function MarketplaceHubPage() {
  const session = await requireSession()
  const isSuper = session.profile.is_platform_superadmin
  const isSupplier = session.profile.is_supplier
  const isBuyer = session.profile.is_buyer

  const visibleSections = sections.filter((item) => {
    if (isSuper) return true

    if (item.href.startsWith('/dashboard/marketplace/supply')) {
      return isSupplier
    }
    if (item.href.startsWith('/dashboard/marketplace/demand')) {
      return isBuyer
    }
    if (item.href === '/dashboard/marketplace/rfq/open') {
      return isSupplier
    }
    if (item.href === '/dashboard/marketplace/rfq') {
      return isSupplier || isBuyer
    }
    if (item.href === '/dashboard/marketplace/matches') {
      return isSupplier || isBuyer
    }

    return false
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Procurement marketplace
        </h1>
        <p className="mt-1 text-muted-foreground">
          Prototype shell for the AI procurement & supply-chain platform (TRD
          v2): listings, matching, RFQ, and negotiation.
        </p>
      </div>
      {!visibleSections.length ? (
        <p className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          No marketplace sections available for your current role.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {visibleSections.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex gap-4 rounded-lg border bg-card p-5 text-card-foreground shadow-sm transition-colors hover:bg-muted/40"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                  <item.icon className="size-5 text-foreground" aria-hidden />
                </div>
                <div>
                  <h2 className="font-medium">{item.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
