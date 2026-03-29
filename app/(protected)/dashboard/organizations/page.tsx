import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/rbac/guards'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type OrgRow = {
  id: string
  name: string
  type: string
  sector: string | null
  created_at: string
}

export default async function OrganizationsPage() {
  const session = await requireSession()
  const canAccess =
    session.profile.is_platform_superadmin || session.profile.role === 'admin'
  if (!canAccess) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        <h2 className="text-base font-semibold">Dilarang</h2>
        <p className="mt-2 text-muted-foreground">
          Hanya admin organisasi atau superadmin platform yang dapat mengakses halaman ini.
        </p>
      </div>
    )
  }
  const supabase = await createClient()

  const base = supabase
    .from('organizations')
    .select('id, name, type, sector, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const query =
    session.profile.is_platform_superadmin || !session.organization
      ? base
      : base.eq('id', session.organization.id)

  const { data, error } = await query

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        Gagal memuat organisasi: {error.message}
      </div>
    )
  }

  const rows = (data ?? []) as OrgRow[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organisasi</h1>
        <p className="text-muted-foreground">
          {session.profile.is_platform_superadmin
            ? 'Semua organisasi di platform.'
            : 'Organisasi Anda.'}
        </p>
      </div>

      <div className="rounded-lg border bg-card p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Sektor</TableHead>
              <TableHead>Dibuat</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell>{o.type}</TableCell>
                  <TableCell>{o.sector ?? '—'}</TableCell>
                  <TableCell>{new Date(o.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    {session.profile.is_platform_superadmin ||
                    (session.organization?.id === o.id && session.profile.role === 'admin') ? (
                      <Link
                        href={`/dashboard/organizations/edit/${o.id}`}
                        className="text-sm underline underline-offset-4"
                      >
                        Ubah
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {o.id}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Tidak ada organisasi.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

