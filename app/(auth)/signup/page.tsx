import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PublicSupplierBuyerSignupForm } from '@/components/auth/PublicSupplierBuyerSignupForm'

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Pendaftaran pemasok / pembeli
          </h1>
          <p className="text-sm text-muted-foreground">
            Buat akun Anda. Profil akan ditandai sebagai pemasok atau pembeli
            secara otomatis, dan organisasi Anda dibuat saat pendaftaran.
            Organisasi awalnya berstatus menunggu verifikasi dan dapat
            diverifikasi oleh superadmin platform.
          </p>
        </div>
        <PublicSupplierBuyerSignupForm />
        <div className="text-center text-sm">
          Sudah punya akun?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Masuk
          </Link>
        </div>
        <div className="text-center text-xs text-muted-foreground">
          Setelah mendaftar, periksa email Anda jika proyek Supabase
          memerlukan konfirmasi.
        </div>
      </div>
    </div>
  )
}
