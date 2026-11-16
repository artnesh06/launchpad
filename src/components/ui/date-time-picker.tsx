"use client"

import * as React from "react"
import { HugeiconsIcon } from '@hugeicons/react';
import { Calendar01Icon, Clock01Icon } from '@hugeicons/core-free-icons';
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"

interface DateTimePickerProps {
  label?: string
  startDate?: Date
  endDate?: Date
  onStartDateChange?: (date: Date | undefined) => void
  onEndDateChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DateTimePicker({
  label,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  placeholder = "Select date range",
  className,
  disabled = false
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [activeInput, setActiveInput] = React.useState<'start' | 'end'>('start')
  const [startTime, setStartTime] = React.useState("07:00")
  const [endTime, setEndTime] = React.useState("07:00")
  const [startAmPm, setStartAmPm] = React.useState("PM")
  const [endAmPm, setEndAmPm] = React.useState("PM")

  // Sync time inputs with date props (extract UTC time)
  React.useEffect(() => {
    if (startDate) {
      const utcHours = startDate.getUTCHours();
      const utcMinutes = startDate.getUTCMinutes();
      
      const displayHours = utcHours === 0 ? 12 : utcHours > 12 ? utcHours - 12 : utcHours;
      const displayAmPm = utcHours >= 12 ? 'PM' : 'AM';
      
      setStartTime(`${displayHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')}`);
      setStartAmPm(displayAmPm);
    }
  }, [startDate]);

  React.useEffect(() => {
    if (endDate) {
      const utcHours = endDate.getUTCHours();
      const utcMinutes = endDate.getUTCMinutes();
      
      const displayHours = utcHours === 0 ? 12 : utcHours > 12 ? utcHours - 12 : utcHours;
      const displayAmPm = utcHours >= 12 ? 'PM' : 'AM';
      
      setEndTime(`${displayHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')}`);
      setEndAmPm(displayAmPm);
    }
  }, [endDate]);

  // Convert 24-hour time to 12-hour format for display
  const convertTo12Hour = (time24: string) => {
    const [hours, minutes] = time24.split(':')
    let hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    hour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return {
      time: `${hour.toString().padStart(2, '0')}:${minutes}`,
      ampm
    }
  }

  // Convert 12-hour time + AM/PM to 24-hour format
  const convertTo24Hour = (time12: string, ampm: string) => {
    const [hours, minutes] = time12.split(':')
    let hour = parseInt(hours)
    if (ampm === 'AM' && hour === 12) hour = 0
    if (ampm === 'PM' && hour !== 12) hour += 12
    return `${hour.toString().padStart(2, '0')}:${minutes}`
  }

  // Validate 12-hour time input
  const validateTimeInput = (value: string) => {
    const [hours, minutes] = value.split(':')
    const hour = parseInt(hours)
    const minute = parseInt(minutes)

    // Hour should be 1-12 for 12-hour format
    if (hour < 1 || hour > 12) return false
    // Minutes should be 0-59
    if (minute < 0 || minute > 59) return false

    return true
  }
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

  const formatDateRange = () => {
    if (startDate && endDate) {
      // Display UTC dates and time
      const startUtcYear = startDate.getUTCFullYear();
      const startUtcMonth = (startDate.getUTCMonth() + 1).toString().padStart(2, '0');
      const startUtcDay = startDate.getUTCDate().toString().padStart(2, '0');
      const startUtcHours = startDate.getUTCHours();
      const startUtcMinutes = startDate.getUTCMinutes();
      
      const endUtcYear = endDate.getUTCFullYear();
      const endUtcMonth = (endDate.getUTCMonth() + 1).toString().padStart(2, '0');
      const endUtcDay = endDate.getUTCDate().toString().padStart(2, '0');
      
      const startDisplayHours = startUtcHours === 0 ? 12 : startUtcHours > 12 ? startUtcHours - 12 : startUtcHours;
      const startDisplayAmPm = startUtcHours >= 12 ? 'PM' : 'AM';
      const startDisplayMinutes = startUtcMinutes.toString().padStart(2, '0');
      
      return `${startUtcDay}/${startUtcMonth}/${startUtcYear} - ${endUtcDay}/${endUtcMonth}/${endUtcYear}. ${startDisplayHours.toString().padStart(2, '0')}:${startDisplayMinutes} ${startDisplayAmPm} UTC`;
    } else if (startDate) {
      const startUtcYear = startDate.getUTCFullYear();
      const startUtcMonth = (startDate.getUTCMonth() + 1).toString().padStart(2, '0');
      const startUtcDay = startDate.getUTCDate().toString().padStart(2, '0');
      return `${startUtcDay}/${startUtcMonth}/${startUtcYear} - Select end date`;
    } else {
      return placeholder;
    }
  }

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Convert time to 24-hour format
      const time = activeInput === 'start' ? startTime : endTime;
      const ampm = activeInput === 'start' ? startAmPm : endAmPm;
      const [hours, minutes] = time.split(':');
      
      let hour24 = parseInt(hours);
      if (ampm === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (ampm === 'AM' && hour24 === 12) {
        hour24 = 0;
      }
      
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
      
      if (activeInput === 'start') {
        onStartDateChange?.(utcDate);
        if (!endDate) {
          setActiveInput('end');
        } else {
          setIsOpen(false);
        }
      } else {
        onEndDateChange?.(utcDate);
        setIsOpen(false);
      }
    } else {
      if (activeInput === 'start') {
        onStartDateChange?.(undefined);
      } else {
        onEndDateChange?.(undefined);
      }
      setIsOpen(false);
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
            "h-[42px] bg-[#0D0E11] border border-[#2F3336] rounded p-3 flex items-center gap-3 cursor-pointer",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <HugeiconsIcon icon={Calendar01Icon} size={16} className="text-[#857F94]" />
          <span className="text-[#857F94] font-mono text-[15px] flex-1">
            {formatDateRange()}
          </span>
          <HugeiconsIcon icon={Clock01Icon} size={16} className="text-[#857F94]" />
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 bg-[#0D0E11] border border-[#2F3336] rounded-lg shadow-lg z-50 p-4">
            <div className="space-y-4">
              <div className="flex gap-2 text-sm">
                <button
                  className={cn(
                    "px-3 py-1 rounded font-mono",
                    activeInput === 'start'
                      ? "bg-[#B392F0] text-[#0D0E11]"
                      : "text-[#857F94] hover:text-white"
                  )}
                  onClick={() => setActiveInput('start')}
                >
                  Start Date
                </button>
                <button
                  className={cn(
                    "px-3 py-1 rounded font-mono",
                    activeInput === 'end'
                      ? "bg-[#B392F0] text-[#0D0E11]"
                      : "text-[#857F94] hover:text-white"
                  )}
                  onClick={() => setActiveInput('end')}
                >
                  End Date
                </button>
              </div>

              <HugeiconsIcon icon={Calendar01Icon} mode="single" selected={activeInput === 'start' ? startDate : endDate} onSelect={handleDateSelect} className="bg-[#0D0E11] text-white" />

              <div className="space-y-2">
                <label className="block text-[#B392F0] font-mono font-bold text-sm">
                  {activeInput === 'start' ? 'Start Time (UTC)' : 'End Time (UTC)'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={activeInput === 'start' ? startTime : endTime}
                    onChange={(e) => {
                      const value = e.target.value
                      // Allow typing and validate on complete input
                      if (value.match(/^\d{1,2}:\d{2}$/)) {
                        if (validateTimeInput(value)) {
                          if (activeInput === 'start') {
                            setStartTime(value)
                          } else {
                            setEndTime(value)
                          }
                        }
                      } else if (value.match(/^\d{0,2}:?\d{0,2}$/)) {
                        // Allow partial input while typing
                        if (activeInput === 'start') {
                          setStartTime(value)
                        } else {
                          setEndTime(value)
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value
                      if (!value.match(/^\d{1,2}:\d{2}$/) || !validateTimeInput(value)) {
                        // Reset to default if invalid
                        if (activeInput === 'start') {
                          setStartTime("07:00")
                        } else {
                          setEndTime("07:00")
                        }
                      }
                    }}
                    placeholder="07:00"
                    pattern="^(0?[1-9]|1[0-2]):[0-5][0-9]$"
                    title="Enter time in 12-hour format (1:00 - 12:59)"
                    className="flex-1 h-[32px] bg-[#0D0E11] border border-[#2F3336] rounded px-2 text-[#857F94] font-mono text-sm"
                  />
                  <select
                    value={activeInput === 'start' ? startAmPm : endAmPm}
                    onChange={(e) => {
                      if (activeInput === 'start') {
                        setStartAmPm(e.target.value)
                      } else {
                        setEndAmPm(e.target.value)
                      }
                    }}
                    className="h-[32px] bg-[#0D0E11] border border-[#2F3336] rounded px-2 text-[#857F94] font-mono text-sm w-16"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}