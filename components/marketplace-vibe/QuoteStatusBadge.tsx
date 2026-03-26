import { Badge } from '@/components/ui/badge'

type QuoteStatus = 'pending' | 'accepted' | 'rejected'

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  if (status === 'accepted') {
    return <Badge variant="success">Accepted</Badge>
  }
  if (status === 'rejected') {
    return <Badge variant="outline">Rejected</Badge>
  }
  return <Badge variant="warning">Pending</Badge>
}
