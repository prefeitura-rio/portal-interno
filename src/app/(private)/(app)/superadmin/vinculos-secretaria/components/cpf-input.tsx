'use client'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ComponentProps } from 'react'

export function digitsOnlyCpf(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11)
}

export function formatCpfMask(value: string): string {
  const digits = digitsOnlyCpf(value)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function isValidCpfDigits(cpf: string): boolean {
  return digitsOnlyCpf(cpf).length === 11
}

type CpfInputProps = Omit<
  ComponentProps<typeof Input>,
  'value' | 'onChange'
> & {
  value: string
  onChange: (digits: string) => void
}

export function CpfInput({
  value,
  onChange,
  className,
  placeholder = '000.000.000-00',
  ...props
}: CpfInputProps) {
  return (
    <Input
      {...props}
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      className={cn(className)}
      value={formatCpfMask(value)}
      onChange={event => onChange(digitsOnlyCpf(event.target.value))}
    />
  )
}
