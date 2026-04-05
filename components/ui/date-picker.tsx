"use client"

import { useMemo, useState } from "react"
import { CalendarIcon } from "lucide-react"
import { format, isValid, parse } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type DatePickerProps = {
  value?: string | null
  onChange: (nextValue: string) => void
  placeholder?: string
  className?: string
}

function parseDateValue(value?: string | null): Date | undefined {
  if (!value) return undefined
  const parsed = parse(value, "yyyy-MM-dd", new Date())
  return isValid(parsed) ? parsed : undefined
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pilih tanggal",
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)

  const selectedDate = useMemo(() => parseDateValue(value), [value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-8 w-full justify-start bg-transparent px-2.5 text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
          {selectedDate ? format(selectedDate, "yyyy-MM-dd") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(nextDate) => {
            if (!nextDate) return
            onChange(format(nextDate, "yyyy-MM-dd"))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
