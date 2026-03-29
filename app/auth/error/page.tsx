import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const { message } = await searchParams
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold text-foreground">Kesalahan autentikasi</h1>
      <p className="text-sm text-muted-foreground">
        {message ?? 'Terjadi kesalahan. Silakan coba lagi.'}
      </p>
      <Button asChild variant="outline">
        <Link href="/login">Kembali ke masuk</Link>
      </Button>
    </div>
  )
}
