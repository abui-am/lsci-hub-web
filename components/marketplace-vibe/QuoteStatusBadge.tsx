import { Badge } from '@/components/ui/badge'

type QuoteStatus = 'pending' | 'accepted' | 'rejected'

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  if (status === 'accepted') {
    return <Badge variant="success">Diterima</Badge>
  }
  if (status === 'rejected') {
    return <Badge variant="outline">Ditolak</Badge>
  }
  return <Badge variant="warning">Menunggu</Badge>
}
