import { requireAuth } from '@/lib/auth'

export default async function DashboardSettingsPage() {
  await requireAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application preferences.
        </p>
      </div>
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h2 className="text-lg font-medium">Settings</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Settings content and forms can be added here.
        </p>
      </div>
    </div>
  )
}
