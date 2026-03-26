import { requireSession } from '@/lib/rbac/guards'
import { ProfileFlagsEditor } from '@/components/dashboard/ProfileFlagsEditor'

export default async function DashboardSettingsPage() {
  const session = await requireSession()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application preferences.
        </p>
      </div>
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h2 className="text-lg font-medium">Account settings</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          View your account information and marketplace access.
        </p>
        <div className="mt-4 grid gap-2 text-sm">
          <div>
            Name: <span className="font-medium">{session.profile.name}</span>
          </div>
          <div>
            Email: <span className="font-medium">{session.email ?? '—'}</span>
          </div>
          <div>
            Organization role:{' '}
            <span className="font-medium">{session.profile.role}</span>
          </div>
          <div>
            Linked organization:{' '}
            <span className="font-medium">
              {session.organization ? session.organization.name : 'none'}
            </span>
          </div>
          <div>
            Organization type:{' '}
            <span className="font-medium">
              {session.organization ? session.organization.type : '—'}
            </span>
          </div>
          <div>
            Organization sector:{' '}
            <span className="font-medium">
              {session.organization?.sector ?? '—'}
            </span>
          </div>
          <div>
            Organization description:{' '}
            <span className="font-medium">
              {session.organization?.description ?? '—'}
            </span>
          </div>
          <div>
            Supplier access:{' '}
            <span className="font-medium">
              {session.profile.is_supplier ? 'enabled' : 'disabled'}
            </span>
          </div>
          <div>
            Buyer access:{' '}
            <span className="font-medium">
              {session.profile.is_buyer ? 'enabled' : 'disabled'}
            </span>
          </div>
        </div>
      </div>

      {session.profile.is_platform_superadmin ? <ProfileFlagsEditor /> : null}
    </div>
  )
}
