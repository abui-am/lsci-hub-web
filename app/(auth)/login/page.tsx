import Link from 'next/link'
import { LoginForm } from '@/components/auth/LoginForm'

type LoginPageProps = {
  searchParams: Promise<{ redirect?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirect: redirectPath, error: queryError } = await searchParams

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Masuk</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Masukkan email dan kata sandi Anda
          </p>
        </div>
        <LoginForm redirectTo={redirectPath} queryError={queryError} />
        <p className="text-center text-sm text-muted-foreground">
          Akun dibuat oleh superadmin. Minta akses jika Anda memerlukannya.
        </p>
      </div>
    </div>
  )
}
