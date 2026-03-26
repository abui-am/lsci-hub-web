import Image from 'next/image'
import Link from 'next/link'
import {
  CalendarClock,
  CheckCircle2,
  Globe2,
  Package2,
  Scale,
  ShieldCheck,
  Tag,
  Truck,
} from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCreditScore } from '@/lib/utils'

interface RfqCardProps {
  productName: string
  buyerName: string
  buyerAccountHref?: string
  buyerLogoUrl?: string | null
  buyerCreditScore?: number | null
  quantityLabel: string
  priceBandLabel: string
  statusLabel: string
  targetCountry?: string | null
  incoterms?: string | null
  requiredBy?: string | null
  specSummary?: string | null
  certifications?: string[]
  productCategory?: string | null
  opportunityTags?: string[]
  recommended?: boolean
  action: React.ReactNode
}

export function RfqCard({
  productName,
  buyerName,
  buyerAccountHref,
  buyerLogoUrl,
  buyerCreditScore,
  quantityLabel,
  priceBandLabel,
  statusLabel,
  targetCountry,
  incoterms,
  requiredBy,
  specSummary,
  certifications = [],
  productCategory,
  opportunityTags = [],
  recommended = false,
  action,
}: RfqCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[16/6] w-full">
        <Image
          src="/dummy-cabe.png"
          alt="RFQ product"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <Badge variant={statusLabel === 'active' ? 'success' : 'outline'}>
            {statusLabel}
          </Badge>
          {recommended ? <Badge variant="default">AI Recommended</Badge> : null}
        </div>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-base leading-tight">{productName}</CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="relative h-6 w-6 overflow-hidden rounded-full border">
            <Image
              src={buyerLogoUrl ?? '/dummy-cabe.png'}
              alt={buyerName}
              fill
              className="object-cover"
              sizes="24px"
            />
          </div>
          <p>
            Buyer:{' '}
            {buyerAccountHref ? (
              <Link href={buyerAccountHref} className="hover:underline">
                {buyerName}
              </Link>
            ) : (
              buyerName
            )}
            {` | Credit: ${formatCreditScore(buyerCreditScore)}`}
          </p>
        </div>
        {opportunityTags.length ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {opportunityTags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2.5">
        <div className="grid grid-cols-2 gap-1.5">
          <div className="rounded-md bg-muted/40 p-2">
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Scale className="h-3.5 w-3.5" />
              Required quantity
            </p>
            <p className="text-base font-semibold">{quantityLabel}</p>
          </div>
          <div className="rounded-md bg-muted/40 p-2">
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Tag className="h-3.5 w-3.5" />
              Price band
            </p>
            <p className="font-medium">{priceBandLabel}</p>
          </div>
        </div>
        <div className="rounded-md bg-muted/40 p-2">
          <p className="text-xs text-muted-foreground">Logistics and compliance</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="inline-flex items-center gap-1">
              <Globe2 className="h-3 w-3" />
              Country: {targetCountry ?? 'Not specified'}
            </Badge>
            <Badge variant="secondary" className="inline-flex items-center gap-1">
              <Truck className="h-3 w-3" />
              Incoterm: {incoterms ?? 'Not specified'}
            </Badge>
            <Badge variant="secondary" className="inline-flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              Required by: {requiredBy ?? 'Not specified'}
            </Badge>
            <Badge variant="secondary" className="inline-flex items-center gap-1">
              <Package2 className="h-3 w-3" />
              Category: {productCategory ?? 'Not specified'}
            </Badge>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge variant="outline" className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Specs: {specSummary ?? 'Not specified'}
            </Badge>
            {certifications.length ? (
              certifications.map((cert) => (
                <Badge key={cert} variant="outline" className="inline-flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Cert: {cert}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                Cert: Not specified
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">{action}</CardFooter>
    </Card>
  )
}
