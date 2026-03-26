import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function SupplyDetailNotFound() {
  return (
    <div className="mx-auto max-w-2xl rounded-lg border bg-card p-8 text-center">
      <h1 className="text-xl font-semibold">Supply listing not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This supply listing may have been removed, or the link is invalid.
      </p>
      <div className="mt-5">
        <Button asChild>
          <Link href="/marketplace/supply">Back to supply list</Link>
        </Button>
      </div>
    </div>
  )
}
