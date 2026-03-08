import { requireAuth } from '@/lib/auth'
import { SignOutButton } from '@/components/auth/SignOutButton'

export default async function DashboardPage() {
  const user = await requireAuth()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{user.email}</span>
        </p>
      </div>
      <SignOutButton />
    </div>
  )
}
