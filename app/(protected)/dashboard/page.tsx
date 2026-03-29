import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/rbac/guards'

export default async function DashboardOverviewPage() {
  const session = await requireSession()

  if (!session.profile.is_platform_superadmin) {
    if (session.profile.is_supplier && !session.profile.is_buyer) {
      redirect('/supplier/marketplace')
    }
    if (session.profile.is_buyer && !session.profile.is_supplier) {
      redirect('/buyer/marketplace')
    }
    if (session.profile.is_supplier || session.profile.is_buyer) {
      redirect('/marketplace')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ringkasan</h1>
        <p className="text-muted-foreground">
          Selamat datang kembali. Masuk sebagai{' '}
          <span className="font-medium text-foreground">{session.email}</span>
        </p>
      </div>
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h2 className="text-lg font-medium">Memulai</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Gunakan bilah sisi untuk navigasi antara Ringkasan dan Pengaturan. Area ini
          dapat dipakai untuk widget dasbor, aktivitas terkini, atau metrik utama.
        </p>
      </div>
    </div>
  )
}
