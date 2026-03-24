import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { relationOne } from '@/lib/supabase/relation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft } from 'lucide-react'

export default async function MarketplaceDemandPage() {
  const supabase = await createClient()
  const { data: rows, error } = await supabase
    .from('demand_listings')
    .select(
      `
      id,
      required_quantity,
      required_by,
      price_range_from,
      price_range_to,
      target_location,
      incoterms,
      is_open_for_bidding,
      status,
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
                const band =
                  row.price_range_from != null || row.price_range_to != null
                    ? `${row.price_range_from ?? '…'} – ${row.price_range_to ?? '…'}`
                    : '—'
                return (
                  <TableRow key={row.id}>
                    <TableCell className="px-3 whitespace-normal">
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
