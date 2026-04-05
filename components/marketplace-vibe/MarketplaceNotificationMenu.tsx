'use client'

import Link from 'next/link'
import { Bell, Sparkles } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

type NotificationType = 'ai' | 'rfq' | 'offer' | 'security'

interface MarketplaceNotification {
  id: string
  title: string
  message: string
  time: string
  isUnread: boolean
  type: NotificationType
  href: string
}

const mockNotifications: MarketplaceNotification[] = [
  {
    id: 'notif-1',
    title: 'AI Advisor merekomendasikan supplier',
    message: '3 supplier dengan skor risiko terbaik tersedia untuk RFQ Cabe Keriting.',
    time: '2 menit lalu',
    isUnread: true,
    type: 'ai',
    href: '/marketplace/advisor',
  },
  {
    id: 'notif-2',
    title: 'Credit scoring supplier diperbarui',
    message: 'PT Nusantara Pangan naik dari 89 ke 95 berdasarkan performa terbaru.',
    time: '18 menit lalu',
    isUnread: true,
    type: 'security',
    href: '/marketplace/supply',
  },
  {
    id: 'notif-3',
    title: 'Smart export scoring insight',
    message: '2 supplier siap ekspor ke ASEAN untuk kategori rempah kering.',
    time: '1 jam lalu',
    isUnread: false,
    type: 'ai',
    href: '/marketplace/supply',
  },
  {
    id: 'notif-4',
    title: 'Offer request baru diterima',
    message: 'Buyer meminta revisi lead time untuk penawaran Anda.',
    time: '3 jam lalu',
    isUnread: false,
    type: 'offer',
    href: '/marketplace/supply-listing/offer',
  },
]

function typeLabel(type: NotificationType): string {
  switch (type) {
    case 'ai':
      return 'AI'
    case 'rfq':
      return 'RFQ'
    case 'offer':
      return 'Offer'
    case 'security':
      return 'Trust'
    default:
      return 'Info'
  }
}

export function MarketplaceNotificationMenu() {
  const unreadCount = mockNotifications.filter((notification) => notification.isUnread).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary/25 bg-background/90 text-foreground/70 hover:border-primary/45 hover:bg-primary/8 hover:text-foreground"
          aria-label="Buka notifikasi"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-88 max-w-[calc(100vw-1rem)] p-0">
        <DropdownMenuLabel className="flex items-center justify-between gap-2 px-3 py-2.5">
          <span>Notifikasi</span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            AI Enabled
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {mockNotifications.map((notification) => (
          <DropdownMenuItem
            key={notification.id}
            asChild
            className="cursor-pointer p-0 focus:bg-transparent"
          >
            <Link
              href={notification.href}
              className="flex w-full flex-col items-start gap-1.5 rounded-md px-3 py-3 text-left hover:bg-muted/50"
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span className="line-clamp-1 text-sm font-medium">{notification.title}</span>
                <Badge variant={notification.isUnread ? 'default' : 'outline'} className="h-5 px-1.5 text-[10px]">
                  {typeLabel(notification.type)}
                </Badge>
              </div>
              <p className="line-clamp-2 text-xs text-muted-foreground">{notification.message}</p>
              <div className="flex w-full items-center justify-between">
                <span className="text-[11px] text-muted-foreground">{notification.time}</span>
                {notification.isUnread ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Baru
                  </span>
                ) : null}
              </div>
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="focus:bg-transparent">
          <Link
            href="/marketplace/advisor"
            className="flex w-full items-center justify-center px-3 py-2.5 text-sm font-medium text-primary hover:bg-muted/50"
          >
            Lihat semua notifikasi
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
