'use client'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format, set } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronDownIcon } from 'lucide-react'
import * as React from 'react'

interface DateTimePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Selecionar data e hora',
  disabled = false,
  className,
  id,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    value
  )
  const [timeValue, setTimeValue] = React.useState(() => {
    if (value) {
      return format(value, 'HH:mm:ss')
    }
    return '10:30:00'
  })

  // Sync with external value changes
  React.useEffect(() => {
    if (value) {
      setSelectedDate(value)
      setTimeValue(format(value, 'HH:mm:ss'))
    } else {
      setSelectedDate(undefined)
      setTimeValue('10:30:00')
    }
  }, [value])

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Parse the time and combine with the selected date
      const [hours, minutes, seconds] = timeValue.split(':').map(Number)
      const newDateTime = set(date, {
        hours: hours || 0,
        minutes: minutes || 0,
        seconds: seconds || 0,
        milliseconds: 0,
      })

      setSelectedDate(newDateTime)
      onChange?.(newDateTime)
      setOpen(false)
    }
  }

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = event.target.value
    setTimeValue(newTime)

    if (selectedDate) {
      // Parse the new time and combine with existing date
      const [hours, minutes, seconds] = newTime.split(':').map(Number)
      const newDateTime = set(selectedDate, {
        hours: hours || 0,
        minutes: minutes || 0,
        seconds: seconds || 0,
        milliseconds: 0,
      })

      setSelectedDate(newDateTime)
      onChange?.(newDateTime)
    }
  }

  const formatDisplayValue = () => {
    if (!selectedDate) return placeholder

    return `${format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })} às ${timeValue}`
  }

  return (
    <div className={cn('flex gap-2', className)}>
      <div className="flex flex-col gap-2 flex-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id={id}
              disabled={disabled}
              className={cn(
                'w-full justify-between font-normal',
                !selectedDate && 'text-muted-foreground'
              )}
            >
              {selectedDate
                ? format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })
                : 'Selecionar data'}
              <ChevronDownIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              captionLayout="dropdown"
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col gap-2">
        <Input
          type="time"
          step="1"
          value={timeValue}
          onChange={handleTimeChange}
          disabled={disabled}
          className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </div>
    </div>
  )
}

// Utility function to convert Date to UTC ISO string
export function formatDateTimeToUTC(date: Date): string {
  // JavaScript automatically handles timezone conversion
  // When you create a Date object, it's stored internally as UTC
  // toISOString() returns the UTC representation
  return date.toISOString()
}

// Utility function to parse UTC ISO string to local Date
export function parseUTCToLocal(utcString: string): Date {
  // JavaScript automatically handles timezone conversion
  // When you create a Date from an ISO string, it's automatically converted to local time
  return new Date(utcString)
}
