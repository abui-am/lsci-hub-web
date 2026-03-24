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

export default async function MarketplaceSupplyPage() {
  const supabase = await createClient()
  const { data: rows, error } = await supabase
    .from('supply_listings')
    .select(
      `
      id,
      quantity,
      price_estimate,
      min_order_quantity,
      lead_time_days,
      export_capability,
      price_type,
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
        <h1 className="text-2xl font-semibold tracking-tight">Supply listings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Supplier offers visible under your organization and marketplace rules
          (RLS).
        </p>
      </div>
      {error ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </p>
      ) : !rows?.length ? (
        <p className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          No supply listings yet. Seed data or create listings after migrations
          are applied.
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table className="min-w-[640px]">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="px-3">Product</TableHead>
                <TableHead className="px-3">Seller</TableHead>
                <TableHead className="px-3">Qty</TableHead>
                <TableHead className="px-3">Price</TableHead>
                <TableHead className="px-3">Lead (d)</TableHead>
                <TableHead className="px-3">Export</TableHead>
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
                      {row.quantity ?? '—'}
                    </TableCell>
                    <TableCell className="px-3 whitespace-normal">
                      {row.price_estimate != null ? row.price_estimate : '—'}
                      {row.price_type ? (
                        <span className="text-muted-foreground">
                          {' '}
                          ({row.price_type})
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="px-3">
                      {row.lead_time_days ?? '—'}
                    </TableCell>
                    <TableCell className="px-3">
                      {row.export_capability ? 'Yes' : 'No'}
                    </TableCell>
                    <TableCell className="px-3 capitalize">
                      {row.status}
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
