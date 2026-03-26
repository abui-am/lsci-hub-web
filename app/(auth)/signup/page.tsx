import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PublicSupplierBuyerSignupForm } from '@/components/auth/PublicSupplierBuyerSignupForm'

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Supplier / Buyer signup
          </h1>
          <p className="text-sm text-muted-foreground">
            Create your account. Your profile will be tagged as supplier or buyer
            automatically, and your organization will be created during signup.
            Your organization will start as `pending` and can be verified by
            platform superadmin.
          </p>
        </div>
        <PublicSupplierBuyerSignupForm />
        <div className="text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
        <div className="text-center text-xs text-muted-foreground">
          After signup, check your email if your Supabase project requires
          confirmation.
        </div>
      </div>
    </div>
  )
}
