'use client'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  ensureAfter,
  isDayWithoutTimeAfter,
  withTime,
} from '@/lib/datetime-bounds'
import { cn } from '@/lib/utils'
import { format, isSameDay, set } from 'date-fns'
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
  disablePastDates?: boolean
  minDate?: Date
  // Limite exclusivo de data e hora: dias sem horário posterior a ele ficam
  // desabilitados e o valor escolhido nunca é igual ou anterior a ele.
  after?: Date
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Selecionar data e hora',
  disabled = false,
  className,
  id,
  disablePastDates = false,
  minDate,
  after,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    value
  )
  const [timeValue, setTimeValue] = React.useState(() => {
    if (value) {
      return format(value, 'HH:mm:ss')
    }
    return '23:59:59'
  })

  // Sync with external value changes
  React.useEffect(() => {
    if (value) {
      setSelectedDate(value)
      setTimeValue(format(value, 'HH:mm:ss'))
    } else {
      setSelectedDate(undefined)
      setTimeValue('23:59:59')
    }
  }, [value])

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      // If date is undefined (user clicked on already selected date to unselect)
      setSelectedDate(undefined)
      setTimeValue('23:59:59')
      onChange?.(undefined)
      setOpen(false)
      return
    }

    // Parse the time and combine with the selected date
    const [hours, minutes, seconds] = timeValue.split(':').map(Number)
    const rawDateTime = set(date, {
      hours: hours || 0,
      minutes: minutes || 0,
      seconds: seconds || 0,
      milliseconds: 0,
    })

    // Ao selecionar hoje com horário no passado, snap para 23:59:00 em vez de
    // "agora + 1s". O padrão do sistema é data_limite = fim do dia, e "agora + 1s"
    // expira imediatamente se houver qualquer latência entre o clique e o envio.
    // Para datas futuras, ensureAfter é no-op (valor sempre preservado).
    const needsSnap = !!after && rawDateTime.getTime() <= after.getTime()
    const newDateTime =
      needsSnap && isSameDay(date, new Date())
        ? set(date, { hours: 23, minutes: 59, seconds: 0, milliseconds: 0 })
        : ensureAfter(rawDateTime, after)

    setSelectedDate(newDateTime)
    setTimeValue(format(newDateTime, 'HH:mm:ss'))
    onChange?.(newDateTime)
    setOpen(false)
  }

  // A hora digitada é aplicada como está: o limite `after` só vale ao confirmar
  // o campo (blur), senão a correção para "agora + 1s" interrompe a digitação
  // de um horário de hoje (DEV-679).
  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = event.target.value
    setTimeValue(newTime)

    if (selectedDate) {
      const newDateTime = withTime(selectedDate, newTime)
      setSelectedDate(newDateTime)
      onChange?.(newDateTime)
    }
  }

  const handleTimeBlur = () => {
    if (!selectedDate) return

    const committed = ensureAfter(selectedDate, after)
    setTimeValue(format(committed, 'HH:mm:ss'))
    if (committed.getTime() !== selectedDate.getTime()) {
      setSelectedDate(committed)
      onChange?.(committed)
    }
  }

  const formatDisplayValue = () => {
    if (!selectedDate) return placeholder

    return `${format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })} às ${timeValue}`
  }

  const today = new Date()
  const startMonth = new Date(today.getFullYear() - 10, 0, 1)
  const endMonth = new Date(today.getFullYear() + 5, 11, 31)

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
              startMonth={startMonth}
              endMonth={endMonth}
              onSelect={handleDateSelect}
              disabled={date => {
                const compareDate = new Date(date)
                compareDate.setHours(0, 0, 0, 0)
                if (disablePastDates) {
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  if (compareDate < today) return true
                }
                if (minDate) {
                  const min = new Date(minDate)
                  min.setHours(0, 0, 0, 0)
                  if (compareDate < min) return true
                }
                if (isDayWithoutTimeAfter(date, after)) return true
                return false
              }}
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
          onBlur={handleTimeBlur}
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
