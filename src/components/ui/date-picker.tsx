"use client"

import * as React from "react"
import { format } from "date-fns"
import { HugeiconsIcon } from '@hugeicons/react';
import { Calendar01Icon } from '@hugeicons/core-free-icons';
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"

interface DatePickerProps {
  label?: string
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({
  label,
  date,
  onDateChange,
  placeholder = "Pick a date",
  className,
  disabled = false
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Close calendar when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className={cn("space-y-2", className)} ref={containerRef}>
      {label && (
        <label className="block text-[#B392F0] font-mono font-bold text-[15px]">
          {label}
        </label>
      )}
      <div className="relative">
        <div
          className={cn(
            "h-[42px] bg-[#0D0E11] border border-[#2F3336] rounded p-3 flex items-center gap-3 cursor-pointer",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <HugeiconsIcon icon={Calendar01Icon} size={16} className="text-[#857F94]" />
          <span className="text-[#857F94] font-mono text-[15px] flex-1">
            {date ? format(date, "PPP") : placeholder}
          </span>
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 bg-[#0D0E11] border border-[#2F3336] rounded-lg shadow-lg z-50">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(selectedDate) => {
                onDateChange?.(selectedDate)
                setIsOpen(false)
              }}
              initialFocus
              className="bg-[#0D0E11] text-white"
            />
          </div>
        )}
      </div>
    </div>
  )
}