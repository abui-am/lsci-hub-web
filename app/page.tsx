import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user?.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_supplier, is_buyer, is_platform_superadmin')
      .eq('id', user.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (profile && !profile.is_platform_superadmin) {
      if (profile.is_supplier && !profile.is_buyer) {
        redirect('/supplier/marketplace')
      }
      if (profile.is_buyer && !profile.is_supplier) {
        redirect('/buyer/marketplace')
      }
      if (profile.is_supplier || profile.is_buyer) {
        redirect('/marketplace')
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <main className="flex max-w-3xl flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Indosourcing
        </h1>
        <p className="text-muted-foreground">
          {user
            ? 'Anda sudah masuk. Buka dasbor untuk melanjutkan.'
            : 'Dasbor admin. Akun pemasok dan pembeli dapat mendaftar secara publik. Organisasi ditautkan oleh administrator platform Anda.'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {user ? (
            <>
              <Button asChild>
                <Link href="/dashboard">Dasbor</Link>
              </Button>
              <span className="text-sm text-muted-foreground">
                Masuk sebagai {user.email}
              </span>
            </>
          ) : (
            <Button asChild>
              <Link href="/login">Masuk</Link>
            </Button>
          )}
        </div>
      </main>
    </div>
  )
}
