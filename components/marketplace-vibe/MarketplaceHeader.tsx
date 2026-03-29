import { Card, CardContent } from '@/components/ui/card'
import type { ReactNode } from 'react'

interface MarketplaceHeaderProps {
  title: string
  description: string
  stats: Array<{
    label: string
    value: string | number
    icon?: ReactNode
  }>
  /** Default 3 columns; use 2 for denser layouts (e.g. supplier marketplace). */
  statsColumns?: 2 | 3
}

export function MarketplaceHeader({
  title,
  description,
  stats,
  statsColumns = 3,
}: MarketplaceHeaderProps) {
  const statsGridClass =
    statsColumns === 2 ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3 sm:grid-cols-3'

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className={statsGridClass}>
        {stats.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  {item.icon}
                  {item.label}
                </span>
              </p>
              <p className="mt-1 text-xl font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
