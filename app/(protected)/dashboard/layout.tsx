import { requireSession } from '@/lib/auth'
import { DashboardShell } from '@/components/dashboard/DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireSession()

  return (
    
    <div className="min-h-svh w-full bg-background">
      <DashboardShell>{children}</DashboardShell>
    </div>
  )
}
