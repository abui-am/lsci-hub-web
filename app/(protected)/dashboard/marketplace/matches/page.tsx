import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { relationOne } from '@/lib/supabase/relation'
import { ArrowLeft } from 'lucide-react'

export default async function MarketplaceMatchesPage() {
  const supabase = await createClient()
  const { data: rows, error } = await supabase
    .from('matches')
    .select(
      `
      id,
      match_score,
      status,
      ai_reason,
      created_at,
      supply_listings (
        id,
        quantity,
        price_estimate,
        products ( name ),
        organizations ( name )
      ),
      demand_listings (
        id,
        required_quantity,
        products ( name ),
        organizations ( name )
      )
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
        <h1 className="text-2xl font-semibold tracking-tight">AI matches</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Suggested pairings between supply and demand with optional score and
          rationale.
        </p>
      </div>
      {error ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </p>
      ) : !rows?.length ? (
        <p className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          No matches yet. Matching is typically populated by a backend job or
          superadmin tooling.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            type ListingSide = {
              id: string
              quantity?: number | null
              price_estimate?: number | null
              required_quantity?: number | null
              products: { name: string } | { name: string }[] | null
              organizations: { name: string } | { name: string }[] | null
            }
            const supply = relationOne(
              row.supply_listings as ListingSide | ListingSide[] | null
            )
            const demand = relationOne(
              row.demand_listings as ListingSide | ListingSide[] | null
            )
            const supplyProduct = supply ? relationOne(supply.products) : null
            const supplyOrg = supply ? relationOne(supply.organizations) : null
            const demandProduct = demand ? relationOne(demand.products) : null
            const demandOrg = demand ? relationOne(demand.organizations) : null
            return (
              <li
                key={row.id}
                className="rounded-lg border bg-card p-4 text-sm shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {supplyProduct?.name ?? 'Supply'} ↔{' '}
                      {demandProduct?.name ?? 'Demand'}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {supplyOrg?.name ?? 'Seller'} → {demandOrg?.name ?? 'Buyer'}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {row.match_score != null ? (
                      <p className="font-medium text-foreground">
                        Score {row.match_score.toFixed(2)}
                      </p>
                    ) : null}
                    <p className="capitalize">{row.status}</p>
                  </div>
                </div>
                {row.ai_reason ? (
                  <p className="mt-3 border-t pt-3 text-muted-foreground">
                    {row.ai_reason}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
