import { requireSession } from '@/lib/rbac/guards'
import {
  Bot,
  Clock3,
  Filter,
  MessageSquare,
  Plus,
  Search,
  Send,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default async function MarketplaceAdvisorPage() {
  const session = await requireSession()
  const canAccess =
    session.profile.is_platform_superadmin ||
    session.profile.is_supplier ||
    session.profile.is_buyer

  if (!canAccess) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        <h2 className="text-base font-semibold">Not allowed</h2>
        <p className="mt-2 text-muted-foreground">
          Your account cannot access AI Advisor.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Advisor</h1>
          <p className="text-sm text-muted-foreground">
            Get sourcing guidance, shortlist recommendations, and negotiation prep.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="hidden lg:block">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Advisor chats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="default" className="w-full justify-start gap-2">
              <Plus className="h-4 w-4" />
              Start new chat
            </Button>
            <div className="space-y-1 pt-1 text-sm">
              <div className="rounded-md border bg-muted/30 p-2">
                <p className="font-medium">Shortlist suppliers for chili export</p>
                <p className="text-xs text-muted-foreground">2 min ago</p>
              </div>
              <div className="rounded-md p-2 hover:bg-muted/50">
                <p>Find buyers with fast payment terms</p>
                <p className="text-xs text-muted-foreground">Today</p>
              </div>
              <div className="rounded-md p-2 hover:bg-muted/50">
                <p>Compare RFQ urgency vs margin</p>
                <p className="text-xs text-muted-foreground">Yesterday</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Chat board</CardTitle>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Clock3 className="h-4 w-4" />
                Recent prompts
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Filter className="h-4 w-4" />
                Message Advisor Filters
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                <Input placeholder="Minimum price (IDR)" />
                <Input placeholder="Category" />
                <Input placeholder="Lead time max (days)" />
                <Input placeholder="Certification" />
              </div>
              <div className="mt-2">
                <Button size="sm" className="gap-1.5">
                  <Search className="h-4 w-4" />
                  Search
                </Button>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-start gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback>
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="rounded-md bg-muted px-3 py-2 text-sm">
                  I can help you compare supplier reliability, expected margin, and fulfillment
                  risk. Tell me your target product and timeline.
                </div>
              </div>

              <div className="flex items-start justify-end gap-2">
                <div className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
                  Show top suppliers for dried chili with lead time under 7 days.
                </div>
                <Avatar className="h-7 w-7">
                  <AvatarFallback>
                    <MessageSquare className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Input placeholder="Type your request for AI Advisor..." />
              <Button type="button" className="gap-1.5">
                <Send className="h-4 w-4" />
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
