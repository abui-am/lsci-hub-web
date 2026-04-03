import Link from 'next/link'
import Image from 'next/image'

export function MarketplaceFooter() {
  return (
    <footer className="mt-12 border-t bg-primary text-foreground">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 md:grid-cols-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Image
              src="/indosourcing.png"
              alt="Logo Indosourcing"
              width={24}
              height={24}
              className="rounded-sm"
            />
            <p className="text-lg font-semibold">Marketplace Indosourcing</p>
          </div>
          <p className="text-sm text-slate-400">
            Sumberkan, ajukan penawaran, dan negosiasikan dengan jaringan pemasok dan pembeli terpercaya.
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium text-slate-100">Marketplace</p>
          <Link href="/supplier/marketplace" className="block text-slate-400 hover:text-white">
            Untuk pemasok
          </Link>
          <Link href="/buyer/marketplace" className="block text-slate-400 hover:text-white">
            Untuk pembeli
          </Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium text-slate-100">Sumber daya</p>
          <Link href="/dashboard/settings" className="block text-slate-400 hover:text-white">
            Pengaturan akun
          </Link>
          <Link href="/dashboard" className="block text-slate-400 hover:text-white">
            Dasbor
          </Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium text-slate-100">Kontak</p>
          <p className="text-slate-400">team@lsci-hub.local</p>
          <p className="text-slate-400">Sen–Jum, 09:00–18:00</p>
        </div>
      </div>
      <div className="border-t border-slate-800 px-4 py-4 text-center text-xs text-slate-500">
        Hak cipta {new Date().getFullYear()} Marketplace Indosourcing. Seluruh hak dilindungi.
      </div>
    </footer>
  )
}
