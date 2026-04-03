import Image from 'next/image'
import {
  Building2,
  CalendarClock,
  CircleDollarSign,
  Globe2,
  HandCoins,
  Package2,
  Scale,
  ShieldCheck,
  Timer,
  Tag,
  Truck,
} from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatCurrencyIDR } from '@/lib/utils'
import { OrganizationIdentityBadge } from '@/components/marketplace-vibe/OrganizationIdentityBadge'

function demandStatusVariant(status: string): 'success' | 'outline' | 'warning' {
  if (status === 'active') return 'success'
  if (status === 'receiving_quotes') return 'warning'
  return 'outline'
}

function demandStatusLabel(status: string): string {
  if (status === 'active') return 'Aktif'
  if (status === 'receiving_quotes') return 'Menerima penawaran'
  return status
}

function getSpecItems(specSummary?: string | null): string[] {
  if (!specSummary) return []
  return specSummary
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
}

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
  paymentTerms?: string | null
  rfqExpiresAt?: string | null
  specSummary?: string | null
  certifications?: string[]
  productCategory?: string | null
  opportunityTags?: string[]
  recommended?: boolean
  buyerIsVerified?: boolean
  buyerCompletedDeals?: number | null
  buyerOrgType?: string | null
  buyerSector?: string | null
  quotesCount?: number
  estimatedDealValue?: number | null
  marketGapPercent?: number | null
  winProbability?: number | null
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
  paymentTerms,
  rfqExpiresAt,
  specSummary,
  certifications = [],
  productCategory,
  opportunityTags = [],
  recommended = false,
  buyerIsVerified = false,
  buyerCompletedDeals = null,
  buyerOrgType,
  buyerSector,
  quotesCount = 0,
  estimatedDealValue = null,
  marketGapPercent = null,
  winProbability = null,
  action,
}: RfqCardProps) {
  const specItems = getSpecItems(specSummary)
  const urgencyDate = rfqExpiresAt ?? requiredBy
  const urgencyDays = urgencyDate
    ? Math.ceil((new Date(urgencyDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  const isUrgent = urgencyDays != null && urgencyDays <= 2
  const isHighValue = (estimatedDealValue ?? 0) >= 100000000
  const logisticsBadgeClass =
    'rounded-full border bg-white py-0.5 font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border-border text-foreground inline-flex h-5 items-center gap-1 px-1.5 text-[11px]'
  const emphasisClass = isUrgent
    ? 'border-amber-300 bg-amber-50/30 dark:border-amber-900/60 dark:bg-amber-950/10'
    : isHighValue
      ? 'border-emerald-300 bg-emerald-50/20 dark:border-emerald-900/60 dark:bg-emerald-950/10'
      : undefined

  return (
    <Card className={`overflow-hidden ${emphasisClass ?? ''}`}>
      <div className="relative aspect-video w-full">
        <Image
          src="/dummy-cabe.png"
          alt="Produk RFQ"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <Badge variant={demandStatusVariant(statusLabel)}>
            {demandStatusLabel(statusLabel)}
          </Badge>
          {recommended ? <Badge variant="default">Rekomendasi AI</Badge> : null}
        </div>
      </div>
      <CardHeader className="pb-1.5">
        <CardTitle className="mb-1.5 text-base leading-tight">{productName}</CardTitle>
        <OrganizationIdentityBadge
          name={buyerName}
          logoUrl={buyerLogoUrl}
          accountHref={buyerAccountHref}
          creditScore={buyerCreditScore}
        />
        {opportunityTags.length ? (
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            {isUrgent ? <Badge variant="warning" className="px-1.5 py-0 text-[10px]">Mendesak</Badge> : null}
            {isHighValue ? <Badge variant="success" className="px-1.5 py-0 text-[10px]">Nilai tinggi</Badge> : null}
            {buyerIsVerified ? <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">Terverifikasi</Badge> : null}
            {opportunityTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-1.5">
        <div className="grid grid-cols-2 gap-1">
          <div className="rounded-md bg-muted/40 p-1.5">
            <p className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <CircleDollarSign className="h-3.5 w-3.5" />
              Est. nilai
            </p>
            <p className="text-xs font-semibold">{formatCurrencyIDR(estimatedDealValue, '-')}</p>
          </div>
          <div className="rounded-md bg-muted/40 p-1.5">
            <p className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Package2 className="h-3.5 w-3.5" />
              Kompetisi
            </p>
            <p className="text-xs font-semibold">{quotesCount} penawar</p>
          </div>
          <div className="rounded-md bg-muted/40 p-1.5">
            <p className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Timer className="h-3.5 w-3.5" />
              Peluang menang
            </p>
            <p className="text-xs font-semibold">{winProbability != null ? `${winProbability}%` : '-'}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <div className="rounded-md bg-muted/40 p-1.5">
            <p className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Scale className="h-3.5 w-3.5" />
              Jml dibutuhkan
            </p>
            <p className="text-sm font-semibold leading-tight">{quantityLabel}</p>
          </div>
          <div className="rounded-md bg-muted/40 p-1.5">
            <p className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Tag className="h-3.5 w-3.5" />
              Rentang harga
            </p>
            <p className="text-sm font-medium leading-tight">{priceBandLabel}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="h-5 justify-center px-1.5 text-[11px]">
                <Package2 className="mr-1 h-3 w-3" />
                {buyerCompletedDeals ?? 0}
              </Badge>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>
              Deal selesai : {buyerCompletedDeals ?? 0}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="h-5 justify-center px-1.5 text-[11px]">
                <HandCoins className="mr-1 h-3 w-3" />
                {paymentTerms?.trim() || '-'}
              </Badge>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>
              Pembayaran : {paymentTerms?.trim() || 'Tidak ditentukan'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="h-5 justify-center px-1.5 text-[11px]">
                <Building2 className="mr-1 h-3 w-3" />
                {buyerOrgType?.trim() || '-'}
              </Badge>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>
              Tipe buyer : {buyerOrgType?.trim() || 'Tidak ditentukan'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="h-5 justify-center px-1.5 text-[11px]">
                <Tag className="mr-1 h-3 w-3" />
                {buyerSector?.trim() || '-'}
              </Badge>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>
              Sektor : {buyerSector?.trim() || 'Tidak ditentukan'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="col-span-2 h-5 justify-center px-1.5 text-[11px]">
                <Scale className="mr-1 h-3 w-3" />
                {marketGapPercent != null ? `${Math.round(marketGapPercent)}%` : '-'}
              </Badge>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>
              Gap pasar : {marketGapPercent != null ? `${Math.round(marketGapPercent)}%` : 'Tidak ditentukan'}
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="rounded-md bg-muted/40 p-1.5">
          <p className="text-[10px] text-muted-foreground">Logistik dan kepatuhan</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className={logisticsBadgeClass}>
                  <Globe2 className="h-3 w-3" />
                  {targetCountry?.trim() || '-'}
                </Badge>
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>
                Negara tujuan : {targetCountry?.trim() || 'Tidak ditentukan'}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className={logisticsBadgeClass}>
                  <Truck className="h-3 w-3" />
                  {incoterms?.trim() || '-'}
                </Badge>
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>
                Incoterm : {incoterms?.trim() || 'Tidak ditentukan'}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className={logisticsBadgeClass}>
                  <CalendarClock className="h-3 w-3" />
                  {requiredBy?.trim() || '-'}
                </Badge>
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>
                Dibutuhkan pada : {requiredBy?.trim() || 'Tidak ditentukan'}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className={logisticsBadgeClass}>
                  <Package2 className="h-3 w-3" />
                  {productCategory?.trim() || '-'}
                </Badge>
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>
                Kategori produk : {productCategory?.trim() || 'Tidak ditentukan'}
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="inline-flex h-5 items-center gap-1 px-1.5 text-[11px]">
                  Spek: {specItems.length ? '' : '-'}
                </Badge>
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>
                <div className="space-y-1">
                  <p>Spek : {specItems.length ? '' : 'Tidak ditentukan'}</p>
                  {specItems.length ? (
                    <ul className="list-disc pl-3">
                      {specItems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </TooltipContent>
            </Tooltip>
            {certifications.length ? (
              certifications.map((cert) => (
                <Tooltip key={cert}>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="inline-flex h-5 items-center gap-1 px-1.5 text-[11px]">
                      <ShieldCheck className="h-3 w-3" />
                      {cert}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6}>
                    Sertifikasi : {cert}
                  </TooltipContent>
                </Tooltip>
              ))
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="inline-flex h-5 items-center gap-1 px-1.5 text-[11px]">
                    <ShieldCheck className="h-3 w-3" />-
                  </Badge>
                </TooltipTrigger>
                <TooltipContent sideOffset={6}>
                  Sertifikasi : Tidak ditentukan
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">{action}</CardFooter>
    </Card>
  )
}
