import Link from 'next/link'

export function MarketplaceFooter() {
  return (
    <footer className="mt-12 border-t bg-slate-950 text-slate-200">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 md:grid-cols-4">
        <div className="space-y-2">
          <p className="text-lg font-semibold">Indosourcing Marketplace</p>
          <p className="text-sm text-slate-400">
            Source, quote, and negotiate with trusted supplier and buyer networks.
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium text-slate-100">Marketplace</p>
          <Link href="/supplier/marketplace" className="block text-slate-400 hover:text-white">
            For suppliers
          </Link>
          <Link href="/buyer/marketplace" className="block text-slate-400 hover:text-white">
            For buyers
          </Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium text-slate-100">Resources</p>
          <Link href="/dashboard/settings" className="block text-slate-400 hover:text-white">
            Account settings
          </Link>
          <Link href="/dashboard" className="block text-slate-400 hover:text-white">
            Dashboard
          </Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium text-slate-100">Contact</p>
          <p className="text-slate-400">team@lsci-hub.local</p>
          <p className="text-slate-400">Mon-Fri, 09:00-18:00</p>
        </div>
      </div>
      <div className="border-t border-slate-800 px-4 py-4 text-center text-xs text-slate-500">
        Copyright {new Date().getFullYear()} Indosourcing Marketplace. All rights reserved.
      </div>
    </footer>
  )
}
