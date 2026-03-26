import { requireSession } from '@/lib/rbac/guards'
import { SupplierBuyerRegistration } from '@/components/dashboard/SupplierBuyerRegistration'
import { ProfileFlagsEditor } from '@/components/dashboard/ProfileFlagsEditor'

export default async function DashboardSettingsPage() {
  const session = await requireSession()
  const canAccess =
    session.profile.is_platform_superadmin ||
    session.profile.role === 'admin' ||
    session.profile.role === 'manager'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application preferences.
        </p>
      </div>
      {canAccess ? (
        <div className="space-y-6">
          <SupplierBuyerRegistration
            isPlatformSuperadmin={session.profile.is_platform_superadmin}
            actorRole={session.profile.role}
            organization={
              session.organization
                ? {
                    id: session.organization.id,
                    name: session.organization.name,
                    type: session.organization.type,
                    sector: session.organization.sector,
                  }
                : undefined
            }
          />
          {session.profile.is_platform_superadmin ? <ProfileFlagsEditor /> : null}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <h2 className="text-lg font-medium">Account registration</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Supplier/buyer account registration is restricted to organization administrators and managers
            (admin/manager), or platform superadmin.
          </p>
          <div className="mt-3 text-sm">
            <div className="text-muted-foreground">
              Your status:
            </div>
            <div>
              Platform superadmin: <span className="font-medium">{String(session.profile.is_platform_superadmin)}</span>
            </div>
            <div>
              Organization role: <span className="font-medium">{session.profile.role}</span>
            </div>
            <div>
              Linked organization: <span className="font-medium">{session.organization ? session.organization.type : 'none'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
