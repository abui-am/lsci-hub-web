import Link from 'next/link'
import { GitMerge, ClipboardList, MessagesSquare, Package } from 'lucide-react'
import { requireSession } from '@/lib/rbac/guards'

const sections = [
  {
    href: '/dashboard/marketplace/supply',
    title: 'Listing pasokan',
    description:
      'Buat dan kelola produk, stok, harga, dan timeline pengiriman Anda.',
    icon: Package,
  },
  {
    href: '/dashboard/marketplace/demand',
    title: 'Permintaan / RFQ',
    description:
      'Buat permintaan pembelian dengan jumlah, harga target, dan detail pengiriman.',
    icon: ClipboardList,
  },
  {
    href: '/dashboard/marketplace/matches',
    title: 'Kecocokan AI',
    description:
      'Lihat peluang pemasok-pembeli yang direkomendasikan berdasarkan produk dan ketersediaan.',
    icon: GitMerge,
  },
  {
    href: '/dashboard/marketplace/rfq/open',
    title: 'RFQ terbuka',
    description:
      'Jelajahi permintaan pembeli terbuka dan kirim penawaran langsung.',
    icon: MessagesSquare,
  },
  {
    href: '/dashboard/marketplace/rfq',
    title: 'Respons RFQ',
    description: 'Tinjau aktivitas penawaran dan keputusan pembeli di satu tempat.',
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
          Marketplace pengadaan
        </h1>
        <p className="mt-1 text-muted-foreground">
          Kelola penawaran pemasok, permintaan pembeli, penawaran, dan pencocokan dalam
          satu alur.
        </p>
      </div>
      {!visibleSections.length ? (
        <p className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          Tidak ada bagian marketplace untuk peran Anda saat ini.
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
