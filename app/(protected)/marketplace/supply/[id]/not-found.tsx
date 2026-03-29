import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function SupplyDetailNotFound() {
  return (
    <div className="mx-auto max-w-2xl rounded-lg border bg-card p-8 text-center">
      <h1 className="text-xl font-semibold">Listing pasokan tidak ditemukan</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Listing ini mungkin telah dihapus atau tautan tidak valid.
      </p>
      <div className="mt-5">
        <Button asChild>
          <Link href="/marketplace/supply">Kembali ke daftar pasokan</Link>
        </Button>
      </div>
    </div>
  )
}
