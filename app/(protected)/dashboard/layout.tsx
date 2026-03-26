import { requireSession } from '@/lib/rbac/guards'
import { DashboardShell } from '@/components/dashboard/DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireSession()

  return (
    <div className="min-h-svh w-full bg-background">
      <DashboardShell
        canViewOrganizations={
          session.profile.is_platform_superadmin || session.profile.role === 'admin'
        }
      >
        {children}
      </DashboardShell>
    </div>
  )
}
