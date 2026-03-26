'use client'

import Link from 'next/link'
import { FileText, MessageSquare, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/providers/ToastProvider'

type SupplierResponseActionsProps = {
  demandId: string
  buyerOrganizationId: string | null
  isAccepted: boolean
}

export function SupplierResponseActions({
  demandId,
  buyerOrganizationId,
  isAccepted,
}: SupplierResponseActionsProps) {
  const { toast } = useToast()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href={`/marketplace/demand/${demandId}`}>
          <FileText className="mr-1.5 h-4 w-4" />
          View RFQ detail
        </Link>
      </Button>

      {buyerOrganizationId ? (
        <Button asChild size="sm" variant="outline">
          <Link href={`/marketplace/account/${buyerOrganizationId}`}>
            <MessageSquare className="mr-1.5 h-4 w-4" />
            View buyer detail
          </Link>
        </Button>
      ) : null}

      {isAccepted ? (
        <Button
          type="button"
          size="sm"
          onClick={() =>
            toast({
              title: 'Track shipment is WIP',
              description: 'Shipment tracking module is under development.',
            })
          }
        >
          <Truck className="mr-1.5 h-4 w-4" />
          Track shipment
        </Button>
      ) : null}
    </div>
  )
}
