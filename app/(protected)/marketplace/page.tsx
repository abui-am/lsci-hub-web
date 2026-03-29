import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/rbac/guards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function MarketplaceEntryPage() {
  const session = await requireSession()

  const isSuper = session.profile.is_platform_superadmin
  const isSupplier = session.profile.is_supplier
  const isBuyer = session.profile.is_buyer

  if (isSupplier && !isBuyer && !isSuper) {
    redirect('/supplier/marketplace')
  }

  if (isBuyer && !isSupplier && !isSuper) {
    redirect('/buyer/marketplace')
  }

  if (!isSuper && !isSupplier && !isBuyer) {
    redirect('/dashboard')
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 md:py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Marketplace</h1>
        <p className="text-sm text-muted-foreground">
          Pengalaman terpisah dari dasbor. Pilih ruang kerja sesuai peran Anda.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(isSuper || isSupplier) && (
          <Card>
            <CardHeader>
              <CardTitle>Ruang kerja pemasok</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Jelajahi RFQ terbuka, kirim penawaran, dan pantau status respons.
              </p>
              <Button asChild>
                <Link href="/supplier/marketplace">Ke marketplace pemasok</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {(isSuper || isBuyer) && (
          <Card>
            <CardHeader>
              <CardTitle>Ruang kerja pembeli</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Tinjau penawaran masuk dan putuskan dengan terima/tolak.
              </p>
              <Button asChild>
                <Link href="/buyer/marketplace">Ke marketplace pembeli</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="pt-2">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Kembali ke dasbor
        </Link>
      </div>
    </div>
  )
}
