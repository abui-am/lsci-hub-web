import Image from 'next/image'
import Link from 'next/link'
import { Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCreditScore } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface OrganizationIdentityBadgeProps {
  name: string
  logoUrl?: string | null
  accountHref?: string
  creditScore?: number | null
  roleLabel?: string
  containerClassName?: string
}

export function OrganizationIdentityBadge({
  name,
  logoUrl,
  accountHref,
  creditScore,
  roleLabel,
  containerClassName,
}: OrganizationIdentityBadgeProps) {
  const normalizedName = name.trim() || 'Organisasi'

  return (
    <div className={cn('rounded-lg bg-muted/40 p-1.5', containerClassName)}>
      <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border">
          <Image
            src={logoUrl ?? '/dummy-cabe.png'}
            alt={normalizedName}
            fill
            className="object-cover"
            sizes="24px"
          />
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 leading-none">
          {roleLabel ? <span className="text-[11px] text-muted-foreground">{roleLabel}:</span> : null}
          {accountHref ? (
            <Link
              href={accountHref}
              className="truncate text-[11px] font-semibold text-foreground hover:underline"
            >
              {normalizedName}
            </Link>
          ) : (
            <span className="truncate text-[11px] font-semibold text-foreground">
              {normalizedName}
            </span>
          )}
          <Badge
            variant="outline"
            className="inline-flex h-5 items-center gap-1 px-1.5 text-[11px]"
          >
            <Shield className="h-3 w-3" />
            {formatCreditScore(creditScore)}
          </Badge>
        </div>
      </div>
    </div>
  )
}
