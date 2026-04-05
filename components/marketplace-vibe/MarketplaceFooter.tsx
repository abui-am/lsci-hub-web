import Link from 'next/link'
import Image from 'next/image'

export function MarketplaceFooter() {
  return (
    <footer className="mt-12 border-t bg-background text-foreground">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 md:grid-cols-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Image
              src="/indosourcing_new.png"
              alt="Logo Indosourcing"
              width={24}
              height={24}
              className="rounded-sm"
            />
            <p className="text-lg font-semibold text-foreground">Indosourcing</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Sumberkan, ajukan penawaran, dan negosiasikan dengan jaringan pemasok dan pembeli terpercaya.
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium text-foreground">Marketplace</p>
          <Link href="/supplier/marketplace" className="block text-muted-foreground hover:text-foreground">
            Untuk pemasok
          </Link>
          <Link href="/buyer/marketplace" className="block text-muted-foreground hover:text-foreground">
            Untuk pembeli
          </Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium text-foreground">Sumber daya</p>
          <Link href="/dashboard/settings" className="block text-muted-foreground hover:text-foreground">
            Pengaturan akun
          </Link>
          <Link href="/dashboard" className="block text-muted-foreground hover:text-foreground">
            Dasbor
          </Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium text-foreground">Kontak</p>
          <p className="text-muted-foreground">team@lsci-hub.local</p>
          <p className="text-muted-foreground">Sen–Jum, 09:00–18:00</p>
        </div>
      </div>
      <div className="border-t px-4 py-4 text-center text-xs text-muted-foreground">
        Hak cipta {new Date().getFullYear()} Marketplace Indosourcing. Seluruh hak dilindungi.
      </div>
    </footer>
  )
}
