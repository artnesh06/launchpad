"use client"

import * as React from "react"
import { HugeiconsIcon } from '@hugeicons/react';
import { Calendar01Icon, Clock01Icon } from '@hugeicons/core-free-icons';
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"

interface SingleDateTimePickerProps {
  label?: string
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function SingleDateTimePicker({
  label,
  date,
  onDateChange,
  placeholder = "dd/mm/yyyy. 7 PM UTC",
  className,
  disabled = false
}: SingleDateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [hours, setHours] = React.useState("07")
  const [minutes, setMinutes] = React.useState("00")
  const [amPm, setAmPm] = React.useState("PM")
  const [dropdownPosition, setDropdownPosition] = React.useState<'bottom' | 'top'>('bottom')

  // Sync time inputs with date prop (extract UTC time)
  React.useEffect(() => {
    if (date) {
      const utcHours = date.getUTCHours();
      const utcMinutes = date.getUTCMinutes();
      
      const displayHours = utcHours === 0 ? 12 : utcHours > 12 ? utcHours - 12 : utcHours;
      const displayAmPm = utcHours >= 12 ? 'PM' : 'AM';
      
      setHours(displayHours.toString().padStart(2, '0'));
      setMinutes(utcMinutes.toString().padStart(2, '0'));
      setAmPm(displayAmPm);
    }
  }, [date])

  const containerRef = React.useRef<HTMLDivElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Calculate dropdown position based on available space
  React.useEffect(() => {
    if (isOpen && containerRef.current) {
      const updatePosition = () => {
        if (!containerRef.current) return
        
        const rect = containerRef.current.getBoundingClientRect()
        const viewportHeight = window.innerHeight
        const spaceBelow = viewportHeight - rect.bottom
        const spaceAbove = rect.top
        const dropdownHeight = 450 // Approximate height of calendar + time picker
        
        // Determine position (top or bottom)
        const position = (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) ? 'top' : 'bottom'
        setDropdownPosition(position)
      }
      
      updatePosition()
      
      // Update position on scroll or resize
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [isOpen])

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

  const formatDate = () => {
    if (date) {
      // Display the UTC date and time
      const utcYear = date.getUTCFullYear();
      const utcMonth = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const utcDay = date.getUTCDate().toString().padStart(2, '0');
      const utcHours = date.getUTCHours();
      const utcMinutes = date.getUTCMinutes();
      
      const displayHours = utcHours === 0 ? 12 : utcHours > 12 ? utcHours - 12 : utcHours;
      const displayAmPm = utcHours >= 12 ? 'PM' : 'AM';
      const displayMinutes = utcMinutes.toString().padStart(2, '0');
      
      return `${utcDay}/${utcMonth}/${utcYear}. ${displayHours.toString().padStart(2, '0')}:${displayMinutes} ${displayAmPm} UTC`;
    }
    return placeholder;
  }

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Convert to UTC using the selected time
      const hour24 = amPm === 'PM' && hours !== '12' 
        ? parseInt(hours) + 12 
        : amPm === 'AM' && hours === '12' 
          ? 0 
          : parseInt(hours);
      
      // Create UTC date with selected date and time
      // Use local date components (getFullYear, getMonth, getDate) because
      // the calendar shows dates in local timezone and user expects to select
      // the date they see (e.g., selecting "7" should result in UTC date with day=7)
      const utcDate = new Date(Date.UTC(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        hour24,
        parseInt(minutes),
        0,
        0
      ));
      
      onDateChange?.(utcDate);
    } else {
      onDateChange?.(undefined);
    }
    setIsOpen(false)
  }

  // Handle hours input (1-12)
  const handleHoursChange = (value: string) => {
    // Only allow numbers
    const numValue = value.replace(/\D/g, '')
    
    if (numValue === '') {
      setHours('')
      return
    }

    const num = parseInt(numValue)
    
    // Allow typing, but limit to valid range
    if (numValue.length === 1) {
      // Single digit: allow 1-9
      if (num >= 1 && num <= 9) {
        setHours(numValue)
      }
    } else if (numValue.length === 2) {
      // Two digits: allow 10-12
      if (num >= 10 && num <= 12) {
        setHours(numValue)
      }
    }
  }

  // Handle minutes input (0-59)
  const handleMinutesChange = (value: string) => {
    // Only allow numbers
    const numValue = value.replace(/\D/g, '')
    
    if (numValue === '') {
      setMinutes('')
      return
    }

    const num = parseInt(numValue)
    
    // Allow typing, but limit to valid range
    if (numValue.length === 1) {
      // Single digit: allow 0-9
      if (num >= 0 && num <= 9) {
        setMinutes(numValue)
      }
    } else if (numValue.length === 2) {
      // Two digits: allow 00-59
      if (num >= 0 && num <= 59) {
        setMinutes(numValue)
      }
    }
  }

  // Validate on blur
  const handleHoursBlur = () => {
    if (hours === '' || parseInt(hours) < 1 || parseInt(hours) > 12) {
      setHours('07')
    } else {
      setHours(hours.padStart(2, '0'))
    }
  }

  const handleMinutesBlur = () => {
    if (minutes === '' || parseInt(minutes) < 0 || parseInt(minutes) > 59) {
      setMinutes('00')
    } else {
      setMinutes(minutes.padStart(2, '0'))
    }
  }

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
            "h-[42px] border-0 rounded p-3 flex items-center gap-3 cursor-pointer",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <HugeiconsIcon icon={Calendar01Icon} size={16} className="text-[#857F94]" />
          <span className="text-[#857F94] font-mono text-[15px] flex-1">
            {formatDate()}
          </span>
          <HugeiconsIcon icon={Clock01Icon} size={16} className="text-[#857F94]" />
        </div>

        {isOpen && (
          <>
            {/* Backdrop to prevent modal interaction */}
            <div 
              className="fixed inset-0 z-[9998]"
              style={{ background: 'transparent' }}
              onClick={() => setIsOpen(false)}
            />
            
            {/* Calendar Dropdown */}
            <div 
              ref={dropdownRef}
              className={cn(
                "absolute left-0 bg-[#0D0E11] border border-[#2F3336] rounded-lg shadow-2xl p-4",
                "min-w-[320px] max-h-[450px] overflow-y-auto z-[9999]",
                "animate-in fade-in-0 zoom-in-95 duration-200",
                dropdownPosition === 'bottom' ? "top-full mt-1" : "bottom-full mb-1"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4">
                <Calendar mode="single" selected={date} onSelect={handleDateSelect} className="bg-[#0D0E11] text-white" />

                <div className="space-y-2">
                  <label className="block text-[#B392F0] font-mono font-bold text-sm">
                    Time (UTC)
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={hours}
                      onChange={(e) => handleHoursChange(e.target.value)}
                      onBlur={handleHoursBlur}
                      placeholder="07"
                      maxLength={2}
                      className="w-12 h-[32px] bg-[#0D0E11] border border-[#2F3336] rounded px-2 text-[#857F94] font-mono text-sm text-center"
                    />
                    <span className="text-[#857F94] font-mono">:</span>
                    <input
                      type="text"
                      value={minutes}
                      onChange={(e) => handleMinutesChange(e.target.value)}
                      onBlur={handleMinutesBlur}
                      placeholder="00"
                      maxLength={2}
                      className="w-12 h-[32px] bg-[#0D0E11] border border-[#2F3336] rounded px-2 text-[#857F94] font-mono text-sm text-center"
                    />
                    <select
                      value={amPm}
                      onChange={(e) => setAmPm(e.target.value)}
                      className="h-[32px] bg-[#0D0E11] border border-[#2F3336] rounded px-2 text-[#857F94] font-mono text-sm w-16"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                  <p className="text-xs text-[#857F94]/60 font-mono">
                    Hours: 1-12, Minutes: 0-59
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
