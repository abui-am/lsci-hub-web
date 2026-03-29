import { requireSession } from '@/lib/rbac/guards'
import {
  Bot,
  Clock3,
  Filter,
  MessageSquare,
  Plus,
  Search,
  Send,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default async function MarketplaceAdvisorPage() {
  const session = await requireSession()
  const canAccess =
    session.profile.is_platform_superadmin ||
    session.profile.is_supplier ||
    session.profile.is_buyer

  if (!canAccess) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        <h2 className="text-base font-semibold">Tidak diizinkan</h2>
        <p className="mt-2 text-muted-foreground">
          Akun Anda tidak dapat mengakses Penasihat AI.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Penasihat AI</h1>
          <p className="text-sm text-muted-foreground">
            Dapatkan panduan sourcing, rekomendasi shortlist, dan persiapan negosiasi.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="hidden lg:block">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Percakapan penasihat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="default" className="w-full justify-start gap-2">
              <Plus className="h-4 w-4" />
              Mulai chat baru
            </Button>
            <div className="space-y-1 pt-1 text-sm">
              <div className="rounded-md border bg-muted/30 p-2">
                <p className="font-medium">Shortlist pemasok untuk ekspor cabai</p>
                <p className="text-xs text-muted-foreground">2 menit lalu</p>
              </div>
              <div className="rounded-md p-2 hover:bg-muted/50">
                <p>Cari pembeli dengan syarat bayar cepat</p>
                <p className="text-xs text-muted-foreground">Hari ini</p>
              </div>
              <div className="rounded-md p-2 hover:bg-muted/50">
                <p>Bandingkan urgensi RFQ vs margin</p>
                <p className="text-xs text-muted-foreground">Kemarin</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Papan chat</CardTitle>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Clock3 className="h-4 w-4" />
                Prompt terkini
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Filter className="h-4 w-4" />
                Filter pesan penasihat
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                <Input placeholder="Harga minimum (IDR)" />
                <Input placeholder="Kategori" />
                <Input placeholder="Lead time maks (hari)" />
                <Input placeholder="Sertifikasi" />
              </div>
              <div className="mt-2">
                <Button size="sm" className="gap-1.5">
                  <Search className="h-4 w-4" />
                  Cari
                </Button>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-start gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback>
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="rounded-md bg-muted px-3 py-2 text-sm">
                  Saya dapat membantu membandingkan keandalan pemasok, margin perkiraan, dan risiko
                  pemenuhan. Beri tahu produk target dan timeline Anda.
                </div>
              </div>

              <div className="flex items-start justify-end gap-2">
                <div className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
                  Tunjukkan pemasok terbaik untuk cabai kering dengan lead time di bawah 7 hari.
                </div>
                <Avatar className="h-7 w-7">
                  <AvatarFallback>
                    <MessageSquare className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Input placeholder="Ketik permintaan Anda untuk Penasihat AI..." />
              <Button type="button" className="gap-1.5">
                <Send className="h-4 w-4" />
                Kirim
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
