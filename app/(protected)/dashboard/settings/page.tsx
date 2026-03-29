import { requireSession } from '@/lib/rbac/guards'
import { ProfileFlagsEditor } from '@/components/dashboard/ProfileFlagsEditor'

export default async function DashboardSettingsPage() {
  const session = await requireSession()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground">
          Kelola akun dan preferensi aplikasi Anda.
        </p>
      </div>
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h2 className="text-lg font-medium">Pengaturan akun</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Lihat informasi akun dan akses marketplace.
        </p>
        <div className="mt-4 grid gap-2 text-sm">
          <div>
            Nama: <span className="font-medium">{session.profile.name}</span>
          </div>
          <div>
            Email: <span className="font-medium">{session.email ?? '—'}</span>
          </div>
          <div>
            Peran di organisasi:{' '}
            <span className="font-medium">{session.profile.role}</span>
          </div>
          <div>
            Organisasi tertaut:{' '}
            <span className="font-medium">
              {session.organization ? session.organization.name : 'tidak ada'}
            </span>
          </div>
          <div>
            Jenis organisasi:{' '}
            <span className="font-medium">
              {session.organization ? session.organization.type : '—'}
            </span>
          </div>
          <div>
            Sektor organisasi:{' '}
            <span className="font-medium">
              {session.organization?.sector ?? '—'}
            </span>
          </div>
          <div>
            Deskripsi organisasi:{' '}
            <span className="font-medium">
              {session.organization?.description ?? '—'}
            </span>
          </div>
          <div>
            Akses pemasok:{' '}
            <span className="font-medium">
              {session.profile.is_supplier ? 'aktif' : 'nonaktif'}
            </span>
          </div>
          <div>
            Akses pembeli:{' '}
            <span className="font-medium">
              {session.profile.is_buyer ? 'aktif' : 'nonaktif'}
            </span>
          </div>
        </div>
      </div>

      {session.profile.is_platform_superadmin ? <ProfileFlagsEditor /> : null}
    </div>
  )
}
