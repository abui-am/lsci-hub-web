import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { relationOne } from '@/lib/supabase/relation'
import { requireSession } from '@/lib/rbac/guards'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, Plus } from 'lucide-react'
import { DemandListingActivateButton } from '@/components/dashboard/marketplace/DemandListingActivateButton'
import { formatCurrencyIDR, formatCurrencyRangeIDR } from '@/lib/utils'

export default async function MarketplaceDemandPage() {
  const session = await requireSession()
  const supabase = await createClient()
  const { data: rows, error } = await supabase
    .from('demand_listings')
    .select(
      `
      id,
      required_quantity,
      rfq_responses (
        id,
        quantity_offer,
        price_offer,
        status,
        organizations ( name )
      ),
      required_by,
      price_range_from,
      price_range_to,
      target_location,
      incoterms,
      is_open_for_bidding,
      status,
      image_url,
      created_at,
      products ( name, unit ),
      organizations ( name )
    `
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(40)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/marketplace"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Marketplace
        </Link>
        <Link
          href="/dashboard/marketplace/demand/new"
          className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
        >
          <Plus className="size-4" aria-hidden />
          Create
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Demand listings (RFQ)
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Buyer RFQs with lifecycle status and sourcing constraints.
        </p>
      </div>
      {error ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </p>
      ) : !rows?.length ? (
        <p className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          No demand listings yet.
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table className="min-w-[720px]">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="px-3">Product</TableHead>
                <TableHead className="px-3">Buyer</TableHead>
                <TableHead className="px-3">Qty</TableHead>
                <TableHead className="px-3">Price band</TableHead>
                <TableHead className="px-3">Target</TableHead>
                <TableHead className="px-3">Bidding</TableHead>
                <TableHead className="px-3">Status</TableHead>
                <TableHead className="px-3">Accepted</TableHead>
                <TableHead className="px-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const product = relationOne(
                  row.products as { name: string; unit: string } | { name: string; unit: string }[] | null
                )
                const org = relationOne(
                  row.organizations as { name: string } | { name: string }[] | null
                )
                type RfqRow = {
                  id: string
                  quantity_offer: number | null
                  price_offer: number | null
                  status: 'pending' | 'accepted' | 'rejected'
                  organizations: { name: string } | { name: string }[] | null
                }
                const acceptedQuotes = (
                  (row.rfq_responses as RfqRow[] | null) ?? []
                ).filter((r) => r.status === 'accepted')
                const band =
                  formatCurrencyRangeIDR(row.price_range_from, row.price_range_to)
                return (
                  <TableRow key={row.id}>
                    <TableCell className="px-3 whitespace-normal">
                      <div className="mb-2">
                        <div className="relative h-12 w-16 overflow-hidden rounded border">
                          <Image
                            src={row.image_url ?? '/dummy-cabe.png'}
                            alt={product?.name ?? 'Demand product'}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                      </div>
                      {product?.name ?? '—'}
                      {product?.unit ? (
                        <span className="text-muted-foreground">
                          {' '}
                          ({product.unit})
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="px-3 whitespace-normal">
                      {org?.name ?? '—'}
                    </TableCell>
                    <TableCell className="px-3">
                      {row.required_quantity ?? '—'}
                    </TableCell>
                    <TableCell className="px-3 whitespace-normal">
                      {band}
                    </TableCell>
                    <TableCell className="px-3 whitespace-normal">
                      {[row.target_location, row.incoterms]
                        .filter(Boolean)
                        .join(' / ') || '—'}
                    </TableCell>
                    <TableCell className="px-3">
                      {row.is_open_for_bidding ? 'Open' : 'Closed'}
                    </TableCell>
                    <TableCell className="px-3 whitespace-normal">
                      {String(row.status).replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell className="px-3 whitespace-normal">
                      {acceptedQuotes.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="space-y-1">
                          {acceptedQuotes.map((q) => {
                            const supplier = relationOne(
                              q.organizations as
                                | { name: string }
                                | { name: string }[]
                                | null
                            )
                            return (
                              <p key={q.id} className="text-xs">
                                {supplier?.name ?? 'Supplier'}: {q.quantity_offer ?? '—'}
                                {q.price_offer != null ? ` @ ${formatCurrencyIDR(q.price_offer)}` : ''}
                              </p>
                            )
                          })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/marketplace/demand/edit/${row.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          Edit
                        </Link>
                        {(session.profile.is_platform_superadmin ||
                          session.profile.is_buyer) && (
                          <>
                            {row.status === 'draft' ? (
                              <DemandListingActivateButton demandId={row.id} />
                            ) : null}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
