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
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email and password
          </p>
        </div>
        <LoginForm redirectTo={redirectPath} queryError={queryError} />
        <p className="text-center text-sm text-muted-foreground">
          Accounts are created by the superadmin. Request access if you need one.
        </p>
      </div>
    </div>
  )
}
