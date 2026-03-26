'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAuth } from '@/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'

function getInitials(email: string | undefined): string {
  if (!email) return '?'
  const part = email.split('@')[0]
  if (part.length >= 2) return part.slice(0, 2).toUpperCase()
  return part.slice(0, 1).toUpperCase()
}

function AppBarUser() {
  const { user } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined
  const email = user?.email ?? undefined

  return (
    <div className="ml-auto flex items-center gap-2">
      <Avatar size="sm" className="size-8">
        <AvatarImage src={avatarUrl} alt="" />
        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
          {getInitials(email)}
        </AvatarFallback>
      </Avatar>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            aria-label="Sign out"
            className="size-8"
          >
            <LogOut className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Sign out</TooltipContent>
      </Tooltip>
    </div>
  )
}

export function DashboardShell({
  children,
  canViewOrganizations,
}: {
  children: React.ReactNode
  canViewOrganizations: boolean
}) {
  return (
    <SidebarProvider>
      <DashboardSidebar canViewOrganizations={canViewOrganizations} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <span className="text-sm font-medium text-muted-foreground">
            Dashboard
          </span>
          <AppBarUser />
        </header>
        <div className="min-h-0 flex-1 overflow-auto bg-background p-4 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
