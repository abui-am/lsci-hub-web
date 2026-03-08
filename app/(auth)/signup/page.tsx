import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">No self-registration</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This is an admin dashboard. User accounts are created by the superadmin only.
          </p>
        </div>
        <Button asChild>
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    </div>
  )
}
