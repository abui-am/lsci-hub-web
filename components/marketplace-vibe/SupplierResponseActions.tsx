'use client'

import Link from 'next/link'
import { FileText, MessageSquare, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/providers/ToastProvider'
import { TradeChatSheet } from '@/components/marketplace-vibe/TradeChatSheet'

type SupplierResponseActionsProps = {
  demandId: string
  buyerOrganizationId: string | null
  supplierOrganizationId: string | null
  buyerName: string
  viewerProfileId: string
  isAccepted: boolean
}

export function SupplierResponseActions({
  demandId,
  buyerOrganizationId,
  supplierOrganizationId,
  buyerName,
  viewerProfileId,
  isAccepted,
}: SupplierResponseActionsProps) {
  const { toast } = useToast()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href={`/marketplace/demand/${demandId}`}>
          <FileText className="mr-1.5 h-4 w-4" />
          Lihat detail RFQ
        </Link>
      </Button>

      {buyerOrganizationId ? (
        <Button asChild size="sm" variant="outline">
          <Link href={`/marketplace/account/${buyerOrganizationId}`}>
            <MessageSquare className="mr-1.5 h-4 w-4" />
            Lihat detail pembeli
          </Link>
        </Button>
      ) : null}

      {supplierOrganizationId ? (
        <TradeChatSheet
          viewerProfileId={viewerProfileId}
          otherPartyName={buyerName || 'Pembeli'}
          triggerLabel="Chat pembeli"
          context={{
            type: 'rfq',
            demandListingId: demandId,
            supplierOrganizationId,
          }}
        />
      ) : null}

      {isAccepted ? (
        <Button
          type="button"
          size="sm"
          onClick={() =>
            toast({
              title: 'Pelacakan pengiriman (akan datang)',
              description: 'Modul pelacakan pengiriman sedang dikembangkan.',
            })
          }
        >
          <Truck className="mr-1.5 h-4 w-4" />
          Lacak pengiriman
        </Button>
      ) : null}
    </div>
  )
}
