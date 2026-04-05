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
    statsColumns === 2 ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4 sm:grid-cols-3'

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        <p className="max-w-2xl text-base text-muted-foreground">{description}</p>
      </div>
      <div className={statsGridClass}>
        {stats.map((item) => (
          <Card key={item.label} className="border-border/70 bg-card/90 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm">
                <span className="inline-flex items-center gap-1">
                  {item.icon}
                  {item.label}
                </span>
              </p>
              <p className="mt-1.5 text-2xl font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
