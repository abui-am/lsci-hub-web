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
}

export function MarketplaceHeader({
  title,
  description,
  stats,
}: MarketplaceHeaderProps) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
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
