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
            Sort
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem>Newest</DropdownMenuItem>
          <DropdownMenuItem>Price: low to high</DropdownMenuItem>
          <DropdownMenuItem>Price: high to low</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
