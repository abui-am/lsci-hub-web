import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <main className="flex max-w-3xl flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Indosourcing
        </h1>
        <p className="text-muted-foreground">
          {user
            ? 'Signed in. Open the dashboard to continue.'
            : 'Admin dashboard. Supplier and buyer accounts can sign up publicly. Organizations are linked by your platform administrator.'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {user ? (
            <>
              <Button asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <span className="text-sm text-muted-foreground">
                Signed in as {user.email}
              </span>
            </>
          ) : (
            <Button asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </main>
    </div>
  )
}
