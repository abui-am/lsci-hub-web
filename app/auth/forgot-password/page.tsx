import Link from 'next/link'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'
import { Button } from '@/components/ui/button'

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Atur ulang kata sandi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Masukkan email Anda, kami akan mengirim tautan pengaturan ulang
          </p>
        </div>
        <ForgotPasswordForm />
        <Button asChild variant="ghost" className="w-full">
          <Link href="/login">Kembali ke masuk</Link>
        </Button>
      </div>
    </div>
  )
}
