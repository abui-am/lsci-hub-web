"use client"

import { SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MarketplaceFilterBarProps {
  searchPlaceholder: string
}

export function MarketplaceFilterBar({
  searchPlaceholder,
}: MarketplaceFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder={searchPlaceholder}
        className="h-9 max-w-md bg-background"
        aria-label={searchPlaceholder}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-1.5">
            <SlidersHorizontal className="size-4" />
            Urutkan
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem>Terbaru</DropdownMenuItem>
          <DropdownMenuItem>Harga: rendah ke tinggi</DropdownMenuItem>
          <DropdownMenuItem>Harga: tinggi ke rendah</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
