import Link from 'next/link'
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
import { ArrowLeft } from 'lucide-react'
import { RfqResponseStatusActions } from '@/components/dashboard/marketplace/RfqResponseStatusActions'
import { formatCurrencyIDR } from '@/lib/utils'

export default async function MarketplaceRfqPage() {
  const session = await requireSession()
  const supabase = await createClient()

  const canManageResponses =
    session.profile.is_platform_superadmin || session.profile.is_buyer
  const { data: rows, error } = await supabase
    .from('rfq_responses')
    .select(
      `
      id,
      price_offer,
      quantity_offer,
      lead_time_days,
      message,
      status,
      created_at,
      organizations ( name ),
      demand_listings (
        id,
        products ( name ),
        organizations ( name )
      )
    `
    )
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
        <h1 className="text-2xl font-semibold tracking-tight">RFQ responses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Supplier quotes linked to demand listings.
        </p>
      </div>
      {error ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </p>
      ) : !rows?.length ? (
        <p className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          No RFQ responses yet.
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table className="min-w-[640px]">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="px-3">Demand</TableHead>
                <TableHead className="px-3">Buyer</TableHead>
                <TableHead className="px-3">Supplier</TableHead>
                <TableHead className="px-3">Offer</TableHead>
                <TableHead className="px-3">Lead (d)</TableHead>
                <TableHead className="px-3">Status</TableHead>
                <TableHead className="px-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                type DemandEmbed = {
                  id: string
                  products: { name: string } | { name: string }[] | null
                  organizations: { name: string } | { name: string }[] | null
                }
                const demand = relationOne(
                  row.demand_listings as DemandEmbed | DemandEmbed[] | null
                )
                const supplier = relationOne(
                  row.organizations as { name: string } | { name: string }[] | null
                )
                const demandProduct = demand ? relationOne(demand.products) : null
                const demandBuyer = demand ? relationOne(demand.organizations) : null
                return (
                  <TableRow key={row.id}>
                    <TableCell className="px-3 whitespace-normal">
                      {demandProduct?.name ?? '—'}
                    </TableCell>
                    <TableCell className="px-3 whitespace-normal">
                      {demandBuyer?.name ?? '—'}
                    </TableCell>
                    <TableCell className="px-3 whitespace-normal">
                      {supplier?.name ?? '—'}
                    </TableCell>
                    <TableCell className="px-3 whitespace-normal">
                      {formatCurrencyIDR(row.price_offer)}
                      {row.quantity_offer != null ? (
                        <span className="text-muted-foreground">
                          {' '}
                          × {row.quantity_offer}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="px-3">
                      {row.lead_time_days ?? '—'}
                    </TableCell>
                    <TableCell className="px-3 capitalize">
                      {row.status}
                    </TableCell>
                    <TableCell className="px-3">
                      <RfqResponseStatusActions
                        id={row.id}
                        status={row.status as 'pending' | 'accepted' | 'rejected'}
                        canManage={canManageResponses}
                      />
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
